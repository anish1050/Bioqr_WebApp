import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sanitizeInput } from "../helpers/sanitize.js";
import { generateTokens, JWT_REFRESH_SECRET } from "../helpers/tokens.js";
import { authenticateToken } from "../helpers/auth.js";
import { authLimiter } from "../helpers/rateLimiters.js";
import { optionalDoubleCsrfProtection } from "../helpers/csrf.js";
import { UserQueries, SessionQueries, OtpQueries } from "../helpers/queries.js";
import { log } from "../helpers/logger.js";
import { sendVerificationOtp } from "../helpers/email.js";
import crypto from "crypto";

const router = Router();

// ============================================================
// ============================================================
// Registration Step 1: Send Email Verification OTP
// ============================================================
router.post(
    "/users/register/send-email-otp",
    authLimiter,
    async (req: Request, res: Response): Promise<void> => {
        const { first_name, last_name, username, email, mobile_number, password } = req.body;

        if (!first_name || !last_name || !username || !email || !password) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        try {
            // Rate Limit Check (Max 3 per hour)
            const recentRequests = await OtpQueries.countRecentRequests(email);
            if (recentRequests >= 3) {
                res.status(429).json({ success: false, message: "Too many OTP requests. Please try again after an hour." });
                return;
            }

            // Check for existing users
            const duplicates = await UserQueries.findDuplicates(email, username);
            if (duplicates.length > 0) {
                const existing = duplicates[0];
                if (existing.email === email) {
                    res.json({ success: false, message: "Email already registered" });
                    return;
                }
                if (existing.username === username) {
                    res.json({ success: false, message: "Username already taken" });
                    return;
                }
            }

            // Prepare Email OTP.
            const otpCode = crypto.randomInt(100000, 999999).toString();
            const hashedOtp = await bcrypt.hash(otpCode, 10);
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create temporary entry in otp_verifications tracking user state
            await OtpQueries.create({
                identifier: email,
                otp_hash: hashedOtp,
                type: 'email',
                user_data: { 
                    first_name, 
                    last_name, 
                    username, 
                    email, 
                    password: hashedPassword, 
                    mobile_number: mobile_number || null,
                    mobile_verified: false,
                    email_verified: false 
                }
            });

            // Send verification email
            const emailSent = await sendVerificationOtp(email, otpCode, first_name);
            
            if (emailSent) {
                res.json({ success: true, message: "Verification code sent to your email." });
            } else {
                res.status(500).json({ success: false, message: "Failed to send verification email." });
            }
        } catch (error) {
            console.error("❌ Email Verification Sender Error:", error);
            res.status(500).json({ success: false, message: "Server error during registration step 1" });
        }
    }
);

// ============================================================
// Registration Step 2: Finalize With Email OTP
// ============================================================
router.post(
    "/users/register/verify-email",
    authLimiter,
    async (req: Request, res: Response): Promise<void> => {
        const { email, otp } = req.body;

        if (!email || !otp) {
            res.json({ success: false, message: "Email and code are required" });
            return;
        }

        try {
            const record = await OtpQueries.findActive(email);
            
            if (!record) {
                res.json({ success: false, message: "Verification link expired or invalid" });
                return;
            }

            const isMatch = await bcrypt.compare(otp, record.otp_hash);
            
            if (!isMatch) {
                await OtpQueries.incrementAttempts(record.id);
                const updatedRecord = await OtpQueries.findActive(email);
                const attemptsRemaining = 3 - (updatedRecord?.attempts || 0);
                
                if (attemptsRemaining <= 0) {
                    await OtpQueries.delete(record.id);
                    res.json({ success: false, message: "Too many incorrect attempts. This OTP is now invalid." });
                } else {
                    res.json({ 
                        success: false, 
                        message: "Incorrect verification code",
                        attemptsRemaining: attemptsRemaining
                    });
                }
                return;
            }

            // Extract data and create user
            const userData = JSON.parse(record.user_data);
            
            // Mark email as verified for the final user row
            const userId = await UserQueries.create({
                ...userData,
                email_verified: true,
                mobile_number_verified: false
            });

            await OtpQueries.delete(record.id);

            (req as any).user = userData;
            await log(`User registered: ${userData.username}`, req, userId);

            res.json({ 
                success: true, 
                message: "Email verified! Account created successfully.",
                user_id: userId
            });
        } catch (error) {
            console.error("❌ Final Verification Error:", error);
            res.status(500).json({ success: false, message: "Registration failed." });
        }
    }
);

// ============================================================
// Forgot Password Step 1: Send Reset OTP
// ============================================================
router.post(
    "/users/forgot-password/send-otp",
    authLimiter,
    async (req: Request, res: Response): Promise<void> => {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ success: false, message: "Email is required" });
            return;
        }

        try {
            // Rate limit: max 3 reset requests per hour
            const recentRequests = await OtpQueries.countRecentRequests(email);
            if (recentRequests >= 3) {
                res.status(429).json({ success: false, message: "Too many reset requests. Please try again after an hour." });
                return;
            }

            // Check if user exists
            const user = await UserQueries.findByEmail(email);
            if (!user) {
                // Don't reveal whether the email exists for security
                res.json({ success: true, message: "If an account with that email exists, a reset code has been sent." });
                return;
            }

            // Check if user is OAuth-only (no password set)
            if (!user.password) {
                res.json({ success: false, message: "This account uses social login. Please sign in with Google or GitHub." });
                return;
            }

            // Generate OTP
            const otpCode = crypto.randomInt(100000, 999999).toString();
            const hashedOtp = await bcrypt.hash(otpCode, 10);

            // Store OTP with user_data containing user ID for password update
            await OtpQueries.create({
                identifier: email,
                otp_hash: hashedOtp,
                type: 'email',
                user_data: { userId: user.id, purpose: 'password_reset' }
            });

            // Send reset email
            const { sendPasswordResetOtp } = await import("../helpers/email.js");
            await sendPasswordResetOtp(email, otpCode, user.first_name);

            res.json({ success: true, message: "If an account with that email exists, a reset code has been sent." });
        } catch (error) {
            console.error("❌ Forgot Password Error:", error);
            res.status(500).json({ success: false, message: "Server error. Please try again." });
        }
    }
);

// ============================================================
// Forgot Password Step 2: Verify OTP & Reset Password
// ============================================================
router.post(
    "/users/forgot-password/reset",
    authLimiter,
    async (req: Request, res: Response): Promise<void> => {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            res.status(400).json({ success: false, message: "Email, code, and new password are required" });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
            return;
        }

        try {
            const record = await OtpQueries.findActive(email);

            if (!record) {
                res.json({ success: false, message: "Reset code expired or invalid. Please request a new one." });
                return;
            }

            // Verify it's a password reset OTP
            const userData = JSON.parse(record.user_data);
            if (userData.purpose !== 'password_reset') {
                res.json({ success: false, message: "Invalid reset code." });
                return;
            }

            const isMatch = await bcrypt.compare(otp, record.otp_hash);

            if (!isMatch) {
                await OtpQueries.incrementAttempts(record.id);
                const updatedRecord = await OtpQueries.findActive(email);
                const attemptsRemaining = 3 - (updatedRecord?.attempts || 0);

                if (attemptsRemaining <= 0) {
                    await OtpQueries.delete(record.id);
                    res.json({ success: false, message: "Too many incorrect attempts. Please request a new code." });
                } else {
                    res.json({
                        success: false,
                        message: "Incorrect code",
                        attemptsRemaining
                    });
                }
                return;
            }

            // OTP verified — update password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await UserQueries.updatePassword(userData.userId, hashedPassword);

            // Clean up OTP record
            await OtpQueries.delete(record.id);

            // Invalidate all existing sessions for security
            await SessionQueries.invalidateAll(userData.userId);

            await log(`Password reset for user ID: ${userData.userId}`, req, userData.userId);

            res.json({ success: true, message: "Password reset successfully! You can now sign in." });
        } catch (error) {
            console.error("❌ Password Reset Error:", error);
            res.status(500).json({ success: false, message: "Server error during password reset." });
        }
    }
);

// ============================================================
// Login (rate limited + CSRF protected)
// ============================================================
router.post(
    "/users/login",
    authLimiter,
    optionalDoubleCsrfProtection,
    async (req: Request, res: Response): Promise<void> => {
        const loginField = sanitizeInput(req.body.loginField, 100);
        const password: string = req.body.password;

        console.log("📝 Login attempt:", { loginField });

        if (!loginField || !password) {
            res.json({ success: false, message: "All fields are required" });
            return;
        }

        try {
            const user = await UserQueries.findByEmailOrUsername(loginField);

            if (!user) {
                const isEmail = loginField.includes("@");
                const fieldType = isEmail ? "email address" : "username";
                res.json({
                    success: false,
                    message: `No account found with this ${fieldType}`,
                });
                return;
            }

            // Check if the user has a password set (local auth vs OAuth only)
            if (!user.password) {
                console.warn(`⚠️ User '${loginField}' has no password set (possibly OAuth only)`);
                res.json({
                    success: false,
                    message: "Invalid credentials. Please sign in using your OAuth provider.",
                });
                return;
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                console.warn(`❌ Login failed for user '${loginField}': Invalid password`);
                res.json({ success: false, message: "Invalid credentials" });
                return;
            }

            const { accessToken, refreshToken } = generateTokens({
                userId: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            });
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await SessionQueries.create(user.id, refreshToken, expiresAt);

            console.log("✅ Login successful:", user.id);
            // Attach user to req so the logger can extract firstName, LastName, etc.
            (req as any).user = user;
            await log(`User logged in: ${user.username}`, req, user.id);
            res.json({
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                },
                tokens: { accessToken, refreshToken, expiresIn: 900 },
            });
        } catch (error: any) {
            console.error("❌ Login error:", error);
            res.status(500).json({ 
                success: false, 
                message: "Internal server error during login",
                error: process.env.NODE_ENV !== "production" ? error.message : undefined 
            });
        }
    }
);

// ============================================================
// Token Refresh (rate limited)
// ============================================================
router.post(
    "/auth/refresh",
    authLimiter,
    async (req: Request, res: Response): Promise<void> => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(401).json({ success: false, message: "Refresh token required" });
            return;
        }

        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
                userId: number;
            };

            const session = await SessionQueries.findActiveByToken(refreshToken);

            if (!session) {
                res.status(403).json({
                    success: false,
                    message: "Invalid or expired refresh token",
                });
                return;
            }

            const user = await UserQueries.findById(decoded.userId);
            if (!user) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }

            const { accessToken, refreshToken: newRefreshToken } = generateTokens({
                userId: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            });
            const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await SessionQueries.rotateToken(refreshToken, newRefreshToken, newExpiresAt);

            res.json({
                success: true,
                tokens: { accessToken, refreshToken: newRefreshToken, expiresIn: 900 },
            });
        } catch (error) {
            console.error("❌ Token refresh error:", error);
            res.status(403).json({ success: false, message: "Invalid refresh token" });
        }
    }
);

// ============================================================
// Logout (authenticated)
// ============================================================
router.post(
    "/auth/logout",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        const userId = (req as any).user?.userId;
        const { refreshToken } = req.body;

        console.log("🔐 Logout request for user:", userId);

        try {
            if (refreshToken) {
                await SessionQueries.invalidate(userId, refreshToken);
                console.log("✅ Session invalidated for user:", userId);
            } else {
                await SessionQueries.invalidateAll(userId);
                console.log("✅ All sessions invalidated for user:", userId);
            }
            log("User logged out", req, userId);
        } catch (error) {
            console.error("❌ Logout error:", error);
        }

        res.json({ success: true, message: "Logged out successfully" });
    }
);

// ============================================================
// Get Current User Info (authenticated)
// ============================================================
router.get(
    "/auth/me",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }
            const user = await UserQueries.getProfile(userId);

            if (!user) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }

            res.json({ success: true, user });
        } catch (error) {
            console.error("❌ Get profile error:", error);
            res.status(500).json({ success: false, message: "Database error" });
        }
    }
);

export default router;

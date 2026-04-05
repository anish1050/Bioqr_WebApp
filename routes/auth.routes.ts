import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sanitizeInput } from "../helpers/sanitize.js";
import { generateTokens, JWT_REFRESH_SECRET } from "../helpers/tokens.js";
import { authenticateToken } from "../helpers/auth.js";
import { authLimiter } from "../helpers/rateLimiters.js";
import { optionalDoubleCsrfProtection } from "../helpers/csrf.js";
import { UserQueries, SessionQueries, OtpQueries, BioSealQueries, OrganisationQueries, TeamQueries, execute } from "../helpers/queries.js";
import type { UserType } from "../helpers/queries.js";
import { log } from "../helpers/logger.js";
import { sendVerificationOtp } from "../helpers/email.js";
import { createBioSeal, generateTemplateHash } from "../helpers/bioseal.js";
import { generateUniqueUserId, generateOrgId, generateTeamId, generateCommunityId, isValidOrgId, isValidTeamId, isValidCommunityId } from "../helpers/uniqueId.js";
import { extractFaceDescriptorFromBase64 } from "../helpers/faceRecognition.js";
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
        const { first_name, last_name, username, email, mobile_number, password,
                user_type, org_unique_id, team_unique_id, org_name, org_description, org_industry, team_name, team_description } = req.body;

        if (!first_name || !last_name || !username || !email || !password) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }

        // Validate user_type
        const validTypes: UserType[] = ['individual', 'org_super_admin', 'org_admin', 'org_member', 'team_lead', 'team_member', 'community_lead', 'community_member'];
        const finalUserType: UserType = validTypes.includes(user_type) ? user_type : 'individual';

        // Validate org/team IDs if joining existing
        if ((finalUserType === 'org_admin' || finalUserType === 'org_member') && !org_unique_id) {
            res.status(400).json({ success: false, message: 'Organisation ID is required to join an organisation' });
            return;
        }
        if (finalUserType === 'community_member' && !team_unique_id) {
            res.status(400).json({ success: false, message: 'Community ID is required to join a community' });
            return;
        }
        if (finalUserType === 'org_super_admin' && (!org_name || org_name.trim().length < 2)) {
            res.status(400).json({ success: false, message: 'Organisation name is required (min 2 characters)' });
            return;
        }
        if (finalUserType === 'community_lead' && (!team_name || team_name.trim().length < 2)) {
            res.status(400).json({ success: false, message: 'Community name is required (min 2 characters)' });
            return;
        }

        // Validate that the org/team exists if joining
        if (org_unique_id) {
            const org = await OrganisationQueries.findByOrgUniqueId(org_unique_id);
            if (!org) {
                res.status(400).json({ success: false, message: 'Organisation not found. Please check the Organisation ID.' });
                return;
            }
        }
        if (team_unique_id) {
            const team = await TeamQueries.findByTeamUniqueId(team_unique_id);
            if (!team) {
                res.status(400).json({ success: false, message: 'Team not found. Please check the Team ID.' });
                return;
            }
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
                const existing = duplicates.find(d => d.email === email);
                const existingUsername = duplicates.find(d => d.username === username);

                if (existing) {
                    if (existing.biometric_enrolled) {
                        res.json({ success: false, message: "Email already registered" });
                        return;
                    }
                    // If not enrolled, allow sending OTP to resume
                    console.log(`Resuming registration for ${email} (BioSeal pending)`);
                } else if (existingUsername) {
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
                    user_type: finalUserType,
                    org_unique_id: org_unique_id || null,
                    team_unique_id: team_unique_id || null,
                    org_name: org_name || null,
                    org_description: org_description || null,
                    org_industry: org_industry || null,
                    team_name: team_name || null,
                    team_description: team_description || null
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

            // Handle both new registration and resumption
            const reqUserData = JSON.parse(record.user_data);
            let userId: number;
            let userData: any;
            let uniqueUserId: string;

            const existingUser = await UserQueries.findByEmail(email);

            if (existingUser) {
                userId = existingUser.id;
                userData = existingUser;
                uniqueUserId = existingUser.unique_user_id || `BQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                
                // Update unique ID if missing
                if (!existingUser.unique_user_id) {
                    await execute("UPDATE users SET unique_user_id = ? WHERE id = ?", [uniqueUserId, userId]);
                }
                console.log(`Resuming account setup for user ID: ${userId}`);
            } else {
                userId = await UserQueries.create({
                    first_name: reqUserData.first_name,
                    last_name: reqUserData.last_name,
                    username: reqUserData.username,
                    email: reqUserData.email,
                    password: reqUserData.password,
                    mobile_number: reqUserData.mobile_number,
                    user_type: reqUserData.user_type,
                    unique_user_id: `BQ-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
                });

                const createdUser = await UserQueries.findById(userId);
                if (!createdUser) throw new Error("Failed to retrieve created user");
                userData = createdUser;
                uniqueUserId = createdUser.unique_user_id!;
            }

            // Handle org/team creation or joining
            let orgUniqueId = null;
            let teamUniqueId = null;

            if (userData.user_type === 'org_super_admin' && reqUserData.org_name) {
                // Create organisation
                const newOrgUniqueId = generateOrgId();
                const orgId = await OrganisationQueries.create({
                    org_unique_id: newOrgUniqueId,
                    name: reqUserData.org_name,
                    description: reqUserData.org_description || undefined,
                    industry: reqUserData.org_industry || undefined,
                    created_by: userId
                });
                await UserQueries.setOrgId(userId, orgId);
                orgUniqueId = newOrgUniqueId;
                console.log(`🏢 Organisation created: ${reqUserData.org_name} (${newOrgUniqueId})`);
            } else if ((userData.user_type === 'org_admin' || userData.user_type === 'org_member') && reqUserData.org_unique_id) {
                // Join existing organisation
                const org = await OrganisationQueries.findByOrgUniqueId(reqUserData.org_unique_id);
                if (org) {
                    await UserQueries.setOrgId(userId, org.id);
                    orgUniqueId = org.org_unique_id;
                }
            }

            if (userData.user_type === 'community_lead' && reqUserData.team_name) {
                // Create standalone community
                const newTeamUniqueId = generateCommunityId();
                const teamId = await TeamQueries.create({
                    team_unique_id: newTeamUniqueId,
                    name: reqUserData.team_name,
                    description: reqUserData.team_description || undefined,
                    created_by: userId
                });
                await UserQueries.setTeamId(userId, teamId);
                teamUniqueId = newTeamUniqueId;
                console.log(`💚 Community created: ${reqUserData.team_name} (${newTeamUniqueId})`);
            } else if (userData.user_type === 'community_member' && reqUserData.team_unique_id) {
                // Join existing team
                const team = await TeamQueries.findByTeamUniqueId(reqUserData.team_unique_id);
                if (team) {
                    await UserQueries.setTeamId(userId, team.id);
                    teamUniqueId = team.team_unique_id;
                }
            }

            await OtpQueries.delete(record.id);
            await UserQueries.verifyEmail(userId, true);

            const { accessToken, refreshToken } = generateTokens({
                userId: userId,
                username: userData.username,
                email: userData.email,
                firstName: userData.first_name,
                lastName: userData.last_name,
                userType: userData.user_type,
                uniqueUserId: uniqueUserId || undefined,
                orgUniqueId: orgUniqueId || undefined,
                teamUniqueId: teamUniqueId || undefined
            });
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionQueries.create(userId, refreshToken, expiresAt);

            (req as any).user = userData;
            await log(`User registered: ${userData.username} (${uniqueUserId}) as ${userData.user_type || 'individual'}`, req, userId);

            const expiresInSec = 365 * 24 * 60 * 60; // 1 year
            res.cookie("accessToken", accessToken, {
                maxAge: expiresInSec * 1000,
                httpOnly: false, // Set to false since user mentioned "application storage like deviceId"
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
            });

            res.json({ 
                success: true, 
                message: "Email verified! Account created. Please enroll your biometric to complete setup.",
                user_id: userId,
                unique_user_id: uniqueUserId,
                orgUniqueId: orgUniqueId || undefined,
                org_id: userData.org_id || undefined,
                teamUniqueId: teamUniqueId || undefined,
                team_id: userData.team_id || undefined,
                user_type: reqUserData.user_type || 'individual',
                tokens: { accessToken, refreshToken, expiresIn: expiresInSec }
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
                lastName: user.last_name,
                userType: user.user_type,
                uniqueUserId: user.unique_user_id || undefined,
                orgUniqueId: user.org_unique_id || undefined,
                teamUniqueId: user.team_unique_id || undefined
            });
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await SessionQueries.create(user.id, refreshToken, expiresAt);

            console.log("✅ Login successful:", user.id);
            // Attach user to req so the logger can extract firstName, LastName, etc.
            (req as any).user = user;
            await log(`User logged in: ${user.username}`, req, user.id);
            const expiresInSec = 365 * 24 * 60 * 60; // 1 year
            res.cookie("accessToken", accessToken, {
                maxAge: expiresInSec * 1000,
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
            });

            // Ensure unique_user_id exists for legacy users
            if (!user.unique_user_id) {
                user.unique_user_id = generateUniqueUserId();
                await UserQueries.setUniqueUserId(user.id, user.unique_user_id);
            }

            res.json({
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_type: user.user_type,
                    unique_user_id: user.unique_user_id,
                    biometric_enrolled: user.biometric_enrolled,
                    avatar_url: user.avatar_url,
                    org_id: user.org_id,
                    org_unique_id: user.org_unique_id,
                    team_id: user.team_id,
                    team_unique_id: user.team_unique_id
                },
                tokens: { accessToken, refreshToken, expiresIn: expiresInSec },
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
                lastName: user.last_name,
                userType: user.user_type,
                uniqueUserId: user.unique_user_id || undefined,
                orgUniqueId: user.org_unique_id || undefined,
                teamUniqueId: user.team_unique_id || undefined
            });
            const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await SessionQueries.rotateToken(refreshToken, newRefreshToken, newExpiresAt);

            const expiresInSec = 365 * 24 * 60 * 60; // 1 year
            res.cookie("accessToken", accessToken, {
                maxAge: expiresInSec * 1000,
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
            });

            res.json({
                success: true,
                tokens: { accessToken, refreshToken: newRefreshToken, expiresIn: expiresInSec },
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
            res.clearCookie("accessToken", { path: "/" });
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
            const user = await UserQueries.findById(userId);

            if (!user) {
                res.status(404).json({ success: false, message: "User not found" });
                return;
            }

            res.json({ 
                success: true, 
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_type: user.user_type,
                    unique_user_id: user.unique_user_id,
                    biometric_enrolled: user.biometric_enrolled,
                    email_verified: user.email_verified,
                    org_id: user.org_id,
                    team_id: user.team_id
                } 
            });
        } catch (error) {
            console.error("❌ Get profile error:", error);
            res.status(500).json({ success: false, message: "Database error" });
        }
    }
);

// ============================================================
// Bio-Seal Enrollment (Post-Registration)
// ============================================================
router.post(
    "/users/enroll-bioseal",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user.userId;
            const { descriptorBase64, method = 'face' } = req.body;

            if (!descriptorBase64) {
                 res.status(400).json({ success: false, message: "Biometric descriptor data is required" });
                 return;
            }
            if (method !== 'face') {
                res.status(400).json({ success: false, message: "Currently only 'face' biometrics are supported for BioSeal enrollment" });
                return;
            }

            const user = await UserQueries.findById(userId);
            if (!user) {
                 res.status(404).json({ success: false, message: "User not found" });
                 return;
            }
            if (!user.unique_user_id) {
                 res.status(400).json({ success: false, message: "User does not have a unique ID assigned yet" });
                 return;
            }

            // Extract the descriptor array from Base64
            const descriptorArray = await extractFaceDescriptorFromBase64(descriptorBase64);
            
            if (!descriptorArray) {
                res.status(400).json({ success: false, message: "No face detected in the provided biometric scan. Please try again." });
                return;
            }

            const rawDescriptor = Array.from(descriptorArray);

            // Generate hashes
            const templateHash = generateTemplateHash(rawDescriptor);
            
            // Create Bio-Seal
            const sealedTemplate = createBioSeal(rawDescriptor, 'face', user.unique_user_id);

            // Upsert in DB
            await BioSealQueries.upsert(userId, 'face', sealedTemplate, templateHash);
            
            // Update user status
            await UserQueries.updateBiometricStatus(userId, true);

            console.log(`🔐 Bio-Seal enrolled successfully for user ${userId} (${user.unique_user_id})`);

            res.json({ 
                success: true, 
                message: "Biometric enrollment successful! Your device is now secured with Bio-Seal." 
            });
        } catch (error: any) {
            console.error("❌ Bio-Seal Enrollment Error:", error);
            res.status(500).json({ success: false, message: error.message || "Failed to enroll biometric" });
        }
    }
);

// ============================================================
// Lookup User by Unique ID (Used for assigning receiver to QR)
// ============================================================
router.post(
    "/users/lookup",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        const { unique_user_id } = req.body;

        if (!unique_user_id) {
            res.status(400).json({ success: false, message: "Unique ID is required" });
            return;
        }

        try {
            const user = await UserQueries.lookupByUniqueId(unique_user_id);
            
            if (!user) {
                res.status(404).json({ success: false, message: "User not found with that ID" });
                return;
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_type: user.user_type,
                    biometric_enrolled: user.biometric_enrolled
                }
            });
        } catch (error) {
            console.error("❌ User lookup error:", error);
            res.status(500).json({ success: false, message: "Failed to look up user" });
        }
    }
);

export default router;

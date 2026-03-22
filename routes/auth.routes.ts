import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sanitizeInput } from "../helpers/sanitize.js";
import { generateTokens, JWT_REFRESH_SECRET } from "../helpers/tokens.js";
import { authenticateToken } from "../helpers/auth.js";
import { authLimiter } from "../helpers/rateLimiters.js";
import { optionalDoubleCsrfProtection } from "../helpers/csrf.js";
import { UserQueries, SessionQueries } from "../helpers/queries.js";

const router = Router();

// ============================================================
// Registration (rate limited + CSRF protected)
// ============================================================
router.post(
    "/users/register",
    authLimiter,
    optionalDoubleCsrfProtection,
    async (req: Request, res: Response): Promise<void> => {
        const first_name = sanitizeInput(req.body.first_name, 50);
        const last_name = sanitizeInput(req.body.last_name, 50);
        const username = sanitizeInput(req.body.username, 20);
        const email = sanitizeInput(req.body.email, 100);
        const password: string = req.body.password;

        console.log("📝 Registration attempt:", { first_name, last_name, username, email });

        if (!first_name || !last_name || !username || !email || !password) {
            res.json({ success: false, message: "All fields are required" });
            return;
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            res.json({
                success: false,
                message: "Username must be 3-20 characters, letters, numbers, and underscores only",
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.json({ success: false, message: "Invalid email format" });
            return;
        }

        try {
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

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = await UserQueries.create({
                first_name,
                last_name,
                username,
                email,
                password: hashedPassword,
            });

            console.log("✅ User registered successfully:", userId);
            res.json({
                success: true,
                message: "User registered successfully!",
                user_id: userId,
            });
        } catch (error) {
            console.error("❌ Registration error:", error);
            res.status(500).json({ success: false, message: "Database error" });
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
            const isEmail = loginField.includes("@");
            const user = await UserQueries.findByEmailOrUsername(loginField);

            if (!user) {
                const fieldType = isEmail ? "email address" : "username";
                res.json({
                    success: false,
                    message: `No account found with this ${fieldType}`,
                });
                return;
            }

            const match = await bcrypt.compare(password, user.password!);

            if (!match) {
                res.json({ success: false, message: "Invalid credentials" });
                return;
            }

            const { accessToken, refreshToken } = generateTokens(user.id);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await SessionQueries.create(user.id, refreshToken, expiresAt);

            console.log("✅ Login successful:", user.id);
            res.json({
                success: true,
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                },
                tokens: { accessToken, refreshToken, expiresIn: 900 },
            });
        } catch (error) {
            console.error("❌ Login error:", error);
            res.status(500).json({ success: false, message: "Database error" });
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

            const { accessToken, refreshToken: newRefreshToken } = generateTokens(
                decoded.userId
            );
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

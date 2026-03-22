import { Router, Request, Response, NextFunction } from "express";
import passport from "../helpers/passport.js";
import { generateTokens } from "../helpers/tokens.js";
import { SessionQueries } from "../helpers/queries.js";
import { log } from "../helpers/logger.js";

const router = Router();

// ============================================================
// Google OAuth
// ============================================================
router.get(
    "/google",
    (req: Request, _res: Response, next: NextFunction) => {
        const referer = req.get("Referer");
        const origin = req.headers.origin;
        const host = req.get("host");

        (req as any).session.authSource = referer || origin || "direct";

        const isRegistration =
            referer &&
            (referer.includes("/register.html") || referer.includes("/register"));
        (req as any).session.isOAuthRegistration = isRegistration;

        console.log("🔍 Google OAuth initiation:");
        console.log("  - Referer:", referer);
        console.log("  - Origin:", origin);
        console.log("  - Host:", host);
        console.log("  - AuthSource stored:", (req as any).session.authSource);
        console.log("  - Is Registration:", isRegistration);

        next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
        console.log("🔄 Google OAuth callback received");

        passport.authenticate("google", (err: any, user: any, info: any) => {
            if (err) {
                console.error("❌ Passport authentication error:", err);
                return res.redirect("/login?error=passport_error");
            }
            if (!user) {
                console.error("❌ No user returned from passport");
                return res.redirect("/login?error=no_user");
            }

            (req as any).user = user;
            (req as any).session.wasNewUser = user.isNewUser;
            next();
        })(req, res, next);
    },
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        console.log("🔍 Authenticated user:", { id: user.id, email: user.email });

        const { accessToken, refreshToken } = generateTokens({
            userId: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
        });

        try {
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionQueries.create(user.id, refreshToken, expiresAt);
        } catch (err) {
            console.error("❌ Error storing OAuth session:", err);
            return res.redirect("/login?error=session_failed");
        }

        const isRegistration = (req as any).session.isOAuthRegistration;
        const wasNewUser = (req as any).session.wasNewUser;

        let redirectUrl: string;

        const isDevelopment = process.env.NODE_ENV !== "production";
        const authSource: string = (req as any).session.authSource || "";
        const viteUrl = authSource.match(/(http:\/\/localhost:\d+)/)?.[1] || "http://localhost:5173";
        const baseRedirectUrl = isDevelopment ? viteUrl : "";

        if (isRegistration && wasNewUser) {
            redirectUrl = `${baseRedirectUrl}/login?message=registration_success&provider=google`;
            console.log("✅ Google registration successful - redirecting to login");
            log(`User registered via Google: ${user.username}`, req, user.id);
        } else if (isRegistration && !wasNewUser) {
            redirectUrl = `${baseRedirectUrl}/login?message=user_exists&provider=google`;
            console.log("ℹ️ Google user already exists - redirecting to login");
        } else {

            const userPayload = encodeURIComponent(
                JSON.stringify({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                })
            );

            if (isDevelopment) {
                redirectUrl = `${viteUrl}/dashboard?token=${accessToken}&refresh=${refreshToken}&user=${userPayload}`;
                console.log(`🔨 Development Mode: Redir to Vite dev server at ${viteUrl}`);
            } else {
                redirectUrl = `/dashboard?token=${accessToken}&refresh=${refreshToken}&user=${userPayload}`;
            }
            console.log("✅ Google login successful - redirecting to dashboard");
            log(`User logged in via Google: ${user.username}`, req, user.id);
        }

        console.log(`✅ Final OAuth redirect URL: ${redirectUrl}`);

        delete (req as any).session.authSource;
        delete (req as any).session.isOAuthRegistration;
        delete (req as any).session.wasNewUser;

        res.redirect(redirectUrl);
    }
);

// ============================================================
// GitHub OAuth
// ============================================================
router.get(
    "/github",
    (req: Request, _res: Response, next: NextFunction) => {
        const referer = req.get("Referer");
        const origin = req.headers.origin;
        const host = req.get("host");

        (req as any).session.authSource = referer || origin || "direct";

        const isRegistration =
            referer &&
            (referer.includes("/register.html") || referer.includes("/register"));
        (req as any).session.isOAuthRegistration = isRegistration;

        console.log("🔍 GitHub OAuth initiation:");
        console.log("  - Referer:", referer);
        console.log("  - Origin:", origin);
        console.log("  - Host:", host);
        console.log("  - AuthSource stored:", (req as any).session.authSource);
        console.log("  - Is Registration:", isRegistration);

        next();
    },
    passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
    "/github/callback",
    (req: Request, res: Response, next: NextFunction) => {
        console.log("🔄 GitHub OAuth callback received");

        passport.authenticate("github", (err: any, user: any, info: any) => {
            if (err) {
                console.error("❌ Passport authentication error:", err);
                return res.redirect("/login?error=passport_error");
            }
            if (!user) {
                console.error("❌ No user returned from passport");
                return res.redirect("/login?error=no_user");
            }

            (req as any).user = user;
            (req as any).session.wasNewUser = user.isNewUser;
            next();
        })(req, res, next);
    },
    async (req: Request, res: Response) => {
        const user = (req as any).user;
        console.log("🔍 Authenticated user:", { id: user.id, email: user.email || user.username });

        const { accessToken, refreshToken } = generateTokens({
            userId: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name
        });

        try {
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await SessionQueries.create(user.id, refreshToken, expiresAt);
        } catch (err) {
            console.error("❌ Error storing OAuth session:", err);
            return res.redirect("/login?error=session_failed");
        }

        const isRegistration = (req as any).session.isOAuthRegistration;
        const wasNewUser = (req as any).session.wasNewUser;

        let redirectUrl: string;

        const isDevelopment = process.env.NODE_ENV !== "production";
        const authSource: string = (req as any).session.authSource || "";
        const viteUrl = authSource.match(/(http:\/\/localhost:\d+)/)?.[1] || "http://localhost:5173";
        const baseRedirectUrl = isDevelopment ? viteUrl : "";

        if (isRegistration && wasNewUser) {
            redirectUrl = `${baseRedirectUrl}/login?message=registration_success&provider=github`;
            console.log("✅ GitHub registration successful - redirecting to login");
            log(`User registered via GitHub: ${user.username}`, req, user.id);
        } else if (isRegistration && !wasNewUser) {
            redirectUrl = `${baseRedirectUrl}/login?message=user_exists&provider=github`;
            console.log("ℹ️ GitHub user already exists - redirecting to login");
        } else {

            const userPayload = encodeURIComponent(
                JSON.stringify({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    avatar_url: user.avatar_url,
                })
            );

            if (isDevelopment) {
                redirectUrl = `${viteUrl}/dashboard?token=${accessToken}&refresh=${refreshToken}&user=${userPayload}`;
                console.log(`🔨 Development Mode: Redir to Vite dev server at ${viteUrl}`);
            } else {
                redirectUrl = `/dashboard?token=${accessToken}&refresh=${refreshToken}&user=${userPayload}`;
            }
            console.log("✅ GitHub login successful - redirecting to dashboard");
            log(`User logged in via GitHub: ${user.username}`, req, user.id);
        }

        console.log(`✅ Final OAuth redirect URL: ${redirectUrl}`);

        delete (req as any).session.authSource;
        delete (req as any).session.isOAuthRegistration;
        delete (req as any).session.wasNewUser;

        res.redirect(redirectUrl);
    }
);

export default router;

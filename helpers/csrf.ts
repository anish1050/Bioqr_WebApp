import { doubleCsrf } from "csrf-csrf";
import { Request, Response, NextFunction } from "express"; // Added Response, NextFunction
import dotenv from "dotenv";

dotenv.config();

const CSRF_SECRET: string =
    process.env.CSRF_SECRET || "your-csrf-secret-change-in-production";

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => CSRF_SECRET,
    // Static identifier — our app uses JWT auth, not session-based auth.
    // The CSRF secret + double-submit cookie already prevents cross-site forgery.
    getSessionIdentifier: () => "bioqr-csrf",
    cookieName: "__csrf",
    cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    },
    size: 64,
    getCsrfTokenFromRequest: (req: Request) =>
        req.headers["x-csrf-token"] as string,
});

/**
 * Custom middleware that bypasses CSRF protection if the request comes from
 * the Android app (identified by a specific header or User-Agent).
 */
export const optionalDoubleCsrfProtection = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const clientType = req.headers["x-client-type"];
    const userAgent = req.headers["user-agent"] || "";

    // Debug logging to help identify why requests might be failing
    console.log(`🛡️ [CSRF CHECK] URL: ${req.url}, Method: ${req.method}`);
    console.log(`📡 [CSRF HEADERS] x-client-type: ${clientType}, user-agent: ${userAgent}`);

    if (clientType === "android" || userAgent.toLowerCase().includes("okhttp")) {
        console.log(`✅ [CSRF BYPASS] Mobile client detected, bypassing CSRF check.`);
        return next();
    }

    doubleCsrfProtection(req, res, next);
};

export { generateCsrfToken, doubleCsrfProtection, CSRF_SECRET };

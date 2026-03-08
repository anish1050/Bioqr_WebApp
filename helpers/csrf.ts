import { doubleCsrf } from "csrf-csrf";
import { Request } from "express";
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

export { generateCsrfToken, doubleCsrfProtection, CSRF_SECRET };

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./tokens.js";

// Augment Passport's User type to include our JWT payload
declare global {
    namespace Express {
        interface User {
            userId: number;
        }
    }
}

/**
 * JWT authentication middleware.
 * Verifies the Bearer token from the Authorization header.
 */
export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ success: false, message: "Access token required" });
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log("❌ JWT verification failed:", err.message);
            res.status(403).json({ success: false, message: "Invalid or expired token" });
            return;
        }

        req.user = decoded as Express.User;
        next();
    });
};

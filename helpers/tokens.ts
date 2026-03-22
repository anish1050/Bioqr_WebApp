import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const JWT_SECRET: string =
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
export const JWT_REFRESH_SECRET: string =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * User details expected for JWT payload
 */
export interface UserJwtPayload {
    userId: number;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
}

/**
 * Generate access and refresh JWT tokens for a user.
 */
export function generateTokens(user: UserJwtPayload): TokenPair {
    const payload = { 
        userId: user.userId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user.userId }, JWT_REFRESH_SECRET, {
        expiresIn: "7d",
    });
    return { accessToken, refreshToken };
}

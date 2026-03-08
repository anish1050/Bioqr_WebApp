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
 * Generate access and refresh JWT tokens for a user.
 */
export function generateTokens(userId: number): TokenPair {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
        expiresIn: "7d",
    });
    return { accessToken, refreshToken };
}

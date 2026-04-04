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
    userType?: string;
    uniqueUserId?: string;
    orgUniqueId?: string;
    teamUniqueId?: string;
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
        lastName: user.lastName,
        userType: user.userType,
        uniqueUserId: user.uniqueUserId,
        orgUniqueId: user.orgUniqueId,
        teamUniqueId: user.teamUniqueId
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" });
    const refreshToken = jwt.sign({ userId: user.userId }, JWT_REFRESH_SECRET, {
        expiresIn: "400d",
    });
    return { accessToken, refreshToken };
}

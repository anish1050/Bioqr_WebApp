import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const isProd: boolean = process.env.NODE_ENV === "production";

/** Global rate limiter — 100 requests per 15 minutes per IP */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !isProd,
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes.",
    },
});

/** Auth rate limiter — 10 requests per 15 minutes per IP */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !isProd,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes.",
    },
});

/** Upload rate limiter — 20 requests per 15 minutes per IP */
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !isProd,
    message: {
        success: false,
        message: "Too many upload requests, please try again after 15 minutes.",
    },
});

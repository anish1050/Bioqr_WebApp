import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";

// Helpers
import "./helpers/db.js"; // Initialize the DB pool & run migrations on import
import passport from "./helpers/passport.js";
import { globalLimiter } from "./helpers/rateLimiters.js";
import { generateCsrfToken, CSRF_SECRET } from "./helpers/csrf.js";
import { authenticateToken } from "./helpers/auth.js";
import { SessionQueries } from "./helpers/queries.js";
import { initFaceRecognitionModels } from "./helpers/faceRecognition.js";
import { log } from "./helpers/logger.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import filesRoutes from "./routes/files.routes.js";
import qrRoutes from "./routes/qr.routes.js";
import webauthnRoutes from "./routes/webauthn.routes.js";
import faceRoutes from "./routes/face.routes.js";

dotenv.config();

// Load Face Recognition models into Node.js memory
initFaceRecognitionModels();

const app = express();

// 💡 TOP-LEVEL DEBUG LOGGER
app.use((req, res, next) => {
    console.log(`📡 [EXPRESS RECEIVE] ${req.method} ${req.url}`);
    next();
});

// 💡 DEBUG PING ROUTE
app.get("/bioqr/debug-ping", (req, res) => {
    console.log("✅ Received debug ping");
    res.json({ message: "pong", timestamp: new Date().toISOString() });
});

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ limit: "5mb", extended: true }));

// __dirname workaround for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ Created uploads directory");
}

// ============================================================
// Session configuration (must be before passport)
// ============================================================
app.use(
    session({
        secret: process.env.SESSION_SECRET || "your-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ============================================================
// CORS setup
// ============================================================
const prodOrigins: string[] = [
    process.env.ORIGIN_1 || "",
    process.env.ORIGIN_2 || "",
];
const devOrigin: string[] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5174",
];
const allowedOrigins =
    process.env.NODE_ENV === "production" ? prodOrigins : devOrigin;

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log(`❌ CORS blocked origin: ${origin}`);
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

// ============================================================
// Rate Limiting (global)
// ============================================================
app.use(globalLimiter);

// ============================================================
// Cookie Parser + CSRF token endpoint
// ============================================================
app.use(cookieParser(CSRF_SECRET));

app.get("/bioqr/csrf-token", (req: Request, res: Response): void => {
    try {
        const token = generateCsrfToken(req, res);
        res.json({ csrfToken: token });
    } catch (err) {
        console.error("❌ CSRF token generation failed:", err);
        res.status(500).json({ success: false, message: "Failed to generate CSRF token" });
    }
});

// ============================================================
// Request logging middleware
// ============================================================
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// ============================================================
// Mount Routes
// ============================================================
// More specific prefixes first to avoid overlap issues
app.use("/bioqr/auth/webauthn", webauthnRoutes); 
app.use("/bioqr/auth/face", faceRoutes);
app.use("/bioqr/files", filesRoutes);  
app.use("/auth", oauthRoutes);         

// General prefixes
app.use("/bioqr", authRoutes);        
app.use("/bioqr", qrRoutes);           
app.use("", qrRoutes);                 

// Home route for Render health check
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "BioQR API is running" });
});

/**
 * POST /bioqr/log
 * Explicit logging endpoint for external clients (like Android app)
 */
app.post("/bioqr/log", (req: Request, res: Response) => {
    const { activity, userId, platform } = req.body;
    if (!activity) {
        res.status(400).json({ success: false, message: "Activity description required" });
        return;
    }
    log(activity, req, userId, platform);
    res.json({ success: true, message: "Activity logged" });
});

// Add a catch-all 404 logger for handled routes to debug 404s
app.use((req: Request, res: Response) => {
    console.warn(`⚠️  404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.url}`
    });
});

// ============================================================
// Static files
// ============================================================
app.use(
    express.static(path.join(__dirname, "public"), {
        setHeaders: (res, filePath) => {
            if (filePath.includes("dashboard.html") || filePath.includes("login.html")) {
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                res.setHeader("Pragma", "no-cache");
                res.setHeader("Expires", "0");
            }
        },
    })
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ============================================================
// Session validation endpoint
// ============================================================
app.get("/api/validate-session", authenticateToken, (req: Request, res: Response): void => {
    res.json({
        valid: true,
        user: { id: (req as any).user.userId },
    });
});

// ============================================================
// Health check
// ============================================================
app.get("/health", (_req: Request, res: Response): void => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ============================================================
// Serve frontend in production
// ============================================================
if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
        console.log("📂 Serving static files from:", distPath);
        app.use(express.static(distPath));

        app.get(/.*/, (req: Request, res: Response, next: NextFunction) => {
            if (
                req.path.startsWith("/bioqr") ||
                req.path.startsWith("/api") ||
                req.path.startsWith("/auth") ||
                req.path.startsWith("/uploads")
            ) {
                return next();
            }
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
}

// ============================================================
// Cleanup expired sessions (every hour)
// ============================================================
setInterval(async () => {
    try {
        await SessionQueries.cleanup();
        console.log("✅ Expired sessions cleaned up");
    } catch (err) {
        console.error("❌ Error cleaning up sessions:", err);
    }
}, 60 * 60 * 1000);

// ============================================================
// Error handling middleware
// ============================================================
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err.code === "EBADCSRFTOKEN" || err.message?.includes("csrf")) {
        console.error("❌ CSRF token validation failed:", req.method, req.url);
        res.status(403).json({
            success: false,
            message: "Invalid or missing CSRF token. Please refresh the page and try again.",
        });
        return;
    }

    console.error("❌ Unhandled error:", err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? "Internal server error" : err.message,
    });
});

// ============================================================
// Start server
// ============================================================
const PORT: number = parseInt(process.env.PORT || "3000", 10);
const HOST: string = "0.0.0.0"; // Bind to all interfaces for Render

app.listen(PORT, HOST, () => {
    console.log("-----------------------------------------");
    console.log(`🚀 [BIOQR SERVER START]`);
    console.log(`📡 URL: http://${HOST}:${PORT}`);
    console.log(`🎯 PID: ${process.pid}`);
    console.log(`🛠️ Mode: ${process.env.NODE_ENV || "development"}`);
    console.log("-----------------------------------------");
});

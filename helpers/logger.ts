import mongoose from "mongoose";
import dotenv from "dotenv";
import geoip from "geoip-lite";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/BioQR";

// Connect to MongoDB
const isCloud = MONGO_URI.includes("mongodb+srv");
console.log(`🔌 Attempting to connect to ${isCloud ? "MongoDB Atlas" : "local MongoDB"}...`);

let isMongoConnected = false;

mongoose
    .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s
    })
    .then(() => {
        isMongoConnected = true;
        console.log(`✅ MongoDB Connection Established: ${isCloud ? "Cloud Cluster" : "Local Collection"}`);
    })
    .catch((err) => {
        isMongoConnected = false;
        console.error("❌ MongoDB Connection Error:", err.message);
        if (isCloud && err.message.includes("auth")) {
            console.error("💡 Tip: Check your MONGO_URI password in the .env file.");
        }
    });

// Define Log Schema
const LogSchema = new mongoose.Schema({
    userId: { type: String, required: false }, // Store as string (can be MySQL ID)
    activity: { type: String, required: true },
    method: { type: String, required: false },
    url: { type: String, required: false },
    ip: { type: String, required: false },
    platform: { type: String, required: false }, // "web" or "android"
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    username: { type: String, required: false },
    email: { type: String, required: false },
    // Geolocation from Vercel/Render headers
    country: { type: String, required: false },
    city: { type: String, required: false },
    region: { type: String, required: false },
    latitude: { type: String, required: false },
    longitude: { type: String, required: false },
    timezone: { type: String, required: false },
    timestamp: { type: Date, default: Date.now },
});

export const LogModel = mongoose.model("Log", LogSchema, "logs");

/**
 * Helper function to log user activity to MongoDB
 * @param activity Description of the activity
 * @param req Optional Express request object for more details
 * @param userId Optional explicit user ID
 * @param platform Optional explicit platform ("web" | "android")
 */
export async function logActivity(activity: string, req?: any, userId?: string | number, platform?: string) {
    try {
        const user = (req?.user as any) || {};
        const finalUserId = userId || user.id || user.userId || "System/Guest";

        // Extract real IP prioritizing Forwarded headers (crucial when proxied through Vercel to Render)
        const ip = (req?.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || 
                   req?.headers["x-real-ip"] || 
                   req?.ip || 
                   req?.connection?.remoteAddress;
                   
        const detectedPlatform = platform || req?.headers["x-platform"] || req?.headers["x-client-type"] || "web";

        // De-serialize user info if available
        const firstName = user.first_name || user.firstName || req?.body?.firstName;
        const lastName = user.last_name || user.lastName || req?.body?.lastName;
        const username = user.username || req?.body?.username;
        const email = user.email || req?.body?.email;

        // Geolocation Fallback using geoip-lite
        const geo = ip && ip !== "::1" && ip !== "127.0.0.1" && !ip.startsWith("10.") && !ip.startsWith("192.168.") ? geoip.lookup(ip) : null;

        if (!isMongoConnected) {
            console.log(`📝 [${detectedPlatform}] Skip MongoDB: ${activity} - User: ${username || finalUserId}`);
            return;
        }

        // Vercel provided headers are lowercase in Express
        const h = req?.headers || {};
        const isDev = process.env.NODE_ENV !== "production";
        const defaultLoc = isDev ? "Testing on dev server" : "Unknown";

        const country = h["x-vercel-ip-country"] || h["x-render-ip-country"] || h["cf-ipcountry"] || geo?.country || defaultLoc;
        const city = h["x-vercel-ip-city"] || h["x-vercel-city"] || h["x-render-ip-city"] || geo?.city || defaultLoc;
        const region = h["x-vercel-ip-country-region"] || h["x-vercel-region"] || h["x-render-ip-region"] || geo?.region || defaultLoc;

        const logEntry = new LogModel({
            userId: finalUserId.toString(),
            activity,
            method: req?.method,
            url: req?.originalUrl || req?.url,
            ip,
            platform: detectedPlatform,
            firstName,
            lastName,
            username,
            email,
            country,
            city: city !== defaultLoc ? (typeof city === "string" ? decodeURIComponent(city as string) : city) : defaultLoc,
            region,
            latitude: h["x-vercel-ip-latitude"] || (geo?.ll ? geo.ll[0].toString() : defaultLoc),
            longitude: h["x-vercel-ip-longitude"] || (geo?.ll ? geo.ll[1].toString() : defaultLoc),
            timezone: h["x-vercel-ip-timezone"] || geo?.timezone || defaultLoc,
        });

        await logEntry.save();
        console.log(`📝 [${detectedPlatform}] Activity Logged: ${activity} - User: ${username || finalUserId} - Loc: ${city}, ${country}`);
    } catch (err) {
        console.error("❌ Error saving activity log:", err);
    }
}

/**
 * Helper to resolve city/country for an IP from historical logs
 */
export async function getLocationFromIp(ip: string): Promise<{ city: string, country: string } | null> {
    const defaultLoc = process.env.NODE_ENV !== "production" ? "Testing on dev server" : "Unknown";
    try {
        const latestWithLocation = await LogModel.findOne({
            ip: ip,
            city: { $ne: "Unknown", $not: /Testing on dev server/ },
            country: { $ne: "Unknown", $not: /Testing on dev server/ }
        }).sort({ timestamp: -1 });

        if (latestWithLocation) {
            return {
                city: latestWithLocation.city || defaultLoc,
                country: latestWithLocation.country || defaultLoc
            };
        }
    } catch (err) {
        console.error("❌ Error fetching location from logs:", err);
    }
    return null;
}

// Export a shorter alias for convenience
export const log = logActivity;

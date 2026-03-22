import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/BioQR";

// Connect to MongoDB
const isCloud = MONGO_URI.includes("mongodb+srv");
console.log(`🔌 Attempting to connect to ${isCloud ? "MongoDB Atlas" : "local MongoDB"}...`);

mongoose
    .connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s
    })
    .then(() => console.log(`✅ MongoDB Connection Established: ${isCloud ? "Cloud Cluster" : "Local Collection"}`))
    .catch((err) => {
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
    timestamp: { type: Date, default: Date.now },
});

const LogModel = mongoose.model("Log", LogSchema, "logs");

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
        
        // Detect platform from headers or explicit parameter
        const detectedPlatform = platform || req?.headers["x-platform"] || req?.headers["x-client-type"] || "web";

        // Collect user details if available
        const firstName = user.first_name || user.firstName || req?.body?.firstName;
        const lastName = user.last_name || user.lastName || req?.body?.lastName;
        const username = user.username || req?.body?.username;
        const email = user.email || req?.body?.email;

        const logEntry = new LogModel({
            userId: finalUserId.toString(),
            activity,
            method: req?.method,
            url: req?.originalUrl || req?.url,
            ip: req?.ip || req?.headers["x-forwarded-for"] || req?.connection.remoteAddress,
            platform: detectedPlatform,
            firstName,
            lastName,
            username,
            email,
        });

        await logEntry.save();
        console.log(`📝 [${detectedPlatform}] Activity Logged: ${activity} - User: ${username || finalUserId}`);
    } catch (err) {
        console.error("❌ Error saving activity log:", err);
    }
}

// Export a shorter alias for convenience
export const log = logActivity;

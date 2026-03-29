import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinaryConfig.js";
import { authenticateToken } from "../helpers/auth.js";
import { uploadLimiter } from "../helpers/rateLimiters.js";
import { upload } from "../helpers/multer.js";
import { FileQueries } from "../helpers/queries.js";
import { log } from "../helpers/logger.js";

const router = Router();

// ============================================================
// Upload file (rate limited + authenticated)
// ============================================================
router.post(
    "/upload",
    uploadLimiter,
    authenticateToken,
    (req: Request, res: Response): void => {
        const userId = (req as any).user?.userId;
        console.log("📁 Upload request received for user:", userId);
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        upload.single("file")(req as any, res as any, async (err: any) => {
            if (err) {
                console.error("❌ Multer middleware error:", err);
                res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
                return;
            }

            const file = (req as any).file;
            const userId = (req as any).user?.userId;

            console.log("📁 Multer result:", { 
                file: file ? { 
                    originalname: file.originalname,
                    path: file.path, 
                    size: file.size 
                } : "missing",
                userId 
            });

            if (!file) {
                res.status(400).json({ success: false, message: "No file uploaded" });
                return;
            }

            let result: any = null;
            try {
                console.log("☁️ Uploading to Cloudinary...");
                result = await cloudinary.uploader.upload(file.path, {
                    resource_type: "auto",
                    original_filename: file.originalname,
                    folder: "bioqr_user_files",
                });
                console.log("✅ Cloudinary upload successful:", result.secure_url);

                console.log("💾 Inserting record into database...");
                const fileId = await FileQueries.create({
                    user_id: userId,
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    filepath: result.secure_url,
                    size: file.size,
                });
                console.log("✅ Database record created, ID:", fileId);

                // Clean up local temp file
                try { 
                    fs.unlinkSync(file.path); 
                    console.log("🧹 Local file cleaned up:", file.path);
                } catch (_e) { 
                    console.warn("⚠️ Local file cleanup failed:", file.path);
                }

                log(`File uploaded: ${file.originalname}`, req, userId);
                res.json({
                    success: true,
                    message: "File uploaded successfully!",
                    file_id: fileId,
                    url: result.secure_url
                });
            } catch (uploadError: any) {
                console.error("❌ THE UPLOAD FAILED AT SOME STEP:", uploadError);
                res.status(500).json({ 
                    success: false, 
                    message: "Upload failed",
                    debug_error: uploadError.message || "Unknown error",
                    step: file ? (result ? "Database Insertion" : "Cloudinary Upload") : "Prep"
                });
            }

        });

    }
);

// ============================================================
// Get all files for a user (authenticated)
// ============================================================
router.get(
    "/:userId",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        const requestedUserId = req.params.userId as string;
        const tokenUserId = (req as any).user?.userId;
        if (!tokenUserId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        if (parseInt(requestedUserId, 10) !== tokenUserId) {
            res.status(403).json({ success: false, message: "Access denied" });
            return;
        }

        try {
            console.log("📁 Fetching files for user:", tokenUserId);
            const rows = await FileQueries.findByUser(tokenUserId);

            const files = rows.map((f) => ({
                id: f.id,
                filename: f.filename,
                mimetype: f.mimetype,
                size: f.size,
                url: f.filepath,
                uploaded_at: f.uploaded_at,
            }));

            console.log("✅ Found files:", files.length);
            res.json({ files });
        } catch (error) {
            console.error("❌ Database error:", error);
            res.status(500).json({ message: "Database error" });
        }
    }
);

// ============================================================
// Delete file (authenticated)
// ============================================================
router.delete(
    "/delete/:id",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        const fileId = req.params.id as string;
    const userId = (req as any).user?.userId;

        console.log(`🗑️ Delete request for file ${fileId} by user ${userId}`);

        try {
            const file = await FileQueries.findByIdAndUser(fileId, userId);

            if (!file) {
                res.status(404).json({ success: false, message: "File not found or access denied" });
                return;
            }

            await FileQueries.deleteByIdAndUser(fileId, userId);

            // Try to delete physical file
            const filePath = path.resolve(file.filepath);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log("✅ Physical file deleted:", filePath);
                } catch (fsErr: any) {
                    console.warn("⚠️ Could not delete physical file:", fsErr.message);
                }
            }

            console.log("✅ File deleted successfully:", fileId);
            log(`File deleted: ${file.filename}`, req, userId);
            res.json({ success: true, message: "File deleted successfully" });
        } catch (error) {
            console.error("❌ Delete error:", error);
            res.status(500).json({ success: false, message: "Failed to delete file" });
        }
    }
);

// ============================================================
// Download file (authenticated)
// ============================================================
router.get(
    "/download/:id",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        const fileId = req.params.id as string;
    const userId = (req as any).user?.userId;

        try {
            const file = await FileQueries.findByIdAndUser(fileId, userId);

            if (!file) {
                res.status(404).send("File not found or access denied");
                return;
            }

            log(`File downloaded: ${file.filename}`, req, userId);
            res.redirect(file.filepath);
        } catch (error) {
            console.error("❌ Download error:", error);
            res.status(500).send("Internal server error");
        }
    }
);

export default router;

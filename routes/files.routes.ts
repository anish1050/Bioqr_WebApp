import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinaryConfig.js";
import { authenticateToken } from "../helpers/auth.js";
import { uploadLimiter } from "../helpers/rateLimiters.js";
import { upload } from "../helpers/multer.js";
import { FileQueries } from "../helpers/queries.js";

const router = Router();

// ============================================================
// Upload file (rate limited + authenticated)
// ============================================================
router.post(
    "/upload",
    uploadLimiter,
    authenticateToken,
    (req: Request, res: Response): void => {
        console.log("📁 Upload request received for user:", req.user!.userId);
        upload.single("file")(req as any, res as any, async (err: any) => {
            if (err) {
                console.error("❌ Multer error:", err);
                res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
                return;
            }

            const userId = req.user!.userId;
            const file = (req as any).file;
            if (!file) {
                res.status(400).json({ success: false, message: "No file uploaded" });
                return;
            }

            try {
                // Upload to Cloudinary
                const result = await cloudinary.uploader.upload(file.path, {
                    resource_type: "auto",
                    original_filename: file.originalname,
                    folder: "bioqr_user_files",
                });

                // Insert into database
                const fileId = await FileQueries.create({
                    user_id: userId,
                    filename: file.originalname,
                    mimetype: file.mimetype,
                    filepath: result.secure_url,
                    size: file.size,
                });

                // Clean up local temp file
                try { fs.unlinkSync(file.path); } catch (_e) { /* ignore */ }

                console.log("✅ File uploaded to Cloudinary:", fileId);
                res.json({
                    success: true,
                    message: "File uploaded successfully!",
                    file_id: fileId,
                });
            } catch (uploadError: any) {
                console.error("❌ Upload failed:", uploadError);
                res.status(500).json({ success: false, message: "Upload failed" });
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
        const tokenUserId = req.user!.userId;

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
        const userId = req.user!.userId;

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
        const userId = req.user!.userId;

        try {
            const file = await FileQueries.findByIdAndUser(fileId, userId);

            if (!file) {
                res.status(404).send("File not found or access denied");
                return;
            }

            res.redirect(file.filepath);
        } catch (error) {
            console.error("❌ Download error:", error);
            res.status(500).send("Internal server error");
        }
    }
);

export default router;

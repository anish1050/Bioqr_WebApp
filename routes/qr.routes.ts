import { Router, Request, Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { authenticateToken } from "../helpers/auth.js";
import { FileQueries, QrTokenQueries } from "../helpers/queries.js";

const router = Router();

// ============================================================
// Generate QR code for a file (authenticated)
// ============================================================
router.post(
    "/generate-qr",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user!.userId;
            const file_id = parseInt(req.body.file_id, 10);
            const duration = Math.min(
                Math.max(parseInt(req.body.duration, 10) || 60, 1),
                1440
            );

            const isOneTime = req.body.is_one_time === true || req.body.is_one_time === "true";

            if (!file_id) {
                res.status(400).json({ error: "file_id is required" });
                return;
            }

            // Verify user owns the file
            const file = await FileQueries.findByIdAndUser(file_id, userId);

            if (!file) {
                res.status(404).json({ error: "File not found or access denied" });
                return;
            }

            const token = crypto.randomBytes(16).toString("hex");
            const expiresAt = new Date(Date.now() + duration * 60 * 1000);

            await QrTokenQueries.create(token, userId, file_id, expiresAt, isOneTime);

            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const qrData = `${baseUrl}/access-file/${token}`;
            const qrImage = await QRCode.toDataURL(qrData);

            console.log("✅ QR code generated for token:", token);
            res.json({ qrImage, token, expiresAt });
        } catch (err) {
            console.error("❌ QR generation error:", err);
            res.status(500).json({ error: "Failed to generate QR" });
        }
    }
);

// ============================================================
// Access file via QR token (public endpoint)
// ============================================================
router.get(
    "/access-file/:token",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const token = req.params.token as string;
            console.log(`🔍 Accessing file with token: ${token}`);

            const qrToken = await QrTokenQueries.findValid(token);
            console.log("Token from DB:", qrToken);

            if (!qrToken) {
                console.log("❌ Invalid or expired QR token.");
                res.status(403).json({ success: false, message: "Invalid or expired QR" });
                return;
            }

            if (qrToken.is_one_time) {
                if (qrToken.is_used) {
                    console.log(`❌ QR Code ${token} has already been used.`);
                    res.status(403).json({ success: false, message: "QR Code has already been used." });
                    return;
                }

                console.log(`✅ Marking QR Code ${token} as used.`);
                // Mark as used before redirecting
                await QrTokenQueries.markAsUsed(qrToken.id);
            }

            const file = await FileQueries.findById(qrToken.file_id);

            if (!file) {
                console.log(`❌ File ${qrToken.file_id} not found.`);
                res.status(404).json({ success: false, message: "File not found" });
                return;
            }

            console.log(`✅ Redirecting to file: ${file.filepath}`);
            // Explicitly set no-cache headers so browsers don't cache the 302 redirect
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            res.setHeader("Surrogate-Control", "no-store");
            res.redirect(302, file.filepath);
        } catch (error) {
            console.error("❌ QR access error:", error);
            res.status(500).json({ success: false, message: "Database error" });
        }
    }
);

export default router;

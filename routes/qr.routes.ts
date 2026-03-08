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
            const isUnshareable = req.body.is_unshareable === true || req.body.is_unshareable === "true";

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

            await QrTokenQueries.create(token, userId, file_id, expiresAt, isOneTime, isUnshareable);

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

            if (qrToken.is_unshareable) {
                // If unshareable, we do not want to redirect directly to the raw file which could just be copied.
                // We fetch the file and stream it as an attachment so it downloads rather than opens in the browser.
                try {
                    const response = await fetch(file.filepath);
                    if (!response.ok) throw new Error("Failed to fetch file from Cloudinary");

                    const buffer = await response.arrayBuffer();

                    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
                    res.setHeader("Pragma", "no-cache");
                    res.setHeader("Expires", "0");
                    res.setHeader("Surrogate-Control", "no-store");
                    const base64Data = Buffer.from(buffer).toString("base64");
                    let contentHtml = "";

                    if (file.mimetype.startsWith("image/")) {
                        contentHtml = `<img src="data:${file.mimetype};base64,${base64Data}" class="protected-content" style="pointer-events: none;" />`;
                    } else if (file.mimetype === "application/pdf") {
                        contentHtml = `
                            <div id="pdf-container" style="width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; box-sizing: border-box; overflow-y: auto;"></div>
                            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
                            <script>
                                const pdfData = atob("${base64Data}");
                                const uint8Array = new Uint8Array(pdfData.length);
                                for (let i = 0; i < pdfData.length; i++) {
                                    uint8Array[i] = pdfData.charCodeAt(i);
                                }
                                var pdfjsLib = window['pdfjs-dist/build/pdf'];
                                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                                
                                pdfjsLib.getDocument({data: uint8Array}).promise.then(function(pdf) {
                                    const container = document.getElementById('pdf-container');
                                    for(let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                        pdf.getPage(pageNum).then(function(page) {
                                            var viewport = page.getViewport({scale: window.innerWidth > 768 ? 1.5 : 1.0});
                                            var canvas = document.createElement('canvas');
                                            var context = canvas.getContext('2d');
                                            canvas.height = viewport.height;
                                            canvas.width = viewport.width;
                                            canvas.className = "protected-content";
                                            canvas.style.pointerEvents = "none";
                                            canvas.style.marginBottom = "15px";
                                            canvas.style.maxWidth = "100%";
                                            canvas.style.height = "auto";
                                            container.appendChild(canvas);
                                            page.render({canvasContext: context, viewport: viewport});
                                        });
                                    }
                                }).catch(function(err) {
                                    document.getElementById('pdf-container').innerHTML = '<p style="color:white; margin-top:20px;">Error rendering PDF.</p>';
                                    console.error(err);
                                });
                            </script>
                        `;
                    } else if (file.mimetype.startsWith("video/")) {
                        contentHtml = `<video src="data:${file.mimetype};base64,${base64Data}" class="protected-content" controls controlsList="nodownload" style="max-height: 90vh; width: 100%; pointer-events: auto;"></video>`;
                    } else {
                        contentHtml = `<p style="color: white; text-align: center; margin-top: 50px;">Cannot securely preview this file type (${file.mimetype}).</p>`;
                    }

                    const html = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Secure View - ${file.filename}</title>
                        <style>
                            body { margin: 0; padding: 0; background: #111; min-height: 100vh; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; overflow-x: hidden; position: relative; }
                            .protected-content { max-width: 100%; filter: contrast(0.9) brightness(0.9); display: block; margin: 0 auto; pointer-events: none; }
                            .watermark {
                                position: fixed; top: 0; left: 0; width: 200vw; height: 200vh;
                                background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 150px);
                                z-index: 9998; pointer-events: none; transform: translate(-25%, -25%);
                            }
                            .watermark-text {
                                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; flex-wrap: wrap; justify-content: space-around; align-items: center; align-content: space-around;
                                z-index: 9998; pointer-events: none; opacity: 0.15; font-family: sans-serif; font-weight: bold; font-size: 24px; color: white; transform: rotate(-30deg) scale(1.5); overflow: hidden;
                            }
                            .warning { position: fixed; bottom: 20px; color: rgba(255,255,255,0.8); font-family: sans-serif; font-weight: bold; font-size: 14px; text-align: center; width: 100%; z-index: 10000; pointer-events: none; text-shadow: 1px 1px 5px rgba(0,0,0,0.8); }
                        </style>
                        <script>
                            document.addEventListener('contextmenu', event => event.preventDefault());
                            document.addEventListener('keydown', event => {
                                if (event.ctrlKey || event.metaKey || event.key === "PrintScreen") event.preventDefault();
                            });
                        </script>
                    </head>
                    <body>
                        <div class="watermark"></div>
                        <div class="watermark-text">
                            ${Array(50).fill('CONFIDENTIAL<br>DO NOT SHARE').join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')}
                        </div>
                        <div class="warning">Secure View - Screen Recording, Screenshots, & Sharing Strictly Prohibited</div>
                        <div style="position: relative; z-index: 1; align-items: center; display: flex; justify-content: center; min-height: 100vh; width: 100vw; pointer-events: auto;">
                            ${contentHtml}
                        </div>
                    </body>
                    </html>
                    `;

                    res.setHeader("Content-Type", "text/html");
                    res.send(html);
                    return;
                } catch (fetchError) {
                    console.error("❌ Error fetching unshareable file:", fetchError);
                    res.status(500).json({ success: false, message: "Error downloading unshareable file" });
                    return;
                }
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

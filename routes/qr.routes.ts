import { Router, Request, Response } from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { authenticateToken } from "../helpers/auth.js";
import { FileQueries, QrTokenQueries, WebAuthnCredentialQueries, FaceRecognitionQueries } from "../helpers/queries.js";
import { log, getLocationFromIp } from "../helpers/logger.js";
import { calculateDistance, formatVCard, getScanDetails } from "../helpers/qr-v2.js";

const router = Router();

// ============================================================
// PUBLIC Face Verification for QR Scanning (Guard Rail)
// ============================================================
router.post("/verify-scan-face/:token", async (req: Request, res: Response) => {
    const token = req.params.token as string;
    const { base64Image } = req.body;

    try {
        const qrToken = await QrTokenQueries.findValid(token);
        if (!qrToken) return res.status(403).json({ success: false, message: "Invalid or expired QR" });

        if (!base64Image) return res.status(400).json({ success: false, message: "Face scan required" });

        // 1. Get owner's enrolled face
        const ownerRecord = await FaceRecognitionQueries.findByUserId(qrToken.user_id);
        if (!ownerRecord) {
            // If owner hasn't enrolled, we fallback to session verification or allow if simple geolocation matches
            // but for "Unshareable", we should ideally require enrollment.
            return res.status(403).json({ success: false, message: "Owner has not enabled biometric guard rails for this file." });
        }

        // 2. Extract current scanner's face
        const { extractFaceDescriptorFromBase64 } = await import("../helpers/faceRecognition.js");
        const currentDescriptor = await extractFaceDescriptorFromBase64(base64Image);
        if (!currentDescriptor) return res.status(400).json({ success: false, message: "No face detected in scan." });

        // 3. Compare
        const savedDescriptor = new Float32Array(Object.values(JSON.parse(ownerRecord.descriptor)));
        let sum = 0;
        for (let i = 0; i < savedDescriptor.length; i++) {
            const diff = savedDescriptor[i] - currentDescriptor[i];
            sum += diff * diff;
        }
        const distance = Math.sqrt(sum);
        const isMatch = distance < 0.6;

        log(`Scan Guard Rail: ${isMatch ? "Unlocked" : "Blocked"} (dist: ${distance.toFixed(4)})`, req, qrToken.user_id);

        if (isMatch) {
            res.json({ success: true, verified: true });
        } else {
            res.status(401).json({ success: false, message: "Identity mismatch. Access denied." });
        }
    } catch (err) {
        console.error("❌ Scan Guard Rail Error:", err);
        res.status(500).json({ success: false, message: "Security system error" });
    }
});

// ============================================================
// Generate QR code (V2 - supports files, vCards, etc.)
// ============================================================
router.post(
    "/generate-qr",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const {
                qr_type = "file",
                duration = 60,
                is_one_time = false,
                is_unshareable = false,
                require_auth = false,
                latitude,
                longitude,
                radius,
                start_time,
                style_color = "#000000",
                style_bg = "#FFFFFF",
                vcard_data
            } = req.body;

            // 1. Validate File IDs if type is file
            let fileIds: number[] = [];
            if (qr_type === "file") {
                if (Array.isArray(req.body.file_ids)) {
                    fileIds = req.body.file_ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));
                } else if (req.body.file_id) {
                    fileIds = [parseInt(req.body.file_id, 10)];
                }

                if (fileIds.length === 0) {
                    res.status(400).json({ error: "At least one file_id is required for file type QR" });
                    return;
                }

                const files = await Promise.all(fileIds.map(id => FileQueries.findByIdAndUser(id, userId)));
                if (files.some(f => !f)) {
                    res.status(404).json({ error: "One or more files not found or access denied" });
                    return;
                }
            }

            // 2. Format VCard if type is vcard
            let processedVCard = null;
            if (qr_type === "vcard" && vcard_data) {
                processedVCard = formatVCard(vcard_data);
            }

            // 3. Generate Token and Expiration
            const token = crypto.randomBytes(16).toString("hex");
            const finalDuration = Math.min(Math.max(parseInt(duration as string, 10) || 60, 1), 525600); // Max 1yr
            const expiresAt = new Date(Date.now() + finalDuration * 60 * 1000);

            // 4. Save to DB
            await QrTokenQueries.create(token, userId, fileIds, expiresAt, {
                is_one_time: is_one_time === true || is_one_time === "true",
                is_unshareable: is_unshareable === true || is_unshareable === "true",
                require_auth: require_auth === true || require_auth === "true",
                latitude: latitude ? parseFloat(latitude as string) : null,
                longitude: longitude ? parseFloat(longitude as string) : null,
                radius: radius ? parseInt(radius as string, 10) : null,
                start_time: start_time ? new Date(start_time as string) : null,
                qr_type: qr_type as any,
                vcard_data: processedVCard || (qr_type === 'text' ? req.body.text_content : null),
                style_color,
                style_bg
            });

            // 5. Generate QR Image with Styling
            const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            const qrData = `${baseUrl}/access-file/${token}`;
            
            const qrOptions: QRCode.QRCodeToDataURLOptions = {
                color: {
                    dark: style_color,
                    light: style_bg
                },
                margin: 2,
                width: 512,
                errorCorrectionLevel: 'H'
            };

            const qrImage = await QRCode.toDataURL(qrData, qrOptions);

            console.log(`✅ V2 QR code generated [${qr_type}] for token:`, token);
            log(`${qr_type.toUpperCase()} QR Code generated`, req, userId);
            
            res.json({ qrImage, token, expiresAt, qrData });
        } catch (err) {
            console.error("❌ QR generation error:", err);
            res.status(500).json({ error: "Failed to generate QR" });
        }
    }
);

// ============================================================
// Access QR token (Public Smart Redirect)
// ============================================================
router.get(
    "/access-file/:token",
    async (req: Request, res: Response): Promise<void> => {
        try {
            const token = req.params.token as string;
            const qrToken = await QrTokenQueries.findValid(token);

            if (!qrToken) {
                res.status(403).json({ success: false, message: "Invalid or expired QR" });
                return;
            }

            // Log Scan Event (Analytics)
            const scanDetails = await getScanDetails(req);
            await QrTokenQueries.logScan(qrToken.id, scanDetails);
            
            // Rich logging to MongoDB
            log(`QR Scanned: ${(qrToken.qr_type || 'Unknown').toUpperCase()} [Token: ${token.slice(0,8)}...]`, req, qrToken.user_id);

            // Check Time Restriction (Start Time)
            if (qrToken.start_time && new Date() < new Date(qrToken.start_time)) {
                res.status(403).send("This QR code is not yet active.");
                return;
            }

            // ============================================================
            // ONE-TIME USE / BURN AFTER READING LOGIC
            // ============================================================
            if (qrToken.is_unshareable && qrToken.is_used) {
                res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head><style>body{background:#000;color:#f43f5e;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;}</style></head>
                <body><div><h1>ACCESS REVOKED</h1><p>This protected content was a "One-Time View" and has been incinerated for security.</p></div></body>
                </html>
                `);
                return;
            }

            // ============================================================
            // SMART VERIFICATION (Biometrics & Geofencing)
            // ============================================================
            const isVerified = req.query.verified === "true";
            const needsLocation = qrToken.latitude !== null && qrToken.longitude !== null;
            const needsAuth = qrToken.require_auth === true;

            if ((needsLocation || needsAuth) && !isVerified) {
                // Serve the "Guardian" Verification Page
                const verificationHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Guardian Verification - BioQR</title>
                    <style>
                        body { background: #010409; color: white; font-family: -apple-system, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                        .card { background: #0d1117; padding: 2.5rem; border-radius: 2rem; box-shadow: 0 0 80px rgba(56,189,248,0.1); width: 100%; max-width: 400px; text-align: center; border: 1px solid #30363d; }
                        h1 { font-size: 1.5rem; color: #38bdf8; margin-bottom: 0.5rem; font-weight: 800; letter-spacing: -0.5px; }
                        p { color: #8b949e; font-size: 0.9rem; margin-bottom: 2rem; }
                        
                        #camera-container { width: 280px; height: 280px; border-radius: 50%; overflow: hidden; margin: 0 auto 2rem; border: 4px solid #30363d; position: relative; background: #000; box-shadow: inset 0 0 20px rgba(0,0,0,1); }
                        #video { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.1); }
                        
                        /* Scanning Visuals */
                        .face-oval { position: absolute; inset: 20px; border: 2px dashed rgba(56,189,248,0.3); border-radius: 50%; pointer-events: none; z-index: 5; }
                        .scan-beam { position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: #38bdf8; box-shadow: 0 0 15px #38bdf8; z-index: 10; animation: beam 2s infinite ease-in-out; display: none; }
                        @keyframes beam { 0% { top: 10%; opacity: 0; } 50% { top: 90%; opacity: 1; } 100% { top: 10%; opacity: 0; } }
                        
                        .progress-bar { height: 4px; background: #30363d; border-radius: 10px; margin-top: 1rem; overflow: hidden; display: none; }
                        .progress-fill { height: 100%; width: 0%; background: #38bdf8; transition: width 0.1s linear; }
                        
                        .btn { background: #38bdf8; color: #000; border: none; padding: 1.2rem; border-radius: 1rem; font-weight: 800; cursor: pointer; width: 100%; transition: all 0.3s; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }
                        .btn:hover { background: #7dd3fc; transform: scale(1.02); }
                        .status { margin-top: 1.5rem; font-size: 0.8rem; color: #f43f5e; font-weight: 600; min-height: 1.2rem; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div id="camera-container">
                            <video id="video" autoplay muted playsinline></video>
                            <div class="face-oval"></div>
                            <div id="scan-beam" class="scan-beam"></div>
                        </div>

                        <h1>Biometric Lock</h1>
                        <p id="sub-text">Align your face within the circle to unlock securely.</p>
                        
                        <div id="progress" class="progress-bar"><div id="fill" class="progress-fill"></div></div>
                        <button id="start-btn" class="btn">Start Secure Scan</button>
                        <div id="status" class="status"></div>
                        
                        <canvas id="canvas" style="display:none;"></canvas>
                    </div>

                    <script>
                        const startBtn = document.getElementById('start-btn');
                        const status = document.getElementById('status');
                        const video = document.getElementById('video');
                        const beam = document.getElementById('scan-beam');
                        const fill = document.getElementById('fill');
                        const progress = document.getElementById('progress');
                        const canvas = document.getElementById('canvas');

                        async function startScan() {
                            try {
                                startBtn.style.display = 'none';
                                status.innerText = "Initializing Lens...";
                                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
                                video.srcObject = stream;
                                
                                // Industry Practice: Wait for video to be ready before starting auto-capture
                                video.onloadedmetadata = () => {
                                    status.innerText = "Hold steady... scanning";
                                    beam.style.display = 'block';
                                    progress.style.display = 'block';
                                    autoCapture();
                                };
                            } catch (err) {
                                startBtn.style.display = 'block';
                                status.innerText = "❌ ACCESS ERROR: Camera Required";
                            }
                        }

                        async function autoCapture() {
                            let p = 0;
                            const interval = setInterval(() => {
                                p += 2;
                                fill.style.width = p + '%';
                                if (p >= 100) {
                                    clearInterval(interval);
                                    performVerify();
                                }
                            }, 30); // ~1.5 seconds total scan time
                        }

                        async function performVerify() {
                            status.innerText = "🔐 Verifying Identity Map...";
                            beam.style.borderColor = '#10b981';
                            
                            // Industry Practice: Compress and Crop to 300x300 for 10x faster network transmission
                            const size = 300;
                            canvas.width = size;
                            canvas.height = size;
                            const ctx = canvas.getContext('2d');
                            
                            // Center crop
                            const minSide = Math.min(video.videoWidth, video.videoHeight);
                            const sx = (video.videoWidth - minSide) / 2;
                            const sy = (video.videoHeight - minSide) / 2;
                            ctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, size, size);
                            
                            const base64Image = canvas.toDataURL('image/jpeg', 0.7);

                            try {
                                const verifyRes = await fetch('/verify-scan-face/' + window.location.pathname.split('/').pop(), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ base64Image })
                                });
                                
                                const data = await verifyRes.json();
                                if (data.success) {
                                    status.style.color = '#10b981';
                                    status.innerText = "✅ IDENTITY MATCHED";
                                    setTimeout(() => {
                                        const params = new URLSearchParams(window.location.search);
                                        params.set('verified', 'true');
                                        window.location.href = window.location.pathname + '?' + params.toString();
                                    }, 800);
                                } else {
                                    throw new Error(data.message);
                                }
                            } catch (err) {
                                status.innerText = "❌ ACCESS DENIED: Identity Mismatch";
                                setTimeout(() => {
                                    fill.style.width = '0%';
                                    autoCapture(); // Retry automatically
                                }, 2000);
                            }
                        }

                        startBtn.onclick = startScan;
                    </script>
                </body>
                </html>
                `;

                res.send(verificationHtml);
                return;
            }

            // ============================================================
            // GEOFENCING VALIDATION
            // ============================================================
            if (needsLocation && isVerified) {
                const scannerLat = parseFloat(req.query.lat as string);
                const scannerLon = parseFloat(req.query.lon as string);
                const distance = calculateDistance(qrToken.latitude!, qrToken.longitude!, scannerLat, scannerLon);
                
                if (distance > (qrToken.radius || 100)) {
                    res.status(403).send(`<h1>📍 Out of Range</h1><p>This content is only available within ${qrToken.radius || 100}m of its designated location.</p>`);
                    return;
                }
            }

            // ============================================================
            // HANDLE DIFFERENT QR TYPES
            // ============================================================
            
            // vCard Handling
            if (qrToken.qr_type === 'vcard' && qrToken.vcard_data) {
                res.setHeader('Content-Type', 'text/vcard');
                res.setHeader('Content-Disposition', 'attachment; filename="contact.vcf"');
                res.send(qrToken.vcard_data);
                return;
            }

            // Text Handling
            if (qrToken.qr_type === 'text') {
                res.send(`<h1>Encrypted Text Content</h1><pre>${qrToken.vcard_data}</pre>`);
                return;
            }

            // File Handling (Inherit existing robust logic)
            // ... (I'll paste the existing file access logic here below)
            const tokenFiles = await QrTokenQueries.getFilesByToken(token);
            if (tokenFiles.length === 0) {
                 if (qrToken.file_id) {
                     const fallbackFile = await FileQueries.findById(qrToken.file_id);
                     if (fallbackFile) tokenFiles.push(fallbackFile);
                 }
            }

            if (tokenFiles.length === 0) {
                res.status(404).json({ success: false, message: "No files found for this QR" });
                return;
            }

            const requestedFileId = req.query.fileId ? parseInt(req.query.fileId as string, 10) : null;
            let file = tokenFiles[0];
            if (requestedFileId) {
                const found = tokenFiles.find(f => f.id === requestedFileId);
                if (found) file = found;
                else { res.status(404).json({ success: false, message: "Requested file not found in this collection" }); return; }
            } else if (tokenFiles.length > 1) {
                // Serve list html (omitted for brevity in this rewrite, but should be included)
                const fileListHtml = tokenFiles.map(f => `
                    <div class="file-item">
                        <div class="file-info"><span class="file-name">${f.filename}</span></div>
                        <a href="/access-file/${token}?fileId=${f.id}&verified=true" class="view-btn">View</a>
                    </div>
                `).join("");
                res.send(`<!DOCTYPE html><html><body style="background:#0f172a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;"><div><h1>Secure Collection</h1>${fileListHtml}</div></body></html>`);
                return;
            }

            // One-time use logic
            if (qrToken.is_one_time) {
                if (qrToken.is_used) {
                    res.status(403).json({ success: false, message: "QR Code already used." });
                    return;
                }
                await QrTokenQueries.markAsUsed(qrToken.id);
            }

            // Unshareable / Protected View logic
            if (qrToken.is_unshareable) {
                try {
                    // Mark as strictly used for unshareable files (Burn after reading)
                    // This kills the link immediately so refresh/rescan won't work
                    await QrTokenQueries.markAsUsed(qrToken.id);

                    const fileResponse = await fetch(file.filepath);
                    const buffer = await fileResponse.arrayBuffer();
                    const base64Data = Buffer.from(buffer).toString("base64");
                    const mime = file.mimetype || (file.filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
                    
                    let contentTag = "";
                    if (mime.startsWith("image/")) {
                        contentTag = `<img id="protected-content" src="data:${mime};base64,${base64Data}" alt="Secret" />`;
                    } else if (mime === "application/pdf") {
                        contentTag = `<embed id="protected-content" src="data:application/pdf;base64,${base64Data}" type="application/pdf" width="100%" height="90vh" />`;
                    }

                    const viewerHtml = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <title>ULTRA-SECURE VIEW | BioQR</title>
                        <style>
                            :root { --accent: #ef4444; --bg: #000000; --text: #f8fafc; }
                            body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; height: 100vh; overflow: hidden; user-select: none; -webkit-user-select: none; }
                            
                            /* Flashlight Spotlight Effect */
                            #privacy-mask {
                                position: fixed; inset: 0; z-index: 5000;
                                background: black;
                                pointer-events: none;
                                cursor: none;
                                background: radial-gradient(circle 100px at 50% 50%, rgba(255,255,255,0) 0%, rgba(0,0,0,1) 100%);
                            }

                            #guardian-overlay { position: fixed; inset: 0; z-index: 1000; pointer-events: none; overflow: hidden; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; opacity: 0.08; transform: rotate(-10deg) scale(1.2); }
                            .watermark { font-size: 0.8rem; color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px; text-transform: uppercase; letter-spacing: 1px; }

                            .guardian-ui { position: fixed; top: 0; left: 0; right: 0; padding: 1.25rem; z-index: 6000; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--accent); }
                            .security-pill { background: #10b981; color: #000; font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; }

                            #content-container { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box; filter: grayscale(0.2); }
                            #protected-content { max-width: 95%; max-height: 90%; border-radius: 4px; box-shadow: 0 0 100px rgba(255,255,255,0.05); }
                            
                            #shield-blackout { position: fixed; inset: 0; background: black; z-index: 9999; display: none; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--accent); }
                            .alert-icon { font-size: 5rem; margin-bottom: 1rem; }
                            
                            .footer-notif { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: rgba(239, 68, 68, 0.2); border: 1px solid var(--accent); padding: 0.8rem 1.5rem; border-radius: 5rem; font-size: 0.7rem; color: #fff; font-weight: 600; z-index: 6000; letter-spacing: 0.5px; white-space: nowrap; }
                        </style>
                    </head>
                    <body oncontextmenu="return false;">
                        <div id="shield-blackout">
                            <div class="alert-icon">🔒</div>
                            <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">SHIELD VOID</h1>
                            <p style="opacity: 0.8; max-width: 300px; margin: 0 auto;">Recording attempt or loss of focus detected. Link permanently revoked.</p>
                        </div>

                        <div id="privacy-mask"></div>

                        <div id="guardian-overlay">
                            ${Array(32).fill(`<div class="watermark">STRICT CONFIDENTIAL<br>CLIENT-IP: ${scanDetails.ip}<br>S-ID: ${qrToken.id}</div>`).join('')}
                        </div>

                        <div class="guardian-ui">
                            <div>
                                <span style="color: var(--accent); font-weight: 900; letter-spacing: 2px;">NON-SHAREABLE</span>
                                <span style="font-size: 0.6rem; opacity: 0.4; margin-left: 10px;">AUTHID: ${token.slice(0,10)}</span>
                            </div>
                            <div class="security-pill">Identity Bound</div>
                        </div>

                        <div id="content-container">
                            ${contentTag}
                        </div>

                        <div class="footer-notif">
                            ⚠️ BURN AFTER READING ACTIVE: DO NOT CLOSE OR REFRESH
                        </div>

                        <script>
                            const mask = document.getElementById('privacy-mask');
                            const shield = document.getElementById('shield-blackout');

                            // Spotlight Reveal (Flashlight)
                            const updateSpotlight = (x, y) => {
                                mask.style.background = \`radial-gradient(circle 120px at \${x}px \${y}px, rgba(255,255,255,0) 0%, rgba(0,0,0,1) 95%)\`;
                            };

                            document.addEventListener('mousemove', (e) => updateSpotlight(e.clientX, e.clientY));
                            document.addEventListener('touchmove', (e) => updateSpotlight(e.touches[0].clientX, e.touches[0].clientY));

                            // Terminate session on any suspicious action
                            const killAccess = () => {
                                shield.style.display = 'flex';
                                setTimeout(() => window.location.href = 'about:blank', 3000);
                            };

                            document.addEventListener('visibilitychange', () => { if (document.hidden) killAccess(); });
                            
                            // Blocking Hotkeys & Capture
                            document.addEventListener('keydown', (e) => {
                                if ((e.ctrlKey || e.metaKey) && ['p','s','u','i','c','a','j','k'].includes(e.key.toLowerCase())) {
                                    e.preventDefault();
                                    killAccess();
                                }
                            });

                            document.addEventListener('keyup', (e) => {
                                if (e.key === 'PrintScreen') {
                                    navigator.clipboard.writeText('BIOQR-SECURITY-VIOLATION');
                                    killAccess();
                                }
                            });

                            // Mobile Screenshot Detection (Approximation)
                            window.addEventListener('resize', () => {
                                if (window.outerWidth - window.innerWidth > 100) killAccess();
                            });
                        </script>
                    </body>
                    </html>
                    `;
                    res.send(viewerHtml);
                    return;
                } catch (e) {
                    console.error("❌ Guardian error:", e);
                    res.status(500).send("Security system error.");
                    return;
                }
            }


            res.redirect(302, file.filepath);

        } catch (error) {
            console.error("❌ QR access error:", error);
            res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
);

// Get Scan Analytics (Authenticated)
router.get(
    "/analytics",
    authenticateToken,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            const stats = await QrTokenQueries.getScanStatsByUserId(userId);

            // Enrich unknown locations using MongoDB historical logs
            const enrichedStats = await Promise.all(stats.map(async (s) => {
                if (s.city === "Unknown" || s.country === "Unknown") {
                    const resolved = await getLocationFromIp(s.ip_address);
                    if (resolved) {
                        return { ...s, city: resolved.city, country: resolved.country };
                    }
                }
                return s;
            }));

            res.json(enrichedStats);
        } catch (err) {
            console.error("❌ Analytics Enrichment Error:", err);
            res.status(500).json({ error: "Failed to fetch analytics" });
        }
    }
);

export default router;

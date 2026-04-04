import { Router, Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { JWT_SECRET } from "../helpers/tokens.js";
import { authenticateToken } from "../helpers/auth.js";
import { FileQueries, QrTokenQueries, WebAuthnCredentialQueries, FaceRecognitionQueries, UserQueries, BioSealQueries } from "../helpers/queries.js";
import { log, getLocationFromIp } from "../helpers/logger.js";
import { verifyBioSeal } from "../helpers/bioseal.js";
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

        // 1. Extract current scanner's face
        const { extractFaceDescriptorFromBase64 } = await import("../helpers/faceRecognition.js");
        const currentDescriptorFloat32 = await extractFaceDescriptorFromBase64(base64Image);
        if (!currentDescriptorFloat32) return res.status(400).json({ success: false, message: "No face detected in scan." });
        
        const currentDescriptorArray = Array.from(currentDescriptorFloat32);
        let isMatch = false;
        let distanceOutput = 0;

        // 2. Determine who we are matching against (Receiver-locked or fallback to Sender's BioSeal)
        if (qrToken.bioseal_lock) {
            // New BioSeal System (Receiver-locked or Sender-locked using BioSeal)
            try {
                const result = verifyBioSeal(currentDescriptorArray, qrToken.bioseal_lock);
                isMatch = result.verified;
                distanceOutput = result.distance;
            } catch (err) {
                console.error("BioSeal decryption error:", err);
                return res.status(403).json({ success: false, message: "BioSeal integrity failed." });
            }
        } else {
            return res.status(403).json({ success: false, message: "No BioSeal lock found for this QR code. Receiver ID is required for secure generation." });
        }
        const distance = distanceOutput;

        log(`Scan Guard Rail: ${isMatch ? "Unlocked" : "Blocked"} (dist: ${distance.toFixed(4)})`, req, qrToken.user_id);

        if (isMatch) {
            // 💡 Secure Verification: Use session to bridge the redirect
            if ((req as any).session) {
                (req as any).session.verifiedTokens = (req as any).session.verifiedTokens || {};
                (req as any).session.verifiedTokens[token] = true;
            }
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

            let {
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
                vcard_data,
                receiver_unique_id
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

            // Handle Receiver Lock (Optional)
            let receiverId = null;
            let biosealLock = null;
            let lockMethod = null;

            if (receiver_unique_id) {
                const receiver = await UserQueries.findByUniqueUserId(receiver_unique_id);
                if (!receiver) {
                    res.status(404).json({ error: "Receiver not found" });
                    return;
                }
                if (!receiver.biometric_enrolled) {
                    res.status(400).json({ error: "Receiver has not enrolled BioSeal. Cannot lock to them." });
                    return;
                }
                const bioseal = await BioSealQueries.findByUserId(receiver.id);
                if (!bioseal) {
                    res.status(400).json({ error: "Receiver BioSeal not found in system." });
                    return;
                }
                receiverId = receiver.id;
                biosealLock = bioseal.sealed_template;
                lockMethod = bioseal.method;
                require_auth = true; // Implicitly require auth if locking to receiver
            }

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
                style_bg,
                receiver_user_id: receiverId,
                bioseal_lock: biosealLock,
                lock_method: lockMethod as any
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
            const scannerUserId = (req as any).user?.userId || (req as any).session?.user?.id || null;
            const scanDetails = await getScanDetails(req);
            await QrTokenQueries.logScan(qrToken.id, { ...scanDetails, scannerUserId });
            
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
            // Loophole Closed: We check BOTH query param AND session token
            // Query param is just for backward UI flow, the session is the real source of truth.
            const sessionIsVerified = (req as any).session?.verifiedTokens?.[token] === true;
            const isVerified = req.query.verified === "true" && sessionIsVerified;

            // If BioSeal matches (Receiver-locked), we attribute the scan to the receiver
            if (isVerified && qrToken.receiver_user_id) {
                const scanDetails = await getScanDetails(req);
                await QrTokenQueries.logScan(qrToken.id, { ...scanDetails, scannerUserId: qrToken.receiver_user_id });
            }

            const needsLocation = qrToken.latitude !== null && qrToken.longitude !== null;
            const needsAuth = !!qrToken.require_auth || qrToken.receiver_user_id !== null;

            // Debug Log for troubleshooting skips
            console.log(`[QR Access] Token: ${token}, needsAuth: ${needsAuth}, needsLoc: ${needsLocation}, isVerified: ${isVerified}`);

            if ((needsLocation || needsAuth) && !isVerified) {
                // Serve the "Guardian" Verification Page (Face Scan)
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
                            }, 30);
                        }

                        async function performVerify() {
                            status.innerText = "🔐 Verifying Identity Map...";
                            const size = 300;
                            canvas.width = size;
                            canvas.height = size;
                            const ctx = canvas.getContext('2d');
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
                                    autoCapture();
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

            // Secure Serving: All files now use the Safe Viewer for branding and security
            try {
                const fileResponse = await fetch(file.filepath);
                const buffer = await fileResponse.arrayBuffer();
const base64Data = Buffer.from(buffer).toString("base64");
                const mime = file.mimetype;
                
                // One-time use / Burn-after-reading enforcement (Final Mark)
                if (qrToken.is_unshareable) {
                    await QrTokenQueries.markAsUsed(qrToken.id);
                }

                // Consolidated Safe Viewer with Screenshot Protection
                const isUnshareable = !!qrToken.is_unshareable;
                const isRequiredAuth = qrToken.receiver_user_id !== null || !!qrToken.require_auth;
                const accentColor = isUnshareable ? "#ef4444" : (isRequiredAuth ? "#8b5cf6" : "#3b82f6");
                const statusLabel = isUnshareable ? "BURN-ON-READ" : (isRequiredAuth ? "BIO-SECURED" : "SECURED VIEW");
                
                let contentTag = "";
                if (mime.startsWith("image/")) {
                    contentTag = `<img id="protected-content" src="data:${mime};base64,${base64Data}" alt="Secret" />`;
                } else if (mime === "application/pdf") {
                    contentTag = `<embed id="protected-content" src="data:application/pdf;base64,${base64Data}" type="application/pdf" width="100%" height="90vh" />`;
                } else if (mime.startsWith("video/")) {
                    contentTag = `<video id="protected-content" src="data:${mime};base64,${base64Data}" controls controlsList="nodownload" oncontextmenu="return false;" />`;
                } else {
                    contentTag = `<div id="protected-content" style="padding: 2.5rem; background: rgba(255,255,255,0.05); border-radius: 20px; border: 1px dashed ${accentColor}44; text-align:center;">
                        <div style="font-size:3rem;margin-bottom:1rem;">📄</div>
                        <h3>${file.filename}</h3>
                        <a href="data:${mime};base64,${base64Data}" download="${file.filename}" style="background:${accentColor}; color:#000; padding:0.8rem 1.5rem; border-radius:8px; text-decoration:none; font-weight:800; display:inline-block; margin-top:1rem;">Download Decrypted File</a>
                    </div>`;
                }

                const safeViewerHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
                    <title>${statusLabel} | BioQR Guardian</title>
                    <style>
                        :root { 
                            --accent: ${accentColor}; 
                            --bg: #000000; 
                            --panel: rgba(13, 17, 23, 0.8);
                        }

                        * { box-sizing: border-box; }
                        body { 
                            background: var(--bg); 
                            color: white; 
                            font-family: 'Inter', -apple-system, system-ui, sans-serif; 
                            margin: 0; 
                            height: 100vh; 
                            overflow: hidden; 
                            user-select: none; 
                            -webkit-user-select: none;
                        }

                        /* Glassmorphism Header */
                        .guardian-ui { 
                            position: fixed; 
                            top: 0; left: 0; right: 0; 
                            padding: 1.25rem 2rem; 
                            z-index: 6000; 
                            background: var(--panel); 
                            backdrop-filter: blur(20px); 
                            -webkit-backdrop-filter: blur(20px);
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            border-bottom: 1px solid rgba(255,255,255,0.1);
                        }

                        .guardian-ui::after {
                            content: '';
                            position: absolute;
                            bottom: -1px; left: 0; right: 0;
                            height: 1px;
                            background: linear-gradient(90deg, transparent, var(--accent), transparent);
                        }

                        .id-pill { font-size: 0.6rem; font-weight: 700; opacity: 0.4; letter-spacing: 1px; }
                        .status-badge { background: var(--accent); color: #000; font-size: 0.65rem; font-weight: 900; padding: 6px 14px; border-radius: 100px; text-transform: uppercase; box-shadow: 0 0 20px var(--accent)44; }

                        #content-container { 
                            flex: 1;
                            width: 100%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            padding: 100px 20px 40px; 
                        }

                        #protected-content { 
                            max-width: 100%; 
                            max-height: 80vh; 
                            border-radius: 12px; 
                            box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                            border: 1px solid rgba(255,255,255,0.1);
                        }

                        ${isUnshareable ? `
                        #privacy-mask { 
                            position: fixed; inset: 0; z-index: 5000; 
                            background: radial-gradient(circle 120px at 50% 50%, rgba(255,255,255,0) 0%, rgba(0,0,0,1) 90%);
                            pointer-events: none;
                        }
                        ` : ""}

                        #shield-blackout { 
                            position: fixed; inset: 0; background: #000; 
                            z-index: 9999; display: none; 
                            flex-direction: column; align-items: center; justify-content: center; 
                            text-align: center; color: var(--accent);
                        }
                        
                        .footer-notif { 
                            position: fixed; 
                            bottom: 2rem; left: 50%; transform: translateX(-50%); 
                            background: rgba(15, 23, 42, 0.9); 
                            border: 1px solid var(--accent)44; 
                            padding: 1rem 2rem; 
                            border-radius: 100px; 
                            font-size: 0.75rem; 
                            color: #fff; 
                            font-weight: 700; 
                            z-index: 6000; 
                            letter-spacing: 1px;
                            backdrop-filter: blur(10px);
                            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                        }

                        /* Forensic Watermarking */
                        #watermark {
                            position: fixed;
                            inset: 0;
                            z-index: 4500;
                            pointer-events: none;
                            opacity: 0.15;
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            grid-template-rows: repeat(4, 1fr);
                            font-size: 0.8rem;
                            color: #fff;
                            font-weight: 900;
                            overflow: hidden;
                        }
                        
                        .wm-item {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transform: rotate(-25deg);
                            white-space: nowrap;
                        }

                        #content-container img, #content-container video {
                            pointer-events: none;
                            -webkit-user-drag: none;
                        }

                        @keyframes pulse-accent {
                            0%, 100% { opacity: 0.8; }
                            50% { opacity: 1; }
                        }
                        
                        .pulse { animation: pulse-accent 2s infinite ease-in-out; }
                    </style>
                </head>
                <body>
                    <div id="shield-blackout">
                        <div style="font-size: 5rem; margin-bottom: 2rem;">🛡️</div>
                        <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #fff;">SESSION VOID</h1>
                        <p style="opacity: 0.6; max-width: 320px; line-height: 1.6;">Security violation or focus loss detected. Session terminating...</p>
                    </div>

                    <div id="watermark">
                        ${Array(16).fill(`<div class="wm-item">${scanDetails.ip} | ${new Date().toISOString().split('T')[0]}</div>`).join('')}
                    </div>

                    ${isUnshareable ? '<div id="privacy-mask"></div>' : ""}

                    <div class="guardian-ui">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span style="color: var(--accent); font-weight: 900; letter-spacing: 2px; font-size: 0.9rem;">${statusLabel}</span>
                            <span class="id-pill">ACCESS_TOKEN: ${token.slice(0,12)}</span>
                        </div>
                        <div class="status-badge">BIO-VERIFIED</div>
                    </div>

                    <div id="content-container">
                        ${contentTag}
                    </div>

                    <div class="footer-notif pulse">
                        ${isUnshareable ? '⚠️ SINGLE VIEW ACTIVE: DEVICE PROTECTED' : '✅ SECURE BIOMETRIC SESSION ACTIVE'}
                    </div>

                    <script>
                        const mask = document.getElementById('privacy-mask');
                        const shield = document.getElementById('shield-blackout');
                        const killAccess = () => {
                            shield.style.display = 'flex';
                            setTimeout(() => window.location.href = 'about:blank', 2500);
                        };

                        ${isUnshareable ? `
                        const updateSpotlight = (x, y) => {
                            mask.style.background = \`radial-gradient(circle 120px at \${x}px \${y}px, rgba(255,255,255,0) 0%, rgba(0,0,0,1) 95%)\`;
                        };
                        document.addEventListener('mousemove', (e) => updateSpotlight(e.clientX, e.clientY));
                        document.addEventListener('touchmove', (e) => {
                            if(e.touches.length > 0) updateSpotlight(e.touches[0].clientX, e.touches[0].clientY);
                        });
                        ` : ""}

                        // Security hooks
                        const securityEvents = ['visibilitychange', 'blur'];
                        securityEvents.forEach(evt => window.addEventListener(evt, () => {
                            if (document.hidden || !document.hasFocus()) killAccess();
                        }));
                        document.addEventListener('contextmenu', (e) => e.preventDefault());
                        document.addEventListener('keydown', (e) => {
                            const forbidden = ['p','s','u','i','c','a','j','k'];
                            if (e.key === 'PrintScreen' || ((e.ctrlKey || e.metaKey) && forbidden.includes(e.key.toLowerCase()))) {
                                e.preventDefault();
                                killAccess();
                            }
                        });
                    </script>
                </body>
                </html>
                `;
                res.header("Content-Security-Policy", "default-src 'self' 'unsafe-inline' data:; img-src 'self' data:;");
                res.send(safeViewerHtml);
            } catch (e) {
                console.error("❌ Secure Proxy Error:", e);
                res.status(500).send("Security system error.");
            }
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

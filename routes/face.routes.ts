import { Router, Request, Response } from "express";
import { FaceRecognitionQueries } from "../helpers/queries.js";
import { authenticateToken } from "../helpers/auth.js";
import { authLimiter } from "../helpers/rateLimiters.js";
import { extractFaceDescriptorFromBase64 } from "../helpers/faceRecognition.js";

const router = Router();

// ============================================================
// Face Recognition Routes
// ============================================================

/**
 * POST /bioqr/auth/face/enroll
 * Save face descriptor for the currently logged-in user.
 */
router.post("/enroll", authenticateToken, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { base64Image } = req.body;

    if (!base64Image) {
        return res.status(400).json({ success: false, message: "No image provided" });
    }

    try {
        const floatDescriptor = await extractFaceDescriptorFromBase64(base64Image);
        if (!floatDescriptor) {
            return res.status(400).json({ success: false, message: "Could not detect a clear face in the provided image." });
        }
        
        await FaceRecognitionQueries.upsert(userId, floatDescriptor);
        res.json({ success: true, message: "Face enrolled successfully" });
    } catch (error) {
        console.error("❌ Face enrollment error:", error);
        res.status(500).json({ success: false, message: "Server error during enrollment" });
    }
});

/**
 * Helper function to calculate Euclidean distance
 */
const calculateEuclideanDistance = (descriptor1: Float32Array, descriptor2: Float32Array) => {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must be of same length');
  }
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * POST /bioqr/auth/face/verify
 * Compare provided descriptor with the one stored in the database.
 */
router.post("/verify", authenticateToken, authLimiter, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.status(400).json({ success: false, message: "No image provided" });
        }

        const storedRecord = await FaceRecognitionQueries.findByUserId(userId);
        if (!storedRecord) {
            return res.status(404).json({ success: false, message: "No face enrolled for this user" });
        }

        const currentDescriptor = await extractFaceDescriptorFromBase64(base64Image);
        if (!currentDescriptor) {
            return res.status(400).json({ success: false, message: "Could not detect a clear face in the provided image." });
        }

        const savedDescriptor = new Float32Array(Object.values(JSON.parse(storedRecord.descriptor)));

        const distance = calculateEuclideanDistance(savedDescriptor, currentDescriptor);
        
        // face-api threshold: smaller distance = better match. Usually 0.6 is threshold
        console.log("Face match distance (Euclidean):", distance);
        const isMatch = distance < 0.6;

        if (isMatch) {
            return res.json({ success: true, verified: true, message: "Face verified successfully", distance });
        } else {
            return res.status(401).json({ success: false, verified: false, message: "Face did not match", distance });
        }
    } catch (error) {
        console.error("❌ Face verification error:", error);
        res.status(500).json({ success: false, message: "Verification failed on server" });
    }
});

/**
 * GET /bioqr/auth/face/status
 * Check if the current user has a face biometric enrolled.
 */
router.get("/status", authenticateToken, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    try {
        const storedRecord = await FaceRecognitionQueries.findByUserId(userId);
        res.json({ success: true, enrolled: !!storedRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to check status" });
    }
});

/**
 * POST /bioqr/auth/face/reset
 * Remove face biometric for the current user.
 */
router.post("/reset", authenticateToken, async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    try {
        await FaceRecognitionQueries.deleteByUserId(userId);
        res.json({ success: true, message: "Face biometric removed" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to reset face biometric" });
    }
});

/**
 * Helper to calculate Cosine Similarity between two Float32Arrays
 */
function calculateSimilarity(d1: Float32Array, d2: Float32Array): number {
    if (d1.length !== d2.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < d1.length; i++) {
        dotProduct += d1[i] * d2[i];
        normA += d1[i] * d1[i];
        normB += d2[i] * d2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default router;

import { Router, Request, Response } from "express";
import {
  generateRegistrationOptionsForUser,
  verifyAndStoreRegistrationResponse,
  generateAuthenticationOptionsForUser,
  verifyAuthenticationResponseForUser,
  RegistrationResponse,
  AuthenticationResponse,
} from "../helpers/webauthn.js";
import { WebAuthnCredentialQueries, UserQueries } from "../helpers/queries.js";
import { authenticateToken } from "../helpers/auth.js";
import { authLimiter } from "../helpers/rateLimiters.js";
import { log } from "../helpers/logger.js";

const router = Router();

// ============================================================
// All routes require authentication
// ============================================================

// POST /bioqr/auth/webauthn/register/start
router.post("/register/start", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }

  try {
    const user = await UserQueries.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { challengeId, options } = await generateRegistrationOptionsForUser(userId, user.username, user.email);
    res.json({ success: true, challengeId, options });
  } catch (error) {
    console.error("❌ WebAuthn registration start error:", error);
    res.status(500).json({ success: false, message: "Failed to start registration" });
  }
});

// POST /bioqr/auth/webauthn/register/complete
router.post("/register/complete", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }
  const { challengeId, registrationResponse } = req.body as {
    challengeId: string;
    registrationResponse: RegistrationResponse;
  };

  if (!challengeId || !registrationResponse) {
    res.status(400).json({ success: false, message: "Missing challengeId or registrationResponse" });
    return;
  }

  try {
    const { credentialId, publicKeyBase64, transports } = await verifyAndStoreRegistrationResponse(
      registrationResponse,
      challengeId
    );

    await WebAuthnCredentialQueries.create(userId, credentialId, publicKeyBase64, 0, transports);
    console.log(`✅ WebAuthn credential registered for user ${userId}: ${credentialId}`);
    log("Biometric passkey registered", req, userId);
    res.json({ success: true, message: "Biometric credential registered successfully" });
  } catch (error: any) {
    console.error("❌ WebAuthn registration complete error:", error);
    res.status(400).json({ success: false, message: error.message || "Registration failed" });
  }
});

// POST /bioqr/auth/webauthn/verify/start
router.post("/verify/start", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }

  try {
    const credentials = await WebAuthnCredentialQueries.findByUserId(userId);
    if (credentials.length === 0) {
      res.status(404).json({
        success: false,
        message: "No biometric credentials enrolled. Please enroll in security settings first.",
      });
      return;
    }

    const credentialIds = credentials.map((c) => ({ credential_id: c.credential_id }));
    const { challengeId, options } = await generateAuthenticationOptionsForUser(userId, credentialIds);
    res.json({ success: true, challengeId, options });
  } catch (error) {
    console.error("❌ WebAuthn verify start error:", error);
    res.status(500).json({ success: false, message: "Failed to start verification" });
  }
});

// POST /bioqr/auth/webauthn/verify/complete
router.post("/verify/complete", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }
  const { challengeId, authenticationResponse } = req.body as {
    challengeId: string;
    authenticationResponse: AuthenticationResponse;
  };

  if (!challengeId || !authenticationResponse) {
    res.status(400).json({ success: false, message: "Missing challengeId or authenticationResponse" });
    return;
  }

  try {
    const credentialId = authenticationResponse.id;
    const credential = await WebAuthnCredentialQueries.findByCredentialId(credentialId);
    if (!credential) {
      console.warn(`❌ Credential not found: ${credentialId}`);
      res.status(404).json({ success: false, message: "Credential not found" });
      return;
    }

    const { newSignCount } = await verifyAuthenticationResponseForUser(
      authenticationResponse,
      challengeId,
      credential.public_key,
      credential.sign_count
    );

    await WebAuthnCredentialQueries.updateSignCount(credentialId, newSignCount);
    console.log(`✅ WebAuthn verification successful for user ${userId}`);
    log("Biometric passkey verified", req, userId);
    res.json({ success: true, verified: true, userId });
  } catch (error: any) {
    console.error("❌ WebAuthn verify complete error:", error);
    res.status(401).json({ success: false, message: error.message || "Verification failed" });
  }
});

// GET /bioqr/auth/webauthn/credentials
router.get("/credentials", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }

  try {
    const credentials = await WebAuthnCredentialQueries.findByUserId(userId);
    const masked = credentials.map((c) => ({
      id: c.id,
      credential_id_last4: c.credential_id.slice(-4),
      transports: JSON.parse(c.transports || "[]"),
      created_at: c.created_at,
    }));

    res.json({ success: true, credentials: masked, count: credentials.length });
  } catch (error) {
    console.error("❌ WebAuthn credentials list error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch credentials" });
  }
});

// DELETE /bioqr/auth/webauthn/credentials/:id
router.delete("/credentials/:id", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: "Unauthorized" });
                return;
            }
  const id = parseInt(req.params.id as string, 10);

  if (isNaN(id)) {
    res.status(400).json({ success: false, message: "Invalid credential ID" });
    return;
  }

  try {
    const result = await WebAuthnCredentialQueries.deleteByIdAndUser(id, userId);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: "Credential not found or access denied" });
      return;
    }
    console.log(`🗑️  WebAuthn credential deleted for user ${userId}, id: ${id}`);
    log(`Biometric passkey deleted (ID: ${id})`, req, userId);
    res.json({ success: true, message: "Credential removed" });
  } catch (error) {
    console.error("❌ WebAuthn credential delete error:", error);
    res.status(500).json({ success: false, message: "Failed to delete credential" });
  }
});

// POST /bioqr/auth/webauthn/reset
router.post("/reset", authenticateToken, authLimiter, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  try {
    await WebAuthnCredentialQueries.deleteAllByUserId(userId);
    console.log(`🗑️  All WebAuthn credentials reset for user ${userId}`);
    log("All biometric passkeys reset", req, userId);
    res.json({ success: true, message: "All biometric credentials removed" });
  } catch (error) {
    console.error("❌ WebAuthn reset error:", error);
    res.status(500).json({ success: false, message: "Failed to reset credentials" });
  }
});

export default router;

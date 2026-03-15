import { Buffer } from "buffer";
import * as uuid from "uuid";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// Configuration
// ============================================================

const RP_ID = process.env.RP_ID || "localhost";
const RP_ORIGIN = process.env.RP_ORIGIN || "http://localhost:5173";

if (!process.env.RP_ID || !process.env.RP_ORIGIN) {
  console.warn("⚠️  RP_ID or RP_ORIGIN not set in .env. Using defaults (localhost).");
}

// ============================================================
// In-Memory Challenge Cache
// ============================================================

interface ChallengeData {
  userId: number;
  challenge: Uint8Array;
  type: "registration" | "authentication";
  expires: Date;
}

const challengeCache = new Map<string, ChallengeData>();

setInterval(() => {
  const now = new Date();
  let cleaned = 0;
  for (const [key, data] of challengeCache.entries()) {
    if (data.expires < now) {
      challengeCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired WebAuthn challenges`);
  }
}, 5 * 60 * 1000);

function generateChallengeId(): string {
  return uuid.v4();
}

function getCachedChallenge(challengeId: string): ChallengeData | undefined {
  const data = challengeCache.get(challengeId);
  if (!data) return undefined;
  if (data.expires < new Date()) {
    challengeCache.delete(challengeId);
    return undefined;
  }
  return data;
}

function storeChallenge(challengeId: string, data: ChallengeData): void {
  challengeCache.set(challengeId, data);
}

function deleteChallenge(challengeId: string): void {
  challengeCache.delete(challengeId);
}

// ============================================================
// Types for WebAuthn responses (simplified)
// ============================================================

export interface RegistrationResponse {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
}

export interface AuthenticationResponse {
  id: string;
  rawId: string;
  type: "public-key";
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
}

// ============================================================
// Registration (Enrollment)
// ============================================================

export async function generateRegistrationOptionsForUser(
  userId: number,
  username: string,
  email: string
): Promise<{ challengeId: string; options: any }> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const userIdBuffer = Buffer.from(userId.toString());

  const options = await generateRegistrationOptions({
    rpID: RP_ID,
    rpName: "BioQR",
    userID: userIdBuffer,
    userName: username,
    userDisplayName: username,
    challenge: challenge,
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257],
  });

  const challengeId = generateChallengeId();
  storeChallenge(challengeId, {
    userId,
    challenge,
    type: "registration",
    expires: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { challengeId, options: { publicKey: options } };
}

export async function verifyAndStoreRegistrationResponse(
  registrationResponse: RegistrationResponse,
  challengeId: string
): Promise<{
  credentialId: string;
  publicKeyBase64: string;
  transports: string[];
  userId: number;
}> {
  const cachedChallenge = getCachedChallenge(challengeId);
  if (!cachedChallenge) {
    throw new Error("Challenge expired or not found");
  }
  if (cachedChallenge.type !== "registration") {
    throw new Error("Invalid challenge type");
  }

  const verification = await verifyRegistrationResponse({
    response: registrationResponse as any,
    expectedChallenge: Buffer.from(cachedChallenge.challenge).toString("base64url"),
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
  });

  const { verified, registrationInfo } = verification;

  if (!verified || !registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credentialID, credentialPublicKey } = registrationInfo;


  deleteChallenge(challengeId);

  return {
    credentialId: Buffer.from(credentialID).toString("base64url"),
    publicKeyBase64: Buffer.from(credentialPublicKey).toString("base64"),
    transports: (registrationResponse.response as any).transports || [],
    userId: cachedChallenge.userId,
  };
}

// ============================================================
// Authentication (Verification for QR Code Generation)
// ============================================================

export async function generateAuthenticationOptionsForUser(
  userId: number,
  existingCredentials: { credential_id: string }[]
): Promise<{ challengeId: string; options: any }> {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const allowCredentials = existingCredentials.map((c) => ({
    id: c.credential_id, // v10 generateAuthenticationOptions expects base64url strings for IDs
    type: "public-key" as const,
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    challenge: challenge,
    timeout: 60000,
    userVerification: "required",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  const challengeId = generateChallengeId();
  storeChallenge(challengeId, {
    userId,
    challenge,
    type: "authentication",
    expires: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { challengeId, options: { publicKey: options } };
}

export async function verifyAuthenticationResponseForUser(
  authenticationResponse: AuthenticationResponse,
  challengeId: string,
  storedPublicKeyBase64: string,
  storedSignCount: number
): Promise<{ newSignCount: number; userId: number }> {
  const cachedChallenge = getCachedChallenge(challengeId);
  if (!cachedChallenge) {
    throw new Error("Challenge expired or not found");
  }
  if (cachedChallenge.type !== "authentication") {
    throw new Error("Invalid challenge type");
  }

  const storedPublicKey = Buffer.from(storedPublicKeyBase64, "base64");
  
  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse as any,
    expectedChallenge: Buffer.from(cachedChallenge.challenge).toString("base64url"),
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: authenticationResponse.id,
      credentialPublicKey: storedPublicKey,
      counter: storedSignCount,
    },
  });

  const { verified, authenticationInfo } = verification;

  if (!verified) {
    throw new Error("Authentication failed: invalid signature or bad sign count");
  }

  deleteChallenge(challengeId);

  // authenticationInfo can be undefined if verification fails but we already checked
  const newSignCount = authenticationInfo?.newCounter ?? storedSignCount + 1;

  return {
    newSignCount,
    userId: cachedChallenge.userId,
  };
}

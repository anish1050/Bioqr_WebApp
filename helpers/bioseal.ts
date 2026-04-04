/**
 * Bio-Seal Cryptographic Engine
 * 
 * Creates and verifies sealed biometric packages:
 * 1. Biometric template (128-dim Float32Array for face)
 * 2. Compressed → Encrypted (AES-256-GCM) → Signed (HMAC-SHA256)
 * 3. Stored as JSON Bio-Seal package
 * 
 * Verification:
 * 1. Verify HMAC signature (tamper check)
 * 2. Decrypt AES-256-GCM → get stored descriptor
 * 3. Compare with live descriptor (Euclidean distance)
 */

import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────

export interface BioSeal {
    version: number;
    method: 'face' | 'fingerprint';
    payload: string;       // AES-256-GCM encrypted template (base64)
    iv: string;            // Initialization vector (base64)
    tag: string;           // GCM auth tag (base64)
    signature: string;     // HMAC-SHA256 of payload (base64)
    created_at: number;    // Unix timestamp
    user_id_hash: string;  // SHA-256 hash of receiver's unique_user_id
}

export interface BioSealVerificationResult {
    verified: boolean;
    distance: number;
    method: 'face' | 'fingerprint';
    timestamp: number;
}

// ─── Configuration ────────────────────────────────────────────

const FACE_MATCH_THRESHOLD = 0.6;  // Euclidean distance threshold for face matching
const BIOSEAL_VERSION = 1;

function getEncryptionKey(): Buffer {
    const key = process.env.BIOSEAL_ENCRYPTION_KEY;
    if (!key) {
        // Auto-generate a key for development if not set
        console.warn('⚠️  BIOSEAL_ENCRYPTION_KEY not set in .env — using derived key from JWT_SECRET');
        const jwtSecret = process.env.JWT_SECRET || 'bioqr-default-secret-key';
        return crypto.createHash('sha256').update(jwtSecret + '-bioseal-enc').digest();
    }
    return Buffer.from(key, 'hex');
}

function getSigningKey(): Buffer {
    const key = process.env.BIOSEAL_SIGNING_KEY;
    if (!key) {
        console.warn('⚠️  BIOSEAL_SIGNING_KEY not set in .env — using derived key from JWT_SECRET');
        const jwtSecret = process.env.JWT_SECRET || 'bioqr-default-secret-key';
        return crypto.createHash('sha256').update(jwtSecret + '-bioseal-sig').digest();
    }
    return Buffer.from(key, 'hex');
}

// ─── Core Functions ───────────────────────────────────────────

/**
 * Compress a Float32Array descriptor to a Buffer
 * Uses raw binary encoding (4 bytes per float, little-endian)
 */
function compressDescriptor(descriptor: number[]): Buffer {
    const float32 = new Float32Array(descriptor);
    return Buffer.from(float32.buffer);
}

/**
 * Decompress a Buffer back to a number array
 */
function decompressDescriptor(buffer: Buffer): number[] {
    const float32 = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(float32);
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(plaintext: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return { ciphertext: encrypted, iv, tag };
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
function decrypt(ciphertext: Buffer, iv: Buffer, tag: Buffer): Buffer {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Sign data with HMAC-SHA256
 */
function sign(data: string): string {
    const key = getSigningKey();
    return crypto.createHmac('sha256', key).update(data).digest('base64');
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(data: string, signature: string): boolean {
    const expected = sign(data);
    return crypto.timingSafeEqual(
        Buffer.from(expected, 'base64'),
        Buffer.from(signature, 'base64')
    );
}

/**
 * Calculate Euclidean distance between two descriptors
 */
function euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
    }
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Hash a user ID for embedding in the Bio-Seal
 */
function hashUserId(uniqueUserId: string): string {
    return crypto.createHash('sha256').update(uniqueUserId).digest('hex');
}

/**
 * Generate a SHA-256 hash of the raw template for quick DB lookups
 */
function hashTemplate(descriptor: number[]): string {
    const buffer = compressDescriptor(descriptor);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Create a Bio-Seal package from a biometric descriptor
 * 
 * @param descriptor - 128-dim float array from face-api.js
 * @param method - 'face' or 'fingerprint'
 * @param uniqueUserId - The user's unique BQ-XXXXXXXX ID
 * @returns Sealed Bio-Seal package as JSON string
 */
export function createBioSeal(
    descriptor: number[],
    method: 'face' | 'fingerprint',
    uniqueUserId: string
): string {
    // 1. Compress descriptor to binary
    const compressed = compressDescriptor(descriptor);

    // 2. Encrypt with AES-256-GCM
    const { ciphertext, iv, tag } = encrypt(compressed);

    // 3. Create payload
    const payload = ciphertext.toString('base64');

    // 4. Sign the payload with HMAC-SHA256
    const signature = sign(payload);

    // 5. Build Bio-Seal package
    const bioSeal: BioSeal = {
        version: BIOSEAL_VERSION,
        method,
        payload,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        signature,
        created_at: Date.now(),
        user_id_hash: hashUserId(uniqueUserId),
    };

    return JSON.stringify(bioSeal);
}

/**
 * Verify a live biometric scan against a stored Bio-Seal
 * 
 * @param liveDescriptor - descriptor extracted from live scan
 * @param sealedJson - stored Bio-Seal JSON string
 * @returns Verification result with distance and match status
 */
export function verifyBioSeal(
    liveDescriptor: number[],
    sealedJson: string
): BioSealVerificationResult {
    const seal: BioSeal = JSON.parse(sealedJson);

    // 1. Verify HMAC signature (tamper detection)
    if (!verifySignature(seal.payload, seal.signature)) {
        throw new Error('Bio-Seal signature verification failed — template may be tampered');
    }

    // 2. Decrypt the stored template
    const ciphertext = Buffer.from(seal.payload, 'base64');
    const iv = Buffer.from(seal.iv, 'base64');
    const tag = Buffer.from(seal.tag, 'base64');
    const decrypted = decrypt(ciphertext, iv, tag);

    // 3. Decompress to descriptor array
    const storedDescriptor = decompressDescriptor(decrypted);

    // 4. Calculate Euclidean distance
    const distance = euclideanDistance(liveDescriptor, storedDescriptor);

    // 5. Determine match
    const verified = distance < FACE_MATCH_THRESHOLD;

    return {
        verified,
        distance,
        method: seal.method,
        timestamp: Date.now(),
    };
}

/**
 * Extract the stored descriptor from a Bio-Seal (for server-side comparison)
 * Used internally when we need the raw descriptor
 */
export function extractDescriptorFromSeal(sealedJson: string): number[] {
    const seal: BioSeal = JSON.parse(sealedJson);

    // Verify signature first
    if (!verifySignature(seal.payload, seal.signature)) {
        throw new Error('Bio-Seal integrity check failed');
    }

    // Decrypt
    const ciphertext = Buffer.from(seal.payload, 'base64');
    const iv = Buffer.from(seal.iv, 'base64');
    const tag = Buffer.from(seal.tag, 'base64');
    const decrypted = decrypt(ciphertext, iv, tag);

    return decompressDescriptor(decrypted);
}

/**
 * Generate a template hash for database storage
 */
export function generateTemplateHash(descriptor: number[]): string {
    return hashTemplate(descriptor);
}

/**
 * Get the method from a sealed Bio-Seal without decrypting
 */
export function getSealMethod(sealedJson: string): 'face' | 'fingerprint' {
    const seal: BioSeal = JSON.parse(sealedJson);
    return seal.method;
}

/**
 * Validate that a Bio-Seal package is structurally valid
 */
export function validateBioSeal(sealedJson: string): boolean {
    try {
        const seal: BioSeal = JSON.parse(sealedJson);
        return !!(
            seal.version === BIOSEAL_VERSION &&
            seal.method &&
            seal.payload &&
            seal.iv &&
            seal.tag &&
            seal.signature &&
            seal.created_at &&
            seal.user_id_hash
        );
    } catch {
        return false;
    }
}

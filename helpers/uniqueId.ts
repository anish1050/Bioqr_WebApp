/**
 * Unique ID Generator for BioSeal
 * 
 * Generates unique, human-readable IDs:
 * - User IDs:       BQ-XXXXXXXX  (e.g., BQ-A1B2C3D4)
 * - Org IDs:        ORG-XXXXXXXX (e.g., ORG-X1Y2Z3W4)
 * - Team IDs:       TM-XXXXXXXX  (e.g., TM-P1Q2R3S4)
 * - Community IDs:  CM-XXXXXXXX  (e.g., CM-H3J4K5L6)
 * 
 * Uses crypto.randomBytes for collision resistance.
 * Characters are alphanumeric uppercase for readability.
 */

import crypto from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed I, O, 0, 1 to avoid confusion

/**
 * Generate a random alphanumeric string of given length
 */
function randomAlphanumeric(length: number): string {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += CHARSET[bytes[i] % CHARSET.length];
    }
    return result;
}

/**
 * Generate a unique User ID: BQ-XXXXXXXX
 */
export function generateUniqueUserId(): string {
    return `BQ-${randomAlphanumeric(8)}`;
}

/**
 * Generate a unique Organisation ID: ORG-XXXXXXXX
 */
export function generateOrgId(): string {
    return `ORG-${randomAlphanumeric(8)}`;
}

/**
 * Generate a unique Team ID: TM-XXXXXXXX
 */
export function generateTeamId(): string {
    return `TM-${randomAlphanumeric(8)}`;
}

/**
 * Validate a User ID format
 */
export function isValidUserId(id: string): boolean {
    return /^BQ-[A-Z2-9]{8}$/.test(id);
}

/**
 * Validate an Organisation ID format
 */
export function isValidOrgId(id: string): boolean {
    return /^ORG-[A-Z2-9]{8}$/.test(id);
}

/**
 * Validate a Team ID format
 */
export function isValidTeamId(id: string): boolean {
    return /^TM-[A-Z2-9]{8}$/.test(id);
}

/**
 * Generate a unique Community ID: CM-XXXXXXXX
 */
export function generateCommunityId(): string {
    return `CM-${randomAlphanumeric(8)}`;
}

/**
 * Validate a Community ID format
 */
export function isValidCommunityId(id: string): boolean {
    return /^CM-[A-Z2-9]{8}$/.test(id);
}

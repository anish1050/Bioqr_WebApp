import db from "./db.js";

// ============================================================
// Shared Types
// ============================================================

export type UserType = 'individual' | 'org_super_admin' | 'org_admin' | 'org_member' | 'team_lead' | 'team_member' | 'community_lead' | 'community_member';

export interface User {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string | null;
    oauth_provider: string | null;
    oauth_id: string | null;
    avatar_url: string | null;
    user_type: UserType;
    unique_user_id: string | null;
    org_id: number | null;
    org_unique_id?: string | null;
    team_id: number | null;
    team_unique_id?: string | null;
    biometric_enrolled: boolean;
    mobile_number?: string;
    email_verified?: boolean;
    mobile_number_verified?: boolean;
    created_at: Date;
    updated_at: Date;
    isNewUser?: boolean;
}

export interface FileRecord {
    id: number;
    user_id: number;
    filename: string;
    mimetype: string;
    filepath: string;
    size: number;
    uploaded_at: Date;
}

export interface Session {
    id: number;
    user_id: number;
    refresh_token: string;
    created_at: Date;
    expires_at: Date;
    is_active: boolean;
}

export interface QrToken {
    id: number;
    token: string;
    user_id: number;
    file_id: number | null;
    is_one_time: boolean;
    is_unshareable: boolean;
    is_used: boolean;
    receiver_user_id: number | null;
    bioseal_lock: string | null;
    lock_method: 'face' | 'fingerprint' | null;
    created_at: Date;
    expires_at: Date;
    
    // V2 fields
    require_auth?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    radius?: number | null;
    start_time?: Date | null;
    qr_type?: 'file' | 'vcard' | 'text' | 'wifi';
    text_content?: string | null;
    vcard_data?: string | null;
    status?: 'active' | 'revoked' | 'expired';
    style_color?: string;
    style_bg?: string;
}

export interface OtpVerification {
    id: number;
    identifier: string;    // email or mobile
    otp_hash: string;
    type: 'email' | 'mobile';
    user_data: string;     // JSON serialized temp user data (names, username, password hash)
    attempts: number;
    expires_at: Date;
    created_at: Date;
}

// ============================================================
// Generic promisified query helper
// ============================================================

function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results as T[]);
        });
    });
}

export function execute(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// ============================================================
// User Queries
// ============================================================

export const UserQueries = {
    /** Find a user by their ID */
    findById: (id: number): Promise<User | undefined> =>
        query<User>(
            `SELECT u.*, o.org_unique_id, t.team_unique_id 
             FROM users u 
             LEFT JOIN organisations o ON u.org_id = o.id 
             LEFT JOIN teams t ON u.team_id = t.id 
             WHERE u.id = ?`, 
            [id]
        ).then((r) => r[0]),

    /** Find a user by email */
    findByEmail: (email: string): Promise<User | undefined> =>
        query<User>(
            `SELECT u.*, o.org_unique_id, t.team_unique_id 
             FROM users u 
             LEFT JOIN organisations o ON u.org_id = o.id 
             LEFT JOIN teams t ON u.team_id = t.id 
             WHERE u.email = ?`, 
            [email]
        ).then((r) => r[0]),

    /** Find a user by username */
    findByUsername: (username: string): Promise<User | undefined> =>
        query<User>(
            `SELECT u.*, o.org_unique_id, t.team_unique_id 
             FROM users u 
             LEFT JOIN organisations o ON u.org_id = o.id 
             LEFT JOIN teams t ON u.team_id = t.id 
             WHERE u.username = ?`, 
            [username]
        ).then((r) => r[0]),


    /** Find a user by email OR username (for login) */
    findByEmailOrUsername: (loginField: string): Promise<User | undefined> => {
        const isEmail = loginField.includes("@");
        const sql = `
            SELECT u.*, o.org_unique_id, t.team_unique_id 
            FROM users u 
            LEFT JOIN organisations o ON u.org_id = o.id 
            LEFT JOIN teams t ON u.team_id = t.id 
            WHERE u.${isEmail ? 'email' : 'username'} = ?
        `;
        return query<User>(sql, [loginField]).then((r) => r[0]);
    },

    /** Check if email or username already exists (for registration) */
    findDuplicates: (email: string, username: string): Promise<User[]> =>
        query<User>(
            "SELECT id, email, username, biometric_enrolled FROM users WHERE email = ? OR username = ?",
            [email, username]
        ),

    /** Find a user by OAuth provider + OAuth ID */
    findByOAuth: (provider: string, oauthId: string): Promise<User | undefined> =>
        query<User>(
            `SELECT u.*, o.org_unique_id, t.team_unique_id 
             FROM users u 
             LEFT JOIN organisations o ON u.org_id = o.id 
             LEFT JOIN teams t ON u.team_id = t.id 
             WHERE u.oauth_provider = ? AND u.oauth_id = ?`, 
            [provider, oauthId]
        ).then((r) => r[0]),

    /** Get user profile (safe fields only) */
    getProfile: (id: number): Promise<User | undefined> =>
        query<User>(
            "SELECT id, username, email, first_name, last_name, email_verified, biometric_enrolled FROM users WHERE id = ?",
            [id]
        ).then((r) => r[0]),

    create: async (data: {
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        password: string | null;
        mobile_number?: string;
        email_verified?: boolean;
        mobile_number_verified?: boolean;
        user_type?: UserType;
        unique_user_id?: string;
        org_id?: number | null;
        team_id?: number | null;
    }): Promise<number> => {
        const result = await execute(
            `INSERT INTO users (first_name, last_name, username, email, password, mobile_number, 
             email_verified, mobile_number_verified, user_type, unique_user_id, org_id, team_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.first_name,
                data.last_name,
                data.username,
                data.email,
                data.password,
                data.mobile_number || null,
                data.email_verified ? 1 : 0,
                data.mobile_number_verified ? 1 : 0,
                data.user_type || 'individual',
                data.unique_user_id || null,
                data.org_id || null,
                data.team_id || null
            ]
        );
        return result.insertId;
    },

    /** Insert a new OAuth user */
    createOAuth: async (data: {
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        oauth_provider: string;
        oauth_id: string;
        avatar_url: string | null;
    }): Promise<number> => {
        const result = await execute(
            "INSERT INTO users (first_name, last_name, username, email, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                data.first_name,
                data.last_name,
                data.username,
                data.email,
                data.oauth_provider,
                data.oauth_id,
                data.avatar_url,
            ]
        );
        return result.insertId;
    },

    /** Update an existing user to link OAuth */
    updateOAuth: (
        id: number,
        provider: string,
        oauthId: string,
        avatarUrl: string | null
    ): Promise<any> =>
        execute(
            "UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
            [provider, oauthId, avatarUrl, id]
        ),

    /** Update a user's password */
    updatePassword: (userId: number, hashedPassword: string): Promise<any> =>
        execute(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, userId]
        ),

    /** Find a user by their unique BQ-XXXXXXXX ID */
    findByUniqueUserId: (uniqueUserId: string): Promise<User | undefined> =>
        query<User>("SELECT * FROM users WHERE unique_user_id = ?", [uniqueUserId]).then((r) => r[0]),

    /** Find all users belonging to an organisation */
    findByOrgId: (orgId: number): Promise<User[]> =>
        query<User>("SELECT id, first_name, last_name, username, email, user_type, unique_user_id, biometric_enrolled, team_id FROM users WHERE org_id = ?", [orgId]),

    /** Find all users belonging to a team */
    findByTeamId: (teamId: number): Promise<User[]> =>
        query<User>("SELECT id, first_name, last_name, username, email, user_type, unique_user_id, biometric_enrolled FROM users WHERE team_id = ?", [teamId]),

    /** Update biometric enrollment status */
    updateBiometricStatus: (userId: number, enrolled: boolean): Promise<any> =>
        execute("UPDATE users SET biometric_enrolled = ? WHERE id = ?", [enrolled, userId]),

    /** Set unique_user_id for a user */
    setUniqueUserId: (userId: number, uniqueUserId: string): Promise<any> =>
        execute("UPDATE users SET unique_user_id = ? WHERE id = ?", [uniqueUserId, userId]),

    /** Set org_id for a user */
    setOrgId: (userId: number, orgId: number): Promise<any> =>
        execute("UPDATE users SET org_id = ? WHERE id = ?", [orgId, userId]),

    /** Set team_id for a user */
    setTeamId: (userId: number, teamId: number): Promise<any> =>
        execute("UPDATE users SET team_id = ? WHERE id = ?", [teamId, userId]),

    /** Verify email status */
    verifyEmail: (userId: number, verified: boolean = true): Promise<any> =>
        execute("UPDATE users SET email_verified = ? WHERE id = ?", [verified ? 1 : 0, userId]),

    /** Verify mobile status */
    verifyMobile: (userId: number, verified: boolean = true): Promise<any> =>
        execute("UPDATE users SET mobile_number_verified = ? WHERE id = ?", [verified ? 1 : 0, userId]),

    /** Update user type */
    setUserType: (userId: number, userType: UserType): Promise<any> =>
        execute("UPDATE users SET user_type = ? WHERE id = ?", [userType, userId]),

    /** Lookup user by unique ID — public safe fields only */
    lookupByUniqueId: (uniqueUserId: string): Promise<{ id: number; first_name: string; last_name: string; biometric_enrolled: boolean; user_type: UserType } | undefined> =>
        query<any>(
            "SELECT id, first_name, last_name, biometric_enrolled, user_type FROM users WHERE unique_user_id = ?",
            [uniqueUserId]
        ).then((r) => r[0]),
};

// ============================================================
// Session Queries
// ============================================================

export const SessionQueries = {
    /** Create a new session with a refresh token */
    create: (userId: number, refreshToken: string, expiresAt: Date): Promise<any> =>
        execute(
            "INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)",
            [userId, refreshToken, expiresAt]
        ),

    /** Find an active, non-expired session by refresh token */
    findActiveByToken: (refreshToken: string): Promise<Session | undefined> =>
        query<Session>(
            "SELECT * FROM user_sessions WHERE refresh_token = ? AND expires_at > NOW() AND is_active = TRUE",
            [refreshToken]
        ).then((r) => r[0]),

    /** Rotate a refresh token (update existing session) */
    rotateToken: (
        oldToken: string,
        newToken: string,
        newExpiresAt: Date
    ): Promise<any> =>
        execute(
            "UPDATE user_sessions SET refresh_token = ?, expires_at = ? WHERE refresh_token = ?",
            [newToken, newExpiresAt, oldToken]
        ),

    /** Invalidate a specific session by refresh token */
    invalidate: (userId: number, refreshToken: string): Promise<any> =>
        execute(
            "UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND refresh_token = ?",
            [userId, refreshToken]
        ),

    /** Invalidate all sessions for a user */
    invalidateAll: (userId: number): Promise<any> =>
        execute(
            "UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?",
            [userId]
        ),

    /** Delete expired or inactive sessions (cleanup) */
    cleanup: (): Promise<any> =>
        execute(
            "DELETE FROM user_sessions WHERE (expires_at < NOW() OR is_active = FALSE) AND user_id NOT IN (SELECT id FROM users WHERE username = 'anish')"
        ),
};

// ============================================================
// File Queries
// ============================================================

export const FileQueries = {
    /** Insert a new file record */
    create: async (data: {
        user_id: number;
        filename: string;
        mimetype: string;
        filepath: string;
        size: number;
    }): Promise<number> => {
        const result = await execute(
            "INSERT INTO files (user_id, filename, mimetype, filepath, size) VALUES (?, ?, ?, ?, ?)",
            [data.user_id, data.filename, data.mimetype, data.filepath, data.size]
        );
        return result.insertId;
    },

    /** Get all files for a user, sorted by most recent */
    findByUser: (userId: number): Promise<FileRecord[]> =>
        query<FileRecord>(
            "SELECT id, filename, mimetype, filepath, size, uploaded_at FROM files WHERE user_id = ? ORDER BY uploaded_at DESC",
            [userId]
        ),

    /** Find a specific file owned by a user */
    findByIdAndUser: (
        fileId: number | string,
        userId: number
    ): Promise<FileRecord | undefined> =>
        query<FileRecord>(
            "SELECT * FROM files WHERE id = ? AND user_id = ?",
            [fileId, userId]
        ).then((r) => r[0]),

    /** Find a file by ID (any owner) */
    findById: (fileId: number | string): Promise<FileRecord | undefined> =>
        query<FileRecord>("SELECT * FROM files WHERE id = ?", [fileId]).then(
            (r) => r[0]
        ),

    /** Delete a file record owned by a user */
    deleteByIdAndUser: (fileId: number | string, userId: number): Promise<any> =>
        execute("DELETE FROM files WHERE id = ? AND user_id = ?", [fileId, userId]),

    /** Count how many files a user has uploaded */
    countByUser: (userId: number): Promise<number> =>
        query<{ count: number }>("SELECT COUNT(*) as count FROM files WHERE user_id = ?", [userId]).then((r) => r[0].count),
};

// ============================================================
// QR Token Queries
// ============================================================

export const QrTokenQueries = {
    /** Create a new QR access token with V2 + BioSeal features */
    create: async (
        token: string,
        userId: number,
        fileIds: number[],
        expiresAt: Date,
        data: Partial<QrToken> = {}
    ): Promise<number> => {
        const {
            is_one_time = false,
            is_unshareable = false,
            require_auth = false,
            latitude = null,
            longitude = null,
            radius = null,
            start_time = null,
            qr_type = 'file',
            text_content = null,
            vcard_data = null,
            style_color = '#000000',
            style_bg = '#FFFFFF',
            receiver_user_id = null,
            bioseal_lock = null,
            lock_method = null
        } = data;

        const finalFileId = (fileIds && fileIds.length > 0) ? fileIds[0] : 0;

        const result = await execute(
            `INSERT INTO qr_tokens (
                token, user_id, file_id, expires_at, is_one_time, is_unshareable, 
                require_auth, latitude, longitude, radius, qr_type, text_content,
                vcard_data, style_color, style_bg,
                receiver_user_id, bioseal_lock, lock_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                token, userId, finalFileId, expiresAt, 
                is_one_time, is_unshareable, require_auth, latitude, longitude, radius, 
                qr_type, text_content, vcard_data, style_color, style_bg,
                receiver_user_id, bioseal_lock, lock_method
            ]
        );
        const qrTokenId = result.insertId;

        // Link all files in the junction table
        if (fileIds.length > 0) {
            for (const fileId of fileIds) {
                await execute(
                    "INSERT INTO qr_token_files (qr_token_id, file_id) VALUES (?, ?)",
                    [qrTokenId, fileId]
                );
            }
        }
        return qrTokenId;
    },

    /** Mark a one-time QR token as used */
    markAsUsed: (tokenId: number): Promise<any> =>
        execute(
            "UPDATE qr_tokens SET is_used = TRUE WHERE id = ?",
            [tokenId]
        ),

    /** Find a valid (non-expired) QR token */
    findValid: (token: string): Promise<QrToken | undefined> =>
        query<QrToken>(
            "SELECT * FROM qr_tokens WHERE token = ? AND expires_at > NOW()",
            [token]
        ).then((r) => r[0]),

    /** Get all files associated with a QR token */
    getFilesByToken: (token: string): Promise<FileRecord[]> =>
        query<FileRecord>(
            `SELECT f.* FROM files f
             JOIN qr_token_files qtf ON f.id = qtf.file_id
             JOIN qr_tokens qt ON qtf.qr_token_id = qt.id
             WHERE qt.token = ?`,
            [token]
        ),

    /** Log a scan event */
    logScan: (tokenId: number, details: { ip?: string, ua?: string, country?: string, city?: string, scannerUserId?: number | null }): Promise<any> =>
        execute(
            `INSERT INTO qr_scans (qr_token_id, ip_address, user_agent, country, city, scanner_user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tokenId, details.ip, details.ua, details.country, details.city, details.scannerUserId || null]
        ),

    /** Get scan statistics for a user's QR codes */
    getScanStatsByUserId: (userId: number): Promise<any[]> =>
        query(
            `SELECT 
                qt.token, 
                qt.qr_type, 
                qs.ip_address, 
                qs.country, 
                qs.city, 
                qs.scanned_at,
                COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.username, 'Guest') as scanner_name
             FROM qr_tokens qt
             JOIN qr_scans qs ON qt.id = qs.qr_token_id
             LEFT JOIN users u ON qs.scanner_user_id = u.id
             WHERE qt.user_id = ?
             ORDER BY qs.scanned_at DESC`,
            [userId]
        ),

    /** Delete expired QR tokens and their associations */
    cleanup: (): Promise<any> =>
        execute("DELETE FROM qr_tokens WHERE expires_at < NOW() AND user_id NOT IN (SELECT id FROM users WHERE username = 'anish')"),
};

// ============================================================
// WebAuthn Credential Queries
// ============================================================

export interface WebAuthnCredential {
    id: number;
    user_id: number;
    credential_id: string;
    public_key: string; // base64 encoded
    sign_count: number;
    transports: string; // JSON string
    created_at: Date;
}

export const WebAuthnCredentialQueries = {
    /** Create a new WebAuthn credential */
    create: async (
        userId: number,
        credentialId: string,
        publicKeyBase64: string,
        signCount: number,
        transports: string[]
    ): Promise<number> => {
        const result = await execute(
            `INSERT INTO web_authn_credentials (user_id, credential_id, public_key, sign_count, transports)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, credentialId, publicKeyBase64, signCount, JSON.stringify(transports)]
        );
        return result.insertId;
    },

    /** Find a credential by its credential_id */
    findByCredentialId: (credentialId: string): Promise<WebAuthnCredential | undefined> =>
        query<WebAuthnCredential>(
            "SELECT * FROM web_authn_credentials WHERE credential_id = ?",
            [credentialId]
        ).then((r) => r[0]),

    /** Find all credentials for a user */
    findByUserId: (userId: number): Promise<WebAuthnCredential[]> =>
        query<WebAuthnCredential>(
            "SELECT * FROM web_authn_credentials WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        ),

    /** Update the sign count for a credential */
    updateSignCount: (credentialId: string, newSignCount: number): Promise<any> =>
        execute(
            "UPDATE web_authn_credentials SET sign_count = ? WHERE credential_id = ?",
            [newSignCount, credentialId]
        ),

    /** Delete a specific credential by database ID */
    deleteById: (id: number): Promise<any> =>
        execute("DELETE FROM web_authn_credentials WHERE id = ?", [id]),

    /** Delete a specific credential by database ID with ownership check */
    deleteByIdAndUser: (id: number, userId: number): Promise<any> =>
        execute("DELETE FROM web_authn_credentials WHERE id = ? AND user_id = ?", [id, userId]),

    /** Find a credential by database ID */
    findById: (id: number): Promise<WebAuthnCredential | undefined> =>
        query<WebAuthnCredential>("SELECT * FROM web_authn_credentials WHERE id = ?", [id]).then((r) => r[0]),

    /** Delete all credentials for a user */
    deleteAllByUserId: (userId: number): Promise<any> =>
        execute("DELETE FROM web_authn_credentials WHERE user_id = ?", [userId]),
};
// ============================================================
// Face Recognition Queries
// ============================================================

export interface FaceRecognition {
    id: number;
    user_id: number;
    descriptor: string; // JSON string of Float32Array
    created_at: Date;
}

export const FaceRecognitionQueries = {
    upsert: async (userId: number, descriptor: Float32Array): Promise<any> => {
        // We only store one face per user for simplicity in this version
        const existing = await query("SELECT id FROM face_recognition WHERE user_id = ?", [userId]);
        const descriptorJson = JSON.stringify(Array.from(descriptor));
        
        console.log(`💾 Persisting face descriptor for user ${userId} (Existing: ${existing.length > 0})`);
        
        if (existing.length > 0) {
            return execute(
                "UPDATE face_recognition SET descriptor = ?, created_at = NOW() WHERE user_id = ?",
                [descriptorJson, userId]
            );
        } else {
            return execute(
                "INSERT INTO face_recognition (user_id, descriptor) VALUES (?, ?)",
                [userId, descriptorJson]
            );
        }
    },

    /** Find face descriptor for a user */
    findByUserId: (userId: number): Promise<FaceRecognition | undefined> =>
        query<FaceRecognition>(
            "SELECT * FROM face_recognition WHERE user_id = ?",
            [userId]
        ).then((r) => r[0]),

    /** Delete face recognition data for a user */
    deleteByUserId: (userId: number): Promise<any> =>
        execute("DELETE FROM face_recognition WHERE user_id = ?", [userId]),
};

// ============================================================
// System / Maintenance Queries
// ============================================================

export const SystemQueries = {
    /** Perform a full cleanup of all temporary/expired data */
    performMaintenance: async (): Promise<{ sessions: any, tokens: any }> => {
        const sessions = await SessionQueries.cleanup();
        const tokens = await QrTokenQueries.cleanup();
        return { sessions, tokens };
    },

    /** Hard reset of user activity (Tokens, Scans, Files, Sessions) 
     *  Keeps the users and their biometric enrollments.
     */
    resetActivity: async (): Promise<any> => {
        // Protect 'anish' data during blanket resets
        const anishExclusion = "NOT IN (SELECT id FROM users WHERE username = 'anish')";
        await execute(`DELETE FROM qr_scans WHERE qr_token_id IN (SELECT id FROM qr_tokens WHERE user_id ${anishExclusion})`);
        await execute(`DELETE FROM qr_token_files WHERE qr_token_id IN (SELECT id FROM qr_tokens WHERE user_id ${anishExclusion})`);
        await execute(`DELETE FROM qr_tokens WHERE user_id ${anishExclusion}`);
        await execute(`DELETE FROM user_sessions WHERE user_id ${anishExclusion}`);
        return { success: true };
    }
};

// ============================================================
// OTP Verification Queries
// ============================================================

export const OtpQueries = {
    async create(data: { identifier: string; otp_hash: string; type: 'email' | 'mobile'; user_data: any }) {
        return execute(
            'INSERT INTO otp_verifications (identifier, otp_hash, type, user_data, expires_at) VALUES (?, ?, ?, ?, NOW() + INTERVAL 15 MINUTE)',
            [data.identifier, data.otp_hash, data.type, JSON.stringify(data.user_data)]
        );
    },

    async countRecentRequests(identifier: string): Promise<number> {
        const rows = await query<any>(
            'SELECT COUNT(*) as count FROM otp_verifications WHERE identifier = ? AND created_at > (NOW() - INTERVAL 1 HOUR)',
            [identifier]
        );
        return rows[0]?.count || 0;
    },

    async findActive(identifier: string) {
        const rows = await query<any>(
            'SELECT * FROM otp_verifications WHERE identifier = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [identifier]
        );
        return rows[0] || null;
    },

    async incrementAttempts(id: number) {
        return execute('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [id]);
    },

    async delete(id: number) {
        return execute('DELETE FROM otp_verifications WHERE id = ?', [id]);
    },

    async cleanup() {
        return execute('DELETE FROM otp_verifications WHERE expires_at < NOW() OR attempts >= 3');
    }
};

// ============================================================
// Bio-Seal Queries
// ============================================================

export interface BioSealRecord {
    id: number;
    user_id: number;
    method: 'face' | 'fingerprint';
    sealed_template: string;   // JSON BioSeal package
    template_hash: string;     // SHA-256 of raw template
    created_at: Date;
    updated_at: Date;
}

export const BioSealQueries = {
    /** Create or update a Bio-Seal for a user */
    upsert: async (userId: number, method: 'face' | 'fingerprint', sealedTemplate: string, templateHash: string): Promise<any> => {
        const existing = await query('SELECT id FROM bio_seals WHERE user_id = ?', [userId]);
        if (existing.length > 0) {
            return execute(
                'UPDATE bio_seals SET method = ?, sealed_template = ?, template_hash = ?, updated_at = NOW() WHERE user_id = ?',
                [method, sealedTemplate, templateHash, userId]
            );
        } else {
            return execute(
                'INSERT INTO bio_seals (user_id, method, sealed_template, template_hash) VALUES (?, ?, ?, ?)',
                [userId, method, sealedTemplate, templateHash]
            );
        }
    },

    /** Find Bio-Seal for a user */
    findByUserId: (userId: number): Promise<BioSealRecord | undefined> =>
        query<BioSealRecord>('SELECT * FROM bio_seals WHERE user_id = ?', [userId]).then((r) => r[0]),

    /** Delete Bio-Seal for a user */
    deleteByUserId: (userId: number): Promise<any> =>
        execute('DELETE FROM bio_seals WHERE user_id = ?', [userId]),

    /** Check if a user has a Bio-Seal enrolled */
    isEnrolled: async (userId: number): Promise<boolean> => {
        const rows = await query<any>('SELECT 1 FROM bio_seals WHERE user_id = ? LIMIT 1', [userId]);
        return rows.length > 0;
    },

    /** Get the method (face/fingerprint) for a user */
    getMethod: async (userId: number): Promise<'face' | 'fingerprint' | null> => {
        const rows = await query<any>('SELECT method FROM bio_seals WHERE user_id = ?', [userId]);
        return rows[0]?.method || null;
    },
};

// ============================================================
// Organisation Queries
// ============================================================

export interface Organisation {
    id: number;
    org_unique_id: string;
    name: string;
    description: string | null;
    industry: string | null;
    website: string | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
}

export const OrganisationQueries = {
    /** Create a new organisation */
    create: async (data: {
        org_unique_id: string;
        name: string;
        description?: string;
        industry?: string;
        website?: string;
        created_by: number;
    }): Promise<number> => {
        const result = await execute(
            'INSERT INTO organisations (org_unique_id, name, description, industry, website, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [data.org_unique_id, data.name, data.description || null, data.industry || null, data.website || null, data.created_by]
        );
        return result.insertId;
    },

    /** Find by internal ID */
    findById: (id: number): Promise<Organisation | undefined> =>
        query<Organisation>('SELECT * FROM organisations WHERE id = ?', [id]).then((r) => r[0]),

    /** Find by org unique ID (ORG-XXXXXXXX) */
    findByOrgUniqueId: (orgUniqueId: string): Promise<Organisation | undefined> =>
        query<Organisation>('SELECT * FROM organisations WHERE org_unique_id = ?', [orgUniqueId]).then((r) => r[0]),

    /** Get all members of an organisation */
    getMembers: (orgId: number): Promise<User[]> =>
        query<User>(
            `SELECT id, first_name, last_name, username, email, user_type, unique_user_id, biometric_enrolled, team_id 
             FROM users WHERE org_id = ? ORDER BY user_type, first_name`,
            [orgId]
        ),

    /** Get all teams in an organisation */
    getTeams: (orgId: number): Promise<any[]> =>
        query('SELECT * FROM teams WHERE org_id = ? ORDER BY name', [orgId]),

    /** Get member count */
    getMemberCount: async (orgId: number): Promise<number> => {
        const rows = await query<any>('SELECT COUNT(*) as count FROM users WHERE org_id = ?', [orgId]);
        return rows[0]?.count || 0;
    },

    /** Delete an organisation */
    delete: (id: number): Promise<any> =>
        execute('DELETE FROM organisations WHERE id = ?', [id]),
};

// ============================================================
// Team Queries
// ============================================================

export interface Team {
    id: number;
    team_unique_id: string;
    name: string;
    description: string | null;
    org_id: number | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
}

export const TeamQueries = {
    /** Create a new team */
    create: async (data: {
        team_unique_id: string;
        name: string;
        description?: string;
        org_id?: number | null;
        created_by: number;
    }): Promise<number> => {
        const result = await execute(
            'INSERT INTO teams (team_unique_id, name, description, org_id, created_by) VALUES (?, ?, ?, ?, ?)',
            [data.team_unique_id, data.name, data.description || null, data.org_id || null, data.created_by]
        );
        return result.insertId;
    },

    /** Find by internal ID */
    findById: (id: number): Promise<Team | undefined> =>
        query<Team>('SELECT * FROM teams WHERE id = ?', [id]).then((r) => r[0]),

    /** Find by team unique ID (TM-XXXXXXXX) */
    findByTeamUniqueId: (teamUniqueId: string): Promise<Team | undefined> =>
        query<Team>('SELECT * FROM teams WHERE team_unique_id = ?', [teamUniqueId]).then((r) => r[0]),

    /** Get all members of a team */
    getMembers: (teamId: number): Promise<User[]> =>
        query<User>(
            `SELECT id, first_name, last_name, username, email, user_type, unique_user_id, biometric_enrolled 
             FROM users WHERE team_id = ? ORDER BY user_type, first_name`,
            [teamId]
        ),

    /** Get member count */
    getMemberCount: async (teamId: number): Promise<number> => {
        const rows = await query<any>('SELECT COUNT(*) as count FROM users WHERE team_id = ?', [teamId]);
        return rows[0]?.count || 0;
    },

    /** Delete a team */
    delete: (id: number): Promise<any> =>
        execute('DELETE FROM teams WHERE id = ?', [id]),
};

// ============================================================
// QR Permission Queries (Cross-Team QR Generation Access)
// ============================================================

export interface QrPermission {
    id: number;
    granter_id: number;
    member_id: number;
    target_member_id: number;
    org_id: number;
    created_at: Date;
    // Joined fields
    target_first_name?: string;
    target_last_name?: string;
    target_username?: string;
    target_unique_user_id?: string;
    member_first_name?: string;
    member_last_name?: string;
    member_username?: string;
}

export const QrPermissionQueries = {
    /** Grant cross-team QR permission */
    grant: async (granterId: number, memberId: number, targetMemberId: number, orgId: number): Promise<number> => {
        const result = await execute(
            'INSERT INTO qr_permissions (granter_id, member_id, target_member_id, org_id) VALUES (?, ?, ?, ?)',
            [granterId, memberId, targetMemberId, orgId]
        );
        return result.insertId;
    },

    /** Revoke a specific permission */
    revoke: (id: number): Promise<any> =>
        execute('DELETE FROM qr_permissions WHERE id = ?', [id]),

    /** Revoke by member + target pair */
    revokeByPair: (memberId: number, targetMemberId: number): Promise<any> =>
        execute('DELETE FROM qr_permissions WHERE member_id = ? AND target_member_id = ?', [memberId, targetMemberId]),

    /** Check if a member can generate QR for a target */
    canGenerateFor: async (memberId: number, targetMemberId: number): Promise<boolean> => {
        const rows = await query<any>(
            'SELECT 1 FROM qr_permissions WHERE member_id = ? AND target_member_id = ? LIMIT 1',
            [memberId, targetMemberId]
        );
        return rows.length > 0;
    },

    /** Get all granted targets for a member (with target user info) */
    getGrantedTargets: (memberId: number): Promise<QrPermission[]> =>
        query<QrPermission>(
            `SELECT qp.*, u.first_name as target_first_name, u.last_name as target_last_name, 
                    u.username as target_username, u.unique_user_id as target_unique_user_id
             FROM qr_permissions qp
             JOIN users u ON qp.target_member_id = u.id
             WHERE qp.member_id = ?
             ORDER BY qp.created_at DESC`,
            [memberId]
        ),

    /** Get all permissions for an org (admin view) */
    getByOrgId: (orgId: number): Promise<QrPermission[]> =>
        query<QrPermission>(
            `SELECT qp.*, 
                    m.first_name as member_first_name, m.last_name as member_last_name, m.username as member_username,
                    t.first_name as target_first_name, t.last_name as target_last_name, t.username as target_username,
                    t.unique_user_id as target_unique_user_id
             FROM qr_permissions qp
             JOIN users m ON qp.member_id = m.id
             JOIN users t ON qp.target_member_id = t.id
             WHERE qp.org_id = ?
             ORDER BY qp.created_at DESC`,
            [orgId]
        ),
};

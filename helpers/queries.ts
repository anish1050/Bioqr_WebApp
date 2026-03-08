import db from "./db.js";

// ============================================================
// Shared Types
// ============================================================

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
    file_id: number;
    is_one_time: boolean;
    is_used: boolean;
    created_at: Date;
    expires_at: Date;
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

function execute(sql: string, params: any[] = []): Promise<any> {
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
        query<User>("SELECT * FROM users WHERE id = ?", [id]).then((r) => r[0]),

    /** Find a user by email */
    findByEmail: (email: string): Promise<User | undefined> =>
        query<User>("SELECT * FROM users WHERE email = ?", [email]).then((r) => r[0]),

    /** Find a user by username */
    findByUsername: (username: string): Promise<User | undefined> =>
        query<User>("SELECT * FROM users WHERE username = ?", [username]).then((r) => r[0]),

    /** Find a user by email OR username (for login) */
    findByEmailOrUsername: (loginField: string): Promise<User | undefined> => {
        const isEmail = loginField.includes("@");
        const sql = isEmail
            ? "SELECT * FROM users WHERE email = ?"
            : "SELECT * FROM users WHERE username = ?";
        return query<User>(sql, [loginField]).then((r) => r[0]);
    },

    /** Check if email or username already exists (for registration) */
    findDuplicates: (email: string, username: string): Promise<User[]> =>
        query<User>(
            "SELECT email, username FROM users WHERE email = ? OR username = ?",
            [email, username]
        ),

    /** Find a user by OAuth provider + OAuth ID */
    findByOAuth: (provider: string, oauthId: string): Promise<User | undefined> =>
        query<User>(
            "SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?",
            [provider, oauthId]
        ).then((r) => r[0]),

    /** Get user profile (safe fields only) */
    getProfile: (id: number): Promise<User | undefined> =>
        query<User>(
            "SELECT id, username, email, first_name, last_name FROM users WHERE id = ?",
            [id]
        ).then((r) => r[0]),

    /** Insert a new user (standard registration) */
    create: async (data: {
        first_name: string;
        last_name: string;
        username: string;
        email: string;
        password: string;
    }): Promise<number> => {
        const result = await execute(
            "INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)",
            [data.first_name, data.last_name, data.username, data.email, data.password]
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
            "DELETE FROM user_sessions WHERE expires_at < NOW() OR is_active = FALSE"
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
};

// ============================================================
// QR Token Queries
// ============================================================

export const QrTokenQueries = {
    /** Create a new QR access token */
    create: (
        token: string,
        userId: number,
        fileId: number,
        expiresAt: Date,
        isOneTime: boolean = false
    ): Promise<any> =>
        execute(
            "INSERT INTO qr_tokens (token, user_id, file_id, expires_at, is_one_time) VALUES (?, ?, ?, ?, ?)",
            [token, userId, fileId, expiresAt, isOneTime]
        ),

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
};

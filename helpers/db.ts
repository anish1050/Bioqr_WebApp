import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db: mysql.Pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.SQL_DB_NAME,
    port: parseInt(process.env.DB_PORT || '4000', 10),
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false, // TiDB Cloud requires SSL but uses custom CA
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10 second timeout
});

// Test the connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.stack);
        return;
    }
    console.log("✅ Connected to database (Pool initialized).");
    connection.release();

    // ---------------------------------------------------------------------------
    // IMPORTANT: Running DDL statements (CREATE TABLE, ALTER TABLE) automatically 
    // on every server restart causes "Information schema is changed" errors in 
    // distributed databases like TiDB when concurrent queries hit the tables.
    // Migrations should be handled by `npm run setup-db`.
    // ---------------------------------------------------------------------------
    if (process.env.RUN_AUTO_MIGRATIONS === "true") {
        console.log("🔄 Running automatic migrations...");
        
        // Create sessions table if it doesn't exist
        const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          refresh_token VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_refresh_token (refresh_token),
          INDEX idx_user_id (user_id)
        )
      `;

        db.query(createSessionsTable, (err) => {
            if (err) {
                console.error("❌ Error creating sessions table:", err);
            } else {
                console.log("✅ Sessions table ready");
            }
        });

        // Update users table to support OAuth
        const oauthMigrations = [
            {
                name: "oauth_provider",
                query: `ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50) DEFAULT NULL`,
            },
            {
                name: "oauth_id",
                query: `ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255) DEFAULT NULL`,
            },
            {
                name: "avatar_url",
                query: `ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL`,
            },
            {
                name: "password_nullable",
                query: `ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL`,
            },
            {
                name: "unique_oauth_index",
                query: `ALTER TABLE users ADD UNIQUE KEY unique_oauth (oauth_provider, oauth_id)`,
            },
          {
            name: "unshareable_qr_tokens",
            query: `ALTER TABLE qr_tokens ADD COLUMN is_unshareable BOOLEAN DEFAULT FALSE`,
          },
          {
            name: "web_authn_credentials_table",
            query: `CREATE TABLE IF NOT EXISTS web_authn_credentials (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              credential_id VARCHAR(255) UNIQUE NOT NULL,
              public_key TEXT NOT NULL,
              sign_count INT DEFAULT 0,
              transports TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              INDEX idx_user_id (user_id),
              INDEX idx_credential_id (credential_id)
            )`,
          },
          {
            name: "face_recognition_table",
            query: `CREATE TABLE IF NOT EXISTS face_recognition (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT UNIQUE NOT NULL,
              descriptor TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              INDEX idx_user_id (user_id)
            )`,
          },
        ];

        let completedMigrations = 0;
        oauthMigrations.forEach((migration) => {
            db.query(migration.query, (err) => {
                if (err) {
                    const code = (err as any).code;
                    if (code === "ER_DUP_FIELDNAME" || code === "ER_DUP_KEYNAME") {
                        console.log(`✅ ${migration.name} already exists - skipping`);
                    } else {
                        console.error(`❌ Error with ${migration.name}:`, err.message);
                    }
                } else {
                    console.log(`✅ ${migration.name} migration completed`);
                }

                completedMigrations++;
                if (completedMigrations === oauthMigrations.length) {
                    console.log("✅ All OAuth migrations completed");
                }
            });
        });
    }
});

export default db;

import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db: mysql.Pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test the connection and run migrations
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.stack);
        return;
    }
    console.log("✅ Connected to database (Pool initialized).");
    connection.release();

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
});

export default db;

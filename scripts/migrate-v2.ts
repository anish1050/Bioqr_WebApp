import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.SQL_DB_NAME || "bioqr",
    port: parseInt(process.env.DB_PORT || '4000', 10),
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
    },
});

console.log("🚀 Running BioQR Schema Migration V2...");

const alterQueries = [
    // 1. Biometric Lock & Auth
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS require_auth BOOLEAN DEFAULT FALSE",
    
    // 2. Geofencing
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS radius INT NULL",
    
    // 3. Time Restrictions
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS start_time TIMESTAMP NULL",
    
    // 4. QR Content Types & Branding
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS qr_type ENUM('file', 'vcard', 'text', 'wifi') DEFAULT 'file'",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS vcard_data TEXT NULL",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS status ENUM('active', 'revoked', 'expired') DEFAULT 'active'",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS style_color VARCHAR(7) DEFAULT '#000000'",
    "ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS style_bg VARCHAR(7) DEFAULT '#FFFFFF'",
    
    // 5. Scan Analytics tracking (MIGRATED TO MONGODB)
    "DROP TABLE IF EXISTS qr_scans"
];

async function migrate() {
    for (const sql of alterQueries) {
        try {
            await new Promise((resolve, reject) => {
                db.query(sql, (err) => {
                    if (err) {
                        if (err.message.includes("Duplicate column name")) {
                            console.log(`ℹ️  Column already exists, skipping...`);
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log(`✅ Executed: ${sql.substring(0, 50)}...`);
                        resolve(null);
                    }
                });
            });
        } catch (err: any) {
            console.error(`❌ Error executing query: ${err.message}`);
        }
    }
    console.log("🎉 Migration V2 completed!");
    db.end();
}

migrate();

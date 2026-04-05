import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.SQL_DB_NAME || "bioqr",
    port: parseInt(process.env.DB_PORT || '4000', 10),
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false, // TiDB Cloud requires SSL but uses custom CA
    },
    connectTimeout: 30000, // 30 second timeout for TiDB cold starts
});

console.log("🔧 Setting up BioQR database (BioSeal Architecture)...");

db.connect((err) => {
    if (err) {
        console.error("❌ Database connection failed:", err.stack);
        process.exit(1);
    }
    console.log("✅ Connected to database.");

    // Define all table creation scripts — ordered by dependency
    const tables = [
        {
            name: "users",
            query: `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) DEFAULT NULL,
          oauth_provider VARCHAR(50) DEFAULT NULL,
          oauth_id VARCHAR(255) DEFAULT NULL,
          avatar_url TEXT DEFAULT NULL,
          user_type ENUM('individual','org_super_admin','org_admin','org_member','team_lead','team_member','community_lead','community_member') DEFAULT 'individual',
          unique_user_id VARCHAR(12) UNIQUE DEFAULT NULL,
          org_id INT DEFAULT NULL,
          team_id INT DEFAULT NULL,
          community_id INT DEFAULT NULL,
          biometric_enrolled BOOLEAN DEFAULT FALSE,
          email_verified BOOLEAN DEFAULT FALSE,
          mobile_number_verified BOOLEAN DEFAULT FALSE,
          mobile_number VARCHAR(20) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_oauth (oauth_provider, oauth_id),
          INDEX idx_unique_user_id (unique_user_id),
          INDEX idx_user_type (user_type),
          INDEX idx_org_id (org_id),
          INDEX idx_team_id (team_id),
          INDEX idx_community_id (community_id)
        )
      `
        },
        {
            name: "organisations",
            query: `
        CREATE TABLE IF NOT EXISTS organisations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          org_unique_id VARCHAR(12) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          industry VARCHAR(100) DEFAULT NULL,
          website VARCHAR(255) DEFAULT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_org_unique_id (org_unique_id)
        )
      `
        },
        {
            name: "teams",
            query: `
        CREATE TABLE IF NOT EXISTS teams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          team_unique_id VARCHAR(12) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          org_id INT DEFAULT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_team_unique_id (team_unique_id),
          INDEX idx_org_id (org_id)
        )
      `
        },
        {
            name: "files",
            query: `
        CREATE TABLE IF NOT EXISTS files (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          filename VARCHAR(255) NOT NULL,
          mimetype VARCHAR(100) NOT NULL,
          filepath VARCHAR(500) NOT NULL,
          size INT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        )
      `
        },
        {
            name: "qr_tokens",
            query: `
        CREATE TABLE IF NOT EXISTS qr_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(32) UNIQUE NOT NULL,
          user_id INT NOT NULL,
          file_id INT DEFAULT NULL,
          is_one_time BOOLEAN DEFAULT FALSE,
          is_unshareable BOOLEAN DEFAULT FALSE,
          is_used BOOLEAN DEFAULT FALSE,
          receiver_user_id INT DEFAULT NULL,
          bioseal_lock TEXT DEFAULT NULL,
          lock_method ENUM('face','fingerprint') DEFAULT NULL,
          qr_type ENUM('file','vcard','text') DEFAULT 'file',
          text_content TEXT DEFAULT NULL,
          vcard_data TEXT DEFAULT NULL,
          latitude DECIMAL(10,6) DEFAULT NULL,
          longitude DECIMAL(10,6) DEFAULT NULL,
          radius INT DEFAULT NULL,
          style_color VARCHAR(10) DEFAULT '#000000',
          style_bg VARCHAR(10) DEFAULT '#FFFFFF',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          INDEX idx_token (token),
          INDEX idx_expires (expires_at),
          INDEX idx_receiver (receiver_user_id)
        )
      `
        },
        {
            name: "qr_token_files",
            query: `
        CREATE TABLE IF NOT EXISTS qr_token_files (
          id INT AUTO_INCREMENT PRIMARY KEY,
          qr_token_id INT NOT NULL,
          file_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (qr_token_id) REFERENCES qr_tokens(id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          UNIQUE KEY unique_qr_file (qr_token_id, file_id)
        )
      `
        },
        {
            name: "user_sessions",
            query: `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          refresh_token VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_refresh_token (refresh_token),
          INDEX idx_user_id (user_id),
          INDEX idx_expires (expires_at)
        )
      `
        },
        {
            name: "web_authn_credentials",
            query: `
        CREATE TABLE IF NOT EXISTS web_authn_credentials (
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
        )
      `
        },
        {
            name: "bio_seals",
            query: `
        CREATE TABLE IF NOT EXISTS bio_seals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT UNIQUE NOT NULL,
          method ENUM('face','fingerprint') NOT NULL,
          sealed_template TEXT NOT NULL,
          template_hash VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_template_hash (template_hash)
        )
      `
        },
        {
            name: "face_recognition",
            query: `
        CREATE TABLE IF NOT EXISTS face_recognition (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          descriptor TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id)
        )
      `
        },
        {
            name: "communities",
            query: `
        CREATE TABLE IF NOT EXISTS communities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          community_unique_id VARCHAR(12) UNIQUE NOT NULL,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_community_unique_id (community_unique_id)
        )
      `
        },
        {
            name: "qr_permissions",
            query: `
        CREATE TABLE IF NOT EXISTS qr_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          granter_id INT NOT NULL,
          member_id INT NOT NULL,
          target_member_id INT NOT NULL,
          org_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (granter_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (target_member_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_permission (member_id, target_member_id),
          INDEX idx_member_id (member_id),
          INDEX idx_org_id (org_id)
        )
      `
        }
    ];

    // Create tables sequentially to respect foreign key dependencies
    let completedTables = 0;

    // Helper to run ALTER TABLE commands for existing databases
    const runMigrations = () => {
        const migrations = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS community_id INT DEFAULT NULL AFTER team_id',
            'ALTER TABLE users ADD INDEX IF NOT EXISTS idx_community_id (community_id)'
        ];

        migrations.forEach(m => {
            db.query(m, (err) => {
                if (err) console.log(`ℹ️ Migration note: ${err.message}`);
            });
        });
    };

    tables.forEach((table) => {
        db.query(table.query, (err: Error | null) => {
            if (err) {
                console.error(`❌ Error creating ${table.name} table:`, err.message);
            } else {
                console.log(`✅ ${table.name} table ready`);
                if (table.name === 'users') {
                    runMigrations();
                }
            }

            completedTables++;
            if (completedTables === tables.length) {
                console.log("\n🎉 Database setup completed successfully!");
                console.log("\nTables created:");
                tables.forEach(table => {
                    console.log(`  • ${table.name}`);
                });

                console.log("\n📝 BioSeal Architecture Features:");
                console.log("  • User registration (Individual / Organisation / Team)");
                console.log("  • Bio-Seal biometric templates (face + fingerprint)");
                console.log("  • Organisation & Team management");
                console.log("  • Receiver-locked QR code generation");
                console.log("  • Biometric verification on QR scan");
                console.log("  • OAuth login (Google, GitHub)");
                console.log("  • File upload and management");
                console.log("  • Session management with refresh tokens");

                db.end();
            }
        });
    });
});

// Handle cleanup
process.on('SIGINT', () => {
    console.log("\n🛑 Setup interrupted. Closing database connection...");
    db.end();
    process.exit(0);
});

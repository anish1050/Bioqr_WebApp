import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bioqr",
});

console.log("🔧 Setting up BioQR database...");

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.stack);
    process.exit(1);
  }
  console.log("✅ Connected to database.");

  // Define all table creation scripts
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_oauth (oauth_provider, oauth_id)
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
          file_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
          INDEX idx_token (token),
          INDEX idx_expires (expires_at)
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
    }
  ];

  // Create tables one by one
  let completedTables = 0;
  
  tables.forEach((table) => {
    db.query(table.query, (err) => {
      if (err) {
        console.error(`❌ Error creating ${table.name} table:`, err.message);
      } else {
        console.log(`✅ ${table.name} table ready`);
      }
      
      completedTables++;
      if (completedTables === tables.length) {
        console.log("\n🎉 Database setup completed successfully!");
        console.log("\nTables created:");
        tables.forEach(table => {
          console.log(`  • ${table.name}`);
        });
        
        console.log("\n📝 Features supported:");
        console.log("  • User registration and authentication");
        console.log("  • OAuth login (Google, GitHub)");
        console.log("  • File upload and management");
        console.log("  • QR code generation for file access");
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
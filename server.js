import express from "express";
import mysql from "mysql2";
import bodyParser from "body-parser";
import cors from "cors";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import crypto from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import session from "express-session";

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Session configuration (must be before passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

// __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Created uploads directory");
}

// CORS setup
const prodOrigins = [process.env.ORIGIN_1, process.env.ORIGIN_2];
const devOrigin = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
];
const allowedOrigins =
  process.env.NODE_ENV === "production" ? prodOrigins : devOrigin;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`❌ CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bioqr",
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.stack);
    return;
  }
  console.log("✅ Connected to database.");

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
  
  // Update users table to support OAuth - using individual queries for MySQL compatibility
  const oauthMigrations = [
    {
      name: 'oauth_provider',
      query: `ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50) DEFAULT NULL`
    },
    {
      name: 'oauth_id', 
      query: `ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255) DEFAULT NULL`
    },
    {
      name: 'avatar_url',
      query: `ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL`
    },
    {
      name: 'password_nullable',
      query: `ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL`
    },
    {
      name: 'unique_oauth_index',
      query: `ALTER TABLE users ADD UNIQUE KEY unique_oauth (oauth_provider, oauth_id)`
    }
  ];

  // Execute migrations one by one
  let completedMigrations = 0;
  oauthMigrations.forEach((migration, index) => {
    db.query(migration.query, (err) => {
      if (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
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

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
  });
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    const checkUser = 'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?';
    db.query(checkUser, ['google', profile.id], async (err, results) => {
      if (err) return done(err);
      
      if (results.length > 0) {
        // User exists, return user
        const existingUser = results[0];
        existingUser.isNewUser = false;
        return done(null, existingUser);
      } else {
        // Create new user
        const newUser = {
          first_name: profile.name.givenName || '',
          last_name: profile.name.familyName || '',
          username: profile.emails[0].value.split('@')[0] + '_google_' + Date.now(),
          email: profile.emails[0].value,
          oauth_provider: 'google',
          oauth_id: profile.id,
          avatar_url: profile.photos[0]?.value || null
        };
        
        const insertUser = 'INSERT INTO users (first_name, last_name, username, email, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(insertUser, [newUser.first_name, newUser.last_name, newUser.username, newUser.email, newUser.oauth_provider, newUser.oauth_id, newUser.avatar_url], (err, result) => {
          if (err) return done(err);
          
          newUser.id = result.insertId;
          newUser.isNewUser = true;
          console.log(`✅ New Google user created: ${newUser.email}`);
          return done(null, newUser);
        });
      }
    });
  } catch (error) {
    return done(error);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    const checkUser = 'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?';
    db.query(checkUser, ['github', profile.id], async (err, results) => {
      if (err) return done(err);
      
      if (results.length > 0) {
        // User exists, return user
        const existingUser = results[0];
        existingUser.isNewUser = false;
        return done(null, existingUser);
      } else {
        // Create new user
        const newUser = {
          first_name: profile.displayName?.split(' ')[0] || profile.username || '',
          last_name: profile.displayName?.split(' ').slice(1).join(' ') || '',
          username: profile.username + '_github_' + Date.now(),
          email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
          oauth_provider: 'github',
          oauth_id: profile.id,
          avatar_url: profile.photos[0]?.value || null
        };
        
        const insertUser = 'INSERT INTO users (first_name, last_name, username, email, oauth_provider, oauth_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(insertUser, [newUser.first_name, newUser.last_name, newUser.username, newUser.email, newUser.oauth_provider, newUser.oauth_id, newUser.avatar_url], (err, result) => {
          if (err) return done(err);
          
          newUser.id = result.insertId;
          newUser.isNewUser = true;
          console.log(`✅ New GitHub user created: ${newUser.username}`);
          return done(null, newUser);
        });
      }
    });
  } catch (error) {
    return done(error);
  }
}));

// Enhanced error logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("❌ JWT verification failed:", err.message);
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    }

    req.user = user;
    next();
  });
};

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
}

// Registration route
app.post("/bioqr/users/register", async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;

  console.log("📝 Registration attempt:", {
    first_name,
    last_name,
    username,
    email,
  });

  if (!first_name || !last_name || !username || !email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  // Check for both email and username uniqueness
  const checkDuplicatesQuery = "SELECT email, username FROM users WHERE email = ? OR username = ?";
  db.query(checkDuplicatesQuery, [email, username], async (err, result) => {
    if (err) {
      console.error("❌ Error checking duplicates:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (result.length > 0) {
      const existingUser = result[0];
      if (existingUser.email === email) {
        return res.json({ success: false, message: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.json({ success: false, message: "Username already taken" });
      }
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query =
        "INSERT INTO users (first_name, last_name, username, email, password) VALUES (?, ?, ?, ?, ?)";
      db.query(
        query,
        [first_name, last_name, username, email, hashedPassword],
        (err, result) => {
          if (err) {
            console.error("❌ DB insert error:", err);
            return res
              .status(500)
              .json({ success: false, message: "Database error" });
          }
          console.log("✅ User registered successfully:", result.insertId);
          res.json({
            success: true,
            message: "User registered successfully!",
            user_id: result.insertId,
          });
        }
      );
    } catch (error) {
      console.error("❌ Error hashing password:", error);
      res.json({ success: false, message: "Error hashing password" });
    }
  });
});

// OAuth Routes
// Google OAuth
app.get('/auth/google', (req, res, next) => {
  // Store the referrer or source in session for redirect after auth
  const referer = req.get('Referer');
  const origin = req.headers.origin;
  const host = req.get('host');
  
  req.session.authSource = referer || origin || 'direct';
  
  // Detect if this is registration or login based on referrer
  const isRegistration = referer && (referer.includes('/register.html') || referer.includes('/register'));
  req.session.isOAuthRegistration = isRegistration;
  
  console.log('🔍 Google OAuth initiation:');
  console.log('  - Referer:', referer);
  console.log('  - Origin:', origin);
  console.log('  - Host:', host);
  console.log('  - AuthSource stored:', req.session.authSource);
  console.log('  - Is Registration:', isRegistration);
  console.log('  - Request URL:', req.url);
  
  next();
}, passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  (req, res, next) => {
    console.log('🔄 Google OAuth callback received');
    console.log('🔍 Query params:', req.query);
    
    passport.authenticate('google', (err, user, info) => {
      console.log('🔍 Passport authenticate result:');
      console.log('  - Error:', err);
      console.log('  - User:', user ? { id: user.id, email: user.email } : null);
      console.log('  - Info:', info);
      
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('/login.html?error=passport_error');
      }
      
      if (!user) {
        console.error('❌ No user returned from passport');
        return res.redirect('/login.html?error=no_user');
      }
      
      req.user = user;
      // Store the new user flag in session
      req.session.wasNewUser = user.isNewUser;
      next();
    })(req, res, next);
  },
  async (req, res) => {
    console.log('🔍 Google OAuth callback triggered');
    console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 Session authSource:', req.session.authSource);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request origin:', req.get('origin'));
    console.log('🔍 Request referer:', req.get('referer'));
    
    // Successful authentication
    const user = req.user;
    console.log('🔍 Authenticated user:', { id: user.id, email: user.email, username: user.username, isNewUser: user.isNewUser });
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const sessionQuery = "INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)";
    
    db.query(sessionQuery, [user.id, refreshToken, expiresAt], (err) => {
      if (err) {
        console.error("❌ Error storing OAuth session:", err);
        return res.redirect('/login.html?error=session_failed');
      }
      
      // Check if this was a registration or login attempt
      const isRegistration = req.session.isOAuthRegistration;
      const wasNewUser = req.session.wasNewUser; // This will be set in the passport strategy
      
      console.log('🔍 OAuth flow detection:');
      console.log('  - isRegistration intent:', isRegistration);
      console.log('  - wasNewUser:', wasNewUser);
      
      // Determine redirect URL based on registration vs login
      let redirectUrl;
      
      if (isRegistration && wasNewUser) {
        // New user registration - redirect to login with success message
        redirectUrl = '/login.html?message=registration_success&provider=google';
        console.log('✅ Google registration successful - redirecting to login');
      } else if (isRegistration && !wasNewUser) {
        // Existing user trying to register - redirect to login with info message
        redirectUrl = '/login.html?message=user_exists&provider=google';
        console.log('ℹ️ Google user already exists - redirecting to login');
      } else {
        // Login flow - redirect to dashboard with tokens
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const authSource = req.session.authSource || '';
        const isFromViteDevServer = authSource.includes('localhost:') && !authSource.includes('localhost:3000');
        
        if (isDevelopment && isFromViteDevServer) {
          // Extract the Vite dev server URL from authSource
          const viteUrl = authSource.match(/(http:\/\/localhost:\d+)/)?.[1] || 'http://localhost:5173';
          redirectUrl = `${viteUrl}/dashboard.html?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          }))}`;
        } else {
          // Default redirect to Express server dashboard
          redirectUrl = `/dashboard.html?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          }))}`;
        }
        console.log('✅ Google login successful - redirecting to dashboard');
      }
      
      console.log(`✅ Final OAuth redirect URL: ${redirectUrl}`);
      
      // Clear OAuth session flags
      delete req.session.authSource;
      delete req.session.isOAuthRegistration;
      delete req.session.wasNewUser;
      
      res.redirect(redirectUrl);
    });
  }
);

// GitHub OAuth
app.get('/auth/github', (req, res, next) => {
  // Store the referrer or source in session for redirect after auth
  const referer = req.get('Referer');
  const origin = req.headers.origin;
  const host = req.get('host');
  
  req.session.authSource = referer || origin || 'direct';
  
  // Detect if this is registration or login based on referrer
  const isRegistration = referer && (referer.includes('/register.html') || referer.includes('/register'));
  req.session.isOAuthRegistration = isRegistration;
  
  console.log('🔍 GitHub OAuth initiation:');
  console.log('  - Referer:', referer);
  console.log('  - Origin:', origin);
  console.log('  - Host:', host);
  console.log('  - AuthSource stored:', req.session.authSource);
  console.log('  - Is Registration:', isRegistration);
  console.log('  - Request URL:', req.url);
  
  next();
}, passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/callback', 
  (req, res, next) => {
    console.log('🔄 GitHub OAuth callback received');
    console.log('🔍 Query params:', req.query);
    
    passport.authenticate('github', (err, user, info) => {
      console.log('🔍 Passport authenticate result:');
      console.log('  - Error:', err);
      console.log('  - User:', user ? { id: user.id, email: user.email || user.username } : null);
      console.log('  - Info:', info);
      
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('/login.html?error=passport_error');
      }
      
      if (!user) {
        console.error('❌ No user returned from passport');
        return res.redirect('/login.html?error=no_user');
      }
      
      req.user = user;
      // Store the new user flag in session
      req.session.wasNewUser = user.isNewUser;
      next();
    })(req, res, next);
  },
  async (req, res) => {
    console.log('🔍 GitHub OAuth callback triggered');
    console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 Session authSource:', req.session.authSource);
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Request origin:', req.get('origin'));
    console.log('🔍 Request referer:', req.get('referer'));
    
    // Successful authentication
    const user = req.user;
    console.log('🔍 Authenticated user:', { id: user.id, email: user.email || user.username, isNewUser: user.isNewUser });
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const sessionQuery = "INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)";
    
    db.query(sessionQuery, [user.id, refreshToken, expiresAt], (err) => {
      if (err) {
        console.error("❌ Error storing OAuth session:", err);
        return res.redirect('/login.html?error=session_failed');
      }
      
      // Check if this was a registration or login attempt
      const isRegistration = req.session.isOAuthRegistration;
      const wasNewUser = req.session.wasNewUser; // This will be set in the passport strategy
      
      console.log('🔍 OAuth flow detection:');
      console.log('  - isRegistration intent:', isRegistration);
      console.log('  - wasNewUser:', wasNewUser);
      
      // Determine redirect URL based on registration vs login
      let redirectUrl;
      
      if (isRegistration && wasNewUser) {
        // New user registration - redirect to login with success message
        redirectUrl = '/login.html?message=registration_success&provider=github';
        console.log('✅ GitHub registration successful - redirecting to login');
      } else if (isRegistration && !wasNewUser) {
        // Existing user trying to register - redirect to login with info message
        redirectUrl = '/login.html?message=user_exists&provider=github';
        console.log('ℹ️ GitHub user already exists - redirecting to login');
      } else {
        // Login flow - redirect to dashboard with tokens
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const authSource = req.session.authSource || '';
        const isFromViteDevServer = authSource.includes('localhost:') && !authSource.includes('localhost:3000');
        
        if (isDevelopment && isFromViteDevServer) {
          // Extract the Vite dev server URL from authSource
          const viteUrl = authSource.match(/(http:\/\/localhost:\d+)/)?.[1] || 'http://localhost:5173';
          redirectUrl = `${viteUrl}/dashboard.html?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          }))}`;
        } else {
          // Default redirect to Express server dashboard
          redirectUrl = `/dashboard.html?token=${accessToken}&refresh=${refreshToken}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          }))}`;
        }
        console.log('✅ GitHub login successful - redirecting to dashboard');
      }
      
      console.log(`✅ Final OAuth redirect URL: ${redirectUrl}`);
      
      // Clear OAuth session flags
      delete req.session.authSource;
      delete req.session.isOAuthRegistration;
      delete req.session.wasNewUser;
      
      res.redirect(redirectUrl);
    });
  }
);

// Enhanced Login route with JWT - supports both username and email
app.post("/bioqr/users/login", (req, res) => {
  const { loginField, password } = req.body; // Changed from 'email' to 'loginField'

  console.log("📝 Login attempt:", { loginField });

  // Check if loginField is an email (contains @) or username
  const isEmail = loginField && loginField.includes('@');
  const query = isEmail 
    ? "SELECT * FROM users WHERE email = ?"
    : "SELECT * FROM users WHERE username = ?";
  
  console.log(`🔍 Searching by ${isEmail ? 'email' : 'username'}:`, loginField);

  db.query(query, [loginField], async (err, result) => {
    if (err) {
      console.error("❌ DB query error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (result.length === 0) {
      const fieldType = isEmail ? 'email address' : 'username';
      return res.json({ 
        success: false, 
        message: `No account found with this ${fieldType}` 
      });
    }

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

      // Store refresh token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const sessionQuery =
        "INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)";

      db.query(sessionQuery, [user.id, refreshToken, expiresAt], (err) => {
        if (err) {
          console.error("❌ Error storing session:", err);
          return res
            .status(500)
            .json({ success: false, message: "Session creation failed" });
        }

        console.log("✅ Login successful:", user.id);
        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
          },
        });
      });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

// Token refresh endpoint
app.post("/bioqr/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "Refresh token required" });
  }

  // Verify refresh token
  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }

    // Check if refresh token exists in database and is active
    const query =
      "SELECT * FROM user_sessions WHERE refresh_token = ? AND expires_at > NOW() AND is_active = TRUE";
    db.query(query, [refreshToken], (err, result) => {
      if (err || result.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      const userId = decoded.userId;
      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(userId);

      // Update refresh token in database
      const updateQuery =
        "UPDATE user_sessions SET refresh_token = ?, expires_at = ? WHERE refresh_token = ?";
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      db.query(
        updateQuery,
        [newRefreshToken, newExpiresAt, refreshToken],
        (err) => {
          if (err) {
            console.error("❌ Error updating refresh token:", err);
            return res
              .status(500)
              .json({ success: false, message: "Token refresh failed" });
          }

          res.json({
            success: true,
            tokens: {
              accessToken,
              refreshToken: newRefreshToken,
              expiresIn: 900,
            },
          });
        }
      );
    });
  });
});

// Logout endpoint
app.post("/bioqr/auth/logout", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { refreshToken } = req.body;

  console.log("🔐 Logout request for user:", userId);

  if (refreshToken) {
    // Invalidate specific session
    const query =
      "UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND refresh_token = ?";
    db.query(query, [userId, refreshToken], (err) => {
      if (err) {
        console.error("❌ Error invalidating session:", err);
      } else {
        console.log("✅ Session invalidated for user:", userId);
      }
    });
  } else {
    // Invalidate all user sessions
    const query =
      "UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?";
    db.query(query, [userId], (err) => {
      if (err) {
        console.error("❌ Error invalidating all sessions:", err);
      } else {
        console.log("✅ All sessions invalidated for user:", userId);
      }
    });
  }

  res.json({ success: true, message: "Logged out successfully" });
});

// Protected route to verify token and get user info
app.get("/bioqr/auth/me", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query =
    "SELECT id, username, email, first_name, last_name FROM users WHERE id = ?";
  db.query(query, [userId], (err, result) => {
    if (err || result.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user: result[0],
    });
  });
});

// Multer setup with enhanced error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    console.log("📁 Saving file as:", uniqueName);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("📁 File upload attempt:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    cb(null, true);
  },
});

// Protected File Upload
app.post("/bioqr/files/upload", authenticateToken, (req, res) => {
  console.log("📁 Upload request received for user:", req.user.userId);

  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("❌ Multer error:", err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    const userId = req.user.userId; // Get from JWT token
    const file = req.file;

    console.log("📁 Upload data:", {
      userId,
      file: file ? file.filename : "no file",
    });

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const query =
      "INSERT INTO files (user_id, filename, mimetype, filepath, size) VALUES (?, ?, ?, ?, ?)";

    db.query(
      query,
      [userId, file.originalname, file.mimetype, file.path, file.size],
      (err, result) => {
        if (err) {
          console.error("❌ DB insert error:", err);
          return res.status(500).json({
            success: false,
            message: `Database error: ${err.message}`,
          });
        }

        console.log("✅ File uploaded successfully:", result.insertId);
        res.json({
          success: true,
          message: "File uploaded successfully!",
          file_id: result.insertId,
        });
      }
    );
  });
});

// Serve static files from public directory with cache control
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, path) => {
    // Set no-cache headers for sensitive pages
    if (path.includes('dashboard.html') || path.includes('login.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Protected Get all files for a user
app.get("/bioqr/files/:userId", authenticateToken, (req, res) => {
  const requestedUserId = req.params.userId;
  const tokenUserId = req.user.userId;

  // Users can only access their own files
  if (parseInt(requestedUserId) !== tokenUserId) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  console.log("📁 Fetching files for user:", tokenUserId);

  db.query(
    "SELECT id, filename, mimetype, filepath, size, uploaded_at FROM files WHERE user_id = ? ORDER BY uploaded_at DESC",
    [tokenUserId],
    (err, rows) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const baseUrl =
        process.env.NODE_ENV === "production"
          ? process.env.BASE_URL || "http://localhost:3000"
          : "http://localhost:3000";

      const files = rows.map((f) => ({
        id: f.id,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        url: `${baseUrl}/${f.filepath.replace(/\\/g, "/")}`,
        uploaded_at: f.uploaded_at,
      }));

      console.log("✅ Found files:", files.length);
      res.json({ files });
    }
  );
});

// Protected Delete file
app.delete("/bioqr/files/delete/:id", authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.userId;

  console.log(`🗑️ Delete request for file ${fileId} by user ${userId}`);

  // Ensure user owns the file
  db.query(
    "SELECT filename, filepath FROM files WHERE id = ? AND user_id = ?",
    [fileId, userId],
    (err, rows) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (!rows.length) {
        return res.status(404).json({ success: false, message: "File not found or access denied" });
      }

      const filePath = path.resolve(rows[0].filepath);

      // Delete from database first
      db.query(
        "DELETE FROM files WHERE id = ? AND user_id = ?",
        [fileId, userId],
        (err) => {
          if (err) {
            console.error("❌ Error deleting from database:", err);
            return res.status(500).json({ success: false, message: "Failed to delete file record" });
          }

          // Try to delete physical file
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log("✅ Physical file deleted:", filePath);
            } catch (fsErr) {
              console.warn("⚠️ Could not delete physical file:", fsErr.message);
              // Don't fail the request if physical file can't be deleted
            }
          }

          console.log("✅ File deleted successfully:", fileId);
          res.json({ success: true, message: "File deleted successfully" });
        }
      );
    }
  );
});

// Protected Download file
app.get("/bioqr/files/download/:id", authenticateToken, (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.userId;

  // Ensure user owns the file
  db.query(
    "SELECT filename, filepath FROM files WHERE id = ? AND user_id = ?",
    [fileId, userId],
    (err, rows) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(404).send("File not found");
      }

      if (!rows.length) {
        return res.status(404).send("File not found or access denied");
      }

      const filePath = path.resolve(rows[0].filepath);

      if (!fs.existsSync(filePath)) {
        console.error("❌ File not found on disk:", filePath);
        return res.status(404).send("File not found on disk");
      }

      res.download(filePath, rows[0].filename);
    }
  );
});

// Protected Generate QR code for file
app.post("/bioqr/generate-qr", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { file_id, duration = 60 } = req.body; // Default 60 minutes

    if (!file_id) {
      return res.status(400).json({ error: "file_id is required" });
    }

    // Verify user owns the file
    const fileCheckQuery = "SELECT id FROM files WHERE id = ? AND user_id = ?";
    db.query(fileCheckQuery, [file_id, userId], async (err, result) => {
      if (err || result.length === 0) {
        return res
          .status(404)
          .json({ error: "File not found or access denied" });
      }

      const token = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      const query =
        "INSERT INTO qr_tokens (token, user_id, file_id, expires_at) VALUES (?, ?, ?, ?)";
      db.query(query, [token, userId, file_id, expiresAt], async (err) => {
        if (err) {
          console.error("❌ DB insert error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const baseUrl =
          process.env.NODE_ENV === "production"
            ? process.env.BASE_URL || "http://localhost:3000"
            : "http://localhost:3000";

        const qrData = `${baseUrl}/access-file/${token}`;
        const qrImage = await QRCode.toDataURL(qrData);

        console.log("✅ QR code generated for token:", token);
        res.json({ qrImage, token, expiresAt });
      });
    });
  } catch (err) {
    console.error("❌ QR generation error:", err);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

// Access file with QR (public endpoint)
app.get("/access-file/:token", (req, res) => {
  const { token } = req.params;

  const query =
    "SELECT * FROM qr_tokens WHERE token = ? AND expires_at > NOW()";
  db.query(query, [token], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired QR code",
      });
    }

    const fileId = result[0].file_id;
    db.query(
      "SELECT * FROM files WHERE id = ?",
      [fileId],
      (err, fileResult) => {
        if (err || fileResult.length === 0) {
          console.error("❌ File not found:", fileId);
          return res.status(404).json({
            success: false,
            message: "File not found",
          });
        }

        const file = fileResult[0];
        const filePath = path.resolve(file.filepath);

        if (!fs.existsSync(filePath)) {
          return res.status(404).json({
            success: false,
            message: "File not found on disk",
          });
        }

        res.download(filePath, file.filename);
      }
    );
  });
});

// Cleanup expired sessions (run periodically)
setInterval(() => {
  db.query(
    "DELETE FROM user_sessions WHERE expires_at < NOW() OR is_active = FALSE",
    (err) => {
      if (err) {
        console.error("❌ Error cleaning up sessions:", err);
      } else {
        console.log("✅ Expired sessions cleaned up");
      }
    }
  );
}, 60 * 60 * 1000); // Run every hour

// Session validation endpoint
app.get("/api/validate-session", authenticateToken, (req, res) => {
  // If we reach here, token is valid
  res.json({
    valid: true,
    user: {
      id: req.user.userId
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    console.log("📂 Serving static files from:", distPath);
    app.use(express.static(distPath));

    // Handle React routing, return all requests to React app
    app.get("(.*)", (req, res, next) => {
      // Skip API and Auth routes
      if (
        req.path.startsWith("/bioqr") ||
        req.path.startsWith("/api") ||
        req.path.startsWith("/auth") ||
        req.path.startsWith("/uploads")
      ) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔐 JWT Authentication enabled`);
});
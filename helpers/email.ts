import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Configure standard Gmail transporter using App Passwords.
 * 💡 Instructions:
 * 1. Enable 2FA on your Gmail account.
 * 2. Generate an "App Password" (Settings -> Security).
 * 3. Add to your .env: GMAIL_USER=your-email@gmail.com, GMAIL_PASS=16-digit-app-password
 * 
 * 🚀 Production Note: We use explicit host/port and pooling to avoid hanging connections on cloud providers.
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use STARTTLS
    pool: true,   // Use a pool of connections
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
    // Force IPv4 to prevent ENETUNREACH errors on cloud providers like Render/Vercel
    // that may not have IPv6 routing configured correctly.
    host_ip_family: 4, 
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000,
} as any); // cast as any because host_ip_family is a newer/specific property in some versions

// Verify connection on startup to log issues early
transporter.verify((error) => {
    if (error) {
        console.error("❌ SMTP Transporter Verification Failed:", error.message);
        console.error("   Make sure GMAIL_USER and GMAIL_PASS (App Password) are correct in Render!");
    } else {
        console.log("✅ SMTP Transporter is ready (IPv4).");
    }
});

/**
 * Send a verification OTP to a user's email.
 * @param email - Recipient address
 * @param otp - 6-digit verification code
 * @param firstName - User's first name for personalization
 */
export const sendVerificationOtp = async (email: string, otp: string, firstName: string): Promise<boolean> => {
    try {
        const mailOptions = {
            from: `"BioQR Security" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Your BioQR Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4a90e2;">Finalize your BioQR Registration</h2>
                    <p>Hello <strong>${firstName}</strong>,</p>
                    <p>Thank you for choosing BioQR. To complete your account registration, please enter the following 6-digit verification code:</p>
                    <div style="background: #f4f7f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otp}</span>
                    </div>
                    <p>This code expires in 10 minutes. If you did not request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">&copy; 2026 BioQR Secures. All rights reserved.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Verification email sent to ${email}`);
        return true;
    } catch (error: any) {
        console.error("❌ Failed to send verification email:");
        console.error("  Error Name:", error.name);
        console.error("  Error Message:", error.message);
        console.error("  SMTP Code:", error.code);
        console.error("  SMTP Command:", error.command);
        
        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            console.error("  ⚠️ WARNING: GMAIL_USER or GMAIL_PASS environment variables are missing!");
        }
        
        return false;
    }
};

/**
 * Send a password reset OTP to a user's email.
 * @param email - Recipient address
 * @param otp - 6-digit reset code
 * @param firstName - User's first name for personalization
 */
export const sendPasswordResetOtp = async (email: string, otp: string, firstName: string): Promise<boolean> => {
    try {
        const mailOptions = {
            from: `"BioQR Security" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "BioQR Password Reset Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #e74c3c;">Password Reset Request</h2>
                    <p>Hello <strong>${firstName}</strong>,</p>
                    <p>We received a request to reset your BioQR password. Enter the following 6-digit code to proceed:</p>
                    <div style="background: #fef2f2; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626;">${otp}</span>
                    </div>
                    <p>This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #888;">&copy; 2026 BioQR Secures. All rights reserved.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Password reset email sent to ${email}`);
        return true;
    } catch (error: any) {
        console.error("❌ Failed to send password reset email:");
        console.error("  Error Name:", error.name);
        console.error("  Error Message:", error.message);
        console.error("  SMTP Code:", error.code);
        console.error("  SMTP Command:", error.command);
        
        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            console.error("  ⚠️ WARNING: GMAIL_USER or GMAIL_PASS environment variables are missing!");
        }
        
        return false;
    }
};


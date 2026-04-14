import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

// Force IPv4 DNS resolution globally to prevent ENETUNREACH on cloud providers (Render)
dns.setDefaultResultOrder("ipv4first");

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

/**
 * Nodemailer Gmail SMTP transporter.
 * Uses App Password authentication and forces IPv4 to avoid
 * ENETUNREACH (IPv6 routing) issues on Render/cloud hosts.
 */
const smtpConfig: SMTPTransport.Options = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
    },
    // Connection timeouts
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
} as SMTPTransport.Options;

// Force IPv4 — critical fix for Render deployment (ENETUNREACH)
(smtpConfig as any).family = 4;

const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Core email sender using Nodemailer + Gmail SMTP (completely free).
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    if (!GMAIL_USER || !GMAIL_PASS) {
        console.error("❌ Nodemailer Error: GMAIL_USER or GMAIL_PASS is missing from environment variables!");
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"BioQR Security" <${GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        });

        console.log(`✅ Email sent via Nodemailer to ${to} (Message ID: ${info.messageId})`);
        return true;
    } catch (error: any) {
        console.error("❌ Nodemailer send failure:");
        console.error("  Code:", error.code);
        console.error("  Message:", error.message);
        if (error.response) {
            console.error("  SMTP Response:", error.response);
        }
        return false;
    }
};

/**
 * Send a verification OTP to a user's email.
 */
export const sendVerificationOtp = async (email: string, otp: string, firstName: string): Promise<boolean> => {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4a90e2;">Finalize your BioQR Registration</h2>
            <p>Hello <strong>${firstName}</strong>,</p>
            <p>Thank you for choosing BioQR. To complete your account registration, please enter the following 6-digit verification code:</p>
            <div style="background: #f4f7f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otp}</span>
            </div>
            <p>This code expires in 15 minutes. If you did not request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">&copy; 2026 BioQR Secures. All rights reserved.</p>
        </div>
    `;
    return sendEmail(email, "Your BioQR Verification Code", html);
};

/**
 * Send a password reset OTP to a user's email.
 */
export const sendPasswordResetOtp = async (email: string, otp: string, firstName: string): Promise<boolean> => {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #e74c3c;">Password Reset Request</h2>
            <p>Hello <strong>${firstName}</strong>,</p>
            <p>We received a request to reset your BioQR password. Enter the following 6-digit code to proceed:</p>
            <div style="background: #fef2f2; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626;">${otp}</span>
            </div>
            <p>This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">&copy; 2026 BioQR Secures. All rights reserved.</p>
        </div>
    `;
    return sendEmail(email, "BioQR Password Reset Code", html);
};

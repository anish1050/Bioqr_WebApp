import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Robust Email Helper using Resend API (HTTPS).
 * 🚀 This eliminates SMTP issues (port blocking, IPv6 ENETUNREACH) on cloud providers.
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    if (!RESEND_API_KEY) {
        console.error("❌ Resend Migration Error: RESEND_API_KEY is missing from environment variables!");
        return false;
    }

    try {
        const response = await axios.post(
            RESEND_API_URL,
            {
                from: "BioQR Security <onboarding@resend.dev>", // Default free sandbox domain
                to: [to],
                subject: subject,
                html: html,
            },
            {
                headers: {
                    "Authorization": `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (response.status === 200 || response.status === 201) {
            console.log(`✅ Email sent via Resend API to ${to} (ID: ${response.data.id})`);
            return true;
        }
        return false;
    } catch (error: any) {
        console.error("❌ Resend API failure:");
        if (error.response) {
            console.error("  Status:", error.response.status);
            console.error("  Data:", JSON.stringify(error.response.data));
        } else {
            console.error("  Message:", error.message);
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

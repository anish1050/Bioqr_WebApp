import { Request } from "express";
import geoip from "geoip-lite";

/**
 * Calculates the Haversine distance between two points on the Earth
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Formats vCard data
 */
export function formatVCard(data: {
    firstName: string;
    lastName: string;
    org?: string;
    title?: string;
    tel?: string;
    email?: string;
    url?: string;
}): string {
    return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${data.firstName} ${data.lastName}`,
        `N:${data.lastName};${data.firstName};;;`,
        data.org ? `ORG:${data.org}` : "",
        data.title ? `TITLE:${data.title}` : "",
        data.tel ? `TEL;TYPE=WORK,VOICE:${data.tel}` : "",
        data.email ? `EMAIL;TYPE=PREF,INTERNET:${data.email}` : "",
        data.url ? `URL:${data.url}` : "",
        "END:VCARD"
    ].filter(Boolean).join("\n");
}

/**
 * Extracts scan details from request
 */
export async function getScanDetails(req: Request) {
    // Extract real IP prioritizing Forwarded headers (sync with logger.ts for consistency)
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || 
               req.headers["x-real-ip"] || 
               (req as any).ip || 
               req.socket.remoteAddress || "";

    const ua = req.headers["user-agent"];
    
    // Geolocation Fallback using geoip-lite
    const geo = ip && ip !== "::1" && ip !== "127.0.0.1" && !ip.startsWith("10.") && !ip.startsWith("192.168.") ? geoip.lookup(ip as string) : null;

    // Extract location from Vercel/Render headers or fallback to geoip
    const h = req.headers || {};
    const country = h["x-vercel-ip-country"] || h["x-render-ip-country"] || h["cf-ipcountry"] || geo?.country || "Unknown";
    const cityRaw = h["x-vercel-ip-city"] || h["x-vercel-city"] || h["x-render-ip-city"] || geo?.city || "Unknown";
    const city = cityRaw !== "Unknown" ? (typeof cityRaw === "string" ? decodeURIComponent(cityRaw as string) : cityRaw) : "Unknown";

    return {
        ip: ip as string,
        ua,
        country: country as string,
        city: city as string
    };
}

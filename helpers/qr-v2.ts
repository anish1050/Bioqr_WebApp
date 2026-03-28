import { Request } from "express";

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
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const ua = req.headers["user-agent"];
    
    // Extract location from Vercel/Render headers
    const country = (req.headers["x-vercel-ip-country"] || req.headers["x-render-ip-country"] || "Unknown") as string;
    const cityHeader = req.headers["x-vercel-ip-city"] as string;
    const city = cityHeader ? decodeURIComponent(cityHeader) : (req.headers["x-render-ip-city"] as string || "Unknown");

    return {
        ip,
        ua,
        country,
        city
    };
}

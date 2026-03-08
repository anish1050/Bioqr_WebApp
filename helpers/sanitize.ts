/**
 * Strips HTML tags, trims whitespace, and limits length.
 * @param input - The raw user input
 * @param maxLength - Maximum allowed characters (default 255)
 * @returns Sanitized input string
 */
export function sanitizeInput(input: unknown, maxLength: number = 255): string {
    if (typeof input !== "string") return "";
    return input
        .replace(/<[^>]*>/g, "") // Strip HTML tags
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .trim()
        .slice(0, maxLength);
}

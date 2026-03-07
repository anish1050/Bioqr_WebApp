package com.example.bioqr;

import android.util.Log;

/**
 * Centralized API configuration for BioQR app
 * This class manages server URLs and API endpoints
 */
public class ApiConfig {

    private static final String TAG = "ApiConfig";

    // ACTUALLY FIXED: Use Render Deployment URL
    private static final String DEFAULT_HOST = "bioqr-webapp-lvzy.onrender.com";
    private static final String DEFAULT_PORT = ""; // No port needed for https default
    private static final String DEFAULT_PROTOCOL = "https";

    // Server base URL
    public static final String SERVER_BASE_URL = "https://bioqr-webapp-lvzy.onrender.com";

    // API endpoints
    public static final String ENDPOINT_LOGIN = "/bioqr/users/login";
    public static final String ENDPOINT_REGISTER = "/bioqr/users/register";
    public static final String ENDPOINT_UPLOAD = "/bioqr/files/upload";
    public static final String ENDPOINT_FILES = "/bioqr/files";
    public static final String ENDPOINT_QR_GENERATE = "/bioqr/generate-qr";

    // Full API URLs
    public static String getLoginUrl() {
        String url = SERVER_BASE_URL + ENDPOINT_LOGIN;
        Log.d(TAG, "Login URL: " + url);
        return url;
    }

    public static String getRegisterUrl() {
        String url = SERVER_BASE_URL + ENDPOINT_REGISTER;
        Log.d(TAG, "Register URL: " + url);
        return url;
    }

    public static String getUploadUrl() {
        String url = SERVER_BASE_URL + ENDPOINT_UPLOAD;
        Log.d(TAG, "Upload URL: " + url);
        return url;
    }

    public static String getFilesUrl() {
        String url = SERVER_BASE_URL + ENDPOINT_FILES;
        Log.d(TAG, "Files URL: " + url);
        return url;
    }

    public static String getQRGenerateUrl() {
        String url = SERVER_BASE_URL + ENDPOINT_QR_GENERATE;
        Log.d(TAG, "QR Generate URL: " + url);
        return url;
    }

    // Method for access file URL
    public static String getAccessFileUrl(String token) {
        String url = SERVER_BASE_URL + "/access-file/" + token;
        Log.d(TAG, "Access File URL: " + url);
        return url;
    }

    // Base URL getter
    public static String getBaseUrl() {
        return SERVER_BASE_URL;
    }

    // Debug method to log all configuration
    public static void logConfiguration() {
        Log.d(TAG, "=== API Configuration ===");
        Log.d(TAG, "Server Base URL: " + SERVER_BASE_URL);
        Log.d(TAG, "Host: " + DEFAULT_HOST);
        Log.d(TAG, "Port: " + DEFAULT_PORT);
        Log.d(TAG, "Protocol: " + DEFAULT_PROTOCOL);
        Log.d(TAG, "Login URL: " + getLoginUrl());
        Log.d(TAG, "QR Generate URL: " + getQRGenerateUrl());
        Log.d(TAG, "========================");
    }

    // Utility method to check if server URL is configured
    public static boolean isServerConfigured() {
        return !DEFAULT_HOST.equals("localhost");
    }

    // Method to get a user-friendly server status
    public static String getServerStatus() {
        if (isServerConfigured()) {
            return "Connected to: " + SERVER_BASE_URL;
        } else {
            return "Using emulator server: " + SERVER_BASE_URL;
        }
    }
}
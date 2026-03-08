package com.example.bioqr;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.Executor;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class QRGenerationActivity extends AppCompatActivity {

    private static final String TAG = "QRGenerationActivity";

    private Executor executor;
    private BiometricPrompt biometricPrompt;
    private BiometricPrompt.PromptInfo promptInfo;

    // UI Elements
    private TextView tvFileInfo, tvQRDuration, tvStatus;
    private ImageView ivQRCode;
    private Button btnStartAuth, btnBackToFiles, btnShareQR;

    // Data from previous activity
    private int userId;
    private String username;
    private String authToken;
    private int fileId;
    private String fileName;
    private int durationMinutes;
    private boolean isOneTime;
    private boolean isUnshareable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_qr_generation);

        loadIntentData();
        initViews();
        setupBiometricAuth();
        setupListeners();
        updateUI();
    }

    private void loadIntentData() {
        Intent intent = getIntent();
        userId = intent.getIntExtra("user_id", -1);
        username = intent.getStringExtra("username");
        authToken = intent.getStringExtra("token");
        fileId = intent.getIntExtra("file_id", -1);
        fileName = intent.getStringExtra("file_name");
        durationMinutes = intent.getIntExtra("duration_minutes", 60);
        isOneTime = intent.getBooleanExtra("is_one_time", false);
        isUnshareable = intent.getBooleanExtra("is_unshareable", false);

        if (userId == -1 || fileId == -1 || authToken == null) {
            Toast.makeText(this, "Invalid data received", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void initViews() {
        tvFileInfo = findViewById(R.id.tvFileInfo);
        tvQRDuration = findViewById(R.id.tvQRDuration);
        tvStatus = findViewById(R.id.tvStatus);
        ivQRCode = findViewById(R.id.ivQRCode);
        btnStartAuth = findViewById(R.id.btnStartAuth);
        btnBackToFiles = findViewById(R.id.btnBackToFiles);
        btnShareQR = findViewById(R.id.btnShareQR);

        // Initially hide QR code and share button
        ivQRCode.setVisibility(ImageView.GONE);
        btnShareQR.setVisibility(Button.GONE);
    }

    private void setupBiometricAuth() {
        executor = ContextCompat.getMainExecutor(this);
        biometricPrompt = new BiometricPrompt(QRGenerationActivity.this,
                executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                super.onAuthenticationSucceeded(result);
                tvStatus.setText("Authentication successful! Generating QR code...");
                generateQRCode();
            }

            @Override
            public void onAuthenticationFailed() {
                super.onAuthenticationFailed();
                tvStatus.setText("Authentication failed. Please try again.");
                Toast.makeText(getApplicationContext(),
                        "Authentication failed", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                super.onAuthenticationError(errorCode, errString);
                tvStatus.setText("Authentication error: " + errString);
                Toast.makeText(getApplicationContext(),
                        "Authentication error: " + errString, Toast.LENGTH_LONG).show();
            }
        });

        promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Biometric Authentication")
                .setSubtitle("Authenticate to generate secure QR code for: " + fileName)
                .setNegativeButtonText("Cancel")
                .build();
    }

    private void setupListeners() {
        btnStartAuth.setOnClickListener(v -> {
            tvStatus.setText("Place your finger on the sensor...");
            biometricPrompt.authenticate(promptInfo);
        });

        btnBackToFiles.setOnClickListener(v -> {
            finish(); // Go back to FileManagerActivity
        });

        btnShareQR.setOnClickListener(v -> {
            shareQRCode();
        });
    }

    private void updateUI() {
        tvFileInfo.setText("File: " + fileName);

        if (isOneTime) {
            tvQRDuration.setText("QR Code will be valid for: One-Time Use");
        } else {
            String durationText;
            if (durationMinutes < 60) {
                durationText = durationMinutes + " minute" + (durationMinutes != 1 ? "s" : "");
            } else if (durationMinutes < 1440) {
                int hours = durationMinutes / 60;
                durationText = hours + " hour" + (hours != 1 ? "s" : "");
            } else {
                int days = durationMinutes / 1440;
                durationText = days + " day" + (days != 1 ? "s" : "");
            }
            tvQRDuration.setText("QR Code will be valid for: " + durationText);
        }

        tvStatus.setText("Ready to generate secure QR code. Tap 'Authenticate' to begin.");
    }

    private void generateQRCode() {
        Log.d(TAG, "Generating QR for user: " + userId + ", file: " + fileId + ", duration: " + durationMinutes);

        btnStartAuth.setEnabled(false);
        tvStatus.setText("Generating secure QR code...");

        OkHttpClient client = NetworkClient.getClient();

        JSONObject json = new JSONObject();
        try {
            json.put("file_id", fileId);
            json.put("duration", durationMinutes);
            json.put("is_one_time", isOneTime);
            json.put("is_unshareable", isUnshareable);
            Log.d(TAG, "Request JSON: " + json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "Error creating JSON", e);
            tvStatus.setText("Error creating request");
            btnStartAuth.setEnabled(true);
            return;
        }

        RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(ApiConfig.getQRGenerateUrl())
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer " + authToken)
                .build();

        Log.d(TAG, "Sending QR generation request: " + json.toString());
        Log.d(TAG, "Request URL: " + request.url());
        Log.d(TAG, "Auth token: " + (authToken != null && !authToken.isEmpty() ? "Present" : "Missing"));

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "QR generation request failed", e);
                runOnUiThread(() -> {
                    btnStartAuth.setEnabled(true);
                    tvStatus.setText("Failed to connect to server");
                    Toast.makeText(QRGenerationActivity.this,
                            "Failed to connect to server: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                Log.d(TAG, "QR generation response code: " + response.code());
                Log.d(TAG, "QR generation response: " + responseBody);

                runOnUiThread(() -> {
                    SessionUtils.checkSessionExpiry(QRGenerationActivity.this, response.code());
                    btnStartAuth.setEnabled(true);

                    if (response.isSuccessful()) {
                        try {
                            JSONObject resJson = new JSONObject(responseBody);
                            // We ignore the server's qrImage because it might have the wrong BASE_URL (localhost)
                            // String qrBase64 = resJson.getString("qrImage"); 
                            String token = resJson.getString("token");

                            // Generate QR locally using the correct App Config URL
                            String fullAccessUrl = ApiConfig.getAccessFileUrl(token);
                            showLocalQRCode(fullAccessUrl);

                            tvStatus.setText("QR code generated successfully! Valid for " + getDurationText() + ".");
                            btnShareQR.setVisibility(Button.VISIBLE);

                            Log.d(TAG, "QR Link: " + fullAccessUrl);

                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing QR response", e);
                            tvStatus.setText("Error processing server response");
                            Toast.makeText(QRGenerationActivity.this,
                                    "Error: Invalid server response", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        // Try to parse error message from JSON for better debugging
                        String errorMsg = "Server error: " + response.code();
                        try {
                             JSONObject errJson = new JSONObject(responseBody);
                             if (errJson.has("error")) {
                                 errorMsg = "Server: " + errJson.getString("error");
                             } else if (errJson.has("message")) {
                                 errorMsg = "Server: " + errJson.getString("message");
                             }
                        } catch (JSONException e) {
                            // ignore
                        }
                        
                        // Show the actual error to the user
                        tvStatus.setText(errorMsg);
                        Toast.makeText(QRGenerationActivity.this, errorMsg, Toast.LENGTH_LONG).show();
                    }
                });
            }
        });
    }

    private String handleErrorResponse(int code, String responseBody) {
        String baseMessage = "Server error: " + code;

        switch (code) {
            case 404:
                return "File not found or access denied";
            case 401:
                return "Authentication failed - please login again";
            case 403:
                return "Access forbidden";
            default:
                try {
                    JSONObject errorJson = new JSONObject(responseBody);
                    String serverMessage = errorJson.optString("error", baseMessage);
                    return "Server: " + serverMessage;
                } catch (JSONException e) {
                    return baseMessage;
                }
        }
    }

    private void showLocalQRCode(String qrContent) {
        try {
            com.journeyapps.barcodescanner.BarcodeEncoder barcodeEncoder = new com.journeyapps.barcodescanner.BarcodeEncoder();
            Bitmap bitmap = barcodeEncoder.encodeBitmap(qrContent, com.google.zxing.BarcodeFormat.QR_CODE, 400, 400);
            
            if (bitmap != null) {
                ivQRCode.setImageBitmap(bitmap);
                ivQRCode.setVisibility(ImageView.VISIBLE);
                Log.d(TAG, "QR Code generated locally for: " + qrContent);
            } else {
                Toast.makeText(this, "Failed to generate QR bitmap", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error generating local QR code", e);
            Toast.makeText(this, "Error generating QR code: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void shareQRCode() {
        // Get the bitmap from ImageView
        ivQRCode.setDrawingCacheEnabled(true);
        Bitmap bitmap = ivQRCode.getDrawingCache();

        if (bitmap != null) {
            // Create share intent with the QR code image
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, "BioQR Secure File Access");
            shareIntent.putExtra(Intent.EXTRA_TEXT,
                    "Scan this QR code to access the file: " + fileName +
                            "\nValid for: " + getDurationText() +
                            "\n\nGenerated by BioQR - Secure File Sharing");

            startActivity(Intent.createChooser(shareIntent, "Share QR Code"));
        } else {
            Toast.makeText(this, "No QR code to share", Toast.LENGTH_SHORT).show();
        }
    }

    private String getDurationText() {
        if (isOneTime) {
            return "One-Time Use";
        }
        if (durationMinutes < 60) {
            return durationMinutes + " minute" + (durationMinutes != 1 ? "s" : "");
        } else if (durationMinutes < 1440) {
            int hours = durationMinutes / 60;
            return hours + " hour" + (hours != 1 ? "s" : "");
        } else {
            int days = durationMinutes / 1440;
            return days + " day" + (days != 1 ? "s" : "");
        }
    }
}
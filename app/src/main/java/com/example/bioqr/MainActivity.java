package com.example.bioqr;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String PREFS_NAME = "BioQRPrefs";

    // UI Elements
    private TextView statusText;
    private Button btnLogin, btnRegister, btnManageFiles, btnLogout;

    // User session data
    private int userId = -1;
    private String username = "";
    private String userEmail = "";
    private String authToken = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();

        // Check if user is already logged in
        if (checkUserSession()) {
            showLoggedInState();
        } else {
            showLoginState();
        }
    }

    private void initViews() {
        statusText = findViewById(R.id.statusText);
        btnLogin = findViewById(R.id.btnLogin);
        btnRegister = findViewById(R.id.btnRegister);
        btnManageFiles = findViewById(R.id.btnManageFiles);
        btnLogout = findViewById(R.id.btnLogout);

        // Set up click listeners
        btnLogin.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, LoginActivity.class);
            startActivity(intent);
        });

        btnRegister.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, RegisterActivity.class);
            startActivity(intent);
        });

        btnManageFiles.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, FileManagerActivity.class);
            intent.putExtra("user_id", userId);
            intent.putExtra("username", username);
            intent.putExtra("email", userEmail);
            intent.putExtra("token", authToken);
            startActivity(intent);
        });

        Button btnReceiveFiles = findViewById(R.id.btnReceiveFiles);
        btnReceiveFiles.setOnClickListener(v -> {
            showScanOptionsDialog();
        });

        btnLogout.setOnClickListener(v -> {
            logout();
        });
    }

    private void showScanOptionsDialog() {
        android.app.Dialog dialog = new android.app.Dialog(this);
        dialog.setContentView(R.layout.dialog_scan_options);
        // Make background transparent for rounded corners
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        }

        Button btnScanCamera = dialog.findViewById(R.id.btnScanCamera);
        Button btnScanGallery = dialog.findViewById(R.id.btnScanGallery);

        btnScanCamera.setOnClickListener(v -> {
            dialog.dismiss();
            new com.google.zxing.integration.android.IntentIntegrator(MainActivity.this)
                .setCaptureActivity(PortraitCaptureActivity.class)
                .setOrientationLocked(true)
                .setDesiredBarcodeFormats(com.google.zxing.integration.android.IntentIntegrator.QR_CODE)
                .setPrompt("Scan a BioQR Code to receive files")
                .setCameraId(0)
                .setBeepEnabled(false)
                .setBarcodeImageEnabled(true)
                .initiateScan();
        });

        btnScanGallery.setOnClickListener(v -> {
            dialog.dismiss();
            openGallery();
        });

        dialog.show();
    }

    private void openGallery() {
        Intent intent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        startActivityForResult(intent, 1001); // 1001 for Gallery Request
    }

    private void decodeQRCodeFromBitmap(android.graphics.Bitmap bitmap) {
        try {
            int[] intArray = new int[bitmap.getWidth() * bitmap.getHeight()];
            bitmap.getPixels(intArray, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
            
            com.google.zxing.LuminanceSource source = new com.google.zxing.RGBLuminanceSource(bitmap.getWidth(), bitmap.getHeight(), intArray);
            com.google.zxing.BinaryBitmap binaryBitmap = new com.google.zxing.BinaryBitmap(new com.google.zxing.common.HybridBinarizer(source));
            
            com.google.zxing.Reader reader = new com.google.zxing.MultiFormatReader();
            com.google.zxing.Result result = reader.decode(binaryBitmap);
            
            String scannedUrl = result.getText();
            android.widget.Toast.makeText(this, "Decoded: " + scannedUrl, android.widget.Toast.LENGTH_LONG).show();
            
            // Open URL
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(scannedUrl));
            startActivity(browserIntent);
            
        } catch (Exception e) {
            Log.e(TAG, "Error decoding QR code", e);
            android.widget.Toast.makeText(this, "Could not decode QR code from image", android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private boolean checkUserSession() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isLoggedIn = prefs.getBoolean("logged_in", false);

        if (isLoggedIn) {
            userId = prefs.getInt("user_id", -1);
            username = prefs.getString("username", "");
            userEmail = prefs.getString("email", "");
            authToken = prefs.getString("token", "");

            // Check if we have valid session data
            return userId != -1 && !username.isEmpty();
        }

        return false;
    }

    private void showLoggedInState() {
        statusText.setText("Welcome back, " + username + "!\nReady to manage your files and generate secure QR codes.");
        btnLogin.setVisibility(Button.GONE);
        btnRegister.setVisibility(Button.GONE);
        btnManageFiles.setVisibility(Button.VISIBLE);
        findViewById(R.id.btnReceiveFiles).setVisibility(Button.VISIBLE);
        btnLogout.setVisibility(Button.VISIBLE);
    }

    private void showLoginState() {
        statusText.setText("Welcome to BioQR\nSecure file sharing with biometric authentication");
        btnLogin.setVisibility(Button.VISIBLE);
        btnRegister.setVisibility(Button.VISIBLE);
        btnManageFiles.setVisibility(Button.GONE);
        findViewById(R.id.btnReceiveFiles).setVisibility(Button.GONE);
        btnLogout.setVisibility(Button.GONE);
    }

    private void logout() {
        // Clear shared preferences
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.clear();
        editor.apply();

        // Reset variables
        userId = -1;
        username = "";
        userEmail = "";
        authToken = "";

        // Update UI
        showLoginState();

        Log.d(TAG, "User logged out successfully");
    }

    @Override
    protected void onResume() {
        super.onResume();

        Log.d(TAG, "Auth token check: " + (authToken != null && !authToken.isEmpty() ? "Present" : "Missing"));
        Log.d(TAG, "User ID: " + userId);

        // Check for login data passed from LoginActivity
        Intent intent = getIntent();
        if (intent.hasExtra("user_id")) {
            userId = intent.getIntExtra("user_id", -1);
            username = intent.getStringExtra("username");
            userEmail = intent.getStringExtra("email");
            authToken = intent.getStringExtra("token");

            if (userId != -1) {
                showLoggedInState();
            }
        } else {
            // Check session again in case user logged in
            if (checkUserSession()) {
                showLoggedInState();
            }
        }
    }

    // QR Scan Result Handler
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        // Handle Gallery Result
        if (requestCode == 1001) {
            if (resultCode == RESULT_OK && data != null) {
                try {
                    android.net.Uri selectedImage = data.getData();
                    java.io.InputStream inputStream = getContentResolver().openInputStream(selectedImage);
                    android.graphics.Bitmap bitmap = android.graphics.BitmapFactory.decodeStream(inputStream);
                    decodeQRCodeFromBitmap(bitmap);
                } catch (Exception e) {
                    Log.e(TAG, "Error processing gallery image", e);
                    android.widget.Toast.makeText(this, "Error loading image", android.widget.Toast.LENGTH_SHORT).show();
                }
            }
            return;
        }

        com.google.zxing.integration.android.IntentResult result = com.google.zxing.integration.android.IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null) {
            if (result.getContents() == null) {
                android.widget.Toast.makeText(this, "Cancelled", android.widget.Toast.LENGTH_LONG).show();
            } else {
                String scannedUrl = result.getContents();
                android.widget.Toast.makeText(this, "Scanned: " + scannedUrl, android.widget.Toast.LENGTH_LONG).show();
                
                // Open URL in browser
                try {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(scannedUrl));
                    startActivity(browserIntent);
                } catch (Exception e) {
                    android.widget.Toast.makeText(this, "Error opening URL: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
                    Log.e(TAG, "Error opening URL", e);
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }
}
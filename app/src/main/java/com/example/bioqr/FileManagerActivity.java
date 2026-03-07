package com.example.bioqr;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class FileManagerActivity extends AppCompatActivity {

    private static final String TAG = "FileManagerActivity";
    private static final String PREFS_NAME = "BioQRPrefs";
    private static final int FILE_PICKER_REQUEST = 1001;
    private static final int STORAGE_PERMISSION_CODE = 1002;

    // UI Elements
    private Button btnUploadFile, btnGenerateQR, btnRefreshFiles;
    private ListView listViewFiles;
    private TextView tvSelectedFile, tvQRDuration, tvWelcome;
    private SeekBar seekBarDuration;
    private ProgressBar pbLoading, pbUpload;
    private Spinner spinnerDurationUnit;

    // User data
    private int userId = -1;
    private String username = "";
    private String authToken = "";

    // File management
    private List<FileItem> userFiles = new ArrayList<>();
    private FileAdapter fileAdapter;
    private FileItem selectedFile = null;
    private int qrDurationMinutes = 60; // Default 60 minutes

    // Duration units
    private String[] durationUnits = {"Minutes", "Hours", "Days"};
    private int selectedUnitMultiplier = 1; // 1 for minutes, 60 for hours, 1440 for days

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_file_manager);

        initViews();
        loadUserData();
        setupListeners();
        loadUserFiles();
    }

    private void initViews() {
        btnUploadFile = findViewById(R.id.btnUploadFile);
        btnGenerateQR = findViewById(R.id.btnGenerateQR);
        btnRefreshFiles = findViewById(R.id.btnRefreshFiles);
        listViewFiles = findViewById(R.id.listViewFiles);
        tvSelectedFile = findViewById(R.id.tvSelectedFile);
        tvQRDuration = findViewById(R.id.tvQRDuration);
        tvWelcome = findViewById(R.id.tvWelcome);
        seekBarDuration = findViewById(R.id.seekBarDuration);
        pbLoading = findViewById(R.id.pbLoading);
        pbUpload = findViewById(R.id.pbUpload);
        spinnerDurationUnit = findViewById(R.id.spinnerDurationUnit);

        // Setup duration unit spinner
        ArrayAdapter<String> unitAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, durationUnits);
        unitAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerDurationUnit.setAdapter(unitAdapter);

        // Setup file list adapter
        fileAdapter = new FileAdapter(this, userFiles);
        listViewFiles.setAdapter(fileAdapter);

        // Initially disable QR generation
        btnGenerateQR.setEnabled(false);
    }

    private void loadUserData() {
        // Get user data from intent or shared preferences
        Intent intent = getIntent();
        if (intent.hasExtra("user_id")) {
            userId = intent.getIntExtra("user_id", -1);
            username = intent.getStringExtra("username");
            authToken = intent.getStringExtra("token");
        } else {
            // Load from shared preferences
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            userId = prefs.getInt("user_id", -1);
            username = prefs.getString("username", "");
            authToken = prefs.getString("token", "");
        }

        if (userId != -1 && !username.isEmpty()) {
            tvWelcome.setText("Welcome, " + username + "!");
        } else {
            // Invalid session, redirect to login
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        }
    }

    private void setupListeners() {
        // Upload file button
        btnUploadFile.setOnClickListener(v -> pickFile());

        // File list selection
        listViewFiles.setOnItemClickListener((parent, view, position, id) -> {
            selectedFile = userFiles.get(position);
            tvSelectedFile.setText("Selected: " + selectedFile.getFilename());
            btnGenerateQR.setEnabled(true);
            updateQRDurationText();
        });

        // Duration seekbar
        seekBarDuration.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                updateQRDurationText();
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {}

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {}
        });

        // Duration unit spinner
        spinnerDurationUnit.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                switch (position) {
                    case 0: // Minutes
                        selectedUnitMultiplier = 1;
                        seekBarDuration.setMax(480); // Max 8 hours in minutes
                        seekBarDuration.setProgress(60); // Default 60 minutes
                        break;
                    case 1: // Hours
                        selectedUnitMultiplier = 60;
                        seekBarDuration.setMax(168); // Max 7 days in hours
                        seekBarDuration.setProgress(1); // Default 1 hour
                        break;
                    case 2: // Days
                        selectedUnitMultiplier = 1440;
                        seekBarDuration.setMax(30); // Max 30 days
                        seekBarDuration.setProgress(1); // Default 1 day
                        break;
                }
                updateQRDurationText();
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        // Generate QR button
        btnGenerateQR.setOnClickListener(v -> {
            if (selectedFile != null) {
                // Navigate to QR generation activity
                Intent intent = new Intent(FileManagerActivity.this, QRGenerationActivity.class);
                intent.putExtra("user_id", userId);
                intent.putExtra("username", username);
                intent.putExtra("token", authToken);
                intent.putExtra("file_id", selectedFile.getId());
                intent.putExtra("file_name", selectedFile.getFilename());
                intent.putExtra("duration_minutes", qrDurationMinutes);
                startActivity(intent);
            }
        });

        // Refresh files button
        btnRefreshFiles.setOnClickListener(v -> loadUserFiles());
    }

    private void updateQRDurationText() {
        int seekProgress = seekBarDuration.getProgress();
        if (seekProgress == 0) seekProgress = 1; // Minimum 1 unit

        qrDurationMinutes = seekProgress * selectedUnitMultiplier;
        String unitName = durationUnits[spinnerDurationUnit.getSelectedItemPosition()];

        tvQRDuration.setText("QR Valid for: " + seekProgress + " " +
                (seekProgress == 1 ? unitName.substring(0, unitName.length()-1) : unitName) +
                " (" + qrDurationMinutes + " minutes)");
    }



    private void pickFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_PICKER_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_PICKER_REQUEST && resultCode == RESULT_OK && data != null) {
            Uri fileUri = data.getData();
            if (fileUri != null) {
                uploadFile(fileUri);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == STORAGE_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pickFile();
            } else {
                Toast.makeText(this, "Storage permission required to select files", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void uploadFile(Uri fileUri) {
        String fileName = getFileName(fileUri);
        if (fileName == null) {
            Toast.makeText(this, "Could not get file name", Toast.LENGTH_SHORT).show();
            return;
        }

        Log.d(TAG, "Uploading file: " + fileName);

        pbUpload.setVisibility(View.VISIBLE);
        btnUploadFile.setEnabled(false);

        try {
            // Create temporary file
            InputStream inputStream = getContentResolver().openInputStream(fileUri);
            File tempFile = new File(getCacheDir(), fileName);

            FileOutputStream outputStream = new FileOutputStream(tempFile);
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) > 0) {
                outputStream.write(buffer, 0, length);
            }
            outputStream.close();
            inputStream.close();

            // Upload file to server
            uploadFileToServer(tempFile);

        } catch (IOException e) {
            Log.e(TAG, "Error preparing file for upload", e);
            pbUpload.setVisibility(View.GONE);
            btnUploadFile.setEnabled(true);
            Toast.makeText(this, "Error preparing file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void uploadFileToServer(File file) {
        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        RequestBody fileBody = RequestBody.create(file, MediaType.parse("application/octet-stream"));
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.getName(), fileBody)
                .build();

        Request request = new Request.Builder()
                .url(ApiConfig.getUploadUrl())
                .post(requestBody)
                .addHeader("Authorization", "Bearer " + authToken)
                .build();

        Log.d(TAG, "Uploading to: " + request.url());

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "File upload failed", e);
                runOnUiThread(() -> {
                    pbUpload.setVisibility(View.GONE);
                    btnUploadFile.setEnabled(true);
                    Toast.makeText(FileManagerActivity.this,
                            "Upload failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });

                // Clean up temp file
                if (file.exists()) file.delete();
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                Log.d(TAG, "Upload response code: " + response.code());
                Log.d(TAG, "Upload response body: " + responseBody);

                runOnUiThread(() -> {
                    SessionUtils.checkSessionExpiry(FileManagerActivity.this, response.code());
                    pbUpload.setVisibility(View.GONE);
                    btnUploadFile.setEnabled(true);

                    if (response.isSuccessful()) {
                        try {
                            JSONObject result = new JSONObject(responseBody);
                            boolean success = result.optBoolean("success", false);

                            if (success) {
                                Toast.makeText(FileManagerActivity.this,
                                        "File uploaded successfully!", Toast.LENGTH_SHORT).show();
                                loadUserFiles(); // Refresh file list
                            } else {
                                String message = result.optString("message", "Upload failed");
                                Toast.makeText(FileManagerActivity.this, "Server: " + message, Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing upload response", e);
                            Toast.makeText(FileManagerActivity.this,
                                    "Error: Invalid server response", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        // Try to parse error message from JSON
                        String errorMsg = "Server error: " + response.code();
                        try {
                             JSONObject errJson = new JSONObject(responseBody);
                             if (errJson.has("message")) {
                                 errorMsg = errJson.getString("message");
                             }
                        } catch (JSONException e) {
                            // ignore
                        }
                        Toast.makeText(FileManagerActivity.this, errorMsg, Toast.LENGTH_LONG).show();
                    }
                });

                // Clean up temp file
                if (file.exists()) file.delete();
            }
        });
    }

    private void loadUserFiles() {
        Log.d(TAG, "Loading files for user: " + userId);

        pbLoading.setVisibility(View.VISIBLE);

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        Request request = new Request.Builder()
                .url(ApiConfig.getFilesUrl() + "/" + userId)
                .cacheControl(okhttp3.CacheControl.FORCE_NETWORK)
                .get()
                .addHeader("Authorization", "Bearer " + authToken)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "Failed to load files", e);
                runOnUiThread(() -> {
                    pbLoading.setVisibility(View.GONE);
                    Toast.makeText(FileManagerActivity.this,
                            "Failed to load files: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                Log.d(TAG, "Files response: " + responseBody);

                runOnUiThread(() -> {
                    SessionUtils.checkSessionExpiry(FileManagerActivity.this, response.code());
                    pbLoading.setVisibility(View.GONE);

                    if (response.isSuccessful()) {
                        try {
                            JSONObject result = new JSONObject(responseBody);
                            JSONArray filesArray = result.getJSONArray("files");

                            userFiles.clear();
                            for (int i = 0; i < filesArray.length(); i++) {
                                JSONObject fileObj = filesArray.getJSONObject(i);
                                FileItem fileItem = new FileItem(
                                        fileObj.getInt("id"),
                                        fileObj.getString("filename"),
                                        fileObj.getString("mimetype"),
                                        fileObj.getLong("size"),
                                        fileObj.getString("uploaded_at")
                                );
                                userFiles.add(fileItem);
                            }

                            fileAdapter.notifyDataSetChanged();

                            if (userFiles.isEmpty()) {
                                Toast.makeText(FileManagerActivity.this,
                                        "No files uploaded yet. Upload your first file!", Toast.LENGTH_LONG).show();
                            }

                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing files response", e);
                            Toast.makeText(FileManagerActivity.this,
                                    "Error loading files", Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        Toast.makeText(FileManagerActivity.this,
                                "Failed to load files: " + response.code(), Toast.LENGTH_SHORT).show();
                    }
                });
            }
        });
    }

    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        result = cursor.getString(nameIndex);
                    }
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }

    // File item class
    public static class FileItem {
        private int id;
        private String filename;
        private String mimetype;
        private long size;
        private String uploadedAt;

        public FileItem(int id, String filename, String mimetype, long size, String uploadedAt) {
            this.id = id;
            this.filename = filename;
            this.mimetype = mimetype;
            this.size = size;
            this.uploadedAt = uploadedAt;
        }

        // Getters
        public int getId() { return id; }
        public String getFilename() { return filename; }
        public String getMimetype() { return mimetype; }
        public long getSize() { return size; }
        public String getUploadedAt() { return uploadedAt; }

        public String getSizeFormatted() {
            if (size < 1024) return size + " B";
            if (size < 1024 * 1024) return String.format("%.1f KB", size / 1024.0);
            if (size < 1024 * 1024 * 1024) return String.format("%.1f MB", size / (1024.0 * 1024.0));
            return String.format("%.1f GB", size / (1024.0 * 1024.0 * 1024.0));
        }
    }
}
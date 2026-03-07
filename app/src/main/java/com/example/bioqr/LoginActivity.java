package com.example.bioqr;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.util.Patterns;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    private static final String PREFS_NAME = "BioQRPrefs";

    // UI Elements
    private EditText etUsernameEmail, etPassword;
    private Button btnLogin, btnGoToRegister, btnForgotPassword;
    private CheckBox cbRememberMe;
    private TextView tvUsernameEmailStatus, tvPasswordStatus;
    private ImageView ivUsernameEmailStatus, ivPasswordStatus, ivPasswordToggle;
    private ProgressBar pbLoading;

    private boolean isPasswordVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        initViews();
        setupListeners();
        checkRememberedUser();
        ApiConfig.logConfiguration();
        // Check if coming from registration
        String registeredUsername = getIntent().getStringExtra("registered_username");
        if (registeredUsername != null) {
            etUsernameEmail.setText(registeredUsername);
        }
    }

    private void initViews() {
        // Input fields
        etUsernameEmail = findViewById(R.id.etUsernameEmail);
        etPassword = findViewById(R.id.etPassword);

        // Buttons
        btnLogin = findViewById(R.id.btnLogin);
        btnGoToRegister = findViewById(R.id.btnGoToRegister);
        btnForgotPassword = findViewById(R.id.btnForgotPassword);

        // Checkbox
        cbRememberMe = findViewById(R.id.cbRememberMe);

        // Status indicators
        tvUsernameEmailStatus = findViewById(R.id.tvUsernameEmailStatus);
        tvPasswordStatus = findViewById(R.id.tvPasswordStatus);
        ivUsernameEmailStatus = findViewById(R.id.ivUsernameEmailStatus);
        ivPasswordStatus = findViewById(R.id.ivPasswordStatus);
        ivPasswordToggle = findViewById(R.id.ivPasswordToggle);

        // Progress bar
        pbLoading = findViewById(R.id.pbLoading);
    }

    private void setupListeners() {
        // Username/Email validation
        etUsernameEmail.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                validateUsernameEmail(s.toString());
            }
        });

        // Password validation
        etPassword.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                validatePassword(s.toString());
            }
        });

        // Password toggle
        ivPasswordToggle.setOnClickListener(v -> togglePasswordVisibility());

        // Login button
        btnLogin.setOnClickListener(v -> attemptLogin());

        // Go to register button
        btnGoToRegister.setOnClickListener(v -> {
            Intent intent = new Intent(LoginActivity.this, RegisterActivity.class);
            startActivity(intent);
        });

        // Forgot password button
        btnForgotPassword.setOnClickListener(v -> {
            showToast("Password reset feature coming soon!");
            // TODO: Implement forgot password functionality
        });
    }

    private void validateUsernameEmail(String input) {
        if (input.isEmpty()) {
            setFieldStatus(ivUsernameEmailStatus, tvUsernameEmailStatus, "", FieldStatus.NEUTRAL);
            return;
        }

        boolean isEmail = Patterns.EMAIL_ADDRESS.matcher(input).matches();
        boolean isUsername = input.matches("^[a-zA-Z0-9_]{3,20}$");

        if (isEmail || isUsername) {
            setFieldStatus(ivUsernameEmailStatus, tvUsernameEmailStatus,
                    isEmail ? "Valid email address" : "Valid username", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivUsernameEmailStatus, tvUsernameEmailStatus,
                    "Enter a valid email address or username", FieldStatus.ERROR);
        }
    }

    private void validatePassword(String password) {
        if (password.isEmpty()) {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "", FieldStatus.NEUTRAL);
            return;
        }

        if (password.length() >= 8) {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "Password looks good", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "Password too short", FieldStatus.ERROR);
        }
    }

    private void togglePasswordVisibility() {
        if (isPasswordVisible) {
            etPassword.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
            ivPasswordToggle.setImageResource(R.drawable.ic_eye_closed);
            isPasswordVisible = false;
        } else {
            etPassword.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
            ivPasswordToggle.setImageResource(R.drawable.ic_eye_open);
            isPasswordVisible = true;
        }
        etPassword.setSelection(etPassword.getText().length());
    }

    private void setFieldStatus(ImageView imageView, TextView textView, String message, FieldStatus status) {
        switch (status) {
            case SUCCESS:
                imageView.setImageResource(R.drawable.ic_check_circle);
                imageView.setColorFilter(getColor(R.color.success));
                imageView.setVisibility(View.VISIBLE);
                textView.setText(message);
                textView.setTextColor(getColor(R.color.success));
                break;
            case ERROR:
                imageView.setImageResource(R.drawable.ic_error_circle);
                imageView.setColorFilter(getColor(R.color.error));
                imageView.setVisibility(View.VISIBLE);
                textView.setText(message);
                textView.setTextColor(getColor(R.color.error));
                break;
            case NEUTRAL:
            default:
                imageView.setVisibility(View.GONE);
                textView.setText(message);
                textView.setTextColor(getColor(R.color.text_muted));
                break;
        }
    }

    private void attemptLogin() {
        String usernameEmail = etUsernameEmail.getText().toString().trim();
        String password = etPassword.getText().toString();

        // Validation
        if (usernameEmail.isEmpty() || password.isEmpty()) {
            showToast("Please fill in all fields");
            return;
        }

        setLoading(true);
        performLogin(usernameEmail, password);
    }

    private void performLogin(String usernameEmail, String password) {
        Log.d(TAG, "Attempting login for user: " + usernameEmail);

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build();

        JSONObject json = new JSONObject();
        try {
            // FIXED: Send as single loginField instead of separate username/email
            json.put("loginField", usernameEmail);  // Changed this line
            json.put("password", password);

            // Add debug logging
            Log.d(TAG, "Request JSON: " + json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "Error creating JSON", e);
            setLoading(false);
            showToast("Error creating request");
            return;
        }

        RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json; charset=utf-8")
        );

        Request request = new Request.Builder()
                .url(ApiConfig.getLoginUrl())
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();

        Log.d(TAG, "Sending login request to: " + request.url());
        Log.d(TAG, "Request body: " + json.toString());

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "Login request failed", e);
                Log.e(TAG, "Request URL: " + call.request().url());
                runOnUiThread(() -> {
                    setLoading(false);
                    showToast("Failed to connect to server: " + e.getMessage());
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                Log.d(TAG, "Login response code: " + response.code());
                Log.d(TAG, "Login response: " + responseBody);

                runOnUiThread(() -> {
                    setLoading(false);
                    try {
                        JSONObject result = new JSONObject(responseBody);
                        boolean success = result.optBoolean("success", false);

                        if (success) {
                            // Check if response has tokens structure
                            JSONObject tokens = result.optJSONObject("tokens");
                            String token = "";

                            if (tokens != null) {
                                token = tokens.optString("accessToken", "");
                            } else {
                                // Fallback to old structure
                                token = result.optString("token", "");
                            }

                            // Save user session data
                            JSONObject userData = result.getJSONObject("user");
                            int userId = userData.getInt("id");
                            String username = userData.getString("username");
                            String email = userData.getString("email");

                            saveUserSession(userId, username, email, token);

                            // Save remember me preference
                            if (cbRememberMe.isChecked()) {
                                saveRememberMe(usernameEmail);
                            } else {
                                clearRememberMe();
                            }

                            showToast("Login successful!");

                            // Navigate to main activity
                            Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                            intent.putExtra("user_id", userId);
                            intent.putExtra("username", username);
                            intent.putExtra("email", email);
                            intent.putExtra("token", token);
                            startActivity(intent);
                            finish();
                        } else {
                            String message = result.optString("message", "Login failed");
                            showToast(message);
                            Log.e(TAG, "Login failed: " + message);
                        }
                    } catch (JSONException e) {
                        Log.e(TAG, "Error parsing login response", e);
                        showToast("Error processing server response");
                    }
                });
            }
        });
    }

    private void saveUserSession(int userId, String username, String email, String token) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putInt("user_id", userId);
        editor.putString("username", username);
        editor.putString("email", email);
        editor.putString("token", token);
        editor.putBoolean("logged_in", true);
        editor.apply();
    }

    private void saveRememberMe(String usernameEmail) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("remembered_user", usernameEmail);
        editor.putBoolean("remember_me", true);
        editor.apply();
    }

    private void clearRememberMe() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove("remembered_user");
        editor.putBoolean("remember_me", false);
        editor.apply();
    }

    private void checkRememberedUser() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean rememberMe = prefs.getBoolean("remember_me", false);

        if (rememberMe) {
            String rememberedUser = prefs.getString("remembered_user", "");
            if (!rememberedUser.isEmpty()) {
                etUsernameEmail.setText(rememberedUser);
                cbRememberMe.setChecked(true);
                etPassword.requestFocus();
            }
        }
    }

    private void setLoading(boolean loading) {
        btnLogin.setEnabled(!loading);
        pbLoading.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnLogin.setText(loading ? "" : "Sign In");
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private enum FieldStatus {
        SUCCESS, ERROR, NEUTRAL
    }
}
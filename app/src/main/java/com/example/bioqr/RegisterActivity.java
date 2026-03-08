package com.example.bioqr;

import android.content.Intent;
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
import java.util.regex.Pattern;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class RegisterActivity extends AppCompatActivity {

    private static final String TAG = "RegisterActivity";

    // UI Elements
    private EditText etFirstName, etLastName, etUsername, etEmail, etPassword, etConfirmPassword;
    private Button btnRegister, btnGoToLogin;
    private CheckBox cbTerms, cbNewsletter;
    private TextView tvUsernameStatus, tvEmailStatus, tvPasswordStatus, tvConfirmPasswordStatus;
    private TextView tvPasswordStrength;
    private ImageView ivUsernameStatus, ivEmailStatus, ivPasswordStatus, ivConfirmPasswordStatus;
    private ProgressBar pbPasswordStrength, pbLoading;
    private TextView tvPasswordReqLength, tvPasswordReqLower, tvPasswordReqUpper, tvPasswordReqNumber;

    // Password requirements tracking
    private boolean hasLength = false;
    private boolean hasLowercase = false;
    private boolean hasUppercase = false;
    private boolean hasNumber = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        initViews();
        setupListeners();
    }

    private void initViews() {
        // Input fields
        etFirstName = findViewById(R.id.etFirstName);
        etLastName = findViewById(R.id.etLastName);
        etUsername = findViewById(R.id.etUsername);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);

        // Buttons
        btnRegister = findViewById(R.id.btnRegister);
        btnGoToLogin = findViewById(R.id.btnGoToLogin);

        // Checkboxes
        cbTerms = findViewById(R.id.cbTerms);
        cbNewsletter = findViewById(R.id.cbNewsletter);

        // Status indicators
        tvUsernameStatus = findViewById(R.id.tvUsernameStatus);
        tvEmailStatus = findViewById(R.id.tvEmailStatus);
        tvPasswordStatus = findViewById(R.id.tvPasswordStatus);
        tvConfirmPasswordStatus = findViewById(R.id.tvConfirmPasswordStatus);
        tvPasswordStrength = findViewById(R.id.tvPasswordStrength);

        ivUsernameStatus = findViewById(R.id.ivUsernameStatus);
        ivEmailStatus = findViewById(R.id.ivEmailStatus);
        ivPasswordStatus = findViewById(R.id.ivPasswordStatus);
        ivConfirmPasswordStatus = findViewById(R.id.ivConfirmPasswordStatus);

        // Progress bars
        pbPasswordStrength = findViewById(R.id.pbPasswordStrength);
        pbLoading = findViewById(R.id.pbLoading);

        // Password requirements
        tvPasswordReqLength = findViewById(R.id.tvPasswordReqLength);
        tvPasswordReqLower = findViewById(R.id.tvPasswordReqLower);
        tvPasswordReqUpper = findViewById(R.id.tvPasswordReqUpper);
        tvPasswordReqNumber = findViewById(R.id.tvPasswordReqNumber);
    }

    private void setupListeners() {
        // Username validation
        etUsername.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                validateUsername(s.toString());
            }
        });

        // Email validation
        etEmail.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                validateEmail(s.toString());
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
                validatePasswordMatch();
            }
        });

        // Confirm password validation
        etConfirmPassword.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                validatePasswordMatch();
            }
        });

        // Register button
        btnRegister.setOnClickListener(v -> attemptRegistration());

        // Go to login button
        btnGoToLogin.setOnClickListener(v -> {
            Intent intent = new Intent(RegisterActivity.this, LoginActivity.class);
            startActivity(intent);
            finish();
        });
    }

    private void validateUsername(String username) {
        if (username.isEmpty()) {
            setFieldStatus(ivUsernameStatus, tvUsernameStatus, "", FieldStatus.NEUTRAL);
            return;
        }

        Pattern pattern = Pattern.compile("^[a-zA-Z0-9_]{3,20}$");
        boolean isValid = pattern.matcher(username).matches();

        if (isValid) {
            setFieldStatus(ivUsernameStatus, tvUsernameStatus, "Username available", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivUsernameStatus, tvUsernameStatus, "3-20 characters, letters, numbers, and underscores only", FieldStatus.ERROR);
        }
    }

    private void validateEmail(String email) {
        if (email.isEmpty()) {
            setFieldStatus(ivEmailStatus, tvEmailStatus, "", FieldStatus.NEUTRAL);
            return;
        }

        boolean isValid = Patterns.EMAIL_ADDRESS.matcher(email).matches();

        if (isValid) {
            setFieldStatus(ivEmailStatus, tvEmailStatus, "Valid email address", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivEmailStatus, tvEmailStatus, "Please enter a valid email address", FieldStatus.ERROR);
        }
    }

    private void validatePassword(String password) {
        if (password.isEmpty()) {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "", FieldStatus.NEUTRAL);
            resetPasswordRequirements();
            pbPasswordStrength.setProgress(0);
            tvPasswordStrength.setText("Password strength: Weak");
            return;
        }

        // Check requirements
        hasLength = password.length() >= 8;
        hasLowercase = password.matches(".*[a-z].*");
        hasUppercase = password.matches(".*[A-Z].*");
        hasNumber = password.matches(".*\\d.*");

        // Update requirement indicators
        updatePasswordRequirement(tvPasswordReqLength, hasLength);
        updatePasswordRequirement(tvPasswordReqLower, hasLowercase);
        updatePasswordRequirement(tvPasswordReqUpper, hasUppercase);
        updatePasswordRequirement(tvPasswordReqNumber, hasNumber);

        // Calculate strength
        int metRequirements = 0;
        if (hasLength) metRequirements++;
        if (hasLowercase) metRequirements++;
        if (hasUppercase) metRequirements++;
        if (hasNumber) metRequirements++;

        int strength = 0;
        String strengthLabel = "Weak";
        int color = getColor(R.color.error);

        switch (metRequirements) {
            case 4:
                strength = 100;
                strengthLabel = "Strong";
                color = getColor(R.color.success);
                break;
            case 3:
                strength = 75;
                strengthLabel = "Good";
                color = getColor(R.color.info);
                break;
            case 2:
                strength = 50;
                strengthLabel = "Fair";
                color = getColor(R.color.warning);
                break;
            case 1:
                strength = 25;
                strengthLabel = "Weak";
                color = getColor(R.color.error);
                break;
        }

        pbPasswordStrength.setProgress(strength);
        pbPasswordStrength.getProgressDrawable().setColorFilter(color, android.graphics.PorterDuff.Mode.SRC_IN);
        tvPasswordStrength.setText("Password strength: " + strengthLabel);
        tvPasswordStrength.setTextColor(color);

        if (metRequirements == 4) {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "Strong password", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivPasswordStatus, tvPasswordStatus, "Password doesn't meet all requirements", FieldStatus.ERROR);
        }
    }

    private void validatePasswordMatch() {
        String password = etPassword.getText().toString();
        String confirmPassword = etConfirmPassword.getText().toString();

        if (confirmPassword.isEmpty()) {
            setFieldStatus(ivConfirmPasswordStatus, tvConfirmPasswordStatus, "", FieldStatus.NEUTRAL);
            return;
        }

        if (password.equals(confirmPassword)) {
            setFieldStatus(ivConfirmPasswordStatus, tvConfirmPasswordStatus, "Passwords match", FieldStatus.SUCCESS);
        } else {
            setFieldStatus(ivConfirmPasswordStatus, tvConfirmPasswordStatus, "Passwords do not match", FieldStatus.ERROR);
        }
    }

    private void updatePasswordRequirement(TextView textView, boolean met) {
        if (met) {
            textView.setTextColor(getColor(R.color.success));
            textView.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_check_circle, 0, 0, 0);
        } else {
            textView.setTextColor(getColor(R.color.text_muted));
            textView.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_circle, 0, 0, 0);
        }
    }

    private void resetPasswordRequirements() {
        hasLength = false;
        hasLowercase = false;
        hasUppercase = false;
        hasNumber = false;

        updatePasswordRequirement(tvPasswordReqLength, false);
        updatePasswordRequirement(tvPasswordReqLower, false);
        updatePasswordRequirement(tvPasswordReqUpper, false);
        updatePasswordRequirement(tvPasswordReqNumber, false);
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

    private void attemptRegistration() {
        String firstName = etFirstName.getText().toString().trim();
        String lastName = etLastName.getText().toString().trim();
        String username = etUsername.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString();
        String confirmPassword = etConfirmPassword.getText().toString();

        // Validation
        if (firstName.isEmpty() || lastName.isEmpty() || username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            showToast("Please fill in all required fields");
            return;
        }

        if (!password.equals(confirmPassword)) {
            showToast("Passwords do not match");
            return;
        }

        if (!hasLength || !hasLowercase || !hasUppercase || !hasNumber) {
            showToast("Please meet all password requirements");
            return;
        }

        if (!cbTerms.isChecked()) {
            showToast("Please agree to the Terms of Service and Privacy Policy");
            return;
        }

        setLoading(true);
        performRegistration(firstName, lastName, username, email, password);
    }

    private void performRegistration(String firstName, String lastName, String username, String email, String password) {
        Log.d(TAG, "Attempting registration for user: " + username);

        OkHttpClient client = NetworkClient.getClient();

        JSONObject json = new JSONObject();
        try {
            json.put("first_name", firstName);
            json.put("last_name", lastName);
            json.put("username", username);
            json.put("email", email);
            json.put("password", password);
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
                .url(ApiConfig.getRegisterUrl())
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();

        Log.d(TAG, "Sending registration request: " + json.toString());

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(@NonNull Call call, @NonNull IOException e) {
                Log.e(TAG, "Registration request failed", e);
                runOnUiThread(() -> {
                    setLoading(false);
                    showToast("Failed to connect to server: " + e.getMessage());
                });
            }

            @Override
            public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
                String responseBody = response.body().string();
                Log.d(TAG, "Registration response: " + responseBody);

                runOnUiThread(() -> {
                    setLoading(false);
                    try {
                        JSONObject result = new JSONObject(responseBody);
                        boolean success = result.optBoolean("success", false);

                        if (success) {
                            showToast("Account created successfully! Please login.");
                            Intent intent = new Intent(RegisterActivity.this, LoginActivity.class);
                            intent.putExtra("registered_username", username);
                            startActivity(intent);
                            finish();
                        } else {
                            String message = result.optString("message", "Registration failed");
                            showToast(message);
                        }
                    } catch (JSONException e) {
                        Log.e(TAG, "Error parsing registration response", e);
                        showToast("Error processing server response");
                    }
                });
            }
        });
    }

    private void setLoading(boolean loading) {
        btnRegister.setEnabled(!loading);
        pbLoading.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnRegister.setText(loading ? "" : "Create Account");
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private enum FieldStatus {
        SUCCESS, ERROR, NEUTRAL
    }
}
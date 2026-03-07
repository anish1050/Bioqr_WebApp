package com.example.bioqr;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;

public class SessionUtils {

    public static void checkSessionExpiry(Activity activity, int responseCode) {
        if (responseCode == 401 || responseCode == 403) {
            showSessionExpiredDialog(activity);
        }
    }

    private static void showSessionExpiredDialog(final Activity activity) {
        if (activity.isFinishing()) {
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                new AlertDialog.Builder(activity)
                        .setTitle("Session Expired")
                        .setMessage("Your session has expired. Please log in again.")
                        .setCancelable(false)
                        .setPositiveButton("OK", new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                redirectToLogin(activity);
                            }
                        })
                        .show();
            }
        });
    }

    private static void redirectToLogin(Activity activity) {
        // Clear any stored user data/tokens here if necessary (e.g., SharedPreferences)
        // For now, we'll just redirect to LoginActivity
        Intent intent = new Intent(activity, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        activity.startActivity(intent);
        activity.finish();
    }
}

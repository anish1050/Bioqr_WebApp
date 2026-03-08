package com.example.bioqr;

import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import okhttp3.Cookie;
import okhttp3.CookieJar;
import okhttp3.HttpUrl;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class NetworkClient {
    private static OkHttpClient client = null;
    private static String csrfToken = null;
    private static CookieJar sharedCookieJar = null;

    public static synchronized OkHttpClient getClient() {
        if (client == null) {
            sharedCookieJar = new CookieJar() {
                private final HashMap<String, List<Cookie>> cookieStore = new HashMap<>();

                @Override
                public void saveFromResponse(HttpUrl url, List<Cookie> cookies) {
                    cookieStore.put(url.host(), cookies);
                }

                @Override
                public List<Cookie> loadForRequest(HttpUrl url) {
                    List<Cookie> cookies = cookieStore.get(url.host());
                    return cookies != null ? cookies : new ArrayList<Cookie>();
                }
            };

            Interceptor csrfInterceptor = new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                    Request request = chain.request();

                    if (request.method().equals("POST") || request.method().equals("PUT") || request.method().equals("DELETE")) {
                        if (csrfToken == null) {
                            fetchCsrfTokenSync();
                        }
                        if (csrfToken != null) {
                            request = request.newBuilder()
                                    .header("x-csrf-token", csrfToken)
                                    .build();
                        }
                    }

                    Response response = chain.proceed(request);

                    if (response.code() == 403) {
                        try {
                            String bodyString = response.peekBody(2048).string();
                            if (bodyString.toLowerCase().contains("csrf")) {
                                response.close();
                                fetchCsrfTokenSync();
                                if (csrfToken != null) {
                                    Request newRequest = request.newBuilder()
                                            .header("x-csrf-token", csrfToken)
                                            .build();
                                    return chain.proceed(newRequest);
                                }
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    return response;
                }
            };

            client = new OkHttpClient.Builder()
                    .cookieJar(sharedCookieJar)
                    .addInterceptor(csrfInterceptor)
                    .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                    .build();
        }
        return client;
    }

    private static synchronized void fetchCsrfTokenSync() {
        if (sharedCookieJar == null) return;

        OkHttpClient tokenClient = new OkHttpClient.Builder()
                .cookieJar(sharedCookieJar)
                .build();

        Request request = new Request.Builder()
                .url(ApiConfig.SERVER_BASE_URL + "/bioqr/csrf-token")
                .get()
                .build();

        try {
            Response response = tokenClient.newCall(request).execute();
            if (response.isSuccessful() && response.body() != null) {
                String body = response.body().string();
                JSONObject json = new JSONObject(body);
                csrfToken = json.optString("csrfToken", null);
            }
            response.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.example.bioqr"
    compileSdk = 35
    
    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.example.bioqr"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        // Server configuration - can be overridden via gradle.properties or environment variables
        buildConfigField("String", "SERVER_URL", "\"${findProperty("BIOQR_SERVER_URL") ?: ""}\"")
        buildConfigField("String", "SERVER_HOST", "\"${findProperty("BIOQR_SERVER_HOST") ?: "localhost"}\"")
        buildConfigField("String", "SERVER_PORT", "\"${findProperty("BIOQR_SERVER_PORT") ?: "3000"}\"")
    }

    buildTypes {
        debug {
            isDebuggable = true
            // For debug builds, use localhost by default
            buildConfigField("String", "SERVER_URL", "\"${findProperty("BIOQR_SERVER_URL") ?: "http://localhost:3000"}\"")
        }
        
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // For release builds, require explicit server URL
            buildConfigField("String", "SERVER_URL", "\"${findProperty("BIOQR_SERVER_URL") ?: "https://your-production-server.com:3000"}\"")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {

    implementation(libs.appcompat)
    implementation(libs.material)
    implementation(libs.activity)
    implementation(libs.constraintlayout)
    testImplementation(libs.junit)
    androidTestImplementation(libs.ext.junit)
    androidTestImplementation(libs.espresso.core)

    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    implementation("com.squareup.okhttp3:okhttp:4.9.3")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    implementation("com.google.zxing:core:3.4.1")

}
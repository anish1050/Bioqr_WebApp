import * as faceapi from 'face-api.js';
import { Canvas, Image, ImageData, loadImage } from 'canvas';
import { join } from 'path';

// Need to monkey patch faceapi to use canvas instead of standard DOM elements
// Note: as of face-api.js 0.22+, `env.monkeyPatch` handles this nicely
const monkeyPatch = () => {
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);
};

// Will be called when server starts
export const initFaceRecognitionModels = async () => {
    try {
        monkeyPatch();

        // Assuming models are present in public/models
        // Using `cwd()` as the robust path root depending on how the server is run
        const modelsPath = join(process.cwd(), 'public', 'models');
        
        console.log(`Loading face-api.js models from ${modelsPath}...`);
        
        // We need TinyFaceDetector for detection and the RecognitionNet for descriptors.
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath),
            faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
            faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
        ]);
        
        console.log('✅ Face recognition native models loaded onto backend.');
    } catch (error) {
        console.error('❌ Failed to load face recognition native models:', error);
    }
};

/**
 * Given a base64 image string (e.g., from an HTML Canvas),
 * returns the 128-dimensional Float32Array descriptor.
 * Uses a two-pass approach: first with standard settings, then a more lenient fallback.
 */
export const extractFaceDescriptorFromBase64 = async (base64Image: string): Promise<Float32Array | null> => {
    try {
        // Strip out the data:image/png;base64, prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Load the image into a canvas-compatible Image object
        const img = await loadImage(imageBuffer);
        console.log(`🔍 Face detection: image loaded (${(img as any).width}x${(img as any).height})`);
        
        // Pass 1: Standard detection with tuned parameters
        const options1 = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.3 });
        let detection = await faceapi.detectSingleFace(img as any, options1)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            console.log(`✅ Face detected (pass 1) — score: ${detection.detection.score.toFixed(4)}`);
            return detection.descriptor;
        }
        
        console.log("⚠️ Pass 1 failed, trying lenient fallback (inputSize: 320, threshold: 0.15)...");

        // Pass 2: More lenient fallback for difficult images
        const options2 = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.15 });
        detection = await faceapi.detectSingleFace(img as any, options2)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            console.log(`✅ Face detected (pass 2 fallback) — score: ${detection.detection.score.toFixed(4)}`);
            return detection.descriptor;
        }

        console.log("❌ No face detected after both passes.");
        return null;
    } catch (error) {
        console.error("❌ Error extracting descriptor on backend:", error);
        return null;
    }
};

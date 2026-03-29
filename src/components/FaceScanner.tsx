import React, { useRef, useEffect, useState } from "react";
import { Camera, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import "./FaceScanner.css";

interface FaceScannerProps {
  onCapture: (base64Image: string) => Promise<void> | void;
  statusText?: string;
  actionLabel?: string;
}

const FaceScanner: React.FC<FaceScannerProps> = ({ 
  onCapture, 
  statusText = "Align your face for Bio-Verification",
  actionLabel = "Verification Successful"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    enumerateDevices();
    return () => stopVideo();
  }, []);

  const enumerateDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === "videoinput");
      setDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        // AI Logic: Prioritize actual hardware over virtual software cameras
        const physicalCamera = videoDevices.find(d => {
          const label = d.label.toLowerCase();
          if (!label) return false;
          // Priority 1: Trusted hardware names
          if (label.includes('uvc webcam') || label.includes('integrated')) return true;
          // Priority 2: Not a known virtual camera
          return !label.includes('virtual') && !label.includes('a16') && !label.includes('obs') && !label.includes('droidcam');
        });

        // Smart defaulting: switch to physical if no ID is set, or if current ID is a virtual placeholder
        const currentLabel = videoDevices.find(d => d.deviceId === selectedDeviceId)?.label.toLowerCase() || "";
        const isCurrentVirtual = currentLabel.includes('virtual') || currentLabel.includes('a16');

        if (!selectedDeviceId || (isCurrentVirtual && physicalCamera)) {
          const nextId = physicalCamera ? physicalCamera.deviceId : videoDevices[0].deviceId;
          if (nextId !== selectedDeviceId) {
            setSelectedDeviceId(nextId);
            console.log(`📸 BioQR: Auto-selected hardware camera: ${physicalCamera?.label || videoDevices[0].label}`);
          }
        }
      }
    } catch (err) {
      console.error("Error listing cameras:", err);
    }
  };

  useEffect(() => {
    if (!captured) {
      startVideo(selectedDeviceId);
    }
  }, [captured, selectedDeviceId]);

  const startVideo = async (deviceId?: string) => {
    try {
      stopVideo();
      const constraints = { 
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480, facingMode: "user" } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play error:", e));
          setIsCameraReady(true);
        };
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permissions in your browser.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not access camera. Make sure it's not being used by another app.");
      }
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
  };

  const handleScan = async () => {
    if (!videoRef.current) return;
    
    setScanning(true);
    setError(null);

    try {
      // Create a temporary canvas to take the snapshot
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Export as base64 JPEG
        const base64Image = canvas.toDataURL("image/jpeg", 0.9);
        
        await onCapture(base64Image);
        
        // Only trigger the green success state if onCapture finishes without throwing errors
        setCaptured(true);
      } else {
        throw new Error("Canvas context is not available");
      }
    } catch (err) {
      console.error("Scan error:", err);
      // If parent throws, we do NOT setCaptured(true).
      // The parent component controls rendering the specific error message, so we just reset scanning state.
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setCaptured(false);
    setError(null);
    startVideo(selectedDeviceId);
  };

  return (
    <div className="face-scanner-container">
      <div className="video-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className={captured ? "hidden" : ""}
        />
        {captured && (
          <div className="capture-success">
            <CheckCircle2 size={64} color="#10b981" />
            <p>{actionLabel}!</p>
          </div>
        )}
        <div className="overlay-circle" />
      </div>

      <div className="scanner-controls">
        {!captured ? (
          <>
            <p className="status-msg">{statusText}</p>
            {error && (
              <div className="scanner-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {devices.length > 1 && (
              <select 
                className="camera-select" 
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                disabled={scanning}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            )}
            <button 
              className="scan-btn" 
              onClick={handleScan} 
              disabled={scanning || !isCameraReady}
            >
              {scanning ? (
                <>
                  <RefreshCw className="spinner-small" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera size={18} />
                  Take Photo
                </>
              )}
            </button>
          </>
        ) : (
          <button className="reset-btn" onClick={handleReset}>
            <RefreshCw size={18} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceScanner;

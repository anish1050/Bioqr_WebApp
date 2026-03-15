import React, { useState, useEffect } from "react";
import {
  X,
  Loader,
  XCircle,
  Download,
  Share2,
  QrCode,
  Shield,
  Camera,
} from "lucide-react";
import { useBiometricVerification } from "./BiometricVerifier";
import FaceScanner from "./FaceScanner";
import "./QRModal.css";

const API_BASE = "";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  filename: string;
  accessToken: string;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "24 hours" },
];

const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  fileId,
  filename,
  accessToken,
}) => {
  const [step, setStep] = useState<"form" | "verifying" | "generated">("form");
  const [duration, setDuration] = useState(1);
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUnshareable, setIsUnshareable] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [useFaceScanner, setUseFaceScanner] = useState(false);
  const [hasFaceEnrolled, setHasFaceEnrolled] = useState(false);

  const { verify, reset: resetBiometric } = useBiometricVerification();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setQrImage(null);
      setToken(null);
      setError(null);
      setCopied(false);
      setUseFaceScanner(false);
      resetBiometric();
    } else {
      // Check biometric statuses
      const checkStatus = async () => {
        try {
          const [faceRes, webAuthnRes] = await Promise.all([
            fetch(`${API_BASE}/bioqr/auth/face/status`, {
              headers: { "Authorization": `Bearer ${accessToken}` }
            }),
            fetch(`${API_BASE}/bioqr/auth/webauthn/credentials`, {
              headers: { "Authorization": `Bearer ${accessToken}` }
            })
          ]);

          const faceData = await faceRes.json();
          const webAuthnData = await webAuthnRes.json();

          const faceEnrolled = !!faceData.enrolled;
          const webAuthnEnrolled = !!(webAuthnData.credentials && webAuthnData.credentials.length > 0);

          setHasFaceEnrolled(faceEnrolled);
          
          // If ONLY face is enrolled, default to face scanner automatically
          if (faceEnrolled && !webAuthnEnrolled) {
            setUseFaceScanner(true);
          }
        } catch (err) {
          console.error("Error checking biometric status:", err);
        }
      };
      checkStatus();
    }
  }, [isOpen, resetBiometric, accessToken]);

  const handleGenerateQR = async () => {
    setError(null);
    setStep("verifying");

    try {
      // If we are already in the FaceScanner step, this won't be called directly 
      // handleFaceCapture handles it instead.
      if (!useFaceScanner) {
        await verify();
        await completeQRGeneration();
      }
    } catch (err: any) {
      console.error("QR generation error:", err);
      setError(err.message || "An error occurred");
      setStep("form");
    }
  };

  const handleFaceCapture = async (base64Image: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/bioqr/auth/face/verify`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Image }),
      });

      if (!response.ok) {
        throw new Error("Face verification failed. Please try again or check lighting.");
      }

      await completeQRGeneration();
    } catch (err: any) {
      setError(err.message || "Face recognition failed");
      // Intentionally not setting useFaceScanner to false so they can try again
      throw err;
    }
  };

  const completeQRGeneration = async () => {
    const response = await fetch(`${API_BASE}/bioqr/generate-qr`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        file_id: fileId,
        duration,
        is_one_time: isOneTime,
        is_unshareable: isUnshareable,
      }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate QR code");
    }

    const data = await response.json();
    setQrImage(data.qrImage);
    setToken(data.token);
    setExpiresAt(data.expiresAt);
    setStep("generated");
  };

  const handleShareQR = async () => {
    if (!token) return;
    const link = `${window.location.origin}/access-file/${token}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Secure BioQR File',
          text: `Authorized file access: ${filename}`,
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Error sharing:", err);
          // Fallback to copy if share fails
          handleCopyFallback(link);
        }
      }
    } else {
      // Fallback for desktop/unsupported browsers
      handleCopyFallback(link);
    }
  };

  const handleCopyFallback = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.download = `qr-${filename}-${token?.slice(0, 8)}.png`;
    link.href = qrImage;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h3>
            <QrCode size={20} style={{ marginRight: "8px" }} />
            QR Code
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="qr-modal-content">
          {step === "form" && (
            <>
              <div className="file-info">
                <p>
                  <strong>File:</strong> {filename}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration (minutes)</label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isOneTime}
                    onChange={(e) => setIsOneTime(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  One-time use (QR becomes invalid after first scan)
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isUnshareable}
                    onChange={(e) => setIsUnshareable(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Unshareable (prevents direct download, forces secure viewer)
                </label>
              </div>

              <div className="security-notice">
                <Shield size={16} />
                <span>
                  You will need to authenticate with your face to generate this QR code.
                </span>
              </div>

              {error && (
                <div className="error-message">
                  <XCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button className="generate-btn" onClick={handleGenerateQR}>
                <QrCode size={18} />
                Generate QR (Face Auth Required)
              </button>
            </>
          )}

          {step === "verifying" && (
            <div className="verifying-state">
              {useFaceScanner ? (
                <FaceScanner 
                  onCapture={handleFaceCapture} 
                  statusText="Look directly at the camera to authorize"
                  actionLabel="Identity Confirmed"
                />
              ) : (
                <>
                  <Loader className="spinner large" size={48} />
                  <p>Please use your native biometric device (Passkey) to authorize QR code generation...</p>
                  {hasFaceEnrolled && (
                    <button 
                      className="switch-method-btn" 
                      onClick={() => setUseFaceScanner(true)}
                    >
                      <Camera size={18} />
                      Use Webcam Face ID instead
                    </button>
                  )}
                </>
              )}
              <div className="verification-actions">
                <button className="cancel-btn" onClick={() => setStep("form")}>
                  Cancel
                </button>
                {useFaceScanner && (
                  <button className="native-btn" onClick={() => setUseFaceScanner(false)}>
                    Use Native Passkey
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "generated" && qrImage && (
            <div className="qr-generated-container">
              <div className="qr-display">
                <img src={qrImage} alt="Generated QR Code" />
              </div>
 
              {expiresAt && (
                <p className="expiry-info">
                  Expires: {new Date(expiresAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}

              <div className="qr-actions">
                <button className="action-btn download-btn" onClick={handleDownloadQR}>
                  <Download size={18} />
                  Download PNG
                </button>
                <button className="action-btn share-btn" onClick={handleShareQR}>
                  <Share2 size={18} />
                  {copied ? "Link Copied!" : "Share QR Code"}
                </button>
              </div>

              <p className="qr-note">
                {isOneTime
                  ? "⚠️ This QR code can be scanned only once."
                  : "This QR code can be scanned multiple times until it expires."}
                {isUnshareable
                  ? " Files will be displayed in secure viewer with protection."
                  : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRModal;

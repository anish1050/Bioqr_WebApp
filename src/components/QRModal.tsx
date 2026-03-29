import React, { useState, useEffect } from "react";
import {
  X,
  Loader,
  XCircle,
  Download,
  QrCode,
  MapPin,
  Settings,
  ChevronDown,
  ChevronUp,
  User,
  Hash,
  Type,
  Info
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
  { value: 60, label: "1 hour" },
  { value: 1440, label: "24 hours" },
  { value: 10080, label: "1 week" },
  { value: 525600, label: "1 year" },
];

const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  fileId,
  filename,
  accessToken,
}) => {
  const [step, setStep] = useState<"form" | "verifying" | "generated">("form");
  const [qrType, setQrType] = useState<"file" | "vcard" | "text">("file");
  const [duration, setDuration] = useState(1);
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUnshareable, setIsUnshareable] = useState(false);
  const [requireAuth, setRequireAuth] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [passkeyEnrolled, setPasskeyEnrolled] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"face" | "passkey">("face");
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isCrossHighlighted, setIsCrossHighlighted] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);

  // Windows-style Alert Sound (Synthesized)
  const playWindowsAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // Slide up to A5

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio context not available");
    }
  };

  const handleOutsideClick = () => {
    playWindowsAlert();
    setIsShaking(true);
    setIsCrossHighlighted(true);
    setTimeout(() => {
      setIsShaking(false);
      setIsCrossHighlighted(false);
    }, 300);
  };

  // V2 Fields
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("100");
  const [styleColor, setStyleColor] = useState("#000000");
  const [styleBg, setStyleBg] = useState("#FFFFFF");
  const [vcard, setVcard] = useState({ firstName: "", lastName: "", tel: "", email: "", org: "" });
  const [textContent, setTextContent] = useState("");

  const { verify, reset: resetBiometric } = useBiometricVerification();

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setQrImage(null);
      setToken(null);
      setError(null);
      setCopied(false);
      setFaceEnrolled(false);
      setPasskeyEnrolled(false);
      setIsStatusLoading(true);
      resetBiometric();
    } else {
      const checkStatus = async () => {
        setIsStatusLoading(true);
        try {
          const [faceRes, webRes] = await Promise.all([
            fetch(`${API_BASE}/bioqr/auth/face/status`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
            fetch(`${API_BASE}/bioqr/auth/webauthn/credentials`, { headers: { "Authorization": `Bearer ${accessToken}` } })
          ]);
          const faceData = await faceRes.json();
          const webData = await webRes.json();

          const face = !!faceData.enrolled;
          const pass = !!(webData.credentials && webData.credentials.length > 0);

          setFaceEnrolled(face);
          setPasskeyEnrolled(pass);
          
          if (face) {
            setSelectedMethod("face");
          } else if (pass) {
            setSelectedMethod("passkey");
          }
        } catch (err) { 
          console.error("Error checking biometric status:", err); 
        } finally {
          setIsStatusLoading(false);
        }
      };
      checkStatus();
    }
  }, [isOpen, resetBiometric, accessToken]);

  const handleGenerateQR = async () => {
    if (isStatusLoading) return; // Prevent race conditions
    setError(null);

    if (!faceEnrolled && !passkeyEnrolled) {
      setError("No biometric credentials enrolled. Please visit Security settings.");
      return;
    }

    if (selectedMethod === "passkey") {
      setStep("verifying");
      try {
        await verify();
        await completeQRGeneration();
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setStep("form");
      }
    } else {
      setStep("verifying");
    }
  };

  const handleFaceCapture = async (base64Image: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/bioqr/auth/face/verify`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image }),
      });
      if (!response.ok) throw new Error("Face verification failed.");
      await completeQRGeneration();
    } catch (err: any) { setError(err.message || "Face recognition failed"); throw err; }
  };

  const completeQRGeneration = async () => {
    const payload: any = {
      qr_type: qrType,
      duration,
      is_one_time: isOneTime,
      is_unshareable: isUnshareable,
      require_auth: requireAuth,
      style_color: styleColor,
      style_bg: styleBg,
    };

    if (qrType === "file") payload.file_id = fileId;
    if (qrType === "vcard") payload.vcard_data = vcard;
    if (qrType === "text") payload.text_content = textContent;

    if (lat && lng) {
      payload.latitude = lat;
      payload.longitude = lng;
      payload.radius = radius;
    }

    const response = await fetch(`${API_BASE}/bioqr/generate-qr`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Failed to generate QR code");
    const data = await response.json();
    setQrImage(data.qrImage);
    setToken(data.token);
    setExpiresAt(data.expiresAt);
    setStep("generated");
  };

  const handleShareQR = async () => {
    if (!token) return;
    const link = (qrImage?.includes("localhost") || !process.env.NODE_ENV)
      ? `${window.location.protocol}//${window.location.host}/access-file/${token}`
      : `${window.location.origin}/access-file/${token}`;

    if (navigator.share) {
      await navigator.share({ title: 'BioQR Secure', url: link }).catch(() => null);
    } else {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    });
  };

  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay" onClick={handleOutsideClick}>
      <div className={`qr-modal ${isShaking ? 'modal-shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h3><QrCode size={20} style={{ marginRight: "8px" }} /> QR V2 Generator</h3>
          <button 
            className={`close-btn ${isCrossHighlighted ? 'close-btn-highlight' : ''}`} 
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="qr-modal-content">
          {step === "form" && (
            <>
              <div className="qr-tabs">
                <button className={`qr-tab ${qrType === 'file' ? 'active' : ''}`} onClick={() => setQrType('file')}><Hash size={16} /> File</button>
                <button className={`qr-tab ${qrType === 'vcard' ? 'active' : ''}`} onClick={() => setQrType('vcard')}><User size={16} /> Contact</button>
                <button className={`qr-tab ${qrType === 'text' ? 'active' : ''}`} onClick={() => setQrType('text')}><Type size={16} /> Text</button>
              </div>

              {qrType === 'file' && <div className="file-info"><p><strong>Target:</strong> {filename}</p></div>}
              {qrType === 'text' && (
                <div className="form-group">
                  <label>Message Content</label>
                  <textarea 
                    value={textContent} 
                    onChange={e => setTextContent(e.target.value)} 
                    placeholder="Enter the text to encode in the QR..."
                    className="qr-textarea"
                  />
                </div>
              )}
              {qrType === 'vcard' && (
                <div className="settings-grid" style={{ marginBottom: '1rem' }}>
                  <div className="input-row"><label>First Name</label><input value={vcard.firstName} onChange={e => setVcard({ ...vcard, firstName: e.target.value })} /></div>
                  <div className="input-row"><label>Last Name</label><input value={vcard.lastName} onChange={e => setVcard({ ...vcard, lastName: e.target.value })} /></div>
                  <div className="input-row" style={{ gridColumn: 'span 2' }}><label>Email</label><input value={vcard.email} onChange={e => setVcard({ ...vcard, email: e.target.value })} /></div>
                </div>
              )}

              <div className="form-group">
                <div className="label-with-info">
                    <label>Validity Duration</label>
                    <div className="info-tooltip-container">
                        <Info size={14} className="info-icon" />
                        <span className="tooltip-text">How long the QR code remains active before it automatically expires.</span>
                    </div>
                </div>
                <div className="duration-selector-container">
                    <select 
                        value={showCustomDuration ? "custom" : duration} 
                        onChange={(e) => {
                            if (e.target.value === "custom") {
                                setShowCustomDuration(true);
                            } else {
                                setShowCustomDuration(false);
                                setDuration(Number(e.target.value));
                            }
                        }}
                    >
                        {DURATION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        <option value="custom">Custom Duration...</option>
                    </select>
                    {showCustomDuration && (
                        <div className="custom-duration-input" style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={(e) => setDuration(Number(e.target.value))} 
                                min="1"
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Minutes</span>
                        </div>
                    )}
                </div>
              </div>

              <div className="checkbox-group">
                <div className="checkbox-item-container">
                    <label className="checkbox-label"><input type="checkbox" checked={isOneTime} onChange={(e) => setIsOneTime(e.target.checked)} /> One-time use</label>
                    <div className="info-tooltip-container">
                        <Info size={14} className="info-icon" />
                        <span className="tooltip-text">QR code becomes invalid immediately after the first successful scan.</span>
                    </div>
                </div>

                <div className="checkbox-item-container">
                    <label className="checkbox-label"><input type="checkbox" checked={isUnshareable} onChange={(e) => setIsUnshareable(e.target.checked)} /> Unshareable (Protected View)</label>
                    <div className="info-tooltip-container">
                        <Info size={14} className="info-icon" />
                        <span className="tooltip-text">Enables Spotlight mode (hides most of the screen) and adds a dynamic watermark of the viewer's IP/Location.</span>
                    </div>
                </div>

                <div className="checkbox-item-container">
                    <label className="checkbox-label"><input type="checkbox" checked={requireAuth} onChange={(e) => setRequireAuth(e.target.checked)} /> 🧬 Biometric Lock on Scan</label>
                    <div className="info-tooltip-container">
                        <Info size={14} className="info-icon" />
                        <span className="tooltip-text">The person scanning must verify their face against YOUR profile before the file is revealed.</span>
                    </div>
                </div>
              </div>

              <button className="settings-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} /> Advanced (Geofencing & Styling)
                    <div className="info-tooltip-container" onClick={(e) => e.stopPropagation()}>
                        <Info size={14} className="info-icon" />
                        <span className="tooltip-text">Restrict scans to a specific location (Geofencing) or customize the visual appearance of the QR.</span>
                    </div>
                </span>
                {advancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {advancedOpen && (
                <div className="advanced-settings">
                  <div className="settings-grid">
                    <div className="input-row"><label>Latitude</label><input value={lat} onChange={e => setLat(e.target.value)} placeholder="0.0000" /></div>
                    <div className="input-row"><label>Longitude</label><input value={lng} onChange={e => setLng(e.target.value)} placeholder="0.0000" /></div>
                    <div className="input-row"><label>Radius (m)</label><input type="number" value={radius} onChange={e => setRadius(e.target.value)} /></div>
                    <div className="input-row"><button className="switch-method-btn" style={{ marginTop: '1.5rem' }} onClick={useMyLocation}><MapPin size={14} /> My Location</button></div>
                    
                    <div className="color-inputs">
                      <div className="color-field"><label>Dots</label><input type="color" value={styleColor} onChange={e => setStyleColor(e.target.value)} /></div>
                      <div className="color-field"><label>Background</label><input type="color" value={styleBg} onChange={e => setStyleBg(e.target.value)} /></div>
                    </div>
                  </div>
                </div>
              )}

              {faceEnrolled && passkeyEnrolled && (
                <div className="form-group biometric-selector">
                  <label>Verification Method</label>
                  <div className="method-tabs">
                    <button 
                      className={`method-tab ${selectedMethod === 'face' ? 'active' : ''}`}
                      onClick={() => setSelectedMethod('face')}
                    >
                      Webcam Face ID
                    </button>
                    <button 
                      className={`method-tab ${selectedMethod === 'passkey' ? 'active' : ''}`}
                      onClick={() => setSelectedMethod('passkey')}
                    >
                      Native Passkey
                    </button>
                  </div>
                </div>
              )}

              {error && <div className="error-message"><XCircle size={18} /><span>{error}</span></div>}
              <button 
                className="generate-btn" 
                onClick={handleGenerateQR}
                disabled={isStatusLoading}
              >
                {isStatusLoading ? <Loader className="spinner" size={18} /> : <QrCode size={18} />}
                {isStatusLoading ? "Syncing Security..." : "Authorize & Generate"}
              </button>
            </>
          )}

          {step === "verifying" && (
            <div className="verifying-state">
              {selectedMethod === "face" ? (
                <FaceScanner onCapture={handleFaceCapture} statusText="Identity verification required" />
              ) : (
                <div className="verifying-loading">
                  <Loader className="spinner large" size={48} />
                  <p>Check your device for biometric prompt...</p>
                </div>
              )}
              <button className="cancel-btn" onClick={() => setStep("form")}>Cancel</button>
            </div>
          )}

          {step === "generated" && qrImage && (
            <div className="qr-generated-container">
              <div className="qr-display"><img src={qrImage} alt="QR" style={{ border: `8px solid ${styleBg}` }} /></div>
              <p className="expiry-info">Expires: {new Date(expiresAt!).toLocaleString()}</p>
              <div className="qr-actions">
                <button className="action-btn download-btn" onClick={() => { const a = document.createElement('a'); a.href = qrImage; a.download = 'qr.png'; a.click(); }}><Download size={18} /> Download</button>
                <button className="action-btn share-btn" onClick={handleShareQR}>{copied ? "Copied!" : "Share Link"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRModal;

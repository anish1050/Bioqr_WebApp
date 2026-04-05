import React, { useState, useEffect } from "react";
import {
  X,
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
import "./QRModal.css";

const API_BASE = "";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId?: number | null;
  filename?: string | null;
  accessToken: string;
  lockedReceiverId?: string | null; // e.g. "BQ-XXXXXX"
  orgId?: number | null;
  teamId?: number | null;
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
  lockedReceiverId,
  orgId,
  teamId,
}) => {
  const [step, setStep] = useState<"form" | "generated">("form");
  const [qrType, setQrType] = useState<"file" | "vcard" | "text">("file");
  const [duration, setDuration] = useState(1);
  const [isOneTime, setIsOneTime] = useState(false);
  const [isUnshareable, setIsUnshareable] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isCrossHighlighted, setIsCrossHighlighted] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showReceiverError, setShowReceiverError] = useState(false);

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
  const [receiverUniqueId, setReceiverUniqueId] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setQrImage(null);
      setToken(null);
      setError(null);
      setCopied(false);
      setReceiverUniqueId(lockedReceiverId || "");
    }
  }, [isOpen, lockedReceiverId]);

  const handleGenerateQR = async () => {
    setError(null);
    setShowReceiverError(false);

    if (!receiverUniqueId || receiverUniqueId.trim().length < 6) {
      setShowReceiverError(true);
      setError("Receiver BioQR ID is mandatory for security.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      await completeQRGeneration();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const completeQRGeneration = async () => {
    const payload: any = {
      qr_type: qrType,
      duration,
      is_one_time: isOneTime,
      is_unshareable: isUnshareable,
      style_color: styleColor,
      style_bg: styleBg,
      org_id: orgId,
      team_id: teamId,
    };

    if (qrType === "file") payload.file_id = fileId;
    if (qrType === "vcard") payload.vcard_data = vcard;
    if (qrType === "text") payload.text_content = textContent;

    if (lat && lng) {
      payload.latitude = lat;
      payload.longitude = lng;
      payload.radius = radius;
    }

    if (receiverUniqueId) {
      payload.receiver_unique_id = receiverUniqueId;
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
                <button className={`qr-tab ${qrType === 'file' ? 'active' : ''}`} onClick={() => setQrType('file')} disabled={!fileId}><Hash size={16} /> File</button>
                <button className={`qr-tab ${qrType === 'vcard' ? 'active' : ''}`} onClick={() => setQrType('vcard')}><User size={16} /> Contact</button>
                <button className={`qr-tab ${qrType === 'text' ? 'active' : ''}`} onClick={() => setQrType('text')}><Type size={16} /> Text</button>
              </div>

              {qrType === 'file' && (
                <div className="file-info">
                  {fileId ? (
                    <p><strong>Target:</strong> {filename}</p>
                  ) : (
                    <p style={{ color: 'var(--error)' }}>No file selected. Please select a file from the dashboard first.</p>
                  )}
                </div>
              )}
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
              </div>

              <div className={`form-group ${showReceiverError ? 'error-ring' : ''}`} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '12px', border: showReceiverError ? '1px solid var(--error)' : '1px solid rgba(56, 189, 248, 0.1)' }}>
                <div className="label-with-info">
                  <label style={{ color: showReceiverError ? 'var(--error)' : '#38bdf8', fontWeight: 'bold' }}>
                    🧬 Receiver Biometric Lock <span style={{fontSize: '10px', verticalAlign: 'middle'}}>(MANDATORY)</span>
                  </label>
                  <div className="info-tooltip-container">
                    <Info size={14} className="info-icon" style={{ color: showReceiverError ? 'var(--error)' : '#38bdf8' }} />
                    <span className="tooltip-text">Universal Security Rule: You MUST enter the Receiver's BioQR ID (e.g., BQ-XXXXXXXX) to encrypt the payload with their biometric lock.</span>
                  </div>
                </div>
                <input 
                  type="text" 
                  value={receiverUniqueId} 
                  onChange={(e) => {
                    setReceiverUniqueId(e.target.value.trim().toUpperCase());
                    if (e.target.value.trim()) setShowReceiverError(false);
                  }}
                  placeholder="e.g. BQ-ABC12345"
                  className={`qr-textarea ${showReceiverError ? 'input-error' : ''}`}
                  style={{ 
                    height: 'auto', 
                    padding: '10px',
                    borderColor: showReceiverError ? 'var(--error)' : ''
                  }}
                  disabled={!!lockedReceiverId}
                />
                {showReceiverError && <p style={{ color: 'var(--error)', fontSize: '11px', marginTop: '5px' }}>Identity locking is required for individual, org, and community shares.</p>}
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

              {error && <div className="error-message"><XCircle size={18} /><span>{error}</span></div>}
              <button 
                className="generate-btn" 
                onClick={handleGenerateQR}
              >
                <QrCode size={18} />
                Generate Secure QR
              </button>
            </>
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

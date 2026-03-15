import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Loader,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  AlertTriangle,
  Camera,
} from "lucide-react";
import SEO from "../components/SEO";
import FaceScanner from "../components/FaceScanner";
import "../styles/security.css";

const API_BASE = "";

interface CredentialInfo {
  id: number;
  credential_id_last4: string;
  transports: string[];
  created_at: string;
}

const Security: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<CredentialInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Face Scanner State
  const [isFaceScannerOpen, setIsFaceScannerOpen] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const accessToken = localStorage.getItem("accessToken") || "";

  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    fetchCredentials();
  }, [accessToken, navigate]);

  const fetchCredentials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/bioqr/auth/webauthn/credentials`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch credentials");
      }

      const data = await response.json();
      setCredentials(data.credentials || []);
      
      // Also check if face is enrolled via custom face recognition
      const faceRes = await fetch(`${API_BASE}/bioqr/auth/face/status`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      }).catch(() => null);
      
      if (faceRes && faceRes.ok) {
        const faceData = await faceRes.json();
        setFaceEnrolled(faceData.enrolled);
      }
    } catch (err: any) {
      setError(err.message || "Error loading credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceEnroll = async (base64Image: string) => {
    setEnrolling(true);
    setError(null);
    setSuccess(null);
    try {
      console.log("📤 Sending face image to server for enrollment...");
      const response = await fetch(`${API_BASE}/bioqr/auth/face/enroll`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Image }),
      });

      console.log(`📥 Enrollment response status: ${response.status}`);
      const data = await response.json().catch(() => ({}));
      console.log("📥 Enrollment response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to save face biometric");
      }

      setSuccess("Face biometric enrolled successfully!");
      setFaceEnrolled(true);
      setTimeout(() => {
        setIsFaceScannerOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred during enrollment");
      throw err;
    } finally {
      setEnrolling(false);
    }
  };

  const handleWebAuthnEnroll = async () => {
    if (!window.webauthn) {
      setMessage({ text: "WebAuthn is not supported on this browser/device", type: "error" });
      return;
    }

    setEnrolling(true);
    setError(null);
    setMessage(null);

    try {
      const startResponse = await fetch(`${API_BASE}/bioqr/auth/webauthn/register/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const responseData = await startResponse.json();

      if (!startResponse.ok) {
        throw new Error(responseData.message || "Failed to start enrollment");
      }

      const { challengeId, options } = responseData;
      const credential = await window.webauthn.create(options);

      if (!credential) {
        throw new Error("Enrollment was cancelled or failed");
      }

      const completeResponse = await fetch(`${API_BASE}/bioqr/auth/webauthn/register/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          challengeId,
          registrationResponse: {
            id: credential.id,
            rawId: credential.rawId,
            type: "public-key",
            response: {
              clientDataJSON: credential.response.clientDataJSON,
              attestationObject: credential.response.attestationObject,
            },
          },
        }),
      });

      if (!completeResponse.ok) {
        const errData = await completeResponse.json();
        throw new Error(errData.message || "Enrollment failed");
      }

      setMessage({ text: "Native Face/Fingerprint biometric enrolled!", type: "success" });
      fetchCredentials();
    } catch (err: any) {
      console.error("Enrollment error:", err);
      setMessage({ text: err.message || "Enrollment failed", type: "error" });
    } finally {
      setEnrolling(false);
    }
  };

  const handleDeleteCredential = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this biometric device?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/bioqr/auth/webauthn/credentials/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to remove credential");
      }

      setMessage({ text: "Credential removed successfully", type: "success" });
      fetchCredentials();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to remove credential", type: "error" });
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm("Are you sure? This will remove ALL biometric data.")) {
      return;
    }

    try {
      // Clear WebAuthn
      await fetch(`${API_BASE}/bioqr/auth/webauthn/reset`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` },
        credentials: "include",
      });
      
      // Clear Custom Face
      await fetch(`${API_BASE}/bioqr/auth/face/reset`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      setMessage({ text: "All biometric credentials removed", type: "success" });
      setFaceEnrolled(false);
      fetchCredentials();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to reset credentials", type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="security-loading">
        <Loader className="spinner" size={32} />
        <p>Loading security settings...</p>
      </div>
    );
  }

  return (
    <>
      <SEO title="Security Settings" description="Manage your biometric authentication settings" />
      <div className="security-container">
        <div className="security-header">
          <Shield size={28} />
          <div>
            <h1>Security Settings</h1>
            <p>Manage your biometric authentication for QR code generation</p>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="security-sections-grid">
          {/* Custom Webcam Section */}
          <div className="security-card">
            <div className="card-header">
              <Camera size={24} className="accent-icon" />
              <h3>Standard Webcam Face ID</h3>
              {faceEnrolled ? 
                <span className="badge success">Enrolled</span> : 
                <span className="badge warning">Not Enrolled</span>
              }
            </div>
            <p className="card-desc">Recommended for standard webcams without IR hardware.</p>
            
            <div className="card-actions">
              {isFaceScannerOpen ? (
                <div className="face-scanner-inline">
                  <FaceScanner onCapture={handleFaceEnroll} />
                  <button className="btn-link" onClick={() => setIsFaceScannerOpen(false)}>Cancel</button>
                  {success && <p className="success-text">{success}</p>}
                  {error && <p className="error-text">{error}</p>}
                </div>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={() => setIsFaceScannerOpen(true)}
                  disabled={enrolling}
                >
                  <Camera size={18} />
                  {faceEnrolled ? "Re-enroll Face" : "Use Webcam Face ID"}
                </button>
              )}
            </div>
          </div>

          {/* Native WebAuthn Section (Windows Hello / Passkey) */}
          <div className="security-card">
            <div className="card-header">
              <Shield size={24} className="accent-icon" />
              <h3>Windows Hello / Passkey</h3>
              {credentials.length > 0 ? 
                <span className="badge success">{credentials.length} Device(s)</span> : 
                <span className="badge warning">No Passkeys</span>
              }
            </div>
            <p className="card-desc">Requires IR Webcam, Fingerprint, or Security Key.</p>
            
            <div className="card-actions">
              <button 
                className="btn btn-secondary" 
                onClick={handleWebAuthnEnroll}
                disabled={enrolling}
              >
                <Plus size={18} />
                Enroll Native Biometric
              </button>
            </div>
          </div>
        </div>

        {credentials.length > 0 && (
          <div className="security-section">
            <h2>Enrolled Native Devices</h2>
            <div className="credentials-list">
              {credentials.map((cred) => (
                <div key={cred.id} className="credential-item">
                  <div className="credential-info">
                    <strong>Device:</strong> ••••{cred.credential_id_last4} | 
                    <strong> Enrolled:</strong> {new Date(cred.created_at).toLocaleDateString()}
                  </div>
                  <button className="btn-icon danger" onClick={() => handleDeleteCredential(cred.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(faceEnrolled || credentials.length > 0) && (
          <div className="danger-zone">
            <button className="btn btn-danger-outline" onClick={handleResetAll}>
              <Trash2 size={18} />
              Wipe All Biometric Data
            </button>
          </div>
        )}

        <div className="security-info-footer">
          <h3><AlertTriangle size={18} /> Why two options?</h3>
          <p> Standard laptap cameras often lack the <b>Infrared</b> sensors needed for "Native Passkeys." If Windows Hello isn't working for you, use the <b>Webcam Face ID</b> option—it uses AI locally in your browser to recognize you.</p>
        </div>
      </div>
    </>
  );
};

export default Security;

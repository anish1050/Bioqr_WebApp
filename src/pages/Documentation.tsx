/* src/pages/Documentation.tsx */
import React from 'react';
import { 
  Shield, 
  Layout, 
  Smartphone, 
  Lock, 
  Users, 
  FileText, 
  QrCode, 
  CheckCircle2, 
  ArrowRight,
  Fingerprint,
  Globe,
  ShieldAlert,
  Server,
  Key,
  Zap
} from 'lucide-react';
import '../styles/docs.css';
import SEO from '../components/SEO';

const Documentation: React.FC = () => {
    return (
        <div className="docs-page">
            <SEO title="Documentation" description="Detailed guide for using the BioQR Web Dashboard and Android Application." />
            
            <div className="docs-container">
                {/* Sidebar Navigation */}
                <aside className="docs-sidebar">
                    <nav className="docs-nav">
                        <div className="docs-nav-group">
                            <h4>Overview</h4>
                            <ul>
                                <li><a href="#getting-started">Getting Started</a></li>
                                <li><a href="#security-architecture">Security Architecture</a></li>
                            </ul>
                        </div>
                        <div className="docs-nav-group">
                            <h4>Web Dashboard</h4>
                            <ul>
                                <li><a href="#web-enrollment">Biometric Enrollment</a></li>
                                <li><a href="#web-orgs">Orgs & Teams</a></li>
                                <li><a href="#web-files">File Management</a></li>
                                <li><a href="#web-qr">Generating QR Codes</a></li>
                            </ul>
                        </div>
                        <div className="docs-nav-group">
                            <h4>Android App</h4>
                            <ul>
                                <li><a href="#app-install">Installation</a></li>
                                <li><a href="#app-setup">Setup & Biometrics</a></li>
                                <li><a href="#app-generate">Creating QR Codes</a></li>
                                <li><a href="#app-scan">Scanning & Verification</a></li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="docs-content">
                    {/* Getting Started */}
                    <section id="getting-started" className="docs-section">
                        <h1>DOCUMENTATION</h1>
                        <p>
                            BioQR is a next-generation security platform that combines **biometric authentication** 
                            with **identity-locked dynamic QR technology**. This guide covers everything you need 
                            to know about the Web and Android ecosystem.
                        </p>
                        
                        <div className="docs-card">
                            <h4><Zap size={20} /> Quick Start Checklist</h4>
                            <ul className="step-list">
                                <li className="step-item">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <strong>Create Account</strong>
                                        Register on the web portal to receive your unique User ID.
                                    </div>
                                </li>
                                <li className="step-item">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <strong>Install Android App</strong>
                                        Download the BioQR APK from your dashboard's download section.
                                    </div>
                                </li>
                                <li className="step-item">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <strong>Sync Mobile Identity</strong>
                                        Log in on the app to link your hardware-backed biometric keystore to your User ID.
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Security Architecture */}
                    <section id="security-architecture" className="docs-section">
                        <h2><Shield size={32} /> Security Architecture</h2>
                        <p>
                            BioQR operates on a **Zero-Knowledge Architecture**. Your raw biometric data never 
                            leaves your device. Instead, we use Public Key Infrastructure (PKI) to sign and 
                            verify identities.
                        </p>
                        <div className="feature-grid">
                            <div className="feature-item">
                                <div className="feature-icon"><Key size={24} /></div>
                                <h3>Identity Locking</h3>
                                <p>QR codes are encrypted using the receiver's public key, ensuring only they can decrypt it after a biometric scan.</p>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon"><Shield size={24} /></div>
                                <h3>Biometric Privacy</h3>
                                <p>On-device algorithms convert biometrics into local mathematical templates. These templates **never** leave your device and are only used to unlock your hardware-backed private key.</p>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon"><Zap size={24} /></div>
                                <h3>Dynamic TTL</h3>
                                <p>Every QR code has a time-to-live (TTL), typically 1-5 minutes, preventing replay attacks or unauthorized re-scans.</p>
                            </div>
                        </div>
                    </section>

                    {/* Web Dashboard Sections */}
                    <section id="web-dashboard" className="docs-section">
                        <h2><Layout size={32} /> Web Dashboard Guide</h2>
                        
                        <div id="web-enrollment">
                            <h3>Identity Status Monitoring</h3>
                            <p>
                                The dashboard serves as your security monitor. After syncing your identity 
                                via the Android App, the **"Biometric Auth"** card on your dashboard will 
                                turn green and show "Face Ready" or "WebAuthn Ready". This indicates your 
                                account is now BioSeal-protected.
                            </p>
                        </div>

                        <div id="web-orgs">
                            <h3><Globe size={20} /> Organizations & Teams</h3>
                            <p>
                                Admins can manage large-scale groups via the **Organization Dashboard**:
                            </p>
                            <ul className="docs-list">
                                <li><strong>Invite Members:</strong> Share your unique Organization ID to let members join.</li>
                                <li><strong>Team Scoping:</strong> Group members into teams for automatic QR permission granting.</li>
                                <li><strong>Cross-Team Access:</strong> Grant specific "Identity-Locked" permissions between members.</li>
                            </ul>
                        </div>

                        <div id="web-files">
                            <h3><Server size={20} /> Cloud Vault</h3>
                            <p>
                                Upload sensitive documents to your secure **BioQR Cloud Vault**. Files are encrypted 
                                at rest using AES-256 and stored with hardware-restricted access markers.
                            </p>
                            <div className="code-block">
                                Max File Size: 10MB | Storage Limit: 5 Files | Encrytion: AES-256
                            </div>
                        </div>

                        <div id="web-qr">
                            <h3><QrCode size={20} /> Generating QR Codes</h3>
                            <p>
                                Click the **"Generate QR"** button next to any file. You will be prompted for 
                                the **Receiver's Unique User ID**. This ensures that even if someone else gets 
                                the QR code, they cannot open the file without the intended receiver's biometric scan.
                            </p>
                        </div>
                    </section>

                    {/* Android App Sections */}
                    <section id="android-app" className="docs-section">
                        <h2><Smartphone size={32} /> Android App Guide</h2>
                        
                        <div id="app-install">
                            <h3><Smartphone size={20} /> Installation</h3>
                            <p>
                                The BioQR app is currently distributed via the dashboard. Log in to the web app 
                                and navigate to the **"Downloads"** section to get the latest APK.
                            </p>
                        </div>

                        <div id="app-setup">
                            <h3>Setup & Biometric Link</h3>
                            <p>
                                Upon your first login, the BioQR app will automatically initialize its 
                                hardware-backed keystore. You will be prompted to perform a **Biometric Scan** 
                                (Fingerprint or Face). This one-time setup securely links your physical identity 
                                to your digital account, enabling the generation and decryption of "Identity-Locked" 
                                QR codes.
                            </p>
                        </div>

                        <div id="app-generate">
                            <h3>Generating QR Codes (Mobile)</h3>
                            <p>
                                Use the **QR Generator** tab to create codes for:
                            </p>
                            <div className="feature-grid">
                                <div className="feature-item">
                                    <div className="feature-icon"><FileText size={24} /></div>
                                    <h4>Secure Files</h4>
                                    <p>Share local documents with identity-locking.</p>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon"><Users size={24} /></div>
                                    <h4>Trust Contacts</h4>
                                    <p>Securely share professional contact details.</p>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-icon"><Zap size={24} /></div>
                                    <h4>Instant Text</h4>
                                    <p>Send encrypted, time-sensitive text messages.</p>
                                </div>
                            </div>
                        </div>

                        <div id="app-scan">
                            <h3><ShieldAlert size={20} /> Scanning & Verification</h3>
                            <p>
                                Use the **Home** tab to scan a BioQR code. If the code is locked to your identity, 
                                the app will immediately request a fingerprint or face scan. Once verified, 
                                the underlying data will be decrypted and displayed.
                            </p>
                        </div>
                    </section>

                    {/* Conclusion/Help */}
                    <div className="docs-card" style={{ marginTop: '4rem', textAlign: 'center' }}>
                        <h3>Need more assistance?</h3>
                        <p>Our technical team is standing by to help with custom enterprise integrations.</p>
                        <a href="/contact" className="btn btn-primary" style={{ marginTop: '1rem' }}>Contact Support</a>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Documentation;

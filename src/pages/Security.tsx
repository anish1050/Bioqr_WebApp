/* src/pages/Security.tsx */
import React from 'react';
import { 
  ShieldCheck, 
  Key, 
  Server, 
  EyeOff, 
  Lock,
  Globe,
  FileLock2,
  Cpu
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Security: React.FC = () => {
    const securityPillars = [
        {
            icon: EyeOff,
            title: "Zero-Knowledge Storage",
            description: "We don't know who you are. We don't store your raw biometrics. We only process anonymized cryptographic hashes."
        },
        {
            icon: Key,
            title: "Hardware Keystores",
            description: "Keys are generated and stored within the Secure Enclave or TEE of your mobile device, making extraction impossible."
        },
        {
            icon: Cpu,
            title: "On-Device Verification",
            description: "Identity verification happens at the chip level. Your face or fingerprint never touches a cloud server."
        },
        {
            icon: FileLock2,
            title: "AES-256 Encryption",
            description: "All files in your vault are encrypted using military-grade AES-256 before being distributed to the network."
        }
    ];

    return (
        <div className="marketing-page">
            <SEO title="Platform Security" description="Deep dive into the unbreachable architecture of the BioQR ecosystem." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <ShieldCheck size={14} />
                            <span>Security First</span>
                        </div>
                        <h1 className="hero-title">
                            Our Architecture of<br />
                            <span className="early-adopter-badge">Absolute Trust</span>
                        </h1>
                        <p className="hero-subtitle">
                            Security isn't a feature; it's our foundation. Discover how we protect your 
                            digital assets with zero-compromise encryption.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="marketing-grid">
                    {securityPillars.map((pillar, index) => (
                        <div key={index} className="marketing-card">
                            <div className="card-icon">
                                <pillar.icon size={24} />
                            </div>
                            <h3>{pillar.title}</h3>
                            <p>{pillar.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section" style={{ marginTop: '6rem' }}>
                <div className="container">
                    <div className="section-header text-center">
                        <h2 style={{ fontSize: '2.5rem' }}>The BioSeal Protocol</h2>
                        <p style={{ maxWidth: '700px', margin: '1rem auto' }}>
                            Our proprietary protocol ensures that even in the case of a complete database breach, 
                            your data remains encrypted and your identity stays anonymous.
                        </p>
                    </div>
                    
                    <div className="marketing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
                        <div className="marketing-card accent" style={{ textAlign: 'left' }}>
                            <div className="card-icon"><Server /></div>
                            <h3>Cloud Hardening</h3>
                            <p>All server instances are containerized and isolated. We utilize short-lived session tokens and automated threat response systems to mitigate lateral movement.</p>
                        </div>
                        <div className="marketing-card" style={{ textAlign: 'left' }}>
                            <div className="card-icon"><Globe /></div>
                            <h3>Global Compliance</h3>
                            <p>Built from the ground up to exceed GDPR, HIPAA, and SOC2 requirements for data privacy and biometric handling.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Security;

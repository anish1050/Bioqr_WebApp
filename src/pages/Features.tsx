/* src/pages/Features.tsx */
import React from 'react';
import { 
  Fingerprint, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Smartphone,
  Eye,
  RefreshCw
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Features: React.FC = () => {
    const featureList = [
        {
            icon: Fingerprint,
            title: "Identity Enrollment",
            description: "Enroll your physical identity once and link it forever to your digital secure keys via on-device hardware."
        },
        {
            icon: QrCode,
            title: "Dynamic QR Generation",
            description: "Generate time-sensitive codes that expire within minutes, eliminating the risk of replay attacks."
        },
        {
            icon: ShieldCheck,
            title: "Identity-Locked Access",
            description: "Every QR is encrypted specifically for the intended receiver. Only their biometric signature can unlock it."
        },
        {
            icon: RefreshCw,
            title: "Rotating Keys",
            description: "Automatic background key rotation ensures your security posture remains unbreakable over time."
        },
        {
            icon: Smartphone,
            title: "Mobile First",
            description: "Full Android integration utilizing TEE (Trusted Execution Environment) for biometric processing."
        },
        {
            icon: Eye,
            title: "Zero Knowledge",
            description: "Your raw biometric data never leaves your sensor. We only use mathematical signatures to verify intent."
        }
    ];

    return (
        <div className="marketing-page">
            <SEO title="Product Features" description="Explore the next-generation security features of the BioQR platform." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <Zap size={14} />
                            <span>Capability Showcase</span>
                        </div>
                        <h1 className="hero-title">
                            Engineered for<br />
                            <span className="early-adopter-badge">Total Security</span>
                        </h1>
                        <p className="hero-subtitle">
                            BioQR bridges the gap between physical identity and digital access control 
                            using state-of-the-art cryptographic standards and biometric precision.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="marketing-grid">
                    {featureList.map((feature, index) => (
                        <div key={index} className={`marketing-card ${index % 2 !== 0 ? 'accent' : ''}`}>
                            <div className="card-icon">
                                <feature.icon size={24} />
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="section text-center" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div className="glass-panel" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <Lock size={48} style={{ color: '#485BFF', marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Ready to Secure Your Assets?</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '600px', marginInline: 'auto' }}>
                            Experience the unbreachable combination of Biometrics and Dynamic QR technology today.
                        </p>
                        <a href="/register" className="btn btn-primary">Start Protecting Now</a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Features;

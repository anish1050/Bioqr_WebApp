/* src/pages/Partners.tsx */
import React from 'react';
import { 
  Handshake, 
  Workflow, 
  ShieldCheck, 
  Zap, 
  Rocket,
  Globe,
  Plus
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Partners: React.FC = () => {
    return (
        <div className="marketing-page">
            <SEO title="Partner Ecosystem" description="Explore the future of secure integrations within the BioQR ecosystem." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="status-tag">
                            <Workflow size={14} />
                            <span>Integration Roadmap</span>
                        </div>
                        <h1 className="hero-title">
                            Ecosystem of<br />
                            <span className="early-adopter-badge">Pioneers</span>
                        </h1>
                        <p className="hero-subtitle">
                           We're building an open-standard security ecosystem. While we are in the 
                           early stages of establishing formal partnerships, our platform is designed 
                           for seamless third-party integration from day one.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="section-header text-center">
                    <h2 style={{ fontSize: '2.5rem' }}>The Integration Roadmap</h2>
                    <p style={{ maxWidth: '700px', margin: '1rem auto' }}>
                        BioQR is designed to provide identity-locked security to the tools you already use. 
                        Here's what we're working on for future integrations.
                    </p>
                </div>

                <div className="marketing-grid">
                    <div className="marketing-card roadmap-item">
                        <div className="roadmap-dot"></div>
                        <div className="card-icon"><ShieldCheck /></div>
                        <h3>Authentication SDKs</h3>
                        <p>Pluggable SDKs for React, Flutter, and Swift to bring BioQR security to any application with just a few lines of code.</p>
                    </div>
                    <div className="marketing-card roadmap-item accent">
                        <div className="roadmap-dot" style={{ background: '#A2FF9C', boxShadow: '0 0 10px #A2FF9C' }}></div>
                        <div className="card-icon"><Globe /></div>
                        <h3>Enterprise IAM</h3>
                        <p>Native connectors for Okta, Auth0, and Microsoft Azure Active Directory to sync corporate identities with biometric security.</p>
                    </div>
                    <div className="marketing-card roadmap-item">
                        <div className="roadmap-dot"></div>
                        <div className="card-icon"><Rocket /></div>
                        <h3>IOT & Logistics</h3>
                        <p>Hardware-level integration for physical access control systems, gate entry, and proof-of-delivery scanners.</p>
                    </div>
                </div>
            </section>

            <section className="section text-center" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div className="glass-panel" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <Handshake size={48} style={{ color: '#485BFF', marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Become an Early Partner</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '600px', marginInline: 'auto', fontSize: '1.2rem' }}>
                            We're looking for visionary companies to help us test our early-access APIs 
                            and shape the future of the BioSeal protocol.
                        </p>
                        <a href="/contact" className="btn btn-primary btn-large">
                            <Plus size={20} />
                            Inquire for Early Access
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Partners;

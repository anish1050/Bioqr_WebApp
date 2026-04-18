/* src/pages/Careers.tsx */
import React from 'react';
import { 
  Rocket, 
  Heart, 
  Lightbulb, 
  Users, 
  Timer,
  Globe
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Careers: React.FC = () => {
    return (
        <div className="marketing-page">
            <SEO title="Careers" description="Join our mission to revolutionize global digital security." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="status-tag">
                            <Timer size={14} />
                            <span>Building Mode</span>
                        </div>
                        <h1 className="hero-title">
                            Building the Future of<br />
                            <span className="early-adopter-badge">Digital Trust</span>
                        </h1>
                        <p className="hero-subtitle">
                           BioQR is an early-stage project with the ambitious goal of making biometric 
                           security the global standard. We're currently internalizing our core 
                           foundation before scaling our team.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="section-header text-center">
                    <h2 style={{ fontSize: '2.5rem' }}>Our Vision</h2>
                    <p style={{ maxWidth: '800px', margin: '1rem auto' }}>
                        We believe in a world where you never have to remember a password again, and where 
                        your identity is protected by physical laws, not just digital gates.
                    </p>
                </div>

                <div className="marketing-grid">
                    <div className="marketing-card">
                        <div className="card-icon"><Lightbulb /></div>
                        <h3>Innovation First</h3>
                        <p>We're not just building an app; we're designing an unbreachable protocol for human-centric identity.</p>
                    </div>
                    <div className="marketing-card accent">
                        <div className="card-icon"><Users /></div>
                        <h3>Collaborative Spirit</h3>
                        <p>We value open discussions, deep technical debates, and the pursuit of elegant solutions to complex security problems.</p>
                    </div>
                    <div className="marketing-card">
                        <div className="card-icon"><Rocket /></div>
                        <h3>Global Scale</h3>
                        <p>Our goal is 1 Billion secure interactions. We build systems that are designed to scale globally from day one.</p>
                    </div>
                </div>
            </section>

            <section className="section text-center" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div className="glass-panel" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <Heart size={48} style={{ color: '#eb4d4b', marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Interested in Joining?</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '600px', marginInline: 'auto', fontSize: '1.2rem' }}>
                            We aren't currently hiring for new roles, but we love meeting people who are 
                            passionate about biometrics, cryptography, and UX.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <a href="mailto:wearebioqr@gmail.com" className="btn btn-outline">Send a General Inquiry</a>
                            <a href="/status" className="btn btn-primary">Track Project Progress</a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Careers;

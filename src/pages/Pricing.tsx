/* src/pages/Pricing.tsx */
import React from 'react';
import { 
  Check, 
  Zap, 
  Crown, 
  ShieldCheck, 
  Clock,
  ArrowRight
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Pricing: React.FC = () => {
    return (
        <div className="marketing-page">
            <SEO title="Pricing Plans" description="Simple, transparent pricing for next-generation biometric security." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="status-tag">
                            <Clock size={14} />
                            <span>Launch Phase</span>
                        </div>
                        <h1 className="hero-title">
                            Security Without<br />
                            <span className="early-adopter-badge">Boundaries</span>
                        </h1>
                        <p className="hero-subtitle">
                           To celebrate the launch of the BioQR ecosystem, all enterprise-grade features 
                           are currently free for our early adopters.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="pricing-grid">
                    {/* Founder's Edition Card (The current and only plan) */}
                    <div className="marketing-card pricing-card accent" style={{ borderColor: '#A2FF9C', borderWidth: '2px' }}>
                        <div className="status-tag" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Early Adopter</div>
                        <div className="card-icon" style={{ marginInline: 'auto' }}>
                            <Crown size={32} />
                        </div>
                        <h3>FOUNDER'S EDITION</h3>
                        <div className="price-value">
                            $0<span className="price-period">/mo</span>
                        </div>
                        <p style={{ marginBottom: '2rem' }}>Full access to the entire BioQR suite during our beta phase.</p>
                        
                        <div style={{ textAlign: 'left', marginBottom: '3rem' }}>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <ShieldCheck size={18} />
                                <span>Unlimited Biometric Enrolment</span>
                            </div>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <ShieldCheck size={18} />
                                <span>Advanced QR Identity-Locking</span>
                            </div>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <ShieldCheck size={18} />
                                <span>Organization & Team Management</span>
                            </div>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <ShieldCheck size={18} />
                                <span>Priority Launch Updates</span>
                            </div>
                             <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <ShieldCheck size={18} />
                                <span>Cloud Vault (Beta Storage)</span>
                            </div>
                        </div>

                        <a href="/register" className="btn btn-primary" style={{ width: '100%' }}>
                            Claim Free Access
                            <ArrowRight size={18} />
                        </a>
                    </div>

                    {/* Future Enterprise Card */}
                    <div className="marketing-card pricing-card dark-glass" style={{ opacity: 0.8 }}>
                        <div className="card-icon" style={{ marginInline: 'auto', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}>
                            <Zap size={32} />
                        </div>
                        <h3>FUTURE ENTERPRISE</h3>
                        <div className="price-value" style={{ color: '#94a3b8' }}>
                            TBD
                        </div>
                        <p style={{ marginBottom: '2rem' }}>Custom solutions for scaled deployments and air-gapped environments.</p>
                        
                        <div style={{ textAlign: 'left', marginBottom: '3rem', opacity: 0.6 }}>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <Check size={18} />
                                <span>On-Premise Deployment</span>
                            </div>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <Check size={18} />
                                <span>Custom Integrations</span>
                            </div>
                            <div className="feature-item" style={{ marginBottom: '1rem' }}>
                                <Check size={18} />
                                <span>Dedicated Technical Support</span>
                            </div>
                        </div>

                        <a href="/contact" className="btn btn-outline" style={{ width: '100%' }}>
                            Inquire for Roadmap
                        </a>
                    </div>
                </div>
            </section>

            <section className="section text-center" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        *Limited time offer for new accounts created during the Beta period.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Pricing;

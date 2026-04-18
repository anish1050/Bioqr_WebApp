/* src/pages/Community.tsx */
import React from 'react';
import { 
  Users, 
  MessageSquare, 
  Twitter as TwitterIcon, 
  Linkedin, 
  ArrowRight,
  Sparkles,
  Zap,
  Mail
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Community: React.FC = () => {
    return (
        <div className="marketing-page">
            <SEO title="Community" description="Join the BioQR journey and stay updated with our latest milestones." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <Sparkles size={14} />
                            <span>Join the Journey</span>
                        </div>
                        <h1 className="hero-title">
                            Growing Together in<br />
                            <span className="early-adopter-badge">Deep Stealth</span>
                        </h1>
                        <p className="hero-subtitle">
                           BioQR is more than a project; it's a movement towards anonymous, hardware-backed security. 
                           As a new project, we're building our core community around transparency and innovation.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="marketing-grid">
                    <div className="marketing-card">
                        <div className="card-icon"><TwitterIcon /></div>
                        <h3>Twitter / X</h3>
                        <p>Follow us for real-time updates on our release cycles, technical breakthroughs, and security insights.</p>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', color: '#485BFF', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Follow @BioQR <ArrowRight size={16} />
                        </a>
                    </div>
                    <div className="marketing-card accent">
                        <div className="card-icon"><Linkedin /></div>
                        <h3>LinkedIn</h3>
                        <p>Stay connected with our professional milestones, organization updates, and enterprise partnership news.</p>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', color: '#10b981', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Connect with us <ArrowRight size={16} />
                        </a>
                    </div>
                    <div className="marketing-card">
                        <div className="card-icon"><MessageSquare /></div>
                        <h3>Discord / Forum</h3>
                        <p>Our official discussion hubs are coming soon. Join our mailing list to be the first to receive an invite.</p>
                        <div className="status-tag" style={{ marginTop: 'auto' }}>Coming Soon</div>
                    </div>
                </div>
            </section>

            <section className="section text-center" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div className="glass-panel" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <Mail size={48} style={{ color: '#485BFF', marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Never Miss an Update</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '3rem', maxWidth: '600px', marginInline: 'auto', fontSize: '1.2rem' }}>
                            Subscribe to our newsletter to receive monthly technical deep-dives into 
                            biometric security and early-access invites to our upcoming community hubs.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', maxWidth: '500px', marginInline: 'auto' }}>
                             <input 
                                type="email" 
                                placeholder="Enter your email" 
                                style={{ 
                                    padding: '1rem 1.5rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white',
                                    flex: 1
                                }} 
                            />
                            <button className="btn btn-primary">Subscribe</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Community;

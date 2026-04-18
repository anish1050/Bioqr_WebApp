/* src/pages/Press.tsx */
import React from 'react';
import { 
  Newspaper, 
  Download, 
  Image as ImageIcon, 
  Mail, 
  ExternalLink,
  Quote,
  Zap
} from 'lucide-react';
import SEO from '../components/SEO';
import '../styles/marketing-pages.css';

const Press: React.FC = () => {
    return (
        <div className="marketing-page">
            <SEO title="Press Kit" description="Official media assets and news updates for the BioQR project." />
            
            <section className="marketing-hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge">
                            <Newspaper size={14} />
                            <span>Media Relations</span>
                        </div>
                        <h1 className="hero-title">
                            BioQR in the<br />
                            <span className="early-adopter-badge">Newsroom</span>
                        </h1>
                        <p className="hero-subtitle">
                           The latest developments, brand assets, and technical announcements from 
                           the team building the future of biometric security.
                        </p>
                    </div>
                </div>
            </section>

            <section className="container">
                <div className="section-header text-center">
                    <h2 style={{ fontSize: '2.5rem' }}>Brand Assets</h2>
                    <p style={{ maxWidth: '600px', margin: '1rem auto' }}>
                        Download our official logos, typeface guidelines, and product screenshots for media use.
                    </p>
                </div>

                <div className="marketing-grid">
                    <div className="marketing-card">
                        <div className="card-icon"><Download /></div>
                        <h3>Logo Pack</h3>
                        <p>High-resolution SVG and PNG versions of the BioQR logo in light, dark, and monochrome styles.</p>
                        <a href="#" style={{ marginTop: 'auto', color: '#485BFF', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Download Assets <ExternalLink size={16} />
                        </a>
                    </div>
                    <div className="marketing-card accent">
                        <div className="card-icon"><ImageIcon /></div>
                        <h3>Product Stills</h3>
                        <p>High-fidelity mockups of the BioQR Web Dashboard and Android App in various use cases.</p>
                        <a href="#" style={{ marginTop: 'auto', color: '#10b981', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            View Gallery <ExternalLink size={16} />
                        </a>
                    </div>
                    <div className="marketing-card">
                        <div className="card-icon"><Zap /></div>
                        <h3>Fact Sheet</h3>
                        <p>A concise overview of our technology, security standards, and project milestones reached so far.</p>
                        <a href="#" style={{ marginTop: 'auto', color: '#485BFF', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Read Overview <ExternalLink size={16} />
                        </a>
                    </div>
                </div>
            </section>

            <section className="section" style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div className="glass-panel" style={{ padding: '4rem', borderRadius: '40px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                            <div style={{ textAlign: 'left' }}>
                                <Quote size={48} style={{ color: '#A2FF9C', marginBottom: '2rem' }} />
                                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>In the Works</h2>
                                <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6' }}>
                                    We're currently preparing our first major technical whitepaper detailing the 
                                    BioSeal protocol. Stay tuned for our upcoming developer summit.
                                </p>
                            </div>
                            <div className="marketing-card" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <Mail size={32} style={{ color: '#485BFF', marginBottom: '1.5rem' }} />
                                <h3>Media Inquiries</h3>
                                <p style={{ marginBottom: '1.5rem' }}>For interviews, feature requests, or technical clarifications, please reach out to our media desk.</p>
                                <a href="mailto:wearebioqr@gmail.com" className="btn btn-primary">Contact Press Desk</a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Press;

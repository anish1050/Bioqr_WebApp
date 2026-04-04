import React from "react";
import { Link } from "react-router-dom";
import { Shield, Fingerprint, QrCode, Lock, CheckCircle, ArrowRight } from "lucide-react";
import "../styles/about-modern.css";
import SEO from "../components/SEO";

const About: React.FC = () => {
  return (
    <div className="about-page">
      <SEO title="About Us" description="Learn more about BioQR's mission to revolutionize physical and digital security." />
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="hero-content text-left">
            <div className="hero-badge">
              <Shield className="badge-icon" />
              <span>About BioQR</span>
            </div>
            <h1 className="hero-title">
              Next-Generation
              <span className="gradient-text">Biometric Security</span>
              <span className="highlight-text">Platform</span>
            </h1>
            <p className="hero-subtitle">
              BioQR revolutionizes digital security by combining cutting-edge biometric authentication 
              with dynamic QR code technology, creating an unbreachable fortress for your digital assets.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section">
        <div className="container">
          <div className="mission-grid">
            <div className="mission-content text-left">
              <div className="section-badge" style={{ justifyContent: 'flex-start' }}>
                <CheckCircle className="badge-icon" />
                <span>Our Mission</span>
              </div>
              <h2 className="text-left" style={{ textAlign: 'left' }}>Securing the Digital Future</h2>
              <p>
                At BioQR, we believe that security shouldn't come at the cost of usability. Our mission is to 
                democratize enterprise-grade biometric security, making it accessible to individuals and 
                organizations of all sizes.
              </p>
              <p>
                By combining the uniqueness of biometric data with the convenience of QR codes, we've created 
                a security solution that's both impenetrable and intuitive.
              </p>
              <div className="mission-features">
                <div className="feature-item">
                  <CheckCircle />
                  <span>Zero-knowledge architecture</span>
                </div>
                <div className="feature-item">
                  <CheckCircle />
                  <span>End-to-end encryption</span>
                </div>
                <div className="feature-item">
                  <CheckCircle />
                  <span>Military-grade security</span>
                </div>
              </div>
            </div>
            <div className="mission-visual">
              <div className="security-showcase">
                <div className="showcase-item">
                  <Fingerprint className="showcase-icon" />
                  <h4>Fingerprint Recognition</h4>
                  <p>Advanced biometric scanning</p>
                </div>
                <div className="showcase-item">
                  <QrCode className="showcase-icon" />
                  <h4>Dynamic QR Codes</h4>
                  <p>Time-sensitive access tokens</p>
                </div>
                <div className="showcase-item">
                  <Lock className="showcase-icon" />
                  <h4>Secure Storage</h4>
                  <p>Encrypted data protection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="section tech-section">
        <div className="container">
          <div className="section-header text-center">
            <div className="section-badge">
              <Shield className="badge-icon" />
              <span>Technology</span>
            </div>
            <h2>Built with Cutting-Edge Tech</h2>
            <p>Our technology stack is carefully chosen for maximum security, performance, and scalability.</p>
          </div>
          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-icon">
                <Fingerprint />
              </div>
              <h3>Biometric Authentication</h3>
              <p>Advanced fingerprint and facial recognition for industry-leading security</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">
                <QrCode />
              </div>
              <h3>Dynamic QR Codes</h3>
              <p>Time-limited access tokens that regenerate for maximum security</p>
            </div>
            <div className="tech-card">
              <div className="tech-icon">
                <Shield />
              </div>
              <h3>Web Platform</h3>
              <p>Modern React-based dashboard with real-time monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content text-center">
            <h2>Ready to Experience Unbreakable Security?</h2>
            <p>Join thousands of users who trust BioQR to protect their most valuable digital assets.</p>
            <div className="cta-buttons">
              <Link to="/contact" className="btn btn-primary btn-large">
                <ArrowRight className="btn-icon" />
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;

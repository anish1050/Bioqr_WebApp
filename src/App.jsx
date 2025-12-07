import React, { useState } from "react";
import {
  Shield,
  Menu,
  X,
  Zap,
  Lock,
  Fingerprint,
  QrCode,
  Eye,
  Clock,
  Database,
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Activity,
} from "lucide-react";
import "./App.css";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      icon: Fingerprint,
      title: "Biometric Authentication",
      description:
        "Advanced fingerprint and facial recognition with 99.9% accuracy",
      hasImage: true,
    },
    {
      icon: QrCode,
      title: "Dynamic QR Codes",
      description:
        "Time-sensitive QR codes that regenerate for maximum security",
      hasImage: true,
    },
    {
      icon: Shield,
      title: "Multi-Layer Protection",
      description: "Dual authentication ensures unbreachable access control",
      hasImage: false,
    },
    {
      icon: Eye,
      title: "Real-Time Monitoring",
      description: "Live security dashboard with instant threat detection",
      hasImage: false,
    },
    {
      icon: Clock,
      title: "Instant Verification",
      description: "Sub-second authentication for seamless user experience",
      hasImage: false,
    },
    {
      icon: Database,
      title: "Secure Data Storage",
      description: "Encrypted biometric data with zero-knowledge architecture",
      hasImage: false,
    },
  ];

  const stats = [
    {
      icon: Shield,
      value: "99.9%",
      label: "Security Accuracy",
      description: "Industry-leading precision in threat detection",
    },
    {
      icon: Shield,
      value: "10+",
      label: "Trusted Users",
      description: "Global enterprises rely on our security",
    },
    {
      icon: Zap,
      value: "0.3s",
      label: "Average Auth Time",
      description: "Lightning-fast authentication process",
    },
    {
      icon: Lock,
      value: "Zero",
      label: "Breaches Recorded",
      description: "Perfect security track record maintained",
    },
  ];

  const benefits = [
    "30-day free trial with full access",
    "24/7 enterprise support included",
    "No setup fees or hidden costs",
    "Instant deployment capability",
  ];

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Security", href: "#security" },
        { name: "Pricing", href: "#pricing" },
        { name: "Documentation", href: "#docs" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about.html" },
        { name: "Careers", href: "#careers" },
        { name: "Press", href: "#press" },
        { name: "Partners", href: "#partners" },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "/help.html" },
        { name: "Community", href: "#community" },
        { name: "Contact", href: "/contact.html" },
        { name: "Status Page", href: "/status.html" },
      ],
    },
  ];

  return (
    <div className="app">
      {/* Navigation */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <Shield className="logo-icon" />
            <span className="logo-text">BioQR</span>
          </div>

          <nav className={`main-nav ${isMenuOpen ? "nav-open" : ""}`}>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#security">Security</a>
              </li>
              <li>
                <a href="/about.html">About</a>
              </li>
              <li>
                <a href="/contact.html">Contact</a>
              </li>
              <li>
                <a href="/status.html">Status</a>
              </li>
              <li>
                <a className="btn btn-ghost" href="/login.html">
                  Sign In
                </a>
              </li>
              <li>
                <a className="btn btn-primary" href="/register.html">
                  Get Started
                </a>
              </li>
            </ul>
          </nav>

          <button
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Shield className="badge-icon" />
              <span>Next-Gen Security</span>
            </div>

            <h1>
              Next-Generation
              <span className="gradient-text">Biometric Security</span>
              <span className="highlight-text">Platform</span>
            </h1>

            <p>
              Transform your security infrastructure with AI-powered biometric authentication 
              and dynamic QR code technology. Experience enterprise-grade protection 
              with zero-compromise reliability.
            </p>

            <div className="cta-buttons">
              <a href="/register.html" className="btn btn-primary btn-large">
                <Zap className="btn-icon" />
                Start Free Trial
              </a>
              <a href="/viewdemo.html" className="btn btn-outline btn-large">
                <Lock className="btn-icon" />
                View Demo
              </a>
            </div>

            <div className="stats-grid">
              <div className="stat">
                <div className="stat-value primary">99.97%</div>
                <div className="stat-label">Accuracy</div>
                <div className="stat-description">Industry leading</div>
              </div>
              <div className="stat">
                <div className="stat-value accent">0.3s</div>
                <div className="stat-label">Response</div>
                <div className="stat-description">Lightning fast</div>
              </div>
              <div className="stat">
                <div className="stat-value warning">30 Days</div>
                <div className="stat-label">Free Trial</div>
                <div className="stat-description">Be Among The First</div>
              </div>
            </div>
          </div>

          <div className="hero-image">
            <div className="hero-image-placeholder">
              <div className="security-showcase">
                <div className="fingerprint-display">
                  <div className="fingerprint-scanner">
                    <Fingerprint className="fingerprint-icon" />
                  </div>
                </div>
                <div className="qr-display-mini">
                  <QrCode className="qr-icon-mini" />
                  <div className="qr-particles"></div>
                </div>
                <div className="security-status">
                  <div className="status-dot"></div>
                  <span className="status-text">SECURE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <Shield className="badge-icon" />
              <span>Advanced Features</span>
            </div>
            <h2 className="section-title">
              Advanced Security
              <span className="gradient-text">Technology Stack</span>
            </h2>
            <p className="section-description">
              Our comprehensive security platform integrates military-grade biometric 
              authentication with quantum-resistant QR technology, delivering 
              enterprise-level protection for the modern digital landscape.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card large">
              <div className="feature-image biometric-image">
                <div className="biometric-scanner">
                  <div className="scanner-frame">
                    <Fingerprint className="scanner-icon" />
                  </div>
                  <div className="scan-lines"></div>
                </div>
              </div>
              <div className="feature-content">
                <div className="feature-header">
                  <div className="feature-icon">
                    <Fingerprint />
                  </div>
                  <h3>Biometric Authentication</h3>
                </div>
                <p>
                  Advanced fingerprint and facial recognition with 99.9%
                  accuracy
                </p>
              </div>
            </div>

            <div className="feature-card large">
              <div className="feature-image qr-image">
                <div className="qr-display">
                  <div className="qr-code">
                    <QrCode className="qr-icon" />
                  </div>
                  <div className="qr-glow"></div>
                  <Lock className="lock-icon" />
                </div>
              </div>
              <div className="feature-content">
                <div className="feature-header">
                  <div className="feature-icon">
                    <QrCode />
                  </div>
                  <h3>Dynamic QR Codes</h3>
                </div>
                <p>
                  Time-sensitive QR codes that regenerate for maximum security
                </p>
              </div>
            </div>

            {features.slice(2).map((feature, index) => (
              <div key={index + 2} className="feature-card">
                <div className="feature-content">
                  <div className="feature-header">
                    <div className="feature-icon">
                      <feature.icon />
                    </div>
                    <h3>{feature.title}</h3>
                  </div>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Stats Section */}
      <section id="security" className="security-stats">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Proven Security
              <span className="gradient-text">Performance</span>
            </h2>
            <p className="section-description">
              Our advanced security metrics demonstrate the reliability and
              effectiveness of the BioQR system in real-world applications.
            </p>
          </div>

          <div className="stats-cards">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">
                  <stat.icon />
                </div>
                <div className="stat-value gradient-text">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-description">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="section-badge">
              <Shield className="badge-icon" />
              <span>Ready to Secure Your Future?</span>
            </div>

            <h2>
              Ready to Revolutionize
              <span className="gradient-text">Your Security?</span>
            </h2>

            <p>
            Forward-thinking organizations are choosing BioQR to protect their most valuable assets. Start your security transformation today with our comprehensive platform.
            </p>

            <div className="benefits-grid">
              {benefits.map((benefit, index) => (
                <div key={index} className="benefit-item">
                  <CheckCircle className="benefit-icon" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className="cta-buttons">
              <a href="/register.html" className="btn btn-primary btn-large">
                Start Free Trial
                <ArrowRight className="btn-icon" />
              </a>
              <a href="/viewdemo.html" className="btn btn-outline btn-large">
                Schedule Demo
              </a>
            </div>

            <div className="cta-note">
              No credit card required • Enterprise-grade security from day one
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <Shield className="logo-icon" />
                <span className="logo-text">BioQR</span>
              </div>
              <p>
                Revolutionary biometric and QR code security system trusted by
                enterprises worldwide for mission-critical authentication.
              </p>
              <div className="contact-info">
                <div className="contact-item">
                  <Mail className="contact-icon" />
                  <span>contact@bioqr.com</span>
                </div>
                <div className="contact-item">
                  <Phone className="contact-icon" />
                  <span>+1 (555) 123-4567</span>
                </div>
                <div className="contact-item">
                  <MapPin className="contact-icon" />
                  <span>Mumbai, IN</span>
                </div>
              </div>
            </div>

            <div className="footer-links">
              {footerSections.map((section, index) => (
                <div key={index} className="footer-column">
                  <h4>{section.title}</h4>
                  <ul>
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <a href={link.href}>{link.name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copyright">
              © {new Date().getFullYear()} BioQR Security Systems. All rights
              reserved.
            </div>
            <div className="footer-legal">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#cookies">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import {
  Shield,
  Zap,
  Lock,
  Fingerprint,
  QrCode,
  Eye,
  Clock,
  Database,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import "../App.css"; // We will keep App.css for now, can move it later

const Home: React.FC = () => {
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
      icon: CheckCircle,
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

  return (
    <>
      <SEO title="Home" description="Experience enterprise-grade protection with zero-compromise reliability." />
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
              <Link to="/register" className="btn btn-primary btn-large">
                <Zap className="btn-icon" />
                Start Free Trial
              </Link>
              <Link to="/viewdemo" className="btn btn-outline btn-large">
                <Lock className="btn-icon" />
                View Demo
              </Link>
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
              <Link to="/register" className="btn btn-primary btn-large">
                Start Free Trial
                <ArrowRight className="btn-icon" />
              </Link>
              <Link to="/viewdemo" className="btn btn-outline btn-large">
                Schedule Demo
              </Link>
            </div>

            <div className="cta-note">
              No credit card required • Enterprise-grade security from day one
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;

import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import {
  Shield,
  Fingerprint,
  QrCode,
  Eye,
  Clock,
  Database,
} from "lucide-react";
import "../App.css";

const Home: React.FC = () => {
  const features = [
    {
      icon: Fingerprint,
      title: "Biometric Authentication",
      description:
        "Advanced fingerprint and facial recognition for industry-leading security",
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


  return (
    <>
      <SEO title="Home" description="Experience enterprise-grade protection with zero-compromise reliability." />
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge-container">
              <div className="glass-pill hero-badge">
                <Shield size={14} />
                <span>Next-Gen Security</span>
              </div>
            </div>

            <h1 className="hero-title">
              FUTURE<br />
              <span className="accent-text">SECURED.</span>
            </h1>

            <p className="hero-description">
              TRANSFORM YOUR SECURITY INFRASTRUCTURE WITH AI-POWERED BIOMETRIC 
              AUTHENTICATION AND DYNAMIC QR TECHNOLOGY.
            </p>

            <div className="cta-container">
              <Link to="/register" className="btn btn-primary">
                GET STARTED
              </Link>
              <Link to="/docs" className="btn btn-outline">
                VIEW DOCUMENTATION
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 01: Biometric Technology */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header-asymmetric">
            <div className="section-marker">01</div>
            <div className="section-title-container">
              <h2 className="section-headline">BIOMETRIC TECH</h2>
              <p>ADVANCED FINGERPRINT AND FACIAL RECOGNITION FOR INDUSTRY-LEADING SECURITY.</p>
            </div>
          </div>

          <div className="features-grid-premium">
            {features.map((feature, index) => (
              <div key={index} className="feature-card-glass">
                <div className="feature-icon-wrapper">
                  <feature.icon className="feature-icon-premium" />
                </div>
                <h3>{feature.title.toUpperCase()}</h3>
                <p>{feature.description.toUpperCase()}</p>
              </div>
            ))}
          </div>

          <div className="text-center" style={{ marginTop: '4rem' }}>
            <Link to="/features" className="btn btn-outline">
              VIEW DETAILED CAPABILITIES
              <Shield size={18} style={{ marginLeft: '0.5rem' }} />
            </Link>
          </div>
        </div>
      </section>


      {/* Section 03: Mobile Protection */}
      <section id="download" className="app-download-section">
        {/* Decorative background elements inspiration from the user image */}
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="dot-pattern dots-1"></div>
        
        <div className="container">
          <div className="app-download-grid">
            <div className="app-mockup-container-dual">
              <div className="glass-panel mockup-glow"></div>
              <div className="phone-mockup phone-back">
                <img 
                  src="/images/app-screen-generated.jpg" 
                  alt="BioQR Generated QR Screen" 
                  className="phone-screen"
                />
              </div>
              <div className="phone-mockup phone-front">
                <img 
                  src="/images/app-screen-options.jpg" 
                  alt="BioQR Options Screen" 
                  className="phone-screen"
                />
              </div>
            </div>

            <div className="app-download-content">
              <div className="section-marker">02</div>
              <h2 className="section-headline download-headline">
                DOWNLOAD OUR<br />
                ANDROID APP
              </h2>
              <p className="download-description">
                Download our latest version of the app, and get exciting experiences every day. Professional security, biometrics, and QR authentication in the palm of your hand.
              </p>
              <div className="download-cta">
                <a href="/downloads/BioQR.apk" className="btn-pill-download" download>
                  Download Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;

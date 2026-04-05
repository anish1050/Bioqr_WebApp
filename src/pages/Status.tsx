import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Server, Fingerprint, QrCode, 
  Database, Globe, LineChart, Bell, RefreshCcw
} from "lucide-react";
import "../styles/status-modern.css";

const Status: React.FC = () => {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="status-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="status-badge" id="overallStatus">
            <CheckCircle className="badge-icon" />
            <span>All Systems Operational</span>
          </div>
          <h1 className="hero-title">SYSTEM STATUS</h1>
          <p className="hero-subtitle">Real-time monitoring of BioQR services and infrastructure. Last updated: <span id="lastUpdated">{new Date().toLocaleTimeString()}</span></p>
        </div>
      </section>

      {/* Current Status */}
      <section className="section">
        <div className="container">
          <div className="status-header">
            <h2>Current System Status</h2>
            <div className="auto-refresh">
              <RefreshCcw size={16} id="refreshIcon" className={countdown > 28 ? "spin" : ""} />
              <span>Auto-refresh: <span id="refreshCountdown">{countdown}</span>s</span>
            </div>
          </div>
          
          <div className="services-grid grid grid-auto-fit" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))" }}>
            {/* API Services */}
            <div className="service-card card" data-service="api">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <Server />
                  </div>
                  <div>
                    <h3>API Services</h3>
                    <p>Core authentication API</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
            
            {/* Biometric Processing */}
            <div className="service-card card" data-service="biometric">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <Fingerprint />
                  </div>
                  <div>
                    <h3>Biometric Processing</h3>
                    <p>Fingerprint & facial recognition</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
            
            {/* QR Generator */}
            <div className="service-card card" data-service="qr">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <QrCode />
                  </div>
                  <div>
                    <h3>QR Generator</h3>
                    <p>Dynamic QR code generation</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
            
            {/* Database */}
            <div className="service-card card" data-service="database">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <Database />
                  </div>
                  <div>
                    <h3>Database</h3>
                    <p>Primary data storage</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
            
            {/* CDN */}
            <div className="service-card card" data-service="cdn">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <Globe />
                  </div>
                  <div>
                    <h3>Content Delivery</h3>
                    <p>Global CDN network</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
            
            {/* Monitoring */}
            <div className="service-card card" data-service="monitoring">
              <div className="service-header">
                <div className="service-info">
                  <div className="service-icon">
                    <LineChart />
                  </div>
                  <div>
                    <h3>Monitoring</h3>
                    <p>System monitoring & alerts</p>
                  </div>
                </div>
                <div className="status-indicator status-online">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "currentColor", marginRight: 6 }}></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      

      
      {/* Subscribe to Updates */}
      <section className="section">
        <div className="container">
          <div className="subscribe-section card text-center">
            <div className="subscribe-icon">
              <Bell size={32} />
            </div>
            <h2>Stay Informed</h2>
            <p>Subscribe to receive notifications about service status updates and scheduled maintenance.</p>
            
            <form className="subscribe-form" id="subscribeForm" onSubmit={(e) => e.preventDefault()}>
              <div className="form-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <input type="email" className="form-input" placeholder="Enter your email address" required style={{ maxWidth: '300px' }} />
                <button type="submit" className="btn btn-primary">
                  <Bell size={18} style={{ marginRight: '0.5rem' }} />
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Status;

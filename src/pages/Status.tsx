import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Server, Fingerprint, QrCode, 
  Database, Globe, LineChart, Bell, Calendar, RefreshCcw
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
        <div className="status-badge" id="overallStatus">
          <CheckCircle className="badge-icon" />
          <span>All Systems Operational</span>
        </div>
        <h1 className="hero-title">System Status</h1>
        <p className="hero-subtitle">Real-time monitoring of BioQR services and infrastructure. Last updated: <span id="lastUpdated">{new Date().toLocaleTimeString()}</span></p>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">145ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.97%</span>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">324ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.94%</span>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">89ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.99%</span>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">12ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.98%</span>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">67ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.95%</span>
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
              <div className="service-metrics">
                <div className="metric">
                  <span className="metric-label">Response Time</span>
                  <span className="metric-value">234ms</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">99.92%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Uptime Charts */}
      <section className="section">
        <div className="container">
          <h2>90-Day Uptime History</h2>
          <div className="uptime-charts" style={{ gridTemplateColumns: "1fr" }}>
            <div className="chart-container card" style={{ marginBottom: "2rem" }}>
              <div className="chart-header">
                <h3>API Services</h3>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-color operational"></span>
                    Operational
                  </span>
                  <span className="legend-item">
                    <span className="legend-color degraded"></span>
                    Degraded
                  </span>
                  <span className="legend-item">
                    <span className="legend-color outage"></span>
                    Outage
                  </span>
                </div>
              </div>
              <div className="uptime-chart" id="apiChart"></div>
              <div className="chart-summary">
                <span className="uptime-percentage">99.97% uptime</span>
                <span className="incident-count">2 incidents in 90 days</span>
              </div>
            </div>
            
            <div className="chart-container card">
              <div className="chart-header">
                <h3>Biometric Processing</h3>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-color operational"></span>
                    Operational
                  </span>
                  <span className="legend-item">
                    <span className="legend-color degraded"></span>
                    Degraded
                  </span>
                  <span className="legend-item">
                    <span className="legend-color outage"></span>
                    Outage
                  </span>
                </div>
              </div>
              <div className="uptime-chart" id="biometricChart"></div>
              <div className="chart-summary">
                <span className="uptime-percentage">99.94% uptime</span>
                <span className="incident-count">3 incidents in 90 days</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="section">
        <div className="container">
          <h2>Recent Incidents</h2>
          
          <div className="incidents-timeline">
            {/* Resolved Incident */}
            <div className="incident-item card">
              <div className="incident-status resolved">
                <CheckCircle size={16} />
                <span>Resolved</span>
              </div>
              <div className="incident-content">
                <div className="incident-header">
                  <h3>API Response Time Degradation</h3>
                  <span className="incident-date">Jan 15, 2025 - 2:30 PM IST</span>
                </div>
                <p className="incident-description">
                  We experienced elevated response times on our API services for approximately 15 minutes. 
                  The issue was caused by increased load during peak hours and has been resolved by scaling our infrastructure.
                </p>
                <div className="incident-timeline">
                  <div className="timeline-item">
                    <span className="timeline-time">2:30 PM</span>
                    <span className="timeline-text">Investigating elevated API response times</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-time">2:35 PM</span>
                    <span className="timeline-text">Identified high load on primary API servers</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-time">2:45 PM</span>
                    <span className="timeline-text">Additional capacity deployed and load balanced</span>
                  </div>
                  <div className="timeline-item resolved">
                    <span className="timeline-time">2:45 PM</span>
                    <span className="timeline-text">Issue resolved - response times back to normal</span>
                  </div>
                </div>
                <div className="incident-impact">
                  <span className="impact-label">Impact:</span>
                  <span className="impact-text">Minor - Slower API responses, no service interruption</span>
                </div>
              </div>
            </div>
            
            {/* Scheduled Maintenance */}
            <div className="incident-item card">
              <div className="incident-status scheduled">
                <Calendar size={16} />
                <span>Scheduled</span>
              </div>
              <div className="incident-content">
                <div className="incident-header">
                  <h3>Database Maintenance</h3>
                  <span className="incident-date">Jan 20, 2025 - 3:00 AM IST</span>
                </div>
                <p className="incident-description">
                  We will be performing routine database maintenance to improve performance and apply security updates. 
                  Expected duration: 30 minutes. All services will remain operational during this maintenance window.
                </p>
                <div className="incident-impact">
                  <span className="impact-label">Expected Impact:</span>
                  <span className="impact-text">None - All services will remain operational</span>
                </div>
              </div>
            </div>
            
            {/* Historical Incident */}
            <div className="incident-item card">
              <div className="incident-status resolved">
                <CheckCircle size={16} />
                <span>Resolved</span>
              </div>
              <div className="incident-content">
                <div className="incident-header">
                  <h3>Biometric Processing Service Outage</h3>
                  <span className="incident-date">Jan 10, 2025 - 1:15 AM IST</span>
                </div>
                <p className="incident-description">
                  Brief outage of biometric processing services due to a failed deployment. 
                  Services were restored quickly by rolling back to the previous stable version.
                </p>
                <div className="incident-timeline">
                  <div className="timeline-item">
                    <span className="timeline-time">1:15 AM</span>
                    <span className="timeline-text">Biometric processing services offline</span>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-time">1:18 AM</span>
                    <span className="timeline-text">Issue identified - failed deployment rollout</span>
                  </div>
                  <div className="timeline-item resolved">
                    <span className="timeline-time">1:22 AM</span>
                    <span className="timeline-text">Services restored via rollback</span>
                  </div>
                </div>
                <div className="incident-impact">
                  <span className="impact-label">Impact:</span>
                  <span className="impact-text">Major - Biometric authentication unavailable for 7 minutes</span>
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

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { 
  Headset, MessageSquare, Ticket, Calendar, Mail, 
  MapPin, Phone, Clock, Circle, 
  Send, Building 
} from "lucide-react";
import "../styles/contact-modern.css";
import SEO from "../components/SEO";

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    priority: "low",
    message: "",
    newsletter: false,
  });

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  // YOUR actual Google Apps Script Web App URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbzflKRHWiGgMtFcvgMUJM5PZ8qjn3ohq_qs-i1Nq3v-zh2iwEUZCLQntyIvM71JNrrc/exec';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!GAS_URL || GAS_URL.includes('YOUR_GOOGLE_APPS_SCRIPT')) {
      console.warn('GAS URL not configured. Please deploy your Google Apps Script and update the URL in Contact.tsx.');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('submitting');
    
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires no-cors for simple POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Since we use no-cors, we won't get a proper JSON response back in browser-land easily, 
      // but we can assume success if no error is thrown. 
      // For GAS specifically, a successful execution returns opaque response.
      setSubmitStatus('success');
      
      // Redirect to help page with success state
      setTimeout(() => {
        navigate('/help?success=true', { state: { fromContact: true } });
      }, 1500);
      
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  return (
    <div className="contact-page">
      <SEO title="Contact Us" description="Get in touch with the BioQR team for enterprise support and inquiries." />
      <section className="contact-hero">
        <div className="container contact-hero-container">
          <div className="contact-hero-left">
            <div className="hero-badge" style={{ margin: '0 0 1rem 0' }}>
              <Mail className="badge-icon" />
              <span>Email Support</span>
            </div>
            <h1 className="hero-title" style={{ margin: 0 }}>Reach Out to Us</h1>
          </div>
          <div className="contact-hero-right">
            <p className="hero-subtitle" style={{ margin: 0 }}>
              Have questions about BioQR? Need technical support
              or want to discuss enterprise solutions? Send us a message 
              and our team will get back to you shortly.
            </p>
          </div>
        </div>
      </section>


      {/* Main Contact Section */}
      <section className="section">
        <div className="container">
          <div className="contact-main grid grid-cols-2">
            {/* Contact Form */}
            <div className="contact-form-section">
              <div className="card" style={{ padding: 0 }}>
                <div className="contact-form-header">
                  <h2>Send us a Message</h2>
                  <p>Fill out the form below and we'll get back to you within 24 hours.</p>
                </div>
                
                
                <form className="contact-form" id="contactForm" onSubmit={handleSubmit}>
                  {submitStatus === 'success' && (
                    <div className="status-message success-message" style={{ 
                      padding: '1rem', 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      border: '1px solid #10b981', 
                      borderRadius: '0.5rem',
                      color: '#10b981',
                      marginBottom: '1.5rem',
                      textAlign: 'center'
                    }}>
                      Message sent successfully! We'll get back to you soon.
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="status-message error-message" style={{ 
                      padding: '1rem', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid #ef4444', 
                      borderRadius: '0.5rem',
                      color: '#ef4444',
                      marginBottom: '1.5rem',
                      textAlign: 'center'
                    }}>
                      Something went wrong. Please check your configuration or try again later.
                    </div>
                  )}
                  <div className="form-row grid grid-cols-2">
                    <div className="form-group">
                      <label htmlFor="firstName" className="form-label">First Name</label>
                      <input type="text" id="firstName" name="firstName" className="form-input" placeholder="John" required value={formData.firstName} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName" className="form-label">Last Name</label>
                      <input type="text" id="lastName" name="lastName" className="form-input" placeholder="Doe" required value={formData.lastName} onChange={handleChange} />
                    </div>
                  </div>
                  
                  <div className="form-row grid grid-cols-2">
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <input type="email" id="email" name="email" className="form-input" placeholder="john@company.com" required value={formData.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">Phone Number</label>
                      <input type="tel" id="phone" name="phone" className="form-input" placeholder="+1 (555) 123-4567" value={formData.phone} onChange={handleChange} />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="company" className="form-label">Company</label>
                    <input type="text" id="company" name="company" className="form-input" placeholder="Company Name (Optional)" value={formData.company} onChange={handleChange} />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="subject" className="form-label">Subject</label>
                    <select id="subject" name="subject" className="form-select" required value={formData.subject} onChange={handleChange}>
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="sales">Sales & Pricing</option>
                      <option value="partnership">Partnership</option>
                      <option value="integration">API Integration</option>
                      <option value="demo">Product Demo</option>
                      <option value="billing">Billing & Account</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Priority Level</label>
                    <div className="priority-options">
                      <label className="priority-option">
                        <input type="radio" name="priority" value="low" checked={formData.priority === 'low'} onChange={handleChange} />
                        <span className="priority-label priority-low">
                          <Circle size={14} />
                          Low
                        </span>
                      </label>
                      <label className="priority-option">
                        <input type="radio" name="priority" value="medium" checked={formData.priority === 'medium'} onChange={handleChange} />
                        <span className="priority-label priority-medium">
                          <Circle size={14} />
                          Medium
                        </span>
                      </label>
                      <label className="priority-option">
                        <input type="radio" name="priority" value="high" checked={formData.priority === 'high'} onChange={handleChange} />
                        <span className="priority-label priority-high">
                          <Circle size={14} />
                          High
                        </span>
                      </label>
                      <label className="priority-option">
                        <input type="radio" name="priority" value="urgent" checked={formData.priority === 'urgent'} onChange={handleChange} />
                        <span className="priority-label priority-urgent">
                          <Circle size={14} />
                          Urgent
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea id="message" name="message" className="form-textarea" placeholder="Please describe your inquiry in detail..." required value={formData.message} onChange={handleChange}></textarea>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input type="checkbox" id="newsletter" name="newsletter" checked={formData.newsletter} onChange={handleChange} />
                      <span className="checkbox-checkmark"></span>
                      Subscribe to our newsletter for product updates and security insights
                    </label>
                  </div>
                  
                  <button 
                    type="submit" 
                    className={`btn btn-primary btn-lg ${submitStatus === 'submitting' ? 'loading' : ''}`} 
                    id="submitBtn"
                    disabled={submitStatus === 'submitting'}
                  >
                    <Send size={18} style={{ marginRight: '0.5rem' }} />
                    {submitStatus === 'submitting' ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="contact-info-section">
              {/* Direct Contact */}
              <div className="card glass-card">
                <h3><Mail size={20} /> Direct Contact</h3>
                
                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="method-icon">
                      <Mail />
                    </div>
                    <div className="method-details">
                      <h4>Email Support</h4>
                      <p>wearebioqr@gmail.com</p>
                      <span className="response-time">Typical response: 2-4 hours</span>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="method-icon">
                      <Clock />
                    </div>
                    <div className="method-details">
                      <h4>Business Hours</h4>
                      <p>Mon - Fri: 9 AM - 6 PM IST</p>
                      <span className="response-time">Emails monitored daily</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Newsletter or extra info */}
              <div className="card glass-card">
                <h3 style={{ justifyContent: 'flex-start' }}><Building size={20} /> Our Mission</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', textAlign: 'left' }}>
                  BioQR is committed to providing secure, efficient, and innovative solutions for your business needs. 
                  Our team of experts is always striving to deliver the best experience for our users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="section">
        <div className="container">
          <div className="faq-header text-center">
            <h2>Frequently Asked Questions</h2>
            <p>Quick answers to common questions about BioQR</p>
          </div>
          
          <div className="faq-grid grid grid-cols-2">
            <div className="faq-item card glass-card">
              <h4>How long does it take to get a response?</h4>
              <p>We typically respond to all inquiries within 2 to 4 hours during business hours. Over the weekend, it may take slightly longer.</p>
            </div>
            
            <div className="faq-item card glass-card">
              <h4>Do you offer customized solutions?</h4>
              <p>Yes, we can tailor BioQR to fit your specific enterprise needs. Just send us a detailed message with your requirements.</p>
            </div>
            
            <div className="faq-item card glass-card">
              <h4>Is technical support free?</h4>
              <p>Basic technical support is included with every account. For specialized integration help, our team is happy to assist.</p>
            </div>
            
            <div className="faq-item card glass-card">
              <h4>How can I report a security vulnerability?</h4>
              <p>Please email wearebioqr@gmail.com for responsible disclosure. We take security reports very seriously and respond as a priority.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

import React, { useState } from "react";

import { 
  Headset, MessageSquare, Ticket, Calendar, Mail, 
  MapPin, Phone, Clock, Circle, 
  Send, Building 
} from "lucide-react";
import "../styles/contact-modern.css";
import SEO from "../components/SEO";

const Contact: React.FC = () => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    
    setFormData({
      ...formData,
      [target.name]: value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normal form submission handled by action URL, or you can implement fetch call here
    const form = e.target as HTMLFormElement;
    form.submit();
  };

  return (
    <div className="contact-page">
      <SEO title="Contact Us" description="Get in touch with the BioQR team for enterprise support and inquiries." />
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <Headset className="badge-icon" />
          <span>24/7 Support</span>
        </div>
        <h1 className="hero-title">Get in Touch</h1>
        <p className="hero-subtitle">Have questions about BioQR? Need technical support or want to discuss enterprise solutions? We're here to help you secure your future.</p>
      </section>

      {/* Contact Options */}
      <section className="section">
        <div className="container">
          <div className="contact-options grid grid-cols-4">
            <div className="contact-option-card card">
              <div className="contact-icon">
                <MessageSquare />
              </div>
              <h3>Live Chat</h3>
              <p>Get instant support from our technical team</p>
              <button className="btn btn-outline btn-sm">
                Start Chat
              </button>
            </div>
            
            <div className="contact-option-card card">
              <div className="contact-icon">
                <Ticket />
              </div>
              <h3>Support Ticket</h3>
              <p>Submit detailed technical issues and track progress</p>
              <button className="btn btn-outline btn-sm">
                Create Ticket
              </button>
            </div>
            
            <div className="contact-option-card card">
              <div className="contact-icon">
                <Calendar />
              </div>
              <h3>Schedule Call</h3>
              <p>Book a consultation with our solutions experts</p>
              <button className="btn btn-outline btn-sm">
                Book Call
              </button>
            </div>
            
            <div className="contact-option-card card">
              <div className="contact-icon">
                <Mail />
              </div>
              <h3>Email Support</h3>
              <p>Send us detailed inquiries and documentation</p>
              <a href="#contactForm" className="btn btn-outline btn-sm">
                Send Email
              </a>
            </div>
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
                
                <form className="contact-form" id="contactForm" action="https://formspree.io/f/mpwpkpne" method="post" onSubmit={handleSubmit}>
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
                  
                  <button type="submit" className="btn btn-primary btn-lg" id="submitBtn">
                    <Send size={18} style={{ marginRight: '0.5rem' }} />
                    Send Message
                  </button>
                </form>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="contact-info-section">
              {/* Office Locations */}
              <div className="card">
                <h3><Building size={20} /> Office Locations</h3>
                
                <div className="office-location">
                  <h4>Headquarters - Mumbai</h4>
                  <div className="office-details">
                    <p><MapPin size={16} /> 123 Tech Hub, Bandra Kurla Complex<br/>Mumbai, Maharashtra 400051, India</p>
                    <p><Phone size={16} /> +91 98765 43210</p>
                    <p><Clock size={16} /> Mon-Fri: 9:00 AM - 6:00 PM IST</p>
                  </div>
                </div>
                
                <div className="office-location">
                  <h4>Development Center - Bangalore</h4>
                  <div className="office-details">
                    <p><MapPin size={16} /> 456 Innovation Street, Electronic City<br/>Bangalore, Karnataka 560100, India</p>
                    <p><Phone size={16} /> +91 98765 43211</p>
                    <p><Clock size={16} /> Mon-Fri: 9:00 AM - 6:00 PM IST</p>
                  </div>
                </div>
              </div>
              
              {/* Direct Contact */}
              <div className="card">
                <h3><Headset size={20} /> Direct Contact</h3>
                
                <div className="contact-methods">
                  <div className="contact-method">
                    <div className="method-icon">
                      <Mail />
                    </div>
                    <div className="method-details">
                      <h4>Email Support</h4>
                      <p>support@bioqr.com</p>
                      <span className="response-time">Response within 4 hours</span>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="method-icon">
                      <Phone />
                    </div>
                    <div className="method-details">
                      <h4>Phone Support</h4>
                      <p>+91 98765 43210</p>
                      <span className="response-time">Mon-Fri, 9 AM - 6 PM IST</span>
                    </div>
                  </div>
                  
                  <div className="contact-method">
                    <div className="method-icon">
                      <MessageSquare />
                    </div>
                    <div className="method-details">
                      <h4>Live Chat</h4>
                      <p>Available 24/7</p>
                      <span className="response-time">Instant response</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Support Hours */}
              <div className="card">
                <h3><Clock size={20} /> Support Hours</h3>
                <div className="support-hours">
                  <div className="hours-item">
                    <span className="day">Monday - Friday</span>
                    <span className="time">9:00 AM - 6:00 PM IST</span>
                  </div>
                  <div className="hours-item">
                    <span className="day">Saturday</span>
                    <span className="time">10:00 AM - 4:00 PM IST</span>
                  </div>
                  <div className="hours-item">
                    <span className="day">Sunday</span>
                    <span className="time">Emergency only</span>
                  </div>
                  <div className="hours-item emergency">
                    <span className="day">24/7 Emergency</span>
                    <span className="time">Critical issues</span>
                  </div>
                </div>
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
            <div className="faq-item card">
              <h4>What is the typical response time for support tickets?</h4>
              <p>We respond to most support tickets within 4 hours during business hours. Critical issues are addressed immediately.</p>
            </div>
            
            <div className="faq-item card">
              <h4>Do you offer enterprise support packages?</h4>
              <p>Yes, we offer comprehensive enterprise support with dedicated account managers, SLA guarantees, and 24/7 phone support.</p>
            </div>
            
            <div className="faq-item card">
              <h4>Can I schedule a product demonstration?</h4>
              <p>Absolutely! You can schedule a personalized demo with our solutions team using the "Schedule Call" option above.</p>
            </div>
            
            <div className="faq-item card">
              <h4>How can I report a security vulnerability?</h4>
              <p>Please email security@bioqr.com for responsible disclosure. We take security reports very seriously and respond promptly.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;

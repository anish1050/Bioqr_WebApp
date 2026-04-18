import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  HelpCircle, Book, MessageCircle, Shield, 
  ChevronRight, CheckCircle, Mail, ExternalLink 
} from "lucide-react";
import SEO from "../components/SEO";
import "../styles/help-modern.css";

const Help: React.FC = () => {
  const location = useLocation();
  const isSubmissionSuccess = location.search.includes('success=true') || location.state?.fromContact;

  const faqs = [
    {
      question: "How do I create an account?",
      answer: "Contact our support team for assistance with setting up an enterprise account tailored to your needs.",
      icon: <Book size={20} />
    },
    {
      question: "How do I log in to my dashboard?",
      answer: "Navigate to the login page and enter your credentials. If you've forgotten your password, use the reset option.",
      icon: <Shield size={20} />
    },
    {
      question: "Can I track data in real-time?",
      answer: "Yes, our dashboard provides live updates and historical views of all your biometric and scan data.",
      icon: <HelpCircle size={20} />
    },
    {
      question: "Is my data secure?",
      answer: "We use enterprise-grade encryption and blockchain technology to ensure your data remains private and tamper-proof.",
      icon: <Shield size={20} />
    }
  ];

  return (
    <div className="help-page">
      <SEO title="Help Center" description="Find answers to your questions and explore our knowledge base." />
      
      <div className="help-container">
        {/* Success Banner (Conditional) */}
        {isSubmissionSuccess && (
          <div className="success-banner">
            <div className="success-icon">
              <CheckCircle size={24} />
            </div>
            <div className="success-content">
              <h2>Message Sent Successfully!</h2>
              <p>Thank you for reaching out. Our team will get back to you within 2-4 hours.</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <header className="help-hero">
          <h1>How can we help?</h1>
          <p>
            Welcome to the BioQR Help Center. Find answers to common questions, 
            explore our features, and get the support you need.
          </p>
        </header>

        {/* FAQ Section */}
        <section className="help-section">
          <h2><HelpCircle className="text-primary" /> Common Questions</h2>
          <div className="help-grid">
            {faqs.map((faq, index) => (
              <div key={index} className="help-card">
                <div className="help-card-icon">{faq.icon}</div>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
                <Link to="#" className="text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                  Learn More <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Knowledge Base / Links */}
        <section className="help-section">
          <h2><Book className="text-primary" /> Resources</h2>
          <div className="help-grid">
            <div className="help-card">
              <h3>Documentation</h3>
              <p>Explore our detailed API documentation and integration guides.</p>
              <Link to="/documentation" className="btn-contact" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                View Docs <ExternalLink size={14} />
              </Link>
            </div>
            <div className="help-card">
              <h3>Security Features</h3>
              <p>Learn about how we protect your biometric data and privacy.</p>
              <Link to="/about" className="btn-contact" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                About BioQR
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <footer className="help-cta">
          <h2>Still need help?</h2>
          <p>If you didn't find the answer you were looking for, our support team is ready to assist you.</p>
          <Link to="/contact" className="btn-contact">
            <Mail size={18} /> Contact Support
          </Link>
        </footer>
      </div>
    </div>
  );
};

export default Help;

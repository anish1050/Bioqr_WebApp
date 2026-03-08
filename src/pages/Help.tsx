import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
// Note: using basic styling and elements similar to the other pages to match uniformity, 
// since the learnmore.css file was missing.

const Help: React.FC = () => {
  return (
    <div className="help-page" style={{ padding: '4rem 1rem', maxWidth: '800px', margin: '0 auto', minHeight: '60vh' }}>
      <SEO title="Help Center" description="Find answers to your questions and explore our knowledge base." />
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold' }}>Help Center</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Welcome to the BioQR Help Center. Here you can find answers to common questions, guidance on using our services, and ways to get in touch with support.
        </p>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Frequently Asked Questions</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>How do I create an account?</h3>
            <p style={{ color: '#475569' }}>Contact support for assistance with setting up an enterprise account.</p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>How do I log in to my dashboard?</h3>
            <p style={{ color: '#475569' }}>You can navigate to the <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Login page</Link> and enter your credentials. If you face issues, please contact support.</p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>Can I see my heart rate at different times of the day?</h3>
            <p style={{ color: '#475569' }}>Yes, the dashboard provides a detailed historical view of your biometric data.</p>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#e0e7ff', padding: '2rem', borderRadius: '0.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e3a8a' }}>Need More Help?</h2>
        <p style={{ color: '#312e81', marginBottom: '1.5rem' }}>
          If you didn’t find what you were looking for, our support team is here to help.
        </p>
        <Link to="/contact" style={{ display: 'inline-block', backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.25rem', textDecoration: 'none', fontWeight: 'bold' }}>
          Contact Support
        </Link>
      </div>
    </div>
  );
};

export default Help;

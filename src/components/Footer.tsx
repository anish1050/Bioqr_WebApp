import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import Logo from "./Logo";

const Footer: React.FC = () => {
  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "/features" },
        { name: "Security", href: "/security" },
        { name: "Pricing", href: "/pricing" },
        { name: "Documentation", href: "/docs" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about" },
        { name: "Careers", href: "/careers" },
        { name: "Press", href: "/press" },
        { name: "Partners", href: "/partners" },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "/help" },
        { name: "Community", href: "/community" },
        { name: "Contact", href: "/contact" },
        { name: "Status Page", href: "/status" },
      ],
    },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Logo className="logo-icon" />
              <span className="logo-text">BioQR</span>
            </div>
            <p>
              Revolutionary biometric and QR code security system trusted by
              enterprises worldwide for mission-critical authentication.
            </p>
            <div className="contact-info">
              <div className="contact-item">
                <Mail className="contact-icon" />
                <span>wearebioqr@gmail.com</span>
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
                      {link.href.startsWith("http") || link.href.startsWith("#") ? (
                        <a href={link.href}>{link.name}</a>
                      ) : (
                        <Link to={link.href}>{link.name}</Link>
                      )}
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
            <Link to="/#privacy">Privacy Policy</Link>
            <Link to="/#terms">Terms of Service</Link>
            <Link to="/#cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

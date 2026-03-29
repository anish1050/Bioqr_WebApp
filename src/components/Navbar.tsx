import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Helper to determine if a link is active
  const isActive = (path: string) => location.pathname === path;

  // Function to close the menu when a link is clicked
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo" onClick={closeMenu}>
          <Logo className="logo-icon" />
          <span className="logo-text">BioQR</span>
        </Link>

        <nav className={`main-nav ${isMenuOpen ? "nav-open" : ""}`}>
          <ul>
            <li>
              <Link to="/#features" onClick={closeMenu}>Features</Link>
            </li>
            <li>
              <Link to="/#security" onClick={closeMenu}>Security</Link>
            </li>
            <li>
              <Link to="/#download" onClick={closeMenu}>Download</Link>
            </li>
            <li>
              <Link to="/about" className={isActive("/about") ? "active" : ""} onClick={closeMenu}>About</Link>
            </li>
            <li>
              <Link to="/contact" className={isActive("/contact") ? "active" : ""} onClick={closeMenu}>Contact</Link>
            </li>
            <li>
              <Link to="/status" className={isActive("/status") ? "active" : ""} onClick={closeMenu}>Status</Link>
            </li>
            {location.pathname !== '/login' && location.pathname !== '/register' && (
              <>
                <li>
                  <Link className="btn btn-ghost" to="/login" onClick={closeMenu}>
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link className="btn btn-primary" to="/register" onClick={closeMenu}>
                    Get Started
                  </Link>
                </li>
              </>
            )}
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
  );
};

export default Navbar;

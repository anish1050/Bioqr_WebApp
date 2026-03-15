import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import "../styles/register.css";
import SEO from "../components/SEO";
import Navbar from "../components/Navbar";

const API_BASE = '';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
    newsletter: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [csrfToken, setCsrfToken] = useState("");

  const [passwordReqs, setPasswordReqs] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false
  });

  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        const csrfResponse = await fetch(`${API_BASE}/bioqr/csrf-token`, { credentials: 'include' });
        const csrfData = await csrfResponse.json();
        setCsrfToken(csrfData.csrfToken);
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      }
    };
    fetchCsrf();

    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');

    if (error) {
      let errorMessage = 'Registration failed';
      if (error === 'oauth_failed') errorMessage = 'Social registration failed. Please try again or use email registration.';
      else if (error === 'session_failed') errorMessage = 'Session creation failed. Please try again.';
      else if (error === 'no_user') errorMessage = 'Registration failed. Please try again.';
      showMessage(errorMessage, 'error');
      navigate('/register', { replace: true });
    }
  }, [navigate, location]);

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'password') {
      setPasswordReqs({
        length: value.length >= 8,
        lowercase: /[a-z]/.test(value),
        uppercase: /[A-Z]/.test(value),
        number: /\d/.test(value)
      });
    }
  };

  const getPasswordStrength = () => {
    const metRequirements = Object.values(passwordReqs).filter(Boolean).length;
    if (metRequirements === 4) return { strength: 100, label: 'Strong', class: 'strong' };
    if (metRequirements >= 3) return { strength: 75, label: 'Good', class: 'good' };
    if (metRequirements >= 2) return { strength: 50, label: 'Fair', class: 'fair' };
    if (formData.password.length > 0) return { strength: 25, label: 'Weak', class: 'weak' };
    return { strength: 0, label: 'Weak', class: 'weak' };
  };

  const passwordStrength = getPasswordStrength();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.username || !formData.email || !formData.password) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    if (!Object.values(passwordReqs).every(Boolean)) {
      showMessage('Please meet all password requirements', 'error');
      return;
    }

    if (!formData.terms) {
      showMessage('Please agree to the Terms of Service and Privacy Policy', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        first_name: formData.firstName.trim().replace(/<[^>]*>/g, ''),
        last_name: formData.lastName.trim().replace(/<[^>]*>/g, ''),
        username: formData.username.trim().replace(/<[^>]*>/g, ''),
        email: formData.email.trim().replace(/<[^>]*>/g, ''),
        password: formData.password
      };

      const response = await fetch(`${API_BASE}/bioqr/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Account created successfully! Redirecting to login...', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showMessage(result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showMessage('Network error. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthRegistration = (provider: string) => {
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  return (
    <div className="register-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SEO title="Create Account" description="Join BioQR to securely manage, authenticate, and share your files seamlessly." />
      {/* Animated background elements */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      <Navbar />

      {/* Registration form */}
      <section className="register-section" style={{ position: 'relative', zIndex: 10 }}>
        <div className="register-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ textAlign: 'center', margin: 0 }}>Create Your Account</h2>
          </div>

          <form id="registerForm" className="register-form" onSubmit={handleRegister}>
            {/* Name fields */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <div className={`input-wrapper ${formData.firstName ? 'focused' : ''}`}>
                  <User className="input-icon" size={20} />
                  <input type="text" id="firstName" name="firstName" placeholder="Your first name" required autoComplete="given-name" value={formData.firstName} onChange={handleChange} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <div className={`input-wrapper ${formData.lastName ? 'focused' : ''}`}>
                  <User className="input-icon" size={20} />
                  <input type="text" id="lastName" name="lastName" placeholder="Your last name" required autoComplete="family-name" value={formData.lastName} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              {/* Username */}
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className={`input-wrapper ${formData.username ? 'focused' : ''}`}>
                  <User className="input-icon" size={20} />
                  <input type="text" id="username" name="username" placeholder="Choose a unique username" required autoComplete="username" minLength={3} maxLength={20} value={formData.username} onChange={handleChange} />
                </div>
                <div className="field-hint">3-20 characters, letters, numbers, and underscores only</div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className={`input-wrapper ${formData.email ? 'focused' : ''}`}>
                  <Mail className="input-icon" size={20} />
                  <input type="email" id="email" name="email" placeholder="your.email@example.com" required autoComplete="email" value={formData.email} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="form-row">
              {/* Password */}
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className={`input-wrapper ${formData.password ? 'focused' : ''}`}>
                  <Lock className="input-icon" size={20} />
                  <input type={showPassword ? "text" : "password"} id="password" name="password" placeholder="Create a strong password" required autoComplete="new-password" minLength={8} value={formData.password} onChange={handleChange} />
                  <button type="button" className={`password-toggle ${showPassword ? 'active' : ''}`} aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>

                {/* Password strength indicator */}
                <div className="password-strength">
                  <div className="strength-bar">
                    <div className={`strength-fill ${passwordStrength.class}`} style={{ width: `${passwordStrength.strength}%` }}></div>
                  </div>
                  <div className="strength-text">Password strength: <span>{passwordStrength.label}</span></div>
                </div>

                {/* Password requirements */}
                <div className="password-requirements">
                  <div className={`requirement ${passwordReqs.length ? 'met' : ''}`}>
                    <ShieldCheck size={16} className="req-icon" /> At least 8 characters
                  </div>
                  <div className={`requirement ${passwordReqs.lowercase ? 'met' : ''}`}>
                    <ShieldCheck size={16} className="req-icon" /> One lowercase letter
                  </div>
                  <div className={`requirement ${passwordReqs.uppercase ? 'met' : ''}`}>
                    <ShieldCheck size={16} className="req-icon" /> One uppercase letter
                  </div>
                  <div className={`requirement ${passwordReqs.number ? 'met' : ''}`}>
                    <ShieldCheck size={16} className="req-icon" /> One number
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className={`input-wrapper ${formData.confirmPassword ? 'focused' : ''}`}>
                  <Lock className="input-icon" size={20} />
                  <input type={showPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} />
                  <button type="button" className={`password-toggle ${showPassword ? 'active' : ''}`} aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms and Privacy */}
            <div className="form-group">
              <label className="checkbox-container">
                <input type="checkbox" id="terms" name="terms" required checked={formData.terms} onChange={handleChange} />
                <span className="checkmark"></span>
                <span className="checkbox-text">I agree to the <a href="#" className="link">Terms of Service</a> and <a href="#" className="link">Privacy Policy</a></span>
              </label>
            </div>

            {/* Newsletter signup */}
            <div className="form-group">
              <label className="checkbox-container">
                <input type="checkbox" id="newsletter" name="newsletter" checked={formData.newsletter} onChange={handleChange} />
                <span className="checkmark"></span>
                <span className="checkbox-text">Send me product updates and security tips</span>
              </label>
            </div>

            <button type="submit" className="register-btn" disabled={isLoading}>
              {!isLoading ? <span className="btn-text">Create Account</span> : (
                <div className="btn-loading" style={{ display: 'flex' }}>
                  <Loader className="spinner" size={18} style={{ marginRight: '8px' }} />
                  <span>Creating account...</span>
                </div>
              )}
            </button>
          </form>

          <div className="divider">
            <span>or create account with</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-btn google-btn" onClick={() => handleOAuthRegistration('google')}>
              <svg viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button type="button" className="social-btn github-btn" onClick={() => handleOAuthRegistration('github')}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="signin-link" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)' }}>
            <p>Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Sign in</Link></p>
          </div>
        </div>
      </section>

      {message.text && (
        <div id="message" className={`message-container ${message.type}`} style={{ display: 'block' }}>
          <div className="message-content">
            {message.type === 'success' && <CheckCircle size={24} style={{ color: '#10b981' }} />}
            {message.type === 'error' && <XCircle size={24} style={{ color: '#ef4444' }} />}
            <span className="message-text">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

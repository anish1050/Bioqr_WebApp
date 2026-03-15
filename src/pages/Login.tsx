import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader, CheckCircle, XCircle, Info } from "lucide-react";
import "../styles/login.css";
import SEO from "../components/SEO";
import Navbar from "../components/Navbar";

const API_BASE = '';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loginField, setLoginField] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [csrfToken, setCsrfToken] = useState("");

  const isEmail = loginField.includes('@');

  useEffect(() => {
    // Fetch CSRF token
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

    // Check if user is already logged in
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      navigate('/dashboard');
      return;
    }

    // Handle URL parameters (OAuth errors)
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const msg = urlParams.get('message');
    const provider = urlParams.get('provider');

    if (error) {
      let errorMessage = 'Authentication failed';
      if (error === 'oauth_failed') errorMessage = 'Social login failed. Please try again.';
      else if (error === 'session_failed') errorMessage = 'Session creation failed. Please try again.';
      showMessage(errorMessage, 'error');
      // Clean URL
      navigate('/login', { replace: true });
    } else if (msg) {
      let messageText = 'Please sign in to continue.';
      let messageType = 'info';
      if (msg === 'registration_success') {
        messageText = `Account created successfully with ${provider === 'google' ? 'Google' : 'GitHub'}! You can now sign in.`;
        messageType = 'success';
      } else if (msg === 'user_exists') {
        messageText = `You already have an account with ${provider === 'google' ? 'Google' : 'GitHub'}. Please sign in instead.`;
        messageType = 'info';
      }
      showMessage(messageText, messageType);
      // Clean URL
      navigate('/login', { replace: true });
    }
  }, [navigate, location]);

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const loginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!loginField || !password) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginField)) {
        showMessage('Please enter a valid email address', 'error');
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/bioqr/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ loginField: loginField.trim().replace(/<[^>]*>/g, ''), password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.removeItem('userLoggedOut');
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('userInfo', JSON.stringify(data.user));

        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.replace('/dashboard');
        }, 1000);
      } else {
        showMessage(data.message || 'Login failed', 'error');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      showMessage('Network error. Please try again.', 'error');
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const loginWithGitHub = () => {
    window.location.href = `${API_BASE}/auth/github`;
  };

  return (
    <div className="login-page">
      <SEO title="Sign In" description="Securely log in to manage your files and access your BioQR dashboard." />
      {/* Animated Background */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>
      </div>

      <div className="login-container">
        <Navbar />

        {/* Login Section */}
        <div className="login-section">
          <div className="login-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h2 style={{ textAlign: 'center', margin: 0 }}>Welcome Back</h2>
            </div>

            <form className="login-form" onSubmit={loginUser}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="loginField">Username or Email</label>
                  <div className={`input-wrapper ${loginField ? 'focused' : ''}`}>
                    {isEmail ? <Mail className="input-icon" size={20} /> : <User className="input-icon" size={20} />}
                    <input 
                      id="loginField" 
                      type="text" 
                      placeholder="Enter username or email" 
                      required 
                      autoComplete="username"
                      value={loginField}
                      onChange={(e) => setLoginField(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className={`input-wrapper ${password ? 'focused' : ''}`}>
                    <Lock className="input-icon" size={20} />
                    <input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Enter your password" 
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className={`password-toggle ${showPassword ? 'active' : ''}`} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" id="remember-me" />
                  <span className="checkmark"></span>
                  <span className="checkbox-text">Remember me</span>
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>

              <button type="submit" className="login-btn" disabled={isLoading}>
                {!isLoading ? <span className="btn-text">Sign In</span> : (
                  <div className="btn-loading" style={{ display: 'flex' }}>
                    <Loader className="spinner" size={18} style={{ marginRight: '8px' }} />
                    <span>Signing in...</span>
                  </div>
                )}
              </button>
            </form>

            <div className="divider">
              <span>or continue with</span>
            </div>

            <div className="social-login">
              <button type="button" className="social-btn" onClick={loginWithGoogle}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
              <button type="button" className="social-btn" onClick={loginWithGitHub}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </button>
            </div>

            <div className="signup-link">
              Don't have an account? <Link to="/register">Sign up</Link>
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`message-container ${message.type}`} style={{ display: 'block' }}>
          <div className="message-content">
            {message.type === 'success' && <CheckCircle className="message-icon success-icon" size={24} />}
            {message.type === 'error' && <XCircle className="message-icon error-icon" size={24} />}
            {message.type === 'info' && <Info className="message-icon info-icon" size={24} />}
            <span className="message-text">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

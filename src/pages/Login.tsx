import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Info, LogIn, ShieldCheck, X } from "lucide-react";
import "../styles/register.css";
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

  // Fetch CSRF token — once on mount
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

    // Check if user is already logged in
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userInfoStr = localStorage.getItem('userInfo');
    const logoutFlag = localStorage.getItem('userLoggedOut');
    
    if (accessToken && refreshToken && userInfoStr && logoutFlag !== 'true') {
      try {
        const user = JSON.parse(userInfoStr);
        const userType = user.user_type || 'individual';
        let redirectPath = '/dashboard';
        if (['org_super_admin', 'org_admin', 'org_member'].includes(userType)) {
          redirectPath = '/dashboard/org';
        } else if (['team_lead', 'team_member', 'community_lead', 'community_member'].includes(userType)) {
          redirectPath = '/dashboard/team';
        }
        navigate(redirectPath);
        return;
      } catch (e) {
        console.error('Failed to parse userInfo for auto-redirect', e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL parameters (OAuth errors/messages) — once on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const msg = urlParams.get('message');
    const provider = urlParams.get('provider');

    if (error) {
      let errorMessage = 'Authentication failed';
      if (error === 'oauth_failed') errorMessage = 'Social login failed. Please try again.';
      else if (error === 'session_failed') errorMessage = 'Session creation failed. Please try again.';
      else if (error === 'account_not_found') errorMessage = 'Account not found. Please register to create an account.';
      showMessage(errorMessage, 'error');
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
      navigate('/login', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        let redirectPath = '/dashboard';
        const userType = data.user.user_type || 'individual';
        
        if (['org_super_admin', 'org_admin', 'org_member'].includes(userType)) {
          redirectPath = '/dashboard/org';
        } else if (['team_lead', 'team_member', 'community_lead', 'community_member'].includes(userType)) {
          redirectPath = '/dashboard/team';
        }

        // Warning missing bioseal
        const hasBioseal = data.user.biometric_enrolled === true || data.user.biometric_enrolled === 1;
        if (!hasBioseal) {
           showMessage('Please set up BioSeal to fully secure your account.', 'info');
           // Could redirect to a dedicated /enroll-bioseal page but dashboard covers everything for now
        } else {
           showMessage('Login successful! Redirecting...', 'success');
        }

        setTimeout(() => {
          window.location.replace(redirectPath);
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
    <div className="login-wrapper">
      <SEO title="Sign In" description="Securely log in to manage your files and access your BioQR dashboard." />
      
      <Navbar />

      {/* Background Decor */}
      <div className="absolute top-0" style={{ left: '-25%', width: '50%', height: '50%' }}>
        <div className="bg-blue-glow blur-huge rounded-full" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute" style={{ bottom: 0, right: '-25%', width: '50%', height: '50%' }}>
        <div className="bg-emerald-glow blur-huge rounded-full" style={{ width: '100%', height: '100%' }} />
      </div>
      
      <div className="w-full max-w-5xl z-10 animate-in fade-in">
        <div className="premium-card auth-layout rounded-3xl overflow-hidden" style={{ minHeight: '480px' }}>
          
          {/* Left Panel: Branding */}
          <div className="left-panel">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.25rem)', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '0.75rem' }}>Welcome Back.</h2>
                  <p style={{ color: '#94a3b8', fontSize: 'clamp(0.95rem, 3vw, 1.125rem)', fontWeight: 500, lineHeight: 1.5, maxWidth: '100%' }}>Sign in to access your dashboard, manage files, and continue where you left off.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ height: '3rem', width: '3rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: 'white', boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)' }}>
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h4 style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>Secure Access</h4>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>End-to-End Encrypted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="right-panel">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              
              {message.text && (
                <div className={`premium-alert ${message.type === 'error' ? 'premium-alert-error' : message.type === 'success' ? 'premium-alert-success' : 'premium-alert-info'}`}>
                  {message.type === 'success' && <CheckCircle2 className="premium-alert-icon" />}
                  {message.type === 'error' && <XCircle className="premium-alert-icon" />}
                  {message.type === 'info' && <Info className="premium-alert-icon" />}
                  <div className="premium-alert-content">{message.text}</div>
                  <button onClick={() => setMessage({ text: "", type: "" })} className="premium-alert-close">
                    <X size={16} />
                  </button>
                </div>
              )}

              <form onSubmit={loginUser}>
                <div className="form-grid animate-in fade-in" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group text-left">
                    <label className="premium-label">Username or Email</label>
                    <div className="relative">
                      {isEmail 
                        ? <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        : <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      }
                      <input 
                        type="text" 
                        placeholder="Enter username or email" 
                        className="premium-input"
                        autoComplete="username"
                        value={loginField}
                        onChange={(e) => setLoginField(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group text-left">
                    <label className="premium-label">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Enter your password" 
                        className="premium-input hide-ms-reveal"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/50 rounded-lg transition-all focus:outline-none border-0 outline-none" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' }}>
                    <Link to="/forgot-password" style={{ color: '#60a5fa', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 500 }}>Forgot password?</Link>
                  </div>

                  <div style={{ paddingTop: '0.25rem' }}>
                    <button type="submit" disabled={isLoading || !loginField || !password} className="w-full register-btn-primary text-white rounded-xl font-extrabold" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', borderRadius: '0.75rem', fontWeight: 800, color: 'white', opacity: (isLoading || !loginField || !password) ? 0.5 : 1 }}>
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5" /> <span>Sign In</span></>}
                    </button>
                  </div>

                  {/* Security Note for Social Login */}
                  <div style={{ 
                    padding: '0.75rem', 
                    background: 'rgba(59, 130, 246, 0.05)', 
                    border: '1px solid rgba(59, 130, 246, 0.1)', 
                    borderRadius: '0.75rem', 
                    marginTop: '1.25rem',
                    marginBottom: '0.5rem', 
                    display: 'flex', 
                    gap: '0.75rem', 
                    alignItems: 'center' 
                  }}>
                    <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, textAlign: 'left', lineHeight: 1.4 }}>
                      <strong style={{ color: 'white' }}>Security Note:</strong> For your protection, please <Link to="/register" style={{ color: '#60a5fa', fontWeight: 600 }}>Sign Up</Link> first to enroll your biometric profile before using Google or GitHub login.
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  </div>

                  {/* Social Login */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="button" onClick={loginWithGoogle} style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </button>
                    <button type="button" onClick={loginWithGitHub} style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.75rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '18px', height: '18px' }}>
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </button>
                  </div>

                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#60a5fa', fontWeight: 500, textDecoration: 'none' }}>Sign up</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

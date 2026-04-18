import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ArrowRight, KeyRound, MailCheck, ArrowLeft, X } from "lucide-react";
import axios from "axios";
import "../styles/register.css";
import SEO from "../components/SEO";
import Navbar from "../components/Navbar";

const API_BASE = '/bioqr';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    return score;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/users/forgot-password/send-otp`, { email });

      if (response.data.success) {
        setStep('otp');
        setSuccess("Reset code sent! Check your email.");
      } else {
        setError(response.data.message || "Failed to send reset code.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/users/forgot-password/reset`, {
        email,
        otp,
        newPassword
      });

      if (response.data.success) {
        setStep('success');
        setSuccess(response.data.message);
      } else {
        setError(response.data.message || "Reset failed.");
        if (response.data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(response.data.attemptsRemaining);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8.5rem', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem', position: 'relative', overflowY: 'auto', overflowX: 'hidden', background: '#020617' }}>
      <SEO title="Reset Password" description="Reset your BioQR account password securely." />
      
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
          
          {/* Left Panel: Branding & Progress */}
          <div className="left-panel">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '1rem' }}>Reset your Password.</h2>
                  <p style={{ color: '#94a3b8', fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.6 }}>We'll send a verification code to your email to help you regain access to your account.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                  {/* Step 1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', opacity: step === 'email' ? 1 : 0.6, transition: 'all 0.5s' }}>
                    <div style={{ height: '3rem', width: '3rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)', background: step !== 'email' ? '#10b981' : '#2563eb', color: 'white' }}>
                      {step !== 'email' ? <CheckCircle2 size={24} /> : "01"}
                    </div>
                    <div>
                      <h4 style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>Enter Email</h4>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Account Lookup</p>
                    </div>
                  </div>

                  <div style={{ marginLeft: '1.5rem', borderLeft: '2px solid #1e293b', height: '2.5rem' }} />

                  {/* Step 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', opacity: step === 'otp' ? 1 : 0.6, transition: 'all 0.5s' }}>
                    <div style={{ height: '3rem', width: '3rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', background: step === 'otp' ? '#2563eb' : step === 'success' ? '#10b981' : '#1e293b', color: step === 'email' ? '#64748b' : 'white', boxShadow: step === 'otp' ? '0 0 20px rgba(37, 99, 235, 0.2)' : 'none' }}>
                      {step === 'success' ? <CheckCircle2 size={24} /> : "02"}
                    </div>
                    <div>
                      <h4 style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>Reset Password</h4>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verify & Update</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Form Content */}
          <div className="right-panel">
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              
              {error && (
                <div className="premium-alert premium-alert-error">
                  <XCircle className="premium-alert-icon" />
                  <div className="premium-alert-content">{error}</div>
                  <button onClick={() => setError("")} className="premium-alert-close">
                    <X size={16} />
                  </button>
                </div>
              )}
              {success && step !== 'email' && (
                <div className="premium-alert premium-alert-success">
                  <CheckCircle2 className="premium-alert-icon" />
                  <div className="premium-alert-content">{success}</div>
                  <button onClick={() => setSuccess("")} className="premium-alert-close">
                    <X size={16} />
                  </button>
                </div>
              )}

              {step === 'email' && (
                <div className="animate-in fade-in">
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid #2563eb', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }}>
                      <KeyRound style={{ width: '2rem', height: '2rem', color: '#60a5fa' }} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Forgot your password?</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Enter the email associated with your account and we'll send a reset code.</p>
                  </div>

                  <div className="form-group text-left" style={{ marginBottom: '1.5rem' }}>
                    <label className="premium-label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="john@example.com" 
                        className="premium-input"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      />
                    </div>
                  </div>

                  <button type="button" onClick={handleSendOtp} disabled={loading || !email} className="w-full register-btn-primary text-white rounded-xl font-extrabold" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', borderRadius: '0.75rem', fontWeight: 800, color: 'white', opacity: (loading || !email) ? 0.5 : 1 }}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MailCheck className="h-5 w-5" /> <span>Send Reset Code</span> <ArrowRight className="h-5 w-5" /></>}
                  </button>

                  <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '1.5rem' }}>
                    Remember your password? <Link to="/login" style={{ color: '#60a5fa', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
                  </p>
                </div>
              )}

              {step === 'otp' && (
                <div className="animate-in fade-in">
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid #2563eb', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)' }}>
                      <Lock style={{ width: '2rem', height: '2rem', color: '#60a5fa' }} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>Set new password</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Enter the code sent to <span style={{ color: 'white', fontWeight: 500 }}>{email}</span> and your new password.</p>
                  </div>

                  <form onSubmit={handleResetPassword}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* OTP Input */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(""); }}
                            style={{ width: '100%', maxWidth: '240px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', padding: '1rem', textAlign: 'center', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '0.5em', color: 'white', outline: 'none', transition: 'all 0.2s' }}
                            placeholder="000000"
                          />
                        </div>
                        {attemptsRemaining !== null && (
                          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#f87171', marginTop: '0.5rem' }}>Invalid code. {attemptsRemaining} attempts left.</p>
                        )}
                      </div>

                      {/* New Password */}
                      <div className="form-group text-left">
                        <label className="premium-label">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="premium-input hide-ms-reveal"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all focus:outline-none" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                        </div>
                        {newPassword && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(30, 41, 59, 0.2)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1, height: '0.375rem', background: '#1e293b', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${passwordStrength}%`, transition: 'all 0.7s', background: passwordStrength >= 75 ? '#10b981' : passwordStrength >= 50 ? '#3b82f6' : '#ef4444' }} />
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: passwordStrength === 100 ? '#34d399' : passwordStrength >= 50 ? '#60a5fa' : '#f87171' }}>
                              {passwordStrength === 100 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="form-group text-left">
                        <label className="premium-label">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                          <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="premium-input hide-ms-reveal"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword} className="w-full register-btn-primary text-white rounded-xl font-extrabold" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', borderRadius: '0.75rem', fontWeight: 800, color: 'white', opacity: (loading || otp.length !== 6 || !newPassword || !confirmPassword) ? 0.5 : 1 }}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> <span>Reset Password</span></>}
                      </button>

                      <button 
                        type="button" 
                        onClick={() => { setStep('email'); setOtp(""); setNewPassword(""); setConfirmPassword(""); setError(""); setSuccess(""); }} 
                        className="w-full mt-2 flex items-center justify-center gap-2 text-slate-300 hover:text-white text-sm font-semibold py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                        style={{ background: 'transparent' }}
                      >
                        <ArrowLeft size={18} /> <span>Wrong email? Go back</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 'success' && (
                <div className="animate-in fade-in" style={{ textAlign: 'center' }}>
                  <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981' }}>
                    <CheckCircle2 style={{ width: '2rem', height: '2rem', color: '#34d399' }} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem' }}>Password Reset!</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>Your password has been successfully updated. All existing sessions have been signed out for security.</p>
                  <button onClick={() => navigate('/login')} className="w-full register-btn-primary text-white rounded-xl font-extrabold" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', borderRadius: '0.75rem', fontWeight: 800, color: 'white' }}>
                    <ArrowRight className="h-5 w-5" /> <span>Continue to Sign In</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

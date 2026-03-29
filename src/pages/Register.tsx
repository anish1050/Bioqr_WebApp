import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Mail, Lock, Eye, EyeOff,
  Smartphone, MailCheck,
  Fingerprint, CheckCircle2, XCircle, Loader2,
  ArrowRight
} from 'lucide-react';
import axios from "axios";
import "../styles/register.css";
import SEO from "../components/SEO";
import Navbar from "../components/Navbar";

const API_BASE = '/bioqr'; // Backend routes are mounted under /bioqr

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    mobile_number: "",
    password: "",
    confirm_password: "",
    terms: false
  });

  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Verification States
  const [emailSent, setEmailSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Reset errors when user types
    if (error) setError("");
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    return score;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSendEmailOtp = async () => {

    if (!formData.first_name || !formData.email || !formData.password) {
      setError("Please fill all fields before verifying email.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API_BASE}/users/register/send-email-otp`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        mobile_number: formData.mobile_number
      });

      if (response.data.success) {
        setEmailSent(true);
        setStep('verify');
        setSuccess("Verification code sent to your email!");
      } else {
        setError(response.data.message || "Failed to send OTP.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/users/register/verify-email`, {
        email: formData.email,
        otp: emailOtp
      });

      if (response.data.success) {
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(response.data.message || "Verification failed.");
        if (response.data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(response.data.attemptsRemaining);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6.5rem', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem', position: 'relative', overflowY: 'auto', overflowX: 'hidden', background: '#020617' }}>
      <SEO title="Create Account" description="Join BioQR to securely manage and verify your identity." />
      
      <Navbar />

      {/* Background Decor */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-glow blur-huge rounded-full animate-pulse" />
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-glow blur-huge rounded-full animate-pulse delay-700" />
      
      <div className="w-full max-w-5xl z-10 animate-in fade-in">
        <div className="premium-card auth-layout rounded-3xl overflow-hidden min-h-[540px]">
          
          {/* Left Panel: Branding & Progress (Wider) */}
          <div className="left-panel">
            <div className="flex flex-col h-full justify-between">
              <div>
                
                <div className="space-y-8">
                  <div className="space-y-5">
                    <h2 className="text-4xl font-extrabold text-white leading-tight">Securely Share your Files Digital.</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">Experience the next generation of authentication with biometric-backed QR technology.</p>
                  </div>

                  <div className="space-y-6 pt-2">
                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'info' ? 'scale-105 opacity-100' : 'opacity-60 grayscale'}`}>
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${emailSent ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
                        {emailSent ? <CheckCircle2 size={24} /> : "01"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Basic Info</h4>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest">Account Details</p>
                      </div>
                    </div>
                    
                    <div className="ml-6 border-l-2 border-slate-800 h-10 w-0" />

                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'verify' ? 'scale-105 opacity-100' : 'opacity-60 grayscale'}`}>
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${emailSent ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                        02
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Email Verification</h4>
                        <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest">Confirm your email</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Right Panel: Form Content (Spacious) */}
          <div className="right-panel">
            <div className="flex flex-col h-full justify-center">
              {error && (
                <div className="mb-4 p-4 bg-red-alert border rounded-2xl flex items-center gap-3 animate-in fade-in">
                  <XCircle className="text-red-400 h-5 w-5 shrink-0" />
                  <p className="text-red-400 text-sm font-semibold">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-emerald-alert border rounded-2xl flex items-center gap-3 animate-in fade-in">
                  <CheckCircle2 className="text-emerald-400 h-5 w-5 shrink-0" />
                  <p className="text-emerald-400 text-sm font-semibold">{success}</p>
                </div>
              )}

            {step === 'info' ? (
              <div className="form-grid animate-in fade-in slide-in-from-right-4">
                <div className="form-group text-left">
                  <label className="premium-label">First Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type="text" name="first_name" placeholder="John" className="premium-input" value={formData.first_name} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group text-left">
                  <label className="premium-label">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type="text" name="last_name" placeholder="Doe" className="premium-input" value={formData.last_name} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group text-left md:col-span-2">
                  <label className="premium-label">Username</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type="text" name="username" placeholder="johndoe7" className="premium-input" value={formData.username} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group text-left md:col-span-2">
                  <label className="premium-label">Mobile Number (Optional)</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type="tel" name="mobile_number" placeholder="+91 9876543210" className="premium-input" value={formData.mobile_number} onChange={handleChange} disabled={loading} />
                  </div>
                </div>

                <div className="form-group text-left md:col-span-2">
                  <label className="premium-label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type="email" name="email" placeholder="john@example.com" className="premium-input" value={formData.email} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group text-left md:col-span-2">
                  <label className="premium-label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" className="premium-input hide-ms-reveal" value={formData.password} onChange={handleChange} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white rounded-lg transition-all focus:outline-none" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-3 flex items-center gap-3 bg-slate-800/20 p-2 rounded-lg border border-white/5">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-700 ease-out ${passwordStrength >= 75 ? 'bg-emerald-500 shadow-glow' : passwordStrength >= 50 ? 'bg-blue-500 shadow-glow' : 'bg-red-500 shadow-glow'}`} style={{ width: `${passwordStrength}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${passwordStrength === 100 ? 'text-emerald-400' : passwordStrength >= 50 ? 'text-blue-400' : 'text-red-400'}`}>{passwordStrength === 100 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 pt-1">
                  <button type="button" onClick={handleSendEmailOtp} disabled={loading || !formData.email || !formData.password || !formData.first_name || !formData.last_name || !formData.username} className="w-full py-3 register-btn-primary text-white rounded-xl font-extrabold shadow-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.97] disabled:opacity-50 text-sm uppercase tracking-widest">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MailCheck className="h-5 w-5" /> <span>Verify Email</span> <ArrowRight className="h-5 w-5" /></>}
                  </button>
                </div>
                
                <p className="text-center text-xs text-slate-500">
                  Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Log in</Link>
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 h-full flex flex-col justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-glow rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500">
                    <MailCheck className="h-8 w-8 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
                  <p className="text-slate-400 text-sm">We've sent a 6-digit verification code to <span className="text-white font-medium">{formData.email}</span></p>
                </div>

                <form onSubmit={handleFinalSubmit} className="space-y-6">
                  <div className="form-group">
                    <div className="flex justify-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full max-w-[240px] bg-slate-800/50 border border-white/10 rounded-2xl py-4 text-center text-3xl font-bold tracking-[0.5em] text-white focus:border-emerald-500 outline-none transition-all"
                        placeholder="000000"
                      />
                    </div>
                    {attemptsRemaining !== null && (
                      <p className="text-center text-xs text-red-400 mt-2">Invalid code. {attemptsRemaining} attempts left.</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || emailOtp.length !== 6} className="w-full py-3 register-btn-primary text-white rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> <span>Complete Registration</span></>}
                  </button>

                  <button type="button" onClick={() => setStep('info')} className="w-full text-slate-500 hover:text-white text-xs font-medium transition-colors">
                    Wrong email? Go back
                  </button>
                </form>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

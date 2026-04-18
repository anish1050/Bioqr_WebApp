import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Mail, Lock, Eye, EyeOff, Smartphone, MailCheck, Fingerprint, 
  CheckCircle2, XCircle, Loader2, ArrowRight, ArrowLeft, Building, Users, Camera, ChevronDown, X, Heart, UserPlus
} from 'lucide-react';
import axios from "axios";
import "../styles/register.css";
import SEO from "../components/SEO";
import Navbar from "../components/Navbar";

// We assume you have a utility for face api or webcam. 
// For this demo, we'll simulate the enrollment or rely on a simple webcam capture.
import Webcam from "react-webcam";

const API_BASE = '/bioqr'; 

type RegisterStep = 'role' | 'info' | 'verify' | 'bioseal' | 'done';
type UserTypeInput = 'individual' | 'org_super_admin' | 'org_member' | 'team_lead' | 'team_member' | 'community_lead' | 'community_member' | 'joiner';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<RegisterStep>('role');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('registerFormData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      user_type: 'individual' as UserTypeInput,
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      mobile_number: "",
      password: "",
      
      // Org/Team Specific
      org_name: "",
      org_industry: "",
      org_unique_id: "",
      team_name: "",
      team_unique_id: ""
    };
  });

  const [showPassword, setShowPassword] = useState(false);
  
  // Verification States
  const [emailOtp, setEmailOtp] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Biometric States
  const webcamRef = useRef<Webcam>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [biosealStatus, setBiosealStatus] = useState<"idle" | "capturing" | "enrolling" | "success" | "error">("idle");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
    if (error) setError("");
  };

  useEffect(() => {
    sessionStorage.setItem('registerFormData', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn user if they try to leave while in middle of registration
      if (step === 'info' || step === 'verify' || step === 'bioseal') {
        e.preventDefault();
        e.returnValue = ''; // Standard required for the warning to show
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  useEffect(() => {
    // Only check if we are not already on the bioseal step to avoid loops
    if (step === 'bioseal') return;

    const token = localStorage.getItem("accessToken");
    if (token) {
      axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data.success) {
            // Already verified. Do they need bioseal?
            if (!res.data.user.biometric_enrolled) {
              setStep('bioseal');
            } else {
              const redirectPath = ['org_super_admin', 'org_admin', 'org_member'].includes(res.data.user.user_type) 
                ? '/org' 
                : ['team_lead', 'team_member', 'community_lead', 'community_member'].includes(res.data.user.user_type) 
                  ? '/team' 
                  : '/dashboard';
              setTimeout(() => navigate(redirectPath), 100);
            }
          }
        })
        .catch(() => {
          // Token invalid, ignore
        });
    }
  }, [navigate, step]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'account_not_found') {
      setError("Account not found. Please register to create a new account.");
      // Clean up URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const getDevices = async () => {
      try {
        setCameraError(null);
        // Requesting permission is only needed if labels are empty
        const initialDevices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = initialDevices.some(d => d.label);

        if (!hasLabels) {
          await navigator.mediaDevices.getUserMedia({ video: true });
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoDevices);
        
        if (videoDevices.length > 0) {
          // Priority selection logic...
          let selected = videoDevices.find(d => 
            d.label.toLowerCase().includes('integrated') || 
            d.label.toLowerCase().includes('built-in')
          );
          if (!selected) {
            selected = videoDevices.find(d => 
              !d.label.toLowerCase().includes('virtual') && 
              !d.label.toLowerCase().includes('phone link')
            );
          }
          setSelectedDeviceId(selected ? selected.deviceId : videoDevices[0].deviceId);
        }
      } catch (err: any) {
        console.error("Camera Access Error:", err);
        setCameraError(err.message || "Failed to access camera. Please check permissions.");
      }
    };

    if (step === 'bioseal') {
      getDevices();
    }
  }, [step, selectedDeviceId]); // Re-fetch or re-eval on device change if needed

  const setRole = (role: UserTypeInput) => {
    setFormData((prev: any) => ({ ...prev, user_type: role, org_unique_id: '', team_unique_id: '', invite_code: '' }));
    setStep('info');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getRoleDisplayName = (type: string) => {
    switch (type) {
      case 'org_super_admin': return 'Organisation';
      case 'org_member': return 'Join Organisation';
      case 'community_lead': return 'Community Leader';
      case 'community_member': return 'Community Member';
      case 'joiner': return 'Join';
      default: return type.replace(/_/g, ' ');
    }
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
    if (!formData.first_name || !formData.email || !formData.password || !formData.username) {
      setError("Please fill all required basic fields.");
      return;
    }

    // Resolve 'joiner' type based on invite code prefix
    let resolvedFormData = { ...formData };
    if (formData.user_type === 'joiner') {
      const code = (formData.invite_code || '').trim().toUpperCase();
      if (!code) {
        setError("Invite code is required."); return;
      }
      if (code.startsWith('ORG-')) {
        resolvedFormData.user_type = 'org_member';
        resolvedFormData.org_unique_id = code;
      } else if (code.startsWith('CM-')) {
        resolvedFormData.user_type = 'community_member';
        resolvedFormData.team_unique_id = code;
      } else {
        setError("Invalid invite code. Must start with ORG- or CM-."); return;
      }
    }

    if (resolvedFormData.user_type === 'org_super_admin' && !resolvedFormData.org_name) {
      setError("Organisation name is required."); return;
    }
    if (resolvedFormData.user_type === 'org_member' && !resolvedFormData.org_unique_id) {
      setError("Organisation ID is required to join an Org."); return;
    }
    if (resolvedFormData.user_type === 'community_lead' && !resolvedFormData.team_name) {
      setError("Community name is required."); return;
    }
    if (resolvedFormData.user_type === 'community_member' && !resolvedFormData.team_unique_id) {
      setError("Community ID is required to join a Community."); return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API_BASE}/users/register/send-email-otp`, resolvedFormData);
      if (response.data.success) {
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
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
        // Automatically save the token so the next step (BioSeal) can be authenticated
        if (response.data.tokens && response.data.tokens.accessToken) {
          localStorage.removeItem("userLoggedOut");
          localStorage.setItem("accessToken", response.data.tokens.accessToken);
          localStorage.setItem("refreshToken", response.data.tokens.refreshToken);
        }
        setSuccess("Account verified!");
        setStep('bioseal');
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

  const captureBiometric = () => {
    if (webcamRef.current && cameraReady) {
      const image = webcamRef.current.getScreenshot();
      if (image) {
        setImageSrc(image);
        enrollBioSeal(image);
      } else {
        setError("Failed to capture image. Please wait for camera to be ready.");
      }
    } else {
      setError("Camera is not ready yet.");
    }
  };

  const enrollBioSeal = async (base64Image: string | null) => {
    if (!base64Image) {
      setError("Failed to capture image.");
      return;
    }

    setBiosealStatus("enrolling");
    setError("");

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(`${API_BASE}/users/enroll-bioseal`, 
        { descriptorBase64: base64Image, method: 'face' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setBiosealStatus("success");
        setSuccess("BioSeal Enrolled Successfully!");
        
        axios.get(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => {
             if (res.data.success) {
               localStorage.setItem('userInfo', JSON.stringify(res.data.user));
             }
             const userType = res.data.user?.user_type || 'individual';
             const redirectPath = ['org_super_admin', 'org_admin', 'org_member'].includes(userType) ? '/dashboard/org' : ['team_lead', 'team_member', 'community_lead', 'community_member'].includes(userType) ? '/dashboard/team' : '/dashboard';
             setTimeout(() => navigate(redirectPath), 2000);
          }).catch(() => {
             setTimeout(() => navigate('/dashboard'), 2000);
          });
      } else {
        setBiosealStatus("error");
        setError(response.data.message || "Face not detected. Please try again.");
        setImageSrc(null); // Reset to permit retake
      }
    } catch (err: any) {
      setBiosealStatus("error");
      setError(err.response?.data?.message || "BioSeal Enrollment Error. Please try again.");
      setImageSrc(null); 
    }
  };



  const renderRoleSelection = () => (
    <div className="animate-in fade-in slide-in-from-right-4">
      <div className="mb-8 text-left">
        <h3 className="text-2xl font-bold text-white tracking-tight">Select account type</h3>
        <p className="text-slate-400 mt-1">To get started, please select your primary role</p>
      </div>
      
      <div className="role-selection-grid">
        <button 
          onClick={() => setRole('individual')} 
          className="role-card role-individual group"
        >
          <div className="role-icon-box">
            <User size={22} strokeWidth={2.5} />
          </div>
          <div className="role-content">
            <h4>Individual</h4>
            <p>For personal use. Create and receive secure biometric QR codes.</p>
          </div>
          <div className="role-arrow">
            <ArrowRight size={18} />
          </div>
        </button>

        <button 
          onClick={() => setRole('org_super_admin')} 
          className="role-card role-org-create group"
        >
          <div className="role-icon-box">
            <Building size={22} strokeWidth={2.5} />
          </div>
          <div className="role-content">
            <h4>Organisation</h4>
            <p>Setup a new organization for your business or enterprise.</p>
          </div>
          <div className="role-arrow">
            <ArrowRight size={18} />
          </div>
        </button>

        <button 
          onClick={() => setRole('joiner')} 
          className="role-card role-org-join group"
        >
          <div className="role-icon-box">
            <UserPlus size={22} strokeWidth={2.5} />
          </div>
          <div className="role-content">
            <h4>Join</h4>
            <p>Join an existing organisation or community using an invite code.</p>
          </div>
          <div className="role-arrow">
            <ArrowRight size={18} />
          </div>
        </button>

        <button 
          onClick={() => setRole('community_lead')} 
          className="role-card role-community group"
        >
          <div className="role-icon-box">
            <Heart size={22} strokeWidth={2.5} />
          </div>
          <div className="role-content">
            <h4>Community</h4>
            <p>Create a community to share QR codes with your members.</p>
          </div>
          <div className="role-arrow">
            <ArrowRight size={18} />
          </div>
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 mt-10">
        Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Log in</Link>
      </p>
    </div>
  );

  const renderInfoForm = () => (
    <div className="form-grid animate-in fade-in slide-in-from-right-4">
      <div className="flex md:col-span-2 justify-between items-center mb-2 mt-[-10px]">
        <h3 className="text-xl font-bold text-white capitalize">
          {getRoleDisplayName(formData.user_type)} Details
        </h3>
        <button type="button" onClick={() => setStep('role')} className="register-btn-primary text-white text-xs font-extrabold uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg transition-all" style={{ border: 'none', outline: 'none' }}>Change Role</button>
      </div>

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

      {/* Role Conditional Fields */}
      {formData.user_type === 'org_super_admin' && (
        <>
          <div className="form-group text-left md:col-span-2">
            <label className="premium-label">Organisation Name</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input type="text" name="org_name" placeholder="Acme Corp" className="premium-input" value={formData.org_name} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group text-left md:col-span-2">
            <label className="premium-label">Industry</label>
            <div className="relative">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input type="text" name="org_industry" placeholder="Technology" className="premium-input" value={formData.org_industry} onChange={handleChange} />
            </div>
          </div>
        </>
      )}

      {formData.user_type === 'org_member' && (
        <div className="form-group text-left md:col-span-2">
          <label className="premium-label">Organisation ID</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input type="text" name="org_unique_id" placeholder="ORG-XXXXXX" className="premium-input uppercase" value={formData.org_unique_id} onChange={handleChange} />
          </div>
        </div>
      )}

      {formData.user_type === 'joiner' && (
        <div className="form-group text-left md:col-span-2">
          <label className="premium-label">Invite Code</label>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem', marginTop: '-0.25rem' }}>
            Enter your Organisation (ORG-XXXXX) or Community (CM-XXXXX) invite code
          </p>
          <div className="relative">
            <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input 
              type="text" 
              name="invite_code" 
              placeholder="ORG-XXXXXX or CM-XXXXXX" 
              className="premium-input uppercase" 
              value={formData.invite_code || ''} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setFormData((prev: any) => ({ ...prev, invite_code: val }));
                if (error) setError('');
              }} 
            />
          </div>
          {formData.invite_code && (
            <p style={{ fontSize: '0.65rem', marginTop: '0.4rem', color: formData.invite_code.startsWith('ORG-') ? '#60a5fa' : formData.invite_code.startsWith('CM-') ? '#34d399' : '#f87171' }}>
              {formData.invite_code.startsWith('ORG-') ? '🏢 Joining an Organisation' : formData.invite_code.startsWith('CM-') ? '💚 Joining a Community' : '⚠️ Code must start with ORG- or CM-'}
            </p>
          )}
        </div>
      )}

      {formData.user_type === 'community_lead' && (
        <div className="form-group text-left md:col-span-2">
          <label className="premium-label">Community Name</label>
          <div className="relative">
            <Heart className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input type="text" name="team_name" placeholder="My Neighbourhood, Book Club" className="premium-input" value={formData.team_name} onChange={handleChange} />
          </div>
        </div>
      )}

      {formData.user_type === 'community_member' && (
        <div className="form-group text-left md:col-span-2">
          <label className="premium-label">Community ID</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input type="text" name="team_unique_id" placeholder="CM-XXXXXX" className="premium-input uppercase" value={formData.team_unique_id} onChange={handleChange} />
          </div>
        </div>
      )}

      <div className="form-group text-left md:col-span-2">
        <label className="premium-label">Mobile Number (Optional)</label>
        <div className="relative">
          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input type="tel" name="mobile_number" placeholder="+91 9876543210" className="premium-input" value={formData.mobile_number} onChange={handleChange} />
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
          <input type={showPassword ? "text" : "password"} name="password" placeholder="••••••••" className="premium-input pr-12" value={formData.password} onChange={handleChange} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-all">
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        {formData.password && (
          <div className="mt-3 flex items-center gap-3 bg-slate-800/20 p-2 rounded-lg border border-white/5">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-700 ease-out ${passwordStrength >= 75 ? 'bg-emerald-500' : passwordStrength >= 50 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${passwordStrength}%` }} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${passwordStrength === 100 ? 'text-emerald-400' : passwordStrength >= 50 ? 'text-blue-400' : 'text-red-400'}`}>{passwordStrength === 100 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}</span>
          </div>
        )}
      </div>

      <div className="md:col-span-2 pt-4">
        <button type="button" onClick={handleSendEmailOtp} disabled={loading} className="w-full py-3 register-btn-primary text-white rounded-xl font-extrabold shadow-2xl flex items-center justify-center gap-3 transition-all tracking-widest disabled:opacity-50">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MailCheck className="h-5 w-5" /> <span>Verify Email</span> <ArrowRight className="h-5 w-5" /></>}
        </button>
      </div>
    </div>
  );

  const renderVerifyOtp = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 h-full flex flex-col justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-glow rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500">
          <MailCheck className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-slate-400 text-sm">We've sent a 6-digit verification code to <br/><span className="text-white font-medium">{formData.email}</span></p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-6">
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

        <button type="submit" disabled={loading || emailOtp.length !== 6} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> <span>Verify & Continue</span></>}
        </button>

        <button 
          type="button" 
          onClick={() => setStep('info')} 
          className="w-full mt-4 flex items-center justify-center gap-2 text-slate-300 hover:text-white text-sm font-semibold py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Wrong email? Go back</span>
        </button>
      </form>
    </div>
  );

  const renderBioSeal = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 h-full flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2 border border-emerald-500">
          <Fingerprint className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Enroll BioSeal</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          Secure your account and cryptographic keys with your face biometrics. 
          Your template is locally hashed, compressed, and encrypted.
        </p>

        <div className="mt-6 border-2 border-dashed border-slate-700 rounded-2xl p-2 w-full max-w-[320px] aspect-square relative bg-slate-800/50 overflow-hidden flex items-center justify-center">
          {!imageSrc ? (
            <>
              {cameraError ? (
                <div className="flex flex-col items-center justify-center text-red-400 p-6 text-center">
                  <XCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-xs font-medium">{cameraError}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 text-xs underline text-slate-400">Try refreshing</button>
                </div>
              ) : (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className={`object-cover w-full h-full rounded-xl transition-all duration-500 ${cameraReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  onUserMedia={() => {
                    setCameraReady(true);
                    setCameraError(null);
                  }}
                  onUserMediaError={(err) => {
                    setCameraReady(false);
                    setCameraError("Camera blocked or not found. Please check browser permissions or if another app is using the camera.");
                    console.error("Webcam Error:", err);
                  }}
                  mirrored={true}
                  key={selectedDeviceId}
                  videoConstraints={{ 
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                  }}
                />
              )}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md z-[5]">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-black uppercase tracking-[0.2em] animate-pulse">Initializing Feed...</p>
                </div>
              )}
            </>
          ) : (
            <img src={imageSrc} alt="Captured Face" className="object-cover w-full h-full rounded-xl" />
          )}

          {biosealStatus === "enrolling" && (
            <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm rounded-xl">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-3" />
              <p className="text-emerald-400 font-bold tracking-wider text-sm">Sealing Biometrics...</p>
            </div>
          )}
        </div>

        {cameras.length > 1 && (
          <div className="w-full max-w-[320px] mt-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block px-1">Switch Camera</label>
            <div className="relative group">
              <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <select 
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 text-slate-300 text-xs py-2.5 pl-9 pr-4 rounded-xl focus:outline-none focus:border-emerald-500/50 appearance-none transition-all cursor-pointer hover:bg-slate-800/80"
              >
                {cameras.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-slate-400 transition-colors" />
            </div>
          </div>
        )}

        <div className="w-full max-w-[320px] space-y-3 mt-8">
          {!imageSrc ? (
            <button 
              onClick={captureBiometric}
              disabled={!cameraReady || biosealStatus === "enrolling"}
              className={`w-full py-4 register-btn-primary text-white rounded-xl font-black shadow-2xl flex items-center justify-center gap-3 transition-all ${
                (!cameraReady || biosealStatus === "enrolling") ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <Camera className="h-5 w-5" />
              <span>{cameraReady ? "CAPTURE FACE" : "WAITING FOR CAMERA..."}</span>
            </button>
          ) : (
             <button disabled className="w-full py-4 bg-slate-800 text-slate-500 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 cursor-not-allowed border border-white/5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>PROCESSING...</span>
            </button>
          )}
        </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '6.5rem', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem', position: 'relative', overflowY: 'auto', overflowX: 'hidden', background: '#020617' }}>
      <SEO title="Create Account" description="Join BioQR to securely manage and verify your identity." />
      <Navbar />

      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-glow blur-huge rounded-full animate-pulse" />
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-glow blur-huge rounded-full animate-pulse delay-700" />
      
      <div className="w-full max-w-5xl z-10 animate-in fade-in">
        <div className="premium-card auth-layout rounded-3xl overflow-hidden min-h-[580px]">
          
          <div className="left-panel">
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="space-y-8">
                  <div className="space-y-5">
                    <h2 className="text-4xl font-extrabold text-white leading-tight">Securely Share your Files Digital.</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">Experience the next generation of authentication with biometric-backed QR technology.</p>
                  </div>

                  <div className="space-y-6 pt-2">
                    {/* Step 1: Role */}
                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'role' ? 'scale-105 opacity-100' : 'opacity-50 grayscale'}`}>
                       <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${step !== 'role' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                        {step !== 'role' ? <CheckCircle2 size={24} /> : "01"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Select Role</h4>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Account Type</p>
                      </div>
                    </div>
                    <div className="ml-6 border-l-2 border-slate-800 h-6 w-0" />

                    {/* Step 2: Info */}
                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'info' ? 'scale-105 opacity-100' : 'opacity-50 grayscale'}`}>
                       <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${['verify','bioseal','done'].includes(step) ? 'bg-emerald-500 text-white' : step === 'info' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {['verify','bioseal','done'].includes(step) ? <CheckCircle2 size={24} /> : "02"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Basic Info</h4>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Account Details</p>
                      </div>
                    </div>
                    <div className="ml-6 border-l-2 border-slate-800 h-6 w-0" />

                    {/* Step 3: Verify */}
                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'verify' ? 'scale-105 opacity-100' : 'opacity-50 grayscale'}`}>
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${['bioseal','done'].includes(step) ? 'bg-emerald-500 text-white' : step === 'verify' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {['bioseal','done'].includes(step) ? <CheckCircle2 size={24} /> : "03"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">Email Verification</h4>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Confirm your email</p>
                      </div>
                    </div>
                    <div className="ml-6 border-l-2 border-slate-800 h-6 w-0" />

                    {/* Step 4: BioSeal */}
                    <div className={`flex items-center gap-5 transition-all duration-500 ${step === 'bioseal' ? 'scale-105 opacity-100' : 'opacity-50 grayscale'}`}>
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${step === 'done' ? 'bg-emerald-500 text-white' : step === 'bioseal' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {step === 'done' ? <CheckCircle2 size={24} /> : "04"}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">BioSeal Enroll</h4>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">Secure your account</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="flex flex-col h-full justify-center relative">
              {error && (
                <div className="premium-alert premium-alert-error">
                  <XCircle className="premium-alert-icon" />
                  <div className="premium-alert-content">{error}</div>
                  <button onClick={() => setError("")} className="premium-alert-close">
                    <X size={16} />
                  </button>
                </div>
              )}
              {success && (
                <div className="premium-alert premium-alert-success">
                  <CheckCircle2 className="premium-alert-icon" />
                  <div className="premium-alert-content">{success}</div>
                  <button onClick={() => setSuccess("")} className="premium-alert-close">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="pt-16 md:pt-10 w-full h-full flex flex-col justify-center">
                {step === 'role' && renderRoleSelection()}
                {step === 'info' && renderInfoForm()}
                {step === 'verify' && renderVerifyOtp()}
                {step === 'bioseal' && renderBioSeal()}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;

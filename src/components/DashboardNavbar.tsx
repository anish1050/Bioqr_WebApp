import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Info, Mail, LogOut, Menu } from 'lucide-react';
import Logo from './Logo';

interface UserInfo {
  id: number;
  email: string;
  username?: string;
  name?: string;
  provider?: string;
  github_name?: string;
  google_name?: string;
  avatar_url?: string;
  github_avatar?: string;
  google_avatar?: string;
}

interface DashboardNavbarProps {
  onMobileMenuToggle: () => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.setItem('userLoggedOut', 'true');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
      sessionStorage.clear();
      navigate('/login');
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.provider === 'github' && user.github_name) return user.github_name;
    if (user.provider === 'google' && user.google_name) return user.google_name;
    if (user.username && user.username !== user.email) return user.username;
    if (user.name && user.name.trim()) return user.name.trim();
    if (user.email) {
      const emailName = user.email.split('@')[0];
      return emailName.replace(/[._-]/g, ' ').replace(/\d+$/g, '').trim() || emailName;
    }
    return 'User';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  };

  const getAvatarUrl = () => {
    if (!user) return null;
    if (user.provider === 'github' && user.github_avatar) return user.github_avatar;
    if (user.provider === 'google' && user.google_avatar) return user.google_avatar;
    if (user.avatar_url) return user.avatar_url;
    return null;
  };

  const displayName = getUserDisplayName();
  const avatarUrl = getAvatarUrl();

  return (
    <nav className="top-navbar">
      <div className="navbar-brand">
        <div className="logo">
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="logo-icon">
              <Logo className="w-8 h-8" />
            </div>
            <h2 style={{ marginLeft: '10px' }}>BioQR</h2>
          </Link>
        </div>
      </div>
      
      <div className="navbar-nav">
        <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        
        {/* We link Files to Dashboard with a state/hash or handle it inside Dashboard. Since both are in Dashboard.tsx, we can just use /dashboard for now and manage inner tabs, or use /files route if we separate them. Let's assume Dashboard handles both. We'll use a query param or state if needed, or simply let the Dashboard manage it inside. For now, we'll keep it as buttons that might switch state if in Dashboard. Let's manage it by updating location hash. */}
        <Link to="/dashboard#files" className={`nav-item ${location.hash === '#files' ? 'active' : ''}`}>
          <FileText size={20} />
          <span>Files</span>
        </Link>
        
        <Link to="/dashboard/about" className={`nav-item ${location.pathname === '/dashboard/about' ? 'active' : ''}`}>
          <Info size={20} />
          <span>About</span>
        </Link>
        
        <Link to="/dashboard/contact" className={`nav-item ${location.pathname === '/dashboard/contact' ? 'active' : ''}`}>
          <Mail size={20} />
          <span>Contact</span>
        </Link>
      </div>
      
      <div className="navbar-user">
        <div className="user-profile">
          <div className="user-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="profile-image" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span>{getInitials(displayName)}</span>
            )}
          </div>
          <div className="user-details">
            <h4>{displayName}</h4>
            <p>{user?.email || 'user@example.com'}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
      
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle" onClick={onMobileMenuToggle}>
        <Menu size={24} />
      </button>
    </nav>
  );
};

export default DashboardNavbar;

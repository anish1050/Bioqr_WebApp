import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
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
    <header className="header">
      <div className="container">
        <Link to="/dashboard" className="logo">
          <Logo className="logo-icon" />
          <span className="logo-text">BioQR</span>
        </Link>
      
        <nav className={`main-nav ${location.pathname === '/' ? "nav-open" : ""}`}>
          <ul>
            <li>
              <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/dashboard#files" className={location.hash === '#files' ? 'active' : ''}>
                Files
              </Link>
            </li>
            <li>
              <Link to="/dashboard/security" className={location.pathname === '/dashboard/security' ? 'active' : ''}>
                Security
              </Link>
            </li>
            <li>
              <Link to="/dashboard/analytics" className={location.pathname === '/dashboard/analytics' ? 'active' : ''}>
                Analytics
              </Link>
            </li>
            <li>
              <Link to="/dashboard/about" className={location.pathname === '/dashboard/about' ? 'active' : ''}>
                About
              </Link>
            </li>
            <li>
              <Link to="/dashboard/contact" className={location.pathname === '/dashboard/contact' ? 'active' : ''}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="user-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '0.8rem', position: 'relative', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="profile-image" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>
            <div className="user-details" style={{ display: 'none' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{displayName}</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            Logout
          </button>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button className="mobile-menu-btn" onClick={onMobileMenuToggle}>
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};

export default DashboardNavbar;

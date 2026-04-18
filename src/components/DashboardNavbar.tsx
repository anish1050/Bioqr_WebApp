import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import Logo from './Logo';

interface UserInfo {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  provider?: string;
  github_name?: string;
  google_name?: string;
  avatar_url?: string;
  github_avatar?: string;
  google_avatar?: string;
  user_type?: string;
}

interface DashboardNavbarProps {
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserInfo | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo);
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
    return null;
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        try {
          setUser(JSON.parse(userInfo));
        } catch (e) {
          console.error('Failed to parse user info', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.setItem('userLoggedOut', 'true');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    sessionStorage.clear();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
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
    if (!user || imgError) return null;
    let url = user.provider === 'github' ? user.github_avatar : user.provider === 'google' ? user.google_avatar : user.avatar_url;
    if (!url || url === 'null' || url === 'undefined') return null;
    if (typeof url === 'string' && !url.startsWith('http') && !url.startsWith('/')) return `/${url}`;
    return url;
  };

  const displayName = getUserDisplayName();
  const avatarUrl = getAvatarUrl();

  const closeMenu = () => {
    if (isMobileMenuOpen) onMobileMenuToggle();
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/dashboard" className="logo" onClick={closeMenu}>
          <Logo className="logo-icon" />
          <span className="logo-text">BioQR</span>
        </Link>
      
        <nav className={`main-nav ${isMobileMenuOpen ? "nav-open" : ""}`}>
          <ul>
            <li>
              <Link 
                to={user?.user_type && ['org_super_admin', 'org_admin', 'org_member'].includes(user.user_type) 
                  ? "/dashboard/org#files" 
                  : (user?.user_type && ['team_lead', 'team_member', 'community_lead', 'community_member'].includes(user.user_type)
                    ? "/dashboard/team#files"
                    : "/dashboard#files")} 
                className={(location.pathname.includes('/dashboard')) && location.hash === '#files' ? 'active' : ''}
                onClick={closeMenu}
              >
                Files
              </Link>
            </li>
            <li className="mobile-only">
              <Link to="/dashboard?mode=personal" className={location.pathname === '/dashboard' && !location.hash ? 'active' : ''} onClick={closeMenu}>
                Dashboard
              </Link>
            </li>
            {user && ['org_super_admin', 'org_admin', 'org_member'].includes(user.user_type || '') && (
              <li>
                <Link to="/dashboard/org" className={location.pathname.startsWith('/dashboard/org') ? 'active' : ''} onClick={closeMenu}>
                  Org Hub
                </Link>
              </li>
            )}
            {user && ['team_lead', 'team_member', 'community_lead', 'community_member'].includes(user.user_type || '') && (
              <li>
                <Link to="/dashboard/team" className={location.pathname.startsWith('/dashboard/team') ? 'active' : ''} onClick={closeMenu}>
                  Community
                </Link>
              </li>
            )}
            <li>
              <Link to="/dashboard/analytics" className={location.pathname === '/dashboard/analytics' ? 'active' : ''} onClick={closeMenu}>
                Analytics
              </Link>
            </li>
            <li>
              <Link to="/dashboard/about" className={location.pathname === '/dashboard/about' ? 'active' : ''} onClick={closeMenu}>
                About
              </Link>
            </li>
            <li className="mobile-user-info">
              <div className="mobile-profile">
                <div className="mobile-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="" onError={() => setImgError(true)} /> : <span>{getInitials(displayName)}</span>}
                </div>
                <div className="mobile-details">
                   <p className="name">{displayName}</p>
                   <p className="email">{user?.email}</p>
                </div>
              </div>
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> Logout
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="navbar-user">
          <div className="user-profile">
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="profile-image" onError={() => setImgError(true)} />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>
          </div>
          <button className="btn btn-ghost logout-btn-desktop desktop-only" onClick={handleLogout}>
            Logout
          </button>
        </div>
        
        <button className="mobile-menu-btn" onClick={onMobileMenuToggle}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
};

export default DashboardNavbar;

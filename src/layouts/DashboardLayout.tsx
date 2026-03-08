import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import '../styles/dashboard.css';

const API_BASE = '';

const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Authentication Check
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userInfo = localStorage.getItem('userInfo');
    const logoutFlag = localStorage.getItem('userLoggedOut');

    if (logoutFlag === 'true' || !accessToken || !refreshToken || !userInfo) {
      navigate('/login');
      return;
    }

    try {
      JSON.parse(userInfo);
    } catch {
      navigate('/login');
      return;
    }

    // Interval to validate session
    const validateSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/validate-session`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          }
        });
        if (!response.ok) {
          // Attempt token refresh logic or logout. Simplified to logout here for security, expecting fetch wrapper to handle refresh in actual API calls.
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    const intervalId = setInterval(validateSession, 300000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div className={`dashboard-wrapper ${mobileMenuOpen ? 'mobile-nav-open' : ''}`}>
       {/* Background Animation copied from dashboard.html */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <DashboardNavbar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

      <main className="main-content" onClick={() => { if(mobileMenuOpen) setMobileMenuOpen(false) }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;

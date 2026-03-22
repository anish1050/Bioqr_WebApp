import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';
import '../App.css';
import '../styles/dashboard.css';

const API_BASE = '';

const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 0. Parse OAuth tokens if present in URL
    const searchParams = new URLSearchParams(window.location.search);
    const urlToken = searchParams.get('token');
    const urlRefresh = searchParams.get('refresh');
    const urlUser = searchParams.get('user');

    if (urlToken && urlRefresh && urlUser) {
      localStorage.setItem('accessToken', urlToken);
      localStorage.setItem('refreshToken', urlRefresh);
      localStorage.setItem('userInfo', decodeURIComponent(urlUser));
      localStorage.removeItem('userLoggedOut');
      
      // Clean up URL parameters without refreshing the page
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 1. Authentication Check
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
          // Attempt token refresh logic or logout. 
          console.warn('Session invalid, logging out');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          navigate('/login');
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    const intervalId = setInterval(validateSession, 300000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div className="app">
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

// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { Analytics } from "@vercel/analytics/react";

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Status from './pages/Status';
import Help from './pages/Help';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Documentation from './pages/Documentation';

// Authenticated Pages
import Dashboard from './pages/Dashboard';
import OrgDashboard from './pages/OrgDashboard';
import TeamDashboard from './pages/TeamDashboard';
import DashboardAbout from './pages/About';
import DashboardContact from './pages/Contact';
import AnalyticsPage from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        {/* Auth Pages (without Navbar/Footer layout intentionally, they have their own styles) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Public Pages with MainLayout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="status" element={<Status />} />
          <Route path="help" element={<Help />} />
          <Route path="docs" element={<Documentation />} />
        </Route>

        {/* Authenticated Dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="org" element={<OrgDashboard />} />
          <Route path="team" element={<TeamDashboard />} />
          <Route path="about" element={<DashboardAbout />} />
          <Route path="contact" element={<DashboardContact />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>

        {/* Catch-all redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

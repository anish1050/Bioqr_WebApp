import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LayoutDashboard, Copy, CheckCircle, QrCode, Loader, XCircle } from 'lucide-react';
import '../styles/org-team.css';
import SEO from '../components/SEO';

const API_BASE = '';

interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  unique_user_id: string;
  role: string;
}

interface QrTarget {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  unique_user_id: string;
  source: 'same_team' | 'granted' | 'admin';
}

const TeamDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [qrTargets, setQrTargets] = useState<QrTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

  useEffect(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserInfo(user);
      // Org members also use this dashboard for team functionality
      const isTeamUser = ['team_lead', 'team_member', 'org_member', 'community_lead', 'community_member'].includes(user.user_type);
      if (!isTeamUser) {
        navigate('/dashboard');
      } else {
        if (user.team_id) {
          fetchMembers(user.team_id);
        }
        if (user.org_unique_id) {
          fetchQrTargets(user.org_unique_id);
        }
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleCopyId = (id: string, label: string) => {
    navigator.clipboard.writeText(id).then(() => {
      showToast(`${label} copied!`, 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const fetchMembers = async (teamId: string | number) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/bioqr/team/members?team_id=${teamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (e) {
      console.error('Failed to fetch members', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQrTargets = async (orgUniqueId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgUniqueId}/qr-targets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrTargets(data.targets || []);
      }
    } catch (e) {
      console.error('Failed to fetch QR targets', e);
    }
  };

  const getTargetName = (t: QrTarget) => {
    if (t.first_name && t.last_name) return `${t.first_name} ${t.last_name}`;
    return t.username || t.unique_user_id;
  };

  const handleGenerateQrFor = (target: QrTarget) => {
    // Navigate to the main dashboard with a "receiver" context
    // Store the target info temporarily so QRModal can pick it up
    localStorage.setItem('qrReceiverTarget', JSON.stringify({
      id: target.id,
      name: getTargetName(target),
      unique_user_id: target.unique_user_id,
    }));
    navigate('/dashboard#files');
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'same_team': return <span className="team-tag">Same Team</span>;
      case 'granted': return <span className="team-tag" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.25)' }}>Granted Access</span>;
      case 'admin': return <span className="team-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }}>Admin</span>;
      default: return null;
    }
  };

  return (
    <>
      <SEO title="Team Dashboard" description="Manage your team and generate QR codes." />
      <div className="dashboard-wrapper">
        <div className="welcome-banner">
          <h2>{['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Community Hub' : 'Team Workspace'}</h2>
          <p>Welcome, {userInfo?.username || 'Member'}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
            {userInfo?.unique_user_id && (
              <div className="user-id-wrapper" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
                <div className="user-id-badge">
                  <span className="user-id-label">Your ID:</span>
                  <span>{userInfo.unique_user_id}</span>
                </div>
                <button 
                  className="copy-id-btn" 
                  onClick={() => handleCopyId(userInfo.unique_user_id, 'User ID')}
                  title="Copy Your ID"
                >
                  <Copy />
                </button>
              </div>
            )}

            {userInfo?.unique_team_id && (
              <div className="user-id-wrapper" style={{ justifyContent: 'flex-start', marginTop: 0 }}>
                <div className="user-id-badge" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <span className="user-id-label">{['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Community ID:' : 'Team ID:'}</span>
                  <span>{userInfo.unique_team_id}</span>
                </div>
                <button 
                  className="copy-id-btn" 
                  onClick={() => handleCopyId(userInfo.unique_team_id, ['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Community ID' : 'Team ID')}
                  title={['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Copy Community ID' : 'Copy Team ID'}
                >
                  <Copy />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-content">
              <h3>{members.length || 0}</h3>
              <p>{['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Members' : 'Team Members'}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><QrCode size={24} /></div>
            <div className="stat-content">
              <h3>{qrTargets.length}</h3>
              <p>QR Targets</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/dashboard')}>
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><LayoutDashboard size={24} /></div>
            <div className="stat-content">
              <h3>Files</h3>
              <p>My Dashboard</p>
            </div>
          </div>
        </div>

        {/* Team Roster */}
        <div className="section-card">
          <div className="section-header">
            <h3><Users size={20} /> {['community_lead', 'community_member'].includes(userInfo?.user_type) ? 'Community Members' : 'Team Roster'}</h3>
          </div>
          
          <div className="list-container">
            {isLoading ? (
              <div className="loading-row"><Loader className="spinner" size={20} /> Loading members...</div>
            ) : members.length > 0 ? (
              members.map(member => (
                <div key={member.id} className="list-item">
                  <div className="item-info">
                    <h4>{member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.email}</h4>
                    <p>User ID: {member.unique_user_id}</p>
                  </div>
                  <div className="item-actions">
                    <span className="role-badge member">{member.role || 'Member'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-msg">
                {userInfo?.team_id ? (
                  <p>No other members found in this team.</p>
                ) : (
                  <p>You have not been assigned to a team yet. Contact your admin.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR Generation Targets */}
        {qrTargets.length > 0 && (
          <div className="section-card">
            <div className="section-header">
              <h3><QrCode size={20} /> Generate QR For</h3>
            </div>
            <p className="section-subtitle">
              Select a member to generate a QR code locked to their identity. You'll be redirected to upload a file.
            </p>
            
            <div className="list-container">
              {qrTargets.map(target => (
                <div key={target.id} className="list-item">
                  <div className="item-info">
                    <h4>
                      {getTargetName(target)}
                      {getSourceBadge(target.source)}
                    </h4>
                    <p>{target.unique_user_id}</p>
                  </div>
                  <div className="item-actions">
                    <button className="action-btn btn-primary btn-sm" onClick={() => handleGenerateQrFor(target)}>
                      <QrCode size={14} /> Generate QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast.message && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamDashboard;

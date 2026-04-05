import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Plus, Copy, CheckCircle, 
  XCircle, Key, UserPlus, ChevronDown, ChevronUp, X, Loader, AlertCircle,
  QrCode, FileBox, UploadCloud, Search, Eye, Trash2, Send
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/org-team.css';
import SEO from '../components/SEO';
import QRModal from '../components/QRModal';

const API_BASE = '';

interface Team {
  id: number;
  name: string;
  team_unique_id: string;
  description?: string;
  member_count: number;
  created_at: string;
}

interface OrgMember {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  user_type: string;
  unique_user_id: string;
  biometric_enrolled: boolean;
  team_id: number | null;
  team_name: string | null;
}

interface QrPermission {
  id: number;
  member_id: number;
  target_member_id: number;
  member_first_name: string;
  member_last_name: string;
  member_username: string;
  target_first_name: string;
  target_last_name: string;
  target_username: string;
  target_unique_user_id: string;
}

interface FileData {
  id: number;
  filename: string;
  size: number;
  uploaded_at: string;
  mimetype: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const OrgDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'files'>('dashboard');
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [permissions, setPermissions] = useState<QrPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' | '' }>({ message: '', type: '' });
  
  // File management state
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModalFile, setQrModalFile] = useState<FileData | null>(null);

  // Modal states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // QR permission grant modal
  const [showGrantPerm, setShowGrantPerm] = useState(false);
  const [permMemberId, setPermMemberId] = useState<number | ''>('');
  const [permTargetId, setPermTargetId] = useState<number | ''>('');
  const [isGrantingPerm, setIsGrantingPerm] = useState(false);

  // Assign to team
  const [assigningMemberId, setAssigningMemberId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');

  // Expandable team members
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  // QR Modal States
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrReceiverId, setQrReceiverId] = useState<string | null>(null);
  const [qrFilename, setQrFilename] = useState<string | null>(null);

  const isSuperAdmin = userInfo?.user_type === 'org_super_admin';
  const isAdmin = isSuperAdmin || userInfo?.user_type === 'org_admin';

  useEffect(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserInfo(user);
      const isOrgUser = ['org_super_admin', 'org_admin', 'org_member'].includes(user.user_type);
      if (!isOrgUser) {
        navigate('/dashboard');
      } else {
        loadDashboardData(user.org_unique_id);
        fetchFiles(user.id);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Handle Hash change for tabs
  useEffect(() => {
    if (location.hash === '#files') {
      setActiveTab('files');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } else {
      setActiveTab('dashboard');
    }
  }, [location.hash]);

  const scrollToFiles = () => {
    setActiveTab('files');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  const loadDashboardData = async (orgId: string) => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      const [teamsRes, membersRes] = await Promise.all([
        fetch(`${API_BASE}/bioqr/orgs/${orgId}/teams`, { headers }),
        fetch(`${API_BASE}/bioqr/orgs/${orgId}/members`, { headers })
      ]);

      if (teamsRes.ok) {
        const td = await teamsRes.json();
        setTeams(td.teams || []);
      }
      if (membersRes.ok) {
        const md = await membersRes.json();
        setMembers(md.members || []);
      }

      // Fetch QR permissions for super admins
      const userStr = localStorage.getItem('userInfo');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.user_type === 'org_super_admin') {
        const permRes = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/qr-permissions`, { headers });
        if (permRes.ok) {
          const pd = await permRes.json();
          setPermissions(pd.permissions || []);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = (id: string, label: string) => {
    navigator.clipboard.writeText(id).then(() => {
      showToast(`${label} copied!`, 'success');
    });
  };

  // ─── Team Creation ──────────────────────────────────────────
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || newTeamName.trim().length < 2) {
      showToast('Team name must be at least 2 characters', 'error');
      return;
    }
    setIsCreatingTeam(true);
    try {
      const orgId = userInfo?.org_unique_id;
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/teams`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newTeamName.trim(), description: newTeamDesc.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Team "${newTeamName.trim()}" created!`, 'success');
        setShowCreateTeam(false);
        setNewTeamName('');
        setNewTeamDesc('');
        loadDashboardData(orgId);
      } else {
        showToast(data.message || 'Failed to create team', 'error');
      }
    } catch (e) {
      showToast('Network error creating team', 'error');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // ─── Assign Member to Team ──────────────────────────────────
  const handleAssignToTeam = async (memberId: number) => {
    if (!selectedTeamId) return;
    try {
      const orgId = userInfo?.org_unique_id;
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/teams/${selectedTeamId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Member assigned!', 'success');
        setAssigningMemberId(null);
        setSelectedTeamId('');
        loadDashboardData(orgId);
      } else {
        showToast(data.message || 'Failed to assign', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  // ─── Grant QR Permission ────────────────────────────────────
  const handleGrantPermission = async () => {
    if (!permMemberId || !permTargetId) {
      showToast('Select both member and target', 'error');
      return;
    }
    setIsGrantingPerm(true);
    try {
      const orgId = userInfo?.org_unique_id;
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/qr-permissions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ memberId: permMemberId, targetMemberId: permTargetId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('QR permission granted!', 'success');
        setShowGrantPerm(false);
        setPermMemberId('');
        setPermTargetId('');
        loadDashboardData(orgId);
      } else {
        showToast(data.message || 'Failed to grant permission', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    } finally {
      setIsGrantingPerm(false);
    }
  };

  const handleRevokePermission = async (permissionId: number) => {
    if (!window.confirm('Are you sure you want to revoke this permission?')) return;
    try {
      const orgId = userInfo?.org_unique_id;
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/qr-permissions/${permissionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Permission revoked!', 'success');
        loadDashboardData(orgId);
      } else {
        showToast(data.message || 'Failed to revoke permission', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  // ─── File Management ───────────────────────────────────────
  const fetchFiles = async (userId: number) => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`${API_BASE}/bioqr/files/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev: File[]) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !userInfo) return;
    
    if (files.length >= 5) {
      showToast("Maximum limit of 5 files reached. Delete some first.", "warning");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const oversized = selectedFiles.filter(f => f.size > maxSize);
    if (oversized.length > 0) {
      showToast(`Files too large: ${oversized.map(f => f.name).join(', ')}. Max 10MB.`, 'error');
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userInfo.id.toString());

        const res = await fetch(`${API_BASE}/bioqr/files/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
          body: formData
        });

        if (res.ok) {
          successCount++;
        } else {
          const errorData = await res.json().catch(() => ({}));
          showToast(errorData.message || `Failed to upload ${file.name}`, res.status === 403 ? 'warning' : 'error');
          if (res.status === 403) break;
        }
      }

      if (successCount > 0) {
        showToast(`Successfully uploaded ${successCount} file(s)!`, 'success');
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchFiles(userInfo.id);
      }
    } catch (err) {
      showToast('Network error during upload.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleViewFile = async (fileId: number) => {
    try {
      const res = await fetch(`${API_BASE}/bioqr/files/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        showToast('Failed to view file', 'error');
      }
    } catch (err) {
      showToast('Error opening file', 'error');
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      const res = await fetch(`${API_BASE}/bioqr/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (res.ok) {
        showToast('File deleted successfully', 'success');
        fetchFiles(userInfo.id);
      } else {
        showToast('Failed to delete file', 'error');
      }
    } catch (err) {
      showToast('Error deleting file', 'error');
    }
  };

  const filteredFiles = files.filter((f: FileData) => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  const openQRForMember = (member: OrgMember) => {
    setQrReceiverId(member.unique_user_id);
    setQrModalFile(null); // Explicitly clear file if generating for member directly
    setQrFilename(null);
    setIsQRModalOpen(true);
  };

  const openQRForFile = (file: FileData) => {
    setQrModalFile(file);
    setQrReceiverId(null);
    setQrFilename(file.filename);
    setIsQRModalOpen(true);
  };

  const getMemberName = (m: OrgMember) => {
    if (m.first_name && m.last_name) return `${m.first_name} ${m.last_name}`;
    return m.username || m.email;
  };

  const getRoleBadgeClass = (userType: string) => {
    switch (userType) {
      case 'org_super_admin': return 'role-badge super-admin';
      case 'org_admin': return 'role-badge admin';
      case 'org_member': return 'role-badge member';
      default: return 'role-badge';
    }
  };

  const getRoleLabel = (userType: string) => {
    switch (userType) {
      case 'org_super_admin': return 'Super Admin';
      case 'org_admin': return 'Admin';
      case 'org_member': return 'Member';
      default: return userType;
    }
  };

  const teamMembers = (teamId: number) => members.filter(m => m.team_id === teamId);

  return (
    <>
      <SEO title="Organisation Dashboard" description="Manage your organisation, teams, and members." />
      <div className="dashboard-wrapper">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <h2>Organisation Hub</h2>
          <p>Welcome back, {userInfo?.username || userInfo?.name || 'Organisation'}</p>
          
          <div className="ids-container">
            {userInfo?.org_unique_id && (
              <div className="user-id-wrapper">
                <div className="user-id-badge">
                  <span className="user-id-label">Org ID:</span>
                  <span>{userInfo.org_unique_id}</span>
                </div>
                <button className="copy-id-btn" onClick={() => handleCopyId(userInfo.org_unique_id!, 'Org ID')} title="Copy Org ID">
                  <Copy />
                </button>
              </div>
            )}
            {userInfo?.unique_user_id && (
              <div className="user-id-wrapper">
                <div className="user-id-badge">
                  <span className="user-id-label">Your ID:</span>
                  <span>{userInfo.unique_user_id}</span>
                </div>
                <button className="copy-id-btn" onClick={() => handleCopyId(userInfo.unique_user_id!, 'User ID')} title="Copy User ID">
                  <Copy />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ━━━ Dashboard Tab ━━━ */}
        <section className={`content-section ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-card no-click">
              <div className="stat-icon"><Users size={24} /></div>
              <div className="stat-content">
                <h3>{members.length}</h3>
                <p>Members</p>
              </div>
            </div>
            <div className="stat-card no-click">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><Users size={24} /></div>
              <div className="stat-content">
                <h3>{teams.length}</h3>
                <p>Teams</p>
              </div>
            </div>
            <div className="stat-card no-click">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><FileBox size={24} /></div>
              <div className="stat-content">
                <h3>{files.length}</h3>
                <p>Your Files</p>
              </div>
            </div>
          </div>

          <div className="dashboard-cta" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom: '2rem' }}>
              <button 
                className="cta-btn primary-blue" 
                onClick={scrollToFiles}
                style={{ display: 'flex', flexDirection: 'column', padding: '2rem', gap: '1rem', height: '100%', background: 'rgba(0, 102, 255, 0.1)', border: '1px solid rgba(0, 102, 255, 0.2)', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                <Send size={48} color="#0066ff" />
                <span style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Files Management</span>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal', margin: 0 }}>Access your secure files and manage identity-locked BioQR generation.</p>
              </button>
          </div>

          {/* ━━━ Members Section ━━━ */}
          <div className="section-card">
            <div className="section-header">
              <h3><Users size={20} /> Organisation Members</h3>
            </div>
            
            <div className="list-container">
              {isLoading ? (
                <div className="loading-row"><Loader className="spinner" size={20} /> Loading members...</div>
              ) : members.length > 0 ? (
                members.map(member => (
                  <div key={member.id} className="list-item member-row">
                    <div className="item-info">
                      <h4>
                        {getMemberName(member)}
                        <span className={getRoleBadgeClass(member.user_type)}>{getRoleLabel(member.user_type)}</span>
                      </h4>
                      <p>
                        {member.unique_user_id} 
                        {member.team_name ? (
                          <span className="team-tag">{member.team_name}</span>
                        ) : (
                          <span className="team-tag unassigned">No Team</span>
                        )}
                      </p>
                    </div>
                    <div className="item-actions">
                      {/* Assign to team — admin only, for unassigned members */}
                      {isAdmin && (
                        <>
                          {assigningMemberId === member.id ? (
                            <div className="assign-row">
                              <select
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : '')}
                                className="team-select"
                              >
                                <option value="">Select team...</option>
                                {teams.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                              <button className="action-btn btn-primary btn-sm" onClick={() => handleAssignToTeam(member.id)} disabled={!selectedTeamId}>
                                <CheckCircle size={14} /> Assign
                              </button>
                              <button className="action-btn btn-ghost btn-sm" onClick={() => { setAssigningMemberId(null); setSelectedTeamId(''); }}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="action-btn btn-outline btn-sm qrc-btn" 
                                onClick={() => openQRForMember(member)}
                                title="Generate Secure QR for this member"
                              >
                                <QrCode size={14} /> QR
                              </button>
                              <button className="action-btn btn-outline btn-sm" onClick={() => setAssigningMemberId(member.id)}>
                                <UserPlus size={14} /> {member.team_id ? 'Reassign' : 'Assign Team'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-msg">
                  <p>No members yet. Share your Org ID for members to join.</p>
                </div>
              )}
            </div>
          </div>

          {/* ━━━ Teams Section (admins only) ━━━ */}
          {isAdmin && (
            <div className="section-card">
              <div className="section-header">
                <h3><Users size={20} /> Managed Teams</h3>
                <button className="action-btn btn-primary" onClick={() => setShowCreateTeam(true)}>
                  <Plus size={16} /> Create Team
                </button>
              </div>
              
              <div className="list-container">
                {teams.length > 0 ? (
                  teams.map((team: Team) => (
                    <div key={team.id} className="team-card">
                      <div 
                        className="list-item team-header-row" 
                        onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
                      >
                        <div className="item-info">
                          <h4>
                            {team.name}
                            <span className="member-count-badge">{team.member_count} member{team.member_count !== 1 ? 's' : ''}</span>
                          </h4>
                          <p>{team.team_unique_id} {team.description ? `• ${team.description}` : ''}</p>
                        </div>
                        <div className="item-actions">
                          {expandedTeamId === team.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                      
                      {expandedTeamId === team.id && (
                        <div className="team-members-expand">
                          {teamMembers(team.id).length > 0 ? (
                            teamMembers(team.id).map((m: OrgMember) => (
                              <div key={m.id} className="team-member-row">
                                <div className="tm-info">
                                  <span>{getMemberName(m)}</span>
                                  <span className="text-muted">{m.unique_user_id}</span>
                                </div>
                                <button 
                                  className="action-btn btn-ghost btn-sm" 
                                  onClick={(e) => { e.stopPropagation(); openQRForMember(m); }}
                                  title="Generate QR"
                                >
                                  <QrCode size={14} />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted" style={{ padding: '0.75rem 1rem' }}>No members assigned to this team yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-msg">
                    <p>No teams created yet. Create one to organise your members.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ━━━ QR Permissions Section (super admin only) ━━━ */}
          {isSuperAdmin && (
            <div className="section-card">
              <div className="section-header">
                <h3><Key size={20} /> Cross-Team QR Permissions</h3>
                <button className="action-btn btn-primary" onClick={() => setShowGrantPerm(true)}>
                  <Plus size={16} /> Grant Access
                </button>
              </div>
              <p className="section-subtitle">
                Members can generate QR codes for same-team members by default. Grant access here for cross-team QR generation.
              </p>
              
              <div className="list-container">
                {permissions.length > 0 ? (
                  permissions.map(perm => (
                    <div key={perm.id} className="list-item perm-row">
                      <div className="item-info">
                        <h4>
                          <span className="perm-member">{perm.member_first_name || perm.member_username}</span>
                          <span className="perm-arrow">→</span>
                          <span className="perm-target">{perm.target_first_name || perm.target_username}</span>
                        </h4>
                        <p>Can generate QR for {perm.target_unique_user_id}</p>
                      </div>
                      <div className="item-actions">
                        <button className="action-btn btn-danger btn-sm" onClick={() => handleRevokePermission(perm.id)}>
                          <XCircle size={14} /> Revoke
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-msg">
                    <p>No cross-team permissions granted yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ━━━ Files Tab ━━━ */}
        <section className={`content-section ${activeTab === 'files' ? 'active' : ''}`} style={{ display: activeTab === 'files' ? 'block' : 'none', padding: '1rem 0' }}>
          <div className="section-header">
            <h3><FileBox size={20} /> File Management</h3>
            <div className="section-actions" style={{ display: 'flex', gap: '1rem' }}>
              <div className="search-box">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="upload-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
            <form className="upload-form" onSubmit={handleUpload}>
              <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />
              
              <div 
                className="file-drop-zone" 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                  }
                }}
                style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '3rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease' }}
              >
                <div className="drop-content">
                  <div className="drop-icon" style={{ marginBottom: '1rem' }}><UploadCloud size={48} color="#8b5cf6" /></div>
                  <p><strong>Click to browse</strong> or drag files here</p>
                  <span className="file-limit" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Maximum file size: 10MB (Limit: 5 files)</span>
                </div>
              </div>
              
              {selectedFiles.length > 0 && (
                <div className="selected-files" style={{ marginTop: '1.5rem' }}>
                  <div className="selected-file-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="selected-file-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                        <div className="file-details">
                          <span className="file-name" style={{ fontWeight: 500 }}>{f.name}</span>
                          <span className="file-size" style={{ fontSize: '0.8rem', opacity: 0.6, marginLeft: '1rem' }}>{formatFileSize(f.size)}</span>
                        </div>
                        <button type="button" className="remove-file" onClick={() => removeSelectedFile(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <XCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="upload-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  className="action-btn btn-primary" 
                  disabled={isUploading || selectedFiles.length === 0 || files.length >= 5}
                  style={{ padding: '0.75rem 2rem' }}
                >
                  {isUploading ? (
                    <>
                      <Loader className="spinner" size={18} style={{ marginRight: '8px' }} />
                      {uploadProgress || 'Uploading...'}
                    </>
                  ) : files.length >= 5 ? (
                    <>Limit Reached (5/5)</>
                  ) : (
                    <>
                      <UploadCloud size={18} style={{ marginRight: '8px' }} />
                      Upload Files
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="files-container">
            <h4 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 600 }}>Your Files</h4>
            
            <div className="files-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {isLoadingFiles ? (
                <div className="loading-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                  <Loader className="spinner" size={32} />
                  <p style={{ marginTop: '1rem' }}>Loading your files...</p>
                </div>
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map(file => (
                  <div key={file.id} className="file-item" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s ease' }}>
                    <div className="file-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', color: '#8b5cf6' }}>
                        <FileBox size={24} />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div className="file-name" style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</div>
                        <div className="file-info" style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                          {formatFileSize(file.size)} • {formatDate(file.uploaded_at)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="file-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                      <button className="action-btn btn-primary btn-sm" onClick={() => openQRForFile(file)} style={{ flex: 1 }}>
                        <QrCode size={14} /> BioQR
                      </button>
                      <button className="action-btn btn-outline btn-sm" onClick={() => handleViewFile(file.id)}>
                        <Eye size={14} />
                      </button>
                      <button className="action-btn btn-danger btn-sm" onClick={() => handleDeleteFile(file.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                  <FileBox size={48} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
                  <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No files found</h4>
                  <p style={{ opacity: 0.6 }}>Upload some files to see them here and generate BioQRs.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ━━━ Create Team Modal ━━━ */}
      {showCreateTeam && (
        <div className="modal-overlay" onClick={() => setShowCreateTeam(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Team</h3>
              <button className="modal-close" onClick={() => setShowCreateTeam(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Team Name *</label>
                <input 
                  type="text" 
                  value={newTeamName} 
                  onChange={e => setNewTeamName(e.target.value)} 
                  placeholder="e.g. Engineering, Marketing"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea 
                  value={newTeamDesc} 
                  onChange={e => setNewTeamDesc(e.target.value)} 
                  placeholder="Brief team description..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn btn-ghost" onClick={() => setShowCreateTeam(false)}>Cancel</button>
              <button className="action-btn btn-primary" onClick={handleCreateTeam} disabled={isCreatingTeam || !newTeamName.trim()}>
                {isCreatingTeam ? <><Loader className="spinner" size={14} /> Creating...</> : <><Plus size={14} /> Create Team</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Grant QR Permission Modal ━━━ */}
      {showGrantPerm && (
        <div className="modal-overlay" onClick={() => setShowGrantPerm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grant Cross-Team QR Access</h3>
              <button className="modal-close" onClick={() => setShowGrantPerm(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="perm-info-box">
                <AlertCircle size={16} />
                <span>This allows a member to generate QR codes for someone outside their team.</span>
              </div>
              <div className="form-group">
                <label>Member (who gets access)</label>
                <select value={permMemberId} onChange={e => setPermMemberId(e.target.value ? parseInt(e.target.value) : '')}>
                  <option value="">Select member...</option>
                  {members.filter(m => m.user_type === 'org_member').map(m => (
                    <option key={m.id} value={m.id}>{getMemberName(m)} ({m.unique_user_id})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Target (who they can QR for)</label>
                <select value={permTargetId} onChange={e => setPermTargetId(e.target.value ? parseInt(e.target.value) : '')}>
                  <option value="">Select target...</option>
                  {members.filter(m => m.id !== permMemberId).map(m => (
                    <option key={m.id} value={m.id}>{getMemberName(m)} ({m.unique_user_id})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="action-btn btn-ghost" onClick={() => setShowGrantPerm(false)}>Cancel</button>
              <button className="action-btn btn-primary" onClick={handleGrantPermission} disabled={isGrantingPerm || !permMemberId || !permTargetId}>
                {isGrantingPerm ? <><Loader className="spinner" size={14} /> Granting...</> : <><Key size={14} /> Grant Access</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.message && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}

      {/* QR Generation Modal */}
      <QRModal 
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        fileId={qrModalFile?.id || null}
        filename={qrFilename}
        accessToken={localStorage.getItem('accessToken') || ''}
        lockedReceiverId={qrReceiverId}
        orgId={userInfo?.org_id}
      />
    </>
  );
};

export default OrgDashboard;

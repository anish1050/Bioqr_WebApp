import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, LayoutDashboard, Copy, CheckCircle, QrCode, Loader, XCircle,
  FileBox, UploadCloud, Search, Eye, Trash2, Send
} from 'lucide-react';
import '../styles/org-team.css';
import SEO from '../components/SEO';
import QRModal from '../components/QRModal';

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

const TeamDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'files'>('dashboard');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [qrTargets, setQrTargets] = useState<QrTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(() => {
    // 1. Check URL for OAuth data first (handle initial redirect)
    const searchParams = new URLSearchParams(window.location.search);
    const urlUser = searchParams.get('user');
    if (urlUser) {
      try {
        return JSON.parse(decodeURIComponent(urlUser));
      } catch (e) {
        console.error('Failed to parse user from URL', e);
      }
    }

    // 2. Fallback to localStorage
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
    return null;
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' | '' }>({ message: '', type: '' });

  // File management state
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModalFile, setQrModalFile] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR Modal States
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrReceiverId, setQrReceiverId] = useState<string | null>(null);
  const [qrFilename, setQrFilename] = useState<string | null>(null);

  useEffect(() => {
    if (userInfo) {
      // Refresh user info from server to ensure IDs are up-to-date
      refreshUserInfo();

      // Org members also use this dashboard for team functionality
      const isTeamUser = ['team_lead', 'team_member', 'org_member', 'community_lead', 'community_member'].includes(userInfo.user_type);
      if (!isTeamUser) {
        navigate('/dashboard');
      } else {
        if (userInfo.team_id || userInfo.group_id) {
          fetchMembers(userInfo.team_id || userInfo.group_id);
        }
        if (userInfo.org_unique_id) {
          fetchQrTargets(userInfo.org_unique_id);
        }
        fetchFiles(userInfo.id);
      }
    } else {
      // Final check of localStorage
      const userStr = localStorage.getItem('userInfo');
      if (userStr) {
        setUserInfo(JSON.parse(userStr));
      } else {
        navigate('/login');
      }
    }
  }, [navigate]);

  const refreshUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`${API_BASE}/bioqr/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUserInfo(data.user);
          localStorage.setItem('userInfo', JSON.stringify(data.user));
          console.log("✅ User info synchronized with server");
        }
      }
    } catch (err) {
      console.error("Error refreshing user info:", err);
    }
  };

  useEffect(() => {
    if (location.hash === '#files') {
      setActiveTab('files');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } else {
      setActiveTab('dashboard');
    }
  }, [location.hash]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
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
    setSelectedFiles((prev: File[]) => prev.filter((_, i) => i !== index));
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
          showToast(errorData.message || `Failed to upload ${file.name}`, 'error');
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

  const getTargetName = (t: QrTarget) => {
    if (t.first_name && t.last_name) return `${t.first_name} ${t.last_name}`;
    return t.username || t.unique_user_id;
  };

  const handleGenerateQrFor = (target: QrTarget) => {
    setQrReceiverId(target.unique_user_id);
    setQrModalFile(null);
    setQrFilename(null);
    setIsQRModalOpen(true);
  };

  const openQRForFile = (file: FileData) => {
    setQrModalFile(file);
    setQrReceiverId(null);
    setQrFilename(file.filename);
    setIsQRModalOpen(true);
  };

  const scrollToFiles = () => {
    setActiveTab('files');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'same_team': return <span className="team-tag">Same Team</span>;
      case 'granted': return <span className="team-tag" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.25)' }}>Granted Access</span>;
      case 'admin': return <span className="team-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }}>Admin</span>;
      default: return null;
    }
  };

  const isCommunity = ['community_lead', 'community_member'].includes(userInfo?.user_type);

  return (
    <>
      <SEO title={isCommunity ? 'Community Hub' : 'Team Dashboard'} description="Manage your workspace and generate QR codes." />
      <div className="dashboard-wrapper">
        <div className="welcome-banner">
          <h2>{isCommunity ? 'Community Hub' : 'Team Workspace'}</h2>
          <p>Welcome, {userInfo?.username || 'Member'}</p>
          
          <div className="ids-container">
            {userInfo?.org_unique_id && (
              <div className="user-id-wrapper">
                <div className="user-id-badge">
                  <span className="user-id-label">Org ID:</span>
                  <span>{userInfo.org_unique_id}</span>
                </div>
                <button 
                  className="copy-id-btn" 
                  onClick={() => handleCopyId(userInfo.org_unique_id, 'Org ID')}
                  title="Copy Org ID"
                >
                  <Copy />
                </button>
              </div>
            )}

            {(userInfo?.community_unique_id || userInfo?.team_unique_id || userInfo?.unique_team_id) && (
              <div className="user-id-wrapper">
                <div className="user-id-badge">
                  <span className="user-id-label">{isCommunity ? 'Community ID:' : 'Team ID:'}</span>
                  <span>{userInfo.community_unique_id || userInfo.team_unique_id || userInfo.unique_team_id}</span>
                </div>
                <button 
                  className="copy-id-btn" 
                  onClick={() => handleCopyId(userInfo.community_unique_id || userInfo.team_unique_id || userInfo.unique_team_id || '', isCommunity ? 'Community ID' : 'Team ID')}
                  title={isCommunity ? 'Copy Community ID' : 'Copy Team ID'}
                >
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
                <button 
                  className="copy-id-btn" 
                  onClick={() => handleCopyId(userInfo.unique_user_id, 'User ID')}
                  title="Copy Your ID"
                >
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
                <h3>{members.length || 0}</h3>
                <p>{isCommunity ? 'Members' : 'Team Members'}</p>
              </div>
            </div>
            <div className="stat-card no-click">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><FileBox size={24} /></div>
              <div className="stat-content">
                <h3>{files.length}</h3>
                <p>Your Files</p>
              </div>
            </div>
            <div className="stat-card no-click">
              <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><LayoutDashboard size={24} /></div>
              <div className="stat-content">
                <h3>Individual</h3>
                <p>My Dashboard</p>
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
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', textTransform: 'none', letterSpacing: 'normal', margin: 0 }}>Access your secure files and manage identity-locked BioQR code generation.</p>
              </button>
          </div>

          {/* Team Roster */}
          <div className="section-card">
            <div className="section-header">
              <h3><Users size={20} /> {isCommunity ? 'Community Members' : 'Team Roster'}</h3>
            </div>
            
            <div className="list-container">
              {isLoading ? (
                <div className="loading-row"><Loader className="spinner" size={20} /> Loading members...</div>
              ) : members.length > 0 ? (
                members.map((member: TeamMember) => (
                  <div key={member.id} className="list-item">
                    <div className="item-info">
                      <h4>{member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : member.username || member.email}</h4>
                      <p>User ID: {member.unique_user_id}</p>
                    </div>
                    <div className="item-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button className="action-btn btn-outline btn-sm" onClick={() => handleGenerateQrFor({ ...member, source: 'same_team' } as QrTarget)}>
                        <QrCode size={14} /> QR
                      </button>
                      <span className="role-badge member">{member.role || 'Member'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-msg">
                  {userInfo?.team_id || userInfo?.group_id ? (
                    <p>No other members found in this {isCommunity ? 'community' : 'team'}.</p>
                  ) : (
                    <p>You have not been assigned to a {isCommunity ? 'community' : 'team'} yet. Contact your admin.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QR Generation Targets */}
          {qrTargets.length > 0 && (
            <div className="section-card">
              <div className="section-header">
                <h3><QrCode size={20} /> Granted QR Access</h3>
              </div>
              <p className="section-subtitle">
                Members outside your {isCommunity ? 'community' : 'team'} who you have been granted permission to generate QR codes for.
              </p>
              
              <div className="list-container">
                {qrTargets.map((target: QrTarget) => (
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
                    setSelectedFiles((prev: File[]) => [...prev, ...Array.from(e.dataTransfer.files)]);
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
                    {selectedFiles.map((f: File, i: number) => (
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
                filteredFiles.map((file: FileData) => (
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
        teamId={userInfo?.team_id}
        orgId={userInfo?.org_id}
      />
    </>
  );
};

export default TeamDashboard;

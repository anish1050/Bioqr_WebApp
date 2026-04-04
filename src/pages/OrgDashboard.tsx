import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, LayoutDashboard, Copy, CheckCircle, 
  XCircle, Key, UserPlus, ChevronDown, ChevronUp, X, Loader, AlertCircle
} from 'lucide-react';
import '../styles/org-team.css';
import SEO from '../components/SEO';

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

const OrgDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [permissions, setPermissions] = useState<QrPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  
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
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
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

  // ─── Revoke QR Permission ───────────────────────────────────
  const handleRevokePermission = async (permId: number) => {
    if (!window.confirm('Revoke this QR permission?')) return;
    try {
      const orgId = userInfo?.org_unique_id;
      const res = await fetch(`${API_BASE}/bioqr/orgs/${orgId}/qr-permissions/${permId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Permission revoked', 'success');
        loadDashboardData(orgId);
      }
    } catch (e) {
      showToast('Failed to revoke', 'error');
    }
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

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-content">
              <h3>{members.length}</h3>
              <p>Members</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}><Users size={24} /></div>
            <div className="stat-content">
              <h3>{teams.length}</h3>
              <p>Teams</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate('/dashboard')}>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><LayoutDashboard size={24} /></div>
            <div className="stat-content">
              <h3>Files</h3>
              <p>Generate QR</p>
            </div>
          </div>
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
                        <span className="team-tag">📁 {member.team_name}</span>
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
                          <button className="action-btn btn-outline btn-sm" onClick={() => setAssigningMemberId(member.id)}>
                            <UserPlus size={14} /> {member.team_id ? 'Reassign' : 'Assign Team'}
                          </button>
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
                teams.map(team => (
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
                          teamMembers(team.id).map(m => (
                            <div key={m.id} className="team-member-row">
                              <span>{getMemberName(m)}</span>
                              <span className="text-muted">{m.unique_user_id}</span>
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
    </>
  );
};

export default OrgDashboard;

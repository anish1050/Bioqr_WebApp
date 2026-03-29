import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileBox, HardDrive, UploadCloud, Search, CheckCircle,
  XCircle, Eye, Trash2, Loader, Info, QrCode, Shield, AlertCircle
} from 'lucide-react';
import '../styles/dashboard.css';
import SEO from '../components/SEO';
import QRModal from '../components/QRModal';

const API_BASE = '';

interface UserInfo {
  id: number;
  email: string;
  name?: string;
  username?: string;
  provider?: string;
  github_name?: string;
  google_name?: string;
}

interface FileData {
  id: number;
  filename: string;
  size: number;
  uploaded_at: string;
  mimetype: string;
  url?: string;
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

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'files'>('dashboard');
  const [user, setUser] = useState<UserInfo | null>(null);

  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [qrModalFile, setQrModalFile] = useState<FileData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState({ text: '', type: 'info', visible: false });

  // Handle Hash change for tabs
  useEffect(() => {
    if (location.hash === '#files') {
      setActiveTab('files');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.hash]);

  // Load User Info & fetch files
  useEffect(() => {
    const userInfoStr = localStorage.getItem('userInfo');
    if (userInfoStr) {
      try {
        const parsedUser = JSON.parse(userInfoStr);
        setUser(parsedUser);
        fetchFiles(parsedUser.id);
        checkBiometricEnrollment();
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
  }, []);

  const checkBiometricEnrollment = async () => {
    try {
      let hasWebAuthn = false;
      let hasFace = false;

      // Check WebAuthn credentials
      try {
        const response = await authenticatedFetch(`${API_BASE}/bioqr/auth/webauthn/credentials`);
        if (response.ok) {
          const data = await response.json();
          hasWebAuthn = data.count > 0;
        }
      } catch (err) {
        console.error('Failed to check WebAuthn enrollment:', err);
      }

      // Check custom face enrollment
      try {
        const faceRes = await authenticatedFetch(`${API_BASE}/bioqr/auth/face/status`);
        if (faceRes.ok) {
          const faceData = await faceRes.json();
          hasFace = !!faceData.enrolled;
        }
      } catch (err) {
        console.error('Failed to check face enrollment:', err);
      }

      setHasBiometric(hasWebAuthn || hasFace);
    } catch (err) {
      console.error('Failed to check biometric enrollment:', err);
    }
  };

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    let accessToken = localStorage.getItem('accessToken');
    const headers = { ...options.headers, 'Authorization': `Bearer ${accessToken}` };
    
    let response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      // Basic refresh logic
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/bioqr/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.success) {
            localStorage.setItem('accessToken', refreshData.tokens.accessToken);
            localStorage.setItem('refreshToken', refreshData.tokens.refreshToken);
            
            headers['Authorization'] = `Bearer ${refreshData.tokens.accessToken}`;
            response = await fetch(url, { ...options, headers });
          } else {
            throw new Error('Refresh failed');
          }
        } catch (err) {
          console.error('Token refresh failed:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/login';
          throw err;
        }
      }
    }
    return response;
  };

  const fetchFiles = async (userId: number) => {
    setIsLoadingFiles(true);
    try {
      const response = await authenticatedFetch(`${API_BASE}/bioqr/files/${userId}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      showToast('Failed to load files.', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type, visible: true });
    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  const getUserDisplayName = () => {
    if (!user) return 'User';
    if (user.provider === 'github' && user.github_name) return user.github_name;
    if (user.provider === 'google' && user.google_name) return user.google_name;
    if (user.username && user.username !== user.email) return user.username;
    if (user.name && user.name.trim()) return user.name.trim();
    if (user.email) return user.email.split('@')[0];
    return 'User';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !user) return;
    
    // Validate sizes
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
        setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length} files...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', user.id.toString());

        const response = await authenticatedFetch(`${API_BASE}/bioqr/files/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          successCount++;
        } else {
          showToast(`Failed to upload ${file.name}`, 'error');
        }
      }

      if (successCount > 0) {
        showToast(`Successfully uploaded ${successCount} file(s)!`, 'success');
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchFiles(user.id);
      }
    } catch (err) {
      console.error('Upload error', err);
      showToast('Network error during upload.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleViewFile = async (fileId: number) => {
    try {
      const response = await authenticatedFetch(`${API_BASE}/bioqr/files/download/${fileId}`);
      if (response.ok) {
        const blob = await response.blob();
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
      const response = await authenticatedFetch(`${API_BASE}/bioqr/files/delete/${fileId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('File deleted successfully', 'success');
        fetchFiles(user!.id);
      } else {
        showToast('Failed to delete file', 'error');
      }
    } catch (err) {
      showToast('Error deleting file', 'error');
    }
  };

  const handleGoToSecurity = () => {
    navigate('/dashboard/security');
  };

  const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);

  const filteredFiles = files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <SEO title="User Dashboard" description="Manage your secure files, storage, and account settings." />
      <section className={`content-section ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2>Welcome back, <span>{getUserDisplayName()}</span>!</h2>
            <p>Manage your secure files.</p>
          </div>
        </div>

        <div className="quick-stats">
          <div className="stat-card" onClick={() => setActiveTab('files')}>
            <div className="stat-icon"><FileBox size={24} /></div>
            <div className="stat-content">
              <h3>{files.length}</h3>
              <p>Total Files</p>
            </div>
          </div>

          <div className="stat-card" onClick={() => setActiveTab('files')}>
            <div className="stat-icon"><HardDrive size={24} /></div>
            <div className="stat-content">
              <h3>{formatFileSize(totalSize)}</h3>
              <p>Storage Used</p>
            </div>
          </div>

          <div className="stat-card" onClick={handleGoToSecurity}>
            <div className="stat-icon" style={{ color: hasBiometric === false ? '#f59e0b' : '#10b981' }}>
              <Shield size={24} />
            </div>
            <div className="stat-content">
              <h3>{hasBiometric === null ? '?' : hasBiometric ? '✓' : '!'}</h3>
              <p>Biometric Auth</p>
            </div>
          </div>
        </div>

        {hasBiometric === false && (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>Face recognition is not enabled. <button onClick={handleGoToSecurity} style={{ background: 'transparent', border: 'none', color: '#fbbf24', textDecoration: 'underline', cursor: 'pointer', fontSize: 'inherit' }}>Enroll now</button> to secure QR code generation.</span>
          </div>
        )}

        <div className="dashboard-cta">
            <button 
              className="cta-btn" 
              onClick={() => {
                setActiveTab('files');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ borderColor: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}
            >
              <QrCode size={48} color="#3b82f6" />
              <span style={{ color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>Start Generating QR Codes</span>
            </button>
        </div>


      </section>

      {/* Files Section */}
      <section className={`content-section ${activeTab === 'files' ? 'active' : ''}`} style={{ display: activeTab === 'files' ? 'block' : 'none' }}>
        <div className="section-header">
          <h3>File Management</h3>
          <div className="section-actions">
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

        <div className="upload-card">
          <div className="upload-content">
            <div className="upload-icon">
              <UploadCloud size={32} />
            </div>
            <div className="upload-text">
              <h4>Upload New File</h4>
              <p>Select files to upload securely (Max 10MB)</p>
            </div>
          </div>
          
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
            >
              <div className="drop-content">
                <div className="drop-icon"><UploadCloud size={32} /></div>
                <p><strong>Click to browse</strong> or drag files here</p>
                <span className="file-limit">Maximum file size: 10MB</span>
              </div>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="selected-files" style={{ marginTop: '1rem' }}>
                <div className="selected-file-list">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="selected-file-item">
                      <div className="file-details">
                        <span className="file-name">{f.name}</span>
                        <span className="file-size">{formatFileSize(f.size)}</span>
                      </div>
                      <button type="button" className="remove-file" onClick={() => removeSelectedFile(i)}>
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="upload-actions">
              <button type="submit" className="btn btn-primary" disabled={isUploading || selectedFiles.length === 0}>
                {isUploading ? (
                  <>
                    <Loader className="spinner" size={18} style={{ marginRight: '8px' }} />
                    {uploadProgress || 'Uploading...'}
                  </>
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
          <div className="files-header">
            <h4>Your Files</h4>
          </div>
          
          <div className="files-grid">
            {isLoadingFiles ? (
              <div className="loading-state">
                <Loader className="spinner" size={24} />
                <span>Loading your files...</span>
              </div>
            ) : filteredFiles.length > 0 ? (
              filteredFiles.map(file => (
                <div key={file.id} className="file-item">
                  <div className="file-name">{file.filename}</div>
                  <div className="file-info">
                    <span>Size: {formatFileSize(file.size)}</span> •
                    <span> Uploaded: {formatDate(file.uploaded_at)}</span>
                  </div>
                  <div className="file-actions">
                    <button className="btn qr-btn" onClick={() => setQrModalFile(file)}>
                      <QrCode size={16} /> Generate QR
                    </button>
                    <button className="btn view-btn" onClick={() => handleViewFile(file.id)}>
                      <Eye size={16} /> View
                    </button>
                    <button className="btn delete-btn" onClick={() => handleDeleteFile(file.id)}>
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
                <FileBox size={48} style={{ opacity: 0.5, margin: '0 auto 1rem' }} />
                <h4>No files found</h4>
                <p>Upload some files to see them here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      {toastMessage.visible && toastMessage.text && (
        <div className={`toast show ${toastMessage.type}`}>
          <div className="toast-content">
            <div className={`toast-icon ${toastMessage.type}`}>
              {toastMessage.type === 'success' && <CheckCircle />}
              {toastMessage.type === 'error' && <XCircle />}
              {toastMessage.type === 'info' && <Info />}
              {toastMessage.type === 'warning' && <AlertCircle />}
            </div>
            <span className="toast-message">{toastMessage.text}</span>
          </div>
          <button className="toast-close" onClick={() => setToastMessage({ ...toastMessage, visible: false })}>
            <XCircle size={18} />
          </button>
        </div>
      )}


      {/* QR Modal */}
      {qrModalFile && (
        <QRModal
          isOpen={!!qrModalFile}
          onClose={() => setQrModalFile(null)}
          fileId={qrModalFile.id}
          filename={qrModalFile.filename}
          accessToken={localStorage.getItem('accessToken') || ''}
        />
      )}
    </>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { 
    BarChart3, RefreshCcw, Activity, User, AlertCircle, 
    X, MapPin, Globe, Clock, Monitor, Mail, ExternalLink, Info, ShieldCheck,
    Hash
} from 'lucide-react';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

const API_BASE = '';

const ReceiverDetailModal: React.FC<{ log: any; onClose: () => void }> = ({ log, onClose }) => {
    if (!log) return null;

    return (
        <div className="detail-modal-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <h3><Info size={20} style={{ marginRight: '10px', verticalAlign: 'middle', color: '#38bdf8' }} /> Scan Details</h3>
                    <button className="close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>
                <div className="detail-modal-content">
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="detail-label"><Hash size={12} /> QR Token</span>
                            <span className="detail-value monospace">#{log.token}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Activity size={12} /> QR Type</span>
                            <span className="detail-value" style={{ color: '#38bdf8' }}>{log.qr_type}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><User size={12} /> Scanner Name</span>
                            <span className="detail-value">{log.scanner_name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Mail size={12} /> Scanner Email</span>
                            <span className="detail-value">{log.email}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Monitor size={12} /> Device Platform</span>
                            <span className="detail-value" style={{ textTransform: 'capitalize' }}>{log.platform}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Globe size={12} /> IP Address</span>
                            <span className="detail-value">{log.ip_address}</span>
                        </div>
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                            <span className="detail-label"><MapPin size={12} /> Location</span>
                            <div className="detail-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{log.city}, {log.region}, {log.country}</span>
                                {log.latitude && log.longitude && (
                                    <a 
                                        href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', textDecoration: 'none' }}
                                    >
                                        <ExternalLink size={14} /> View Map
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><Clock size={12} /> Exact Time</span>
                            <span className="detail-value">{new Date(log.scanned_at).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label"><ShieldCheck size={12} /> Security Zone</span>
                            <span className="detail-value">{log.timezone}</span>
                        </div>
                    </div>
                </div>
                <div className="detail-modal-footer">
                    <button onClick={onClose} className="btn" style={{ padding: '8px 24px', background: '#334155', color: 'white' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const navigate = useNavigate(); 

    const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
        let accessToken = localStorage.getItem('accessToken');
        const headers = { ...options.headers, 'Authorization': `Bearer ${accessToken}` };
        
        let response = await fetch(url, { ...options, headers });
        
        if (response.status === 401 || response.status === 403) {
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
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        navigate('/login');
                        throw new Error('Session expired');
                    }
                } catch (e) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    navigate('/login');
                    throw new Error('Session expired');
                }
            } else {
                localStorage.removeItem('accessToken');
                navigate('/login');
                throw new Error('Authentication required');
            }
        }
        return response;
    };

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authenticatedFetch(`${API_BASE}/bioqr/analytics`);
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                setStats(data);
            } else {
                setError(data.message || data.error || 'Failed to fetch analytics');
                setStats([]);
            }
        } catch (err: any) { 
            console.error('Error fetching stats:', err);
            setError(err.message || 'An unexpected error occurred');
            setStats([]);
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchStats(); }, []);

    return (
        <>
            <SEO title="QR Analytics" description="Track scans and engagement for your BioQR codes." />
            <div className="analytics-container dashboard-page">
                <div className="page-header">
                    <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <BarChart3 color="#38bdf8" size={32} /> QR Scan Activity
                    </h2>
                    <button onClick={fetchStats} className="btn" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                        <RefreshCcw size={16} /> Refresh logs
                    </button>
                </div>

                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div className="stat-card-premium">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={20} color="#38bdf8" />
                            <p className="stat-label-premium">Total Scans Tracked</p>
                        </div>
                        <h3 className="stat-value-premium">{stats.length}</h3>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(56, 189, 248, 0.6)', fontWeight: 600 }}>Real-time activity</div>
                    </div>
                </div>

                <div className="table-responsive-wrapper" style={{ marginTop: '2.5rem' }}>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>QR TOKEN</th>
                                <th className="hide-mobile">TYPE</th>
                                <th>SCANNED BY</th>
                                <th className="hide-mobile">LOCATION / IP</th>
                                <th className="hide-mobile">SCANNED AT</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading activity logs...</td></tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#f87171' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <AlertCircle size={32} />
                                            <span>{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : stats.length > 0 ? (
                                stats.map((s, i) => (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                            <span style={{ color: '#38bdf8', opacity: 0.8 }}>#</span>{s.token.slice(0, 8)}
                                        </td>
                                        <td className="hide-mobile">
                                            <span className={`type-badge type-badge-${s.qr_type.toLowerCase()}`}>
                                                {s.qr_type}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ minWidth: '24px', width: '24px', height: '24px', borderRadius: '50%', background: s.scanner_name === 'Guest' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                                                    <User size={12} color={s.scanner_name === 'Guest' ? '#64748b' : '#38bdf8'} />
                                                </div>
                                                <span style={{ fontWeight: s.scanner_name === 'Guest' ? '500' : '600', fontSize: '0.9rem' }}>{s.scanner_name}</span>
                                            </div>
                                        </td>
                                        <td className="hide-mobile">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{s.city}, {s.country}</span>
                                                <small style={{ opacity: 0.4, fontSize: '0.75rem' }}>{s.ip_address}</small>
                                            </div>
                                        </td>
                                        <td className="hide-mobile" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                            {new Date(s.scanned_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} <br/>
                                            <small style={{ opacity: 0.6 }}>{new Date(s.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                        </td>
                                        <td>
                                            <button className="btn-details" onClick={() => setSelectedLog(s)}>
                                                <ExternalLink size={14} /> <span className="hide-mobile">Details</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>No scan history recorded yet. Share your QRs to see activity!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {selectedLog && (
                    <ReceiverDetailModal 
                        log={selectedLog} 
                        onClose={() => setSelectedLog(null)} 
                    />
                )}
            </div>
        </>
    );
};

export default AnalyticsPage;

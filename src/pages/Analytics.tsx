import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCcw, Activity, User, AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { useNavigate } from 'react-router-dom';

const API_BASE = '';

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
            <div className="analytics-container" style={{ padding: '2rem', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 color="#38bdf8" size={32} /> QR Scan Activity
                    </h2>
                    <button onClick={fetchStats} className="btn" style={{ background: '#334155', display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                        <RefreshCcw size={16} /> Refresh logs
                    </button>
                </div>

                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div className="stat-card" style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' }}>
                        <Activity size={24} color="#38bdf8" />
                        <h3 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>{stats.length}</h3>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Total Scans Tracked</p>
                    </div>
                </div>

                <div className="logs-table-container" style={{ marginTop: '3rem', background: '#1e293b', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #334155' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#334155', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>QR TOKEN</th>
                                <th style={{ padding: '1rem' }}>TYPE</th>
                                <th style={{ padding: '1rem' }}>SCANNED BY</th>
                                <th style={{ padding: '1rem' }}>LOCATION / IP</th>
                                <th style={{ padding: '1rem' }}>SCANNED AT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>Loading activity logs...</td></tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <AlertCircle size={32} />
                                            <span>{error}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : stats.length > 0 ? (
                                stats.map((s, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                                        <td style={{ padding: '1rem' }}><code>{s.token.slice(0, 8)}...</code></td>
                                        <td style={{ padding: '1rem' }}><span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.qr_type.toUpperCase()}</span></td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <User size={14} color={s.scanner_name === 'Guest' ? '#64748b' : '#38bdf8'} />
                                                <span style={{ fontWeight: s.scanner_name === 'Guest' ? 'normal' : '600' }}>{s.scanner_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{s.city}, {s.country} <br/><small style={{opacity: 0.5}}>{s.ip_address}</small></td>
                                        <td style={{ padding: '1rem' }}>{new Date(s.scanned_at).toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>No scan history recorded yet. Share your QRs to see activity!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default AnalyticsPage;

import React, { useState, useEffect } from 'react';
import { BarChart3, RefreshCcw, Activity, User } from 'lucide-react';
import SEO from '../components/SEO';

const API_BASE = '';

const AnalyticsPage: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/bioqr/analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setStats(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
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
                                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>Loading activity logs...</td></tr>
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
                                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center' }}>No scan history recorded yet. Share your QRs to see activity!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default AnalyticsPage;

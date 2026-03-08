import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, AlertTriangle, ArrowRight, Globe, Users, DollarSign, Zap } from 'lucide-react';
import { useAppStore } from '../hooks/useStore';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { wallet, kyc } = useAppStore();

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'verified': return '#22c55e';
      case 'pending_review': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'verified': return <CheckCircle size={20} color="#22c55e" />;
      case 'pending_review': return <Clock size={20} color="#f59e0b" />;
      case 'rejected': return <AlertTriangle size={20} color="#ef4444" />;
      default: return <Shield size={20} color="#64748b" />;
    }
  };

  const metrics = [
    { icon: Globe, label: 'Countries Supported', value: '180+', color: '#38bdf8' },
    { icon: Users, label: 'Stellar Anchors', value: '180+', color: '#a78bfa' },
    { icon: DollarSign, label: 'Avg Reuse Cost', value: '$0.01', color: '#22c55e' },
    { icon: Zap, label: 'Reuse Time', value: '<2 min', color: '#f59e0b' },
  ];

  const providerMatrix = [
    { region: 'India', share: '30%', provider: 'DigiLocker/Aadhaar', cost: '$0.04', time: '15s' },
    { region: 'Philippines', share: '25%', provider: 'PhilSys', cost: '$0.50', time: '20s' },
    { region: 'Latin America', share: '20%', provider: 'Signzy/Trulioo', cost: '$1.50', time: '45s' },
    { region: 'Africa', share: '10%', provider: 'Smile ID', cost: '$0.80', time: '25s' },
    { region: 'EU/US', share: '10%', provider: 'Onfido/Jumio', cost: '$3.00', time: '60s' },
  ];

  const shortAccount = wallet.stellarAccount
    ? `${wallet.stellarAccount.slice(0, 8)}...${wallet.stellarAccount.slice(-6)}`
    : 'Not connected';

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>
          Identity Dashboard
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Manage your Stellar KYC credentials and consent grants
        </p>
      </div>

      {/* Identity Status Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628, #0f2744)',
        border: '1px solid #1e3a5f', borderRadius: '20px',
        padding: '32px', marginBottom: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: kyc.status === 'verified'
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(100,116,139,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {getStatusIcon(kyc.status)}
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Identity Status
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: getStatusColor(kyc.status), marginBottom: '4px', textTransform: 'capitalize' }}>
              {kyc.status || 'Not Verified'}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', fontFamily: "'DM Mono', monospace" }}>
              {shortAccount}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {kyc.status !== 'verified' ? (
            <Link to="/kyc" style={{
              padding: '12px 24px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
              color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              Complete KYC <ArrowRight size={16} />
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '16px' }}>
              {kyc.expiresAt && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Expires</div>
                  <div style={{ color: '#e2e8f0', fontSize: '14px' }}>
                    {formatDistanceToNow(new Date(kyc.expiresAt * 1000), { addSuffix: true })}
                  </div>
                </div>
              )}
              {kyc.riskLevel && (
                <div style={{
                  padding: '8px 16px', borderRadius: '8px',
                  background: kyc.riskLevel === 'low' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: kyc.riskLevel === 'low' ? '#22c55e' : '#f59e0b',
                  fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center',
                }}>
                  Risk: {kyc.riskLevel}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {metrics.map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: '16px', padding: '24px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: `${color}20`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '16px',
            }}>
              <Icon size={20} color={color} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
              {value}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '18px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {[
              { to: '/kyc', label: 'Submit KYC Documents', desc: 'One-time verification' },
              { to: '/consent', label: 'Manage Consents', desc: 'Control who has access' },
              { to: '/audit', label: 'View Audit Log', desc: 'Track all credential access' },
            ].map(({ to, label, desc }) => (
              <Link key={to} to={to} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: '10px', border: '1px solid #1e3a5f',
                textDecoration: 'none', color: '#e2e8f0',
                background: 'rgba(14,165,233,0.05)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{desc}</div>
                </div>
                <ArrowRight size={16} color="#38bdf8" />
              </Link>
            ))}
          </div>
        </div>

        {/* Credential Hash */}
        {kyc.credentialHash && (
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '18px' }}>Credential Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Credential Hash</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#38bdf8',
                  wordBreak: 'break-all', background: '#060b14',
                  padding: '8px', borderRadius: '6px', border: '1px solid #1e3a5f',
                }}>
                  {kyc.credentialHash}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Credential ID</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: '11px', color: '#94a3b8',
                  wordBreak: 'break-all', background: '#060b14',
                  padding: '8px', borderRadius: '6px', border: '1px solid #1e3a5f',
                }}>
                  {kyc.credentialId}
                </div>
              </div>
              <div style={{
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <CheckCircle size={12} />
                Anchored on Stellar blockchain
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Matrix */}
      <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '20px', fontSize: '18px' }}>
          Global Provider Coverage
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              {['Region', 'Ecosystem Share', 'Provider', 'Cost', 'Avg Time'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', borderBottom: '1px solid #1e3a5f', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providerMatrix.map(({ region, share, provider, cost, time }) => (
              <tr key={region} style={{ borderBottom: '1px solid #0f2744' }}>
                <td style={{ padding: '12px', color: '#f8fafc', fontWeight: 600 }}>{region}</td>
                <td style={{ padding: '12px', color: '#38bdf8', fontFamily: "'DM Mono', monospace" }}>{share}</td>
                <td style={{ padding: '12px', color: '#94a3b8' }}>{provider}</td>
                <td style={{ padding: '12px', color: '#22c55e', fontFamily: "'DM Mono', monospace" }}>{cost}</td>
                <td style={{ padding: '12px', color: '#f59e0b', fontFamily: "'DM Mono', monospace" }}>{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

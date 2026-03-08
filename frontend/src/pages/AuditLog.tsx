import React, { useState } from 'react';
import { ScrollText, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';

const DEMO_LOG = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  consent_id: `grant_${(i % 3 === 0 ? '001' : i % 3 === 1 ? '002' : '003')}`,
  anchor_address: [
    'GANCHOR_STELLARPAY_INDIA_0123456789012345',
    'GANCHOR_VIBRANTPAY_REMITTANCE_01234567890',
    'GANCHOR_STELLAR_MANILA_PAY_01234567890000',
  ][i % 3],
  fields_accessed: [
    ['name', 'email', 'risk_level'],
    ['name', 'risk_level'],
    ['name', 'email'],
  ][i % 3],
  accessed_at: Math.floor(Date.now() / 1000) - i * 3600 * 8,
}));

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name', email: 'Email', risk_level: 'Risk Level',
  phone_number: 'Phone', identity: 'Identity', address: 'Address',
};

export default function AuditLog() {
  const [filter, setFilter] = useState('');

  const filtered = DEMO_LOG.filter(entry =>
    filter === '' || entry.anchor_address.toLowerCase().includes(filter.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      'ID,Anchor,Fields Accessed,Accessed At',
      ...filtered.map(e =>
        `${e.id},${e.anchor_address},"${e.fields_accessed.join(', ')}",${new Date(e.accessed_at * 1000).toISOString()}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stellar-kyc-audit.csv';
    a.click();
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-6)}`;

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>
            Audit Log
          </h1>
          <p style={{ color: '#64748b' }}>
            Immutable record of all credential access — GDPR Article 15 compliant
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            border: '1px solid #1e3a5f', background: '#0a1628',
            color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Accesses', value: DEMO_LOG.length, color: '#38bdf8' },
          { label: 'Unique Anchors', value: new Set(DEMO_LOG.map(e => e.anchor_address)).size, color: '#a78bfa' },
          { label: 'Retention Policy', value: '7 years', color: '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: '12px', padding: '20px',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
              {value}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '20px' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter by anchor address..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '10px',
            background: '#0a1628', border: '1px solid #1e3a5f',
            color: '#e2e8f0', fontSize: '14px', outline: 'none',
          }}
        />
      </div>

      {/* Log Table */}
      <div style={{
        background: '#0a1628', border: '1px solid #1e3a5f',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 1fr 180px',
          padding: '12px 20px', borderBottom: '1px solid #1e3a5f',
          fontSize: '12px', color: '#475569', fontWeight: 600,
        }}>
          <span>#</span>
          <span>ANCHOR</span>
          <span>FIELDS ACCESSED</span>
          <span>ACCESSED AT</span>
        </div>

        {filtered.map((entry, idx) => (
          <div key={entry.id} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 1fr 180px',
            padding: '14px 20px',
            borderBottom: idx < filtered.length - 1 ? '1px solid #0f2744' : 'none',
            alignItems: 'center',
          }}>
            <span style={{ color: '#475569', fontSize: '13px', fontFamily: "'DM Mono', monospace" }}>
              {entry.id}
            </span>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#38bdf8' }}>
                {shortAddr(entry.anchor_address)}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                via consent {entry.consent_id}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {entry.fields_accessed.map(f => (
                <span key={f} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                  background: '#0f2744', color: '#94a3b8', border: '1px solid #1e3a5f',
                }}>
                  {FIELD_LABELS[f] || f}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              {format(new Date(entry.accessed_at * 1000), 'MMM d, HH:mm')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '16px', borderRadius: '12px', background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', fontSize: '13px', color: '#64748b' }}>
        <Eye size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        All records are stored in an append-only audit log. Records are retained for 7 years per financial regulations.
        Active credentials stored until expiry; revoked credentials metadata retained 90 days.
      </div>
    </div>
  );
}

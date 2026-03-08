import React, { useState } from 'react';
import { CheckCircle, X, Clock, Shield, Eye, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../hooks/useStore';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

interface ConsentRequest {
  id: string;
  requesting_anchor: string;
  fields_requested: string[];
  expires_at: number;
}

interface ConsentGrant {
  id: string;
  anchor_address: string;
  fields_shared: string[];
  granted_at: number;
  expires_at: number;
  revoked_at: number | null;
}

// Demo data
const DEMO_PENDING: ConsentRequest[] = [
  {
    id: 'req_001',
    requesting_anchor: 'GANCHOR_VIBRANTPAY_REMITTANCE_01234567890',
    fields_requested: ['name', 'email', 'risk_level'],
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  },
];

const DEMO_ACTIVE: ConsentGrant[] = [
  {
    id: 'grant_001',
    anchor_address: 'GANCHOR_STELLARPAY_INDIA_0123456789012345',
    fields_shared: ['name', 'email', 'risk_level'],
    granted_at: Math.floor(Date.now() / 1000) - 86400 * 5,
    expires_at: Math.floor(Date.now() / 1000) + 86400 * 25,
    revoked_at: null,
  },
];

const FIELD_LABELS: Record<string, string> = {
  name: '👤 Full Name',
  email: '📧 Email',
  phone_number: '📱 Phone',
  date_of_birth: '🎂 Date of Birth',
  address: '📍 Address',
  risk_level: '🔰 Risk Level',
  identity: '🪪 Identity',
  country: '🌍 Country',
};

export default function ConsentPage() {
  const { wallet, kyc } = useAppStore();
  const [pending, setPending] = useState<ConsentRequest[]>(DEMO_PENDING);
  const [active, setActive] = useState<ConsentGrant[]>(DEMO_ACTIVE);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (req: ConsentRequest) => {
    if (!wallet.stellarAccount) return;
    setProcessingId(req.id);
    await new Promise(r => setTimeout(r, 800));

    const newGrant: ConsentGrant = {
      id: `grant_${Date.now()}`,
      anchor_address: req.requesting_anchor,
      fields_shared: req.fields_requested,
      granted_at: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 30 * 86400,
      revoked_at: null,
    };

    setActive(prev => [newGrant, ...prev]);
    setPending(prev => prev.filter(p => p.id !== req.id));
    setProcessingId(null);
    toast.success('Consent approved! Anchor can now access your verified credentials.');
  };

  const handleDeny = async (reqId: string) => {
    setProcessingId(reqId);
    await new Promise(r => setTimeout(r, 500));
    setPending(prev => prev.filter(p => p.id !== reqId));
    setProcessingId(null);
    toast.success('Consent request denied.');
  };

  const handleRevoke = async (grantId: string) => {
    setProcessingId(grantId);
    await new Promise(r => setTimeout(r, 600));
    setActive(prev => prev.map(g =>
      g.id === grantId ? { ...g, revoked_at: Math.floor(Date.now() / 1000) } : g
    ));
    setProcessingId(null);
    toast.success('Consent revoked. Anchor can no longer access your credentials.');
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <div style={{ padding: '40px 48px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>
          Consent Manager
        </h1>
        <p style={{ color: '#64748b' }}>Control which anchors can access your verified credentials</p>
      </div>

      {!kyc.status || kyc.status !== 'verified' ? (
        <div style={{
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '16px', padding: '24px', display: 'flex', gap: '16px',
        }}>
          <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>KYC Not Verified</div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>
              Complete your KYC verification first to start sharing credentials with anchors.
            </div>
          </div>
        </div>
      ) : null}

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#f59e0b" />
            Pending Requests
            <span style={{
              background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
              borderRadius: '12px', padding: '2px 10px', fontSize: '13px',
            }}>
              {pending.length}
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pending.map(req => (
              <div key={req.id} style={{
                background: '#0a1628', border: '1px solid rgba(245,158,11,0.4)',
                borderRadius: '16px', padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                      🏦 Anchor Requesting Access
                    </div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: '#64748b' }}>
                      {shortAddr(req.requesting_anchor)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Expires {formatDistanceToNow(new Date(req.expires_at * 1000), { addSuffix: true })}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                    Requesting access to:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {req.fields_requested.map(field => (
                      <span key={field} style={{
                        padding: '4px 12px', borderRadius: '20px',
                        background: 'rgba(14,165,233,0.15)', color: '#38bdf8',
                        fontSize: '13px', border: '1px solid rgba(14,165,233,0.3)',
                      }}>
                        {FIELD_LABELS[field] || field}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={processingId === req.id}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #065f46, #22c55e)',
                      color: 'white', border: 'none', cursor: 'pointer',
                      fontWeight: 600, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <CheckCircle size={16} />
                    {processingId === req.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleDeny(req.id)}
                    disabled={processingId === req.id}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                      cursor: 'pointer', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <X size={16} />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Grants */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="#22c55e" />
          Active Consents
        </h2>
        {active.length === 0 ? (
          <div style={{
            background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: '16px', padding: '48px', textAlign: 'center',
            color: '#475569',
          }}>
            No active consents yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {active.map(grant => {
              const isRevoked = grant.revoked_at !== null;
              const isExpired = grant.expires_at < Math.floor(Date.now() / 1000);

              return (
                <div key={grant.id} style={{
                  background: '#0a1628', border: `1px solid ${isRevoked ? '#ef444440' : '#1e3a5f'}`,
                  borderRadius: '16px', padding: '24px',
                  opacity: isRevoked ? 0.6 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                        🏦 {shortAddr(grant.anchor_address)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Granted {formatDistanceToNow(new Date(grant.granted_at * 1000), { addSuffix: true })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                        background: isRevoked ? 'rgba(239,68,68,0.1)' : isExpired ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                        color: isRevoked ? '#ef4444' : isExpired ? '#f59e0b' : '#22c55e',
                      }}>
                        {isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                      </span>
                      {!isRevoked && !isExpired && (
                        <button
                          onClick={() => handleRevoke(grant.id)}
                          style={{
                            padding: '6px 14px', borderRadius: '8px',
                            background: 'none', border: '1px solid #ef444460',
                            color: '#ef4444', cursor: 'pointer', fontSize: '12px',
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Fields shared:</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {grant.fields_shared.map(f => (
                          <span key={f} style={{
                            padding: '2px 8px', borderRadius: '12px',
                            background: '#0f2744', color: '#94a3b8',
                            fontSize: '12px', border: '1px solid #1e3a5f',
                          }}>
                            {FIELD_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!isRevoked && (
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#475569' }}>Expires</div>
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {format(new Date(grant.expires_at * 1000), 'MMM d, yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

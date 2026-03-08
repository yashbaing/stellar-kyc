import React, { useState } from 'react';
import { Building2, Key, CheckCircle, Copy, Code } from 'lucide-react';
import toast from 'react-hot-toast';

const TIERS = [
  { name: 'Starter', price: '$500/mo', verifications: '1,000', overage: '$0.10', color: '#64748b' },
  { name: 'Growth', price: '$2,000/mo', verifications: '5,000', overage: '$0.08', color: '#38bdf8', popular: true },
  { name: 'Enterprise', price: '$10,000/mo', verifications: '30,000', overage: '$0.05', color: '#a78bfa' },
];

const SDK_EXAMPLE = `import { StellarKYC } from '@stellarkyc/sdk';

const kyc = new StellarKYC({
  apiKey: 'your_api_key',
  network: 'testnet'
});

// Step 1: Request consent from user
const consent = await kyc.requestConsent({
  account: 'GUSER...STELLAR_ACCOUNT',
  fields: ['name', 'email', 'risk_level']
});

// consent.user_action_required === true
// User approves in their wallet UI

// Step 2: Verify once user approves
const result = await kyc.verify(consent.consentId);

console.log(result.verified);     // true
console.log(result.risk_level);   // 'low'
console.log(result.fields);       // ['name', 'email', 'risk_level']`;

export default function AnchorDashboard() {
  const [demoApiKey] = useState('sk_test_' + Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16)).join(''));
  const [activeTab, setActiveTab] = useState<'overview' | 'sdk' | 'pricing'>('overview');

  const copyApiKey = () => {
    navigator.clipboard.writeText(demoApiKey);
    toast.success('API key copied!');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(SDK_EXAMPLE);
    toast.success('Code copied!');
  };

  const tabStyle = (tab: string) => ({
    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
    border: 'none', fontSize: '14px', fontWeight: 600,
    background: activeTab === tab ? 'rgba(14,165,233,0.15)' : 'none',
    color: activeTab === tab ? '#38bdf8' : '#64748b',
  });

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>
          Anchor Integration
        </h1>
        <p style={{ color: '#64748b' }}>Tools and docs for Stellar anchor integration</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', background: '#0a1628', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid #1e3a5f' }}>
        {(['overview', 'sdk', 'pricing'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* API Key */}
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} color="#38bdf8" /> Your API Key
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                flex: 1, padding: '12px 16px', borderRadius: '10px',
                background: '#060b14', border: '1px solid #1e3a5f',
                fontFamily: "'DM Mono', monospace", fontSize: '13px', color: '#94a3b8',
              }}>
                {demoApiKey}
              </div>
              <button
                onClick={copyApiKey}
                style={{
                  padding: '12px 16px', borderRadius: '10px',
                  border: '1px solid #1e3a5f', background: '#0f2744',
                  color: '#94a3b8', cursor: 'pointer',
                }}
              >
                <Copy size={16} />
              </button>
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
              ⚠️ This is a demo key. Create a real account at stellarkyc.org/anchor
            </div>
          </div>

          {/* Integration Steps */}
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>Integration Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { step: '1', title: 'Register anchor account', desc: 'Create account and get API credentials from stellarkyc.org/anchor' },
                { step: '2', title: 'Install the SDK', desc: 'npm install @stellarkyc/sdk' },
                { step: '3', title: 'Implement SEP-10 auth', desc: 'Authenticate users with their Stellar wallet' },
                { step: '4', title: 'Request consent', desc: 'Call POST /identity/consent/request when user onboards' },
                { step: '5', title: 'Verify credentials', desc: 'Call GET /identity/verify-proof with the consent_id' },
                { step: '6', title: 'Go live', desc: 'Test with sandbox users, then migrate existing users' },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{
                  display: 'flex', gap: '16px', alignItems: 'flex-start',
                  padding: '14px', borderRadius: '10px', background: '#060b14',
                  border: '1px solid #1e293b',
                }}>
                  <div style={{
                    minWidth: '28px', height: '28px', borderRadius: '8px',
                    background: 'rgba(14,165,233,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#38bdf8', fontWeight: 700, fontSize: '13px',
                  }}>
                    {step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{title}</div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>{desc}</div>
                  </div>
                  <CheckCircle size={16} color="#22c55e" style={{ marginLeft: 'auto', marginTop: '4px', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

          {/* ROI Calculator */}
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '20px' }}>ROI Calculator</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Traditional KYC cost (1000 users)', value: '$75,000-$100,000', color: '#ef4444' },
                { label: 'Stellar KYC cost (1000 users)', value: '$3,000', color: '#22c55e' },
                { label: 'Annual Savings', value: '$72,000-$97,000', color: '#38bdf8' },
                { label: 'Cost Reduction', value: '96%', color: '#a78bfa' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '16px', borderRadius: '10px',
                  background: '#060b14', border: '1px solid #1e293b',
                }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sdk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #1e3a5f',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px' }}>
                <Code size={16} /> TypeScript SDK — Quick Start
              </div>
              <button onClick={copyCode} style={{
                padding: '6px 12px', borderRadius: '8px', border: '1px solid #1e3a5f',
                background: '#0f2744', color: '#94a3b8', cursor: 'pointer', fontSize: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Copy size={12} /> Copy
              </button>
            </div>
            <pre style={{
              padding: '24px', margin: 0, fontSize: '13px',
              color: '#e2e8f0', fontFamily: "'DM Mono', monospace",
              overflowX: 'auto', lineHeight: 1.6,
            }}>
              {SDK_EXAMPLE}
            </pre>
          </div>

          <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '28px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '16px' }}>API Endpoints</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { method: 'PUT', path: '/identity/customer', desc: 'Submit KYC data (SEP-12)' },
                { method: 'GET', path: '/identity/customer', desc: 'Check KYC status' },
                { method: 'POST', path: '/identity/consent/request', desc: 'Request consent from user' },
                { method: 'POST', path: '/identity/consent/approve', desc: 'User approves consent' },
                { method: 'GET', path: '/identity/verify-proof', desc: 'Verify credential via consent' },
                { method: 'DELETE', path: '/identity/credential', desc: 'Revoke credential' },
              ].map(({ method, path, desc }) => (
                <div key={path} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  padding: '10px 14px', borderRadius: '8px',
                  background: '#060b14', border: '1px solid #1e293b',
                }}>
                  <span style={{
                    minWidth: '50px', padding: '2px 8px', borderRadius: '6px', textAlign: 'center',
                    fontSize: '11px', fontWeight: 700, fontFamily: "'DM Mono', monospace",
                    background: method === 'GET' ? 'rgba(34,197,94,0.2)' : method === 'PUT' ? 'rgba(245,158,11,0.2)' : method === 'POST' ? 'rgba(14,165,233,0.2)' : 'rgba(239,68,68,0.2)',
                    color: method === 'GET' ? '#22c55e' : method === 'PUT' ? '#f59e0b' : method === 'POST' ? '#38bdf8' : '#ef4444',
                  }}>
                    {method}
                  </span>
                  <code style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                    {path}
                  </code>
                  <span style={{ color: '#475569', fontSize: '13px', marginLeft: 'auto' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pricing' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {TIERS.map(({ name, price, verifications, overage, color, popular }) => (
            <div key={name} style={{
              background: '#0a1628',
              border: `1px solid ${popular ? color : '#1e3a5f'}`,
              borderRadius: '20px', padding: '28px',
              position: 'relative',
            }}>
              {popular && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #0369a1, #0ea5e9)',
                  color: 'white', padding: '4px 16px', borderRadius: '12px',
                  fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}
              <div style={{ color, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{name}</div>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: "'DM Mono', monospace", marginBottom: '4px' }}>
                {price}
              </div>
              <div style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>billed monthly</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  `${verifications} verifications/mo`,
                  `${overage} per overage`,
                  'SEP-12 compatible',
                  'W3C VC credentials',
                  'Audit logging',
                  name === 'Enterprise' ? 'Custom SLA' : 'Standard SLA',
                ].map(feature => (
                  <div key={feature} style={{ display: 'flex', gap: '8px', fontSize: '14px', color: '#94a3b8' }}>
                    <CheckCircle size={16} color={color} style={{ flexShrink: 0, marginTop: '1px' }} />
                    {feature}
                  </div>
                ))}
              </div>
              <button style={{
                width: '100%', marginTop: '24px', padding: '12px',
                borderRadius: '10px', border: `1px solid ${color}`,
                background: popular ? `linear-gradient(135deg, #0369a1, #0ea5e9)` : 'none',
                color: popular ? 'white' : color,
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

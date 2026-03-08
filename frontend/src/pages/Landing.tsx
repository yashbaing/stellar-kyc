import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Globe, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useAppStore } from '../hooks/useStore';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  'GDEMO1STELLARKYC123456789012345678901234567890AAAA',
  'GDEMO2STELLARKYC123456789012345678901234567890BBBB',
];

export default function Landing() {
  const navigate = useNavigate();
  const { connectWallet } = useAppStore();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 800));
    const demoAccount = DEMO_ACCOUNTS[0];
    const demoPublicKey = btoa(demoAccount).substring(0, 44);
    connectWallet(demoAccount, demoPublicKey);
    toast.success('Demo wallet connected!');
    setConnecting(false);
    navigate('/dashboard');
  };

  const stats = [
    { value: '10×', label: 'Faster Onboarding' },
    { value: '80%', label: 'Cost Reduction' },
    { value: '180+', label: 'Countries' },
    { value: '7M+', label: 'Stellar Users' },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Verify Once',
      desc: 'Complete KYC one time and reuse across the entire Stellar ecosystem.',
    },
    {
      icon: Lock,
      title: 'You Own Your Data',
      desc: 'Credentials encrypted with your Stellar keypair. No one can access without your consent.',
    },
    {
      icon: Zap,
      title: 'Instant Onboarding',
      desc: 'Share credentials to new anchors in under 2 minutes at $0.01 cost.',
    },
    {
      icon: Globe,
      title: 'Global Coverage',
      desc: 'DigiLocker, PhilSys, Smile ID, Onfido & more — 180+ countries supported.',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#060b14', color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Nav */}
      <nav style={{
        padding: '20px 48px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #1e293b',
        background: 'rgba(6, 11, 20, 0.95)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #1d6fa4, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', fontFamily: "'DM Mono', monospace" }}>
            StellarKYC
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="https://docs.stellarkyc.org" style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #1e3a5f',
            color: '#94a3b8', textDecoration: 'none', fontSize: '14px',
          }}>
            Docs
          </a>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600,
              opacity: connecting ? 0.7 : 1,
            }}
          >
            {connecting ? 'Connecting...' : 'Launch App →'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '100px 48px 80px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.12) 0%, transparent 60%)',
        textAlign: 'center', maxWidth: '900px', margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)',
          borderRadius: '20px', padding: '6px 16px', fontSize: '13px',
          color: '#38bdf8', marginBottom: '32px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
          Live on Stellar Testnet
        </div>

        <h1 style={{
          fontSize: '64px', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px',
          fontFamily: "'DM Mono', monospace",
        }}>
          <span style={{ color: '#f8fafc' }}>Verify Once.</span>
          <br />
          <span style={{ background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Access Everything.
          </span>
        </h1>

        <p style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '48px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 48px' }}>
          Reusable KYC infrastructure for the Stellar ecosystem. Stop wasting 2.5 hours
          and $75+ on repeat identity verification across anchors.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: '14px 32px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: '16px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {connecting ? 'Connecting...' : 'Get Started Free'}
            <ArrowRight size={18} />
          </button>
          <a href="https://github.com/stellar-kyc" style={{
            padding: '14px 32px', borderRadius: '12px',
            border: '1px solid #1e3a5f', color: '#e2e8f0',
            textDecoration: 'none', fontSize: '16px',
          }}>
            View on GitHub
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: '#1e3a5f', borderRadius: '16px', overflow: 'hidden' }}>
          {stats.map(({ value, label }) => (
            <div key={label} style={{ background: '#0a1628', padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#38bdf8', fontFamily: "'DM Mono', monospace" }}>
                {value}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '36px', fontWeight: 700, marginBottom: '56px', fontFamily: "'DM Mono', monospace" }}>
          Built for the Stellar Ecosystem
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: '#0a1628', border: '1px solid #1e3a5f',
              borderRadius: '16px', padding: '32px',
              transition: 'border-color 0.2s',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(14,165,233,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
              }}>
                <Icon size={24} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
                {title}
              </h3>
              <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: '15px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 48px', background: '#0a1628', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', fontFamily: "'DM Mono', monospace" }}>
            Two-Minute Reuse Flow
          </h2>
          <p style={{ color: '#64748b', marginBottom: '56px', fontSize: '16px' }}>
            After your one-time KYC, reuse credentials across any Stellar anchor in seconds.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            {[
              { step: '01', title: 'New anchor detects your credential', desc: '"You\'re already verified with another Stellar service"' },
              { step: '02', title: 'Review what fields they need', desc: 'Name, email, risk level — you see exactly what will be shared' },
              { step: '03', title: 'Click Approve', desc: 'SEP-10 signed consent token issued with 30-day validity' },
              { step: '04', title: 'Instantly onboarded', desc: 'Anchor receives verified attributes, no document upload needed' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{
                display: 'flex', gap: '20px', alignItems: 'flex-start',
                background: '#060b14', borderRadius: '12px', padding: '20px 24px',
                border: '1px solid #1e3a5f',
              }}>
                <div style={{
                  minWidth: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(14,165,233,0.2)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#38bdf8', fontWeight: 700, fontSize: '13px', fontFamily: "'DM Mono', monospace",
                }}>
                  {step}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>{title}</div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>{desc}</div>
                </div>
                <CheckCircle size={20} color="#22c55e" style={{ marginLeft: 'auto', marginTop: '2px', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px', fontFamily: "'DM Mono', monospace" }}>
          Ready to build?
        </h2>
        <p style={{ color: '#64748b', marginBottom: '40px', fontSize: '16px' }}>
          Join the Stellar KYC ecosystem. Free for the first 1,000 verifications.
        </p>
        <button
          onClick={handleConnect}
          style={{
            padding: '16px 40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
            color: 'white', border: 'none', cursor: 'pointer',
            fontSize: '18px', fontWeight: 700,
          }}
        >
          Launch the App →
        </button>
      </section>

      <footer style={{
        padding: '24px 48px', borderTop: '1px solid #1e293b',
        display: 'flex', justifyContent: 'space-between',
        color: '#475569', fontSize: '13px',
      }}>
        <span>© 2024 Stellar KYC. Open-source identity infrastructure.</span>
        <span>Built on SEP-10 · SEP-12 · W3C VC</span>
      </footer>
    </div>
  );
}

import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FileCheck, GitMerge,
  ScrollText, Building2, LogOut, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../hooks/useStore';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/kyc', icon: FileCheck, label: 'KYC Verification' },
  { path: '/consent', icon: GitMerge, label: 'Consent Manager' },
  { path: '/audit', icon: ScrollText, label: 'Audit Log' },
  { path: '/anchor', icon: Building2, label: 'Anchor Tools' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { wallet, disconnectWallet } = useAppStore();

  const handleDisconnect = () => {
    disconnectWallet();
    toast.success('Wallet disconnected');
    navigate('/');
  };

  const shortAccount = wallet.stellarAccount
    ? `${wallet.stellarAccount.slice(0, 6)}...${wallet.stellarAccount.slice(-4)}`
    : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060b14', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px', background: '#0a1628',
        borderRight: '1px solid #1e3a5f',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', height: '100vh', zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e3a5f' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1d6fa4, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '16px', fontFamily: "'DM Mono', monospace" }}>
                StellarKYC
              </div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Identity Infrastructure</div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
                textDecoration: 'none',
                background: active ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                color: active ? '#38bdf8' : '#94a3b8',
                transition: 'all 0.15s',
                fontSize: '14px', fontWeight: active ? 600 : 400,
              }}>
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        {/* Wallet info */}
        {wallet.isConnected && (
          <div style={{
            padding: '16px', borderTop: '1px solid #1e3a5f',
            margin: '0 12px 12px'
          }}>
            <div style={{
              background: '#0f2744', borderRadius: '10px', padding: '12px',
              border: '1px solid #1e3a5f'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                Connected Wallet
              </div>
              <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: "'DM Mono', monospace" }}>
                {shortAccount}
              </div>
              <button
                onClick={handleDisconnect}
                style={{
                  marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                  fontSize: '12px', padding: 0,
                }}
              >
                <LogOut size={12} />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: '260px', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}

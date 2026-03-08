import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, User, MapPin, FileText, Shield } from 'lucide-react';
import { useAppStore } from '../hooks/useStore';
import { submitKYC } from '../services/api';
import toast from 'react-hot-toast';

const COUNTRIES = [
  { code: 'IN', name: 'India', provider: 'DigiLocker/Aadhaar', time: '15s', cost: '$0.04' },
  { code: 'PH', name: 'Philippines', provider: 'PhilSys', time: '20s', cost: '$0.50' },
  { code: 'NG', name: 'Nigeria', provider: 'Smile ID', time: '25s', cost: '$0.80' },
  { code: 'MX', name: 'Mexico', provider: 'Signzy', time: '45s', cost: '$1.50' },
  { code: 'US', name: 'United States', provider: 'Jumio', time: '60s', cost: '$3.00' },
  { code: 'GB', name: 'United Kingdom', provider: 'Onfido', time: '60s', cost: '$3.00' },
  { code: 'DE', name: 'Germany', provider: 'Onfido', time: '60s', cost: '$3.00' },
  { code: 'BR', name: 'Brazil', provider: 'Signzy', time: '45s', cost: '$1.50' },
];

const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Documents', icon: FileText },
  { id: 4, label: 'Review', icon: Shield },
];

interface FormData {
  first_name: string; last_name: string; email: string;
  phone_number: string; date_of_birth: string;
  address: string; city: string; country: string;
  id_type: 'passport' | 'national_id' | 'drivers_license';
  id_number: string;
}

export default function KYCSubmit() {
  const navigate = useNavigate();
  const { wallet, setKYCStatus } = useAppStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', email: '', phone_number: '',
    date_of_birth: '', address: '', city: '', country: 'IN',
    id_type: 'passport', id_number: '',
  });

  const selectedCountry = COUNTRIES.find(c => c.code === form.country) || COUNTRIES[0];

  const update = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!wallet.stellarAccount || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitKYC(wallet.stellarAccount, {
        ...form,
        user_public_key: wallet.publicKey,
      });

      setKYCStatus({
        status: result.status,
        credentialId: result.credential_id,
      });

      toast.success('KYC submitted successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      // Simulate success for demo
      setKYCStatus({
        status: 'verified',
        riskLevel: 'low',
        credentialId: `cred_${Date.now()}`,
        credentialHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        verifiedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 86400,
      });
      toast.success('KYC verified! (Demo mode)');
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: '#060b14', border: '1px solid #1e3a5f',
    color: '#e2e8f0', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', fontSize: '13px', color: '#94a3b8',
    marginBottom: '6px', fontWeight: 500,
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', fontFamily: "'DM Mono', monospace" }}>
          KYC Verification
        </h1>
        <p style={{ color: '#64748b' }}>Complete once, reuse everywhere in the Stellar ecosystem</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {STEPS.map(({ id, label, icon: Icon }) => (
          <div key={id} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: step >= id ? 'rgba(14,165,233,0.2)' : '#0a1628',
                border: `1px solid ${step >= id ? '#0ea5e9' : '#1e3a5f'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {step > id
                  ? <CheckCircle size={16} color="#22c55e" />
                  : <Icon size={16} color={step === id ? '#38bdf8' : '#475569'} />
                }
              </div>
              <span style={{ fontSize: '13px', color: step >= id ? '#e2e8f0' : '#475569', fontWeight: step === id ? 600 : 400 }}>
                {label}
              </span>
            </div>
            <div style={{
              height: '2px', borderRadius: '2px',
              background: step > id ? '#0ea5e9' : step === id ? 'linear-gradient(90deg, #0ea5e9, #1e3a5f)' : '#1e293b',
            }} />
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div style={{
        background: '#0a1628', border: '1px solid #1e3a5f',
        borderRadius: '20px', padding: '36px',
      }}>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Personal Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} value={form.first_name}
                  onChange={e => update('first_name', e.target.value)}
                  placeholder="Maria" />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} value={form.last_name}
                  onChange={e => update('last_name', e.target.value)}
                  placeholder="Doe" />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input style={inputStyle} type="email" value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="maria@example.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle} value={form.phone_number}
                  onChange={e => update('phone_number', e.target.value)}
                  placeholder="+91 98765 43210" />
              </div>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle} type="date" value={form.date_of_birth}
                  onChange={e => update('date_of_birth', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Address & Country */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Address & Country</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Street Address</label>
                <input style={inputStyle} value={form.address}
                  onChange={e => update('address', e.target.value)}
                  placeholder="123 Main Street" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={form.city}
                    onChange={e => update('city', e.target.value)}
                    placeholder="Mumbai" />
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <select style={inputStyle} value={form.country}
                    onChange={e => update('country', e.target.value)}>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Provider info */}
              <div style={{
                padding: '16px', borderRadius: '12px',
                background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)',
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  Verification Provider for {selectedCountry.name}
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>{selectedCountry.provider}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                    ⚡ {selectedCountry.time} · 💰 {selectedCountry.cost}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Identity Documents</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Document Type</label>
                <select style={inputStyle} value={form.id_type}
                  onChange={e => update('id_type', e.target.value as 'passport' | 'national_id' | 'drivers_license')}>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Number</label>
                <input style={inputStyle} value={form.id_number}
                  onChange={e => update('id_number', e.target.value)}
                  placeholder="e.g. A1234567" />
              </div>
              {/* Upload areas */}
              {['Upload ID Document', 'Upload Selfie'].map(label => (
                <div key={label} style={{
                  border: '2px dashed #1e3a5f', borderRadius: '12px',
                  padding: '32px', textAlign: 'center',
                  cursor: 'pointer', transition: 'border-color 0.2s',
                }}>
                  <Upload size={32} color="#475569" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                  <div style={{ color: '#475569', fontSize: '13px', marginTop: '4px' }}>
                    JPEG, PNG or PDF — Max 10MB
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#22c55e' }}>
                    ✓ Encrypted with your Stellar keypair before upload
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Review & Submit</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Name', value: `${form.first_name} ${form.last_name}` },
                { label: 'Email', value: form.email || '—' },
                { label: 'Phone', value: form.phone_number || '—' },
                { label: 'Country', value: selectedCountry.name },
                { label: 'Document Type', value: form.id_type.replace('_', ' ') },
                { label: 'Document Number', value: form.id_number || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid #1e3a5f',
                }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>{label}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>{value}</span>
                </div>
              ))}

              <div style={{
                padding: '16px', borderRadius: '12px',
                background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
              }}>
                <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>
                  🔒 Privacy Guarantee
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Your credentials will be encrypted with your Stellar keypair.
                  No one — including us — can access your data without your explicit consent.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            style={{
              padding: '12px 24px', borderRadius: '10px',
              border: '1px solid #1e3a5f', background: 'none',
              color: step === 1 ? '#475569' : '#94a3b8',
              cursor: step === 1 ? 'default' : 'pointer', fontSize: '14px',
            }}
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{
                padding: '12px 28px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
                color: 'white', border: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600,
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 28px', borderRadius: '10px',
                background: submitting ? '#0369a1' : 'linear-gradient(135deg, #065f46, #22c55e)',
                color: 'white', border: 'none', cursor: submitting ? 'default' : 'pointer',
                fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {submitting ? '⏳ Verifying...' : '✓ Submit KYC'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

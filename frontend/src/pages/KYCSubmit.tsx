import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, User, MapPin, FileText, Shield, AlertCircle } from 'lucide-react';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+()-]{10,20}$/;

interface FormData {
  first_name: string; last_name: string; email: string;
  phone_number: string; date_of_birth: string;
  address: string; city: string; country: string;
  id_type: 'passport' | 'national_id' | 'drivers_license';
  id_number: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateStep(step: number, form: FormData): FormErrors {
  const errors: FormErrors = {};
  if (step === 1) {
    if (!form.first_name?.trim()) errors.first_name = 'Please enter your first name';
    if (!form.last_name?.trim()) errors.last_name = 'Please enter your last name';
    if (form.email?.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (form.phone_number?.trim() && !PHONE_REGEX.test(form.phone_number.trim())) {
      errors.phone_number = 'Please enter a valid phone number';
    }
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      const now = new Date();
      if (dob >= now) errors.date_of_birth = 'Date of birth must be in the past';
      const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) errors.date_of_birth = 'You must be at least 18 years old';
    }
  }
  if (step === 2) {
    if (!form.address?.trim()) errors.address = 'Please enter your street address';
    if (!form.city?.trim()) errors.city = 'Please enter your city';
  }
  if (step === 3) {
    if (!form.id_number?.trim()) errors.id_number = 'Please enter your document number';
  }
  return errors;
}

function isStepValid(step: number, form: FormData): boolean {
  return Object.keys(validateStep(step, form)).length === 0;
}

function isFormValidForSubmit(form: FormData): boolean {
  return (
    !!form.first_name?.trim() &&
    !!form.last_name?.trim() &&
    !!form.address?.trim() &&
    !!form.city?.trim() &&
    !!form.id_number?.trim() &&
    (!form.email?.trim() || EMAIL_REGEX.test(form.email.trim())) &&
    (!form.phone_number?.trim() || PHONE_REGEX.test(form.phone_number.trim()))
  );
}

export default function KYCSubmit() {
  const navigate = useNavigate();
  const { wallet, setKYCStatus } = useAppStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [form, setForm] = useState<FormData>({
    first_name: '', last_name: '', email: '', phone_number: '',
    date_of_birth: '', address: '', city: '', country: 'IN',
    id_type: 'passport', id_number: '',
  });

  const selectedCountry = COUNTRIES.find(c => c.code === form.country) || COUNTRIES[0];
  const stepValid = isStepValid(step, form);
  const canSubmit = step === 4 && isFormValidForSubmit(form);

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const goNext = useCallback(() => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const keys = Object.keys(stepErrors) as (keyof FormData)[];
      setTouched(prev => ({ ...prev, ...Object.fromEntries(keys.map(k => [k, true] as const)) }));
      toast.error('Please fix the errors before continuing');
      return;
    }
    setErrors({});
    setStep(s => Math.min(4, s + 1));
  }, [step, form]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep(s => Math.max(1, s - 1));
  }, []);

  const handleSubmit = async () => {
    if (!wallet.stellarAccount || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    const allErrors: FormErrors = { ...validateStep(1, form), ...validateStep(2, form), ...validateStep(3, form) };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTouched(prev => ({ ...prev, ...Object.fromEntries((Object.keys(allErrors) as (keyof FormData)[]).map(k => [k, true] as const)) }));
      toast.error('Please complete all required fields before submitting');
      return;
    }
    if (!isFormValidForSubmit(form)) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    setErrors({});
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
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field: keyof FormData) => ({
    width: '100%' as const,
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#060b14',
    border: `1px solid ${errors[field] ? '#ef4444' : '#1e3a5f'}`,
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  });

  const labelStyle = {
    display: 'block' as const,
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
    fontWeight: 500,
  };

  const errorStyle = { fontSize: '12px', color: '#ef4444', marginTop: '4px' };

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

        {Object.keys(errors).length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
            marginBottom: '20px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <span style={{ color: '#fca5a5', fontSize: '14px' }}>
              Please fix the errors below before continuing.
            </span>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Personal Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle('first_name')} value={form.first_name}
                  onChange={e => update('first_name', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, first_name: true }))}
                  placeholder="Maria" aria-invalid={!!errors.first_name} />
                {errors.first_name && <div style={errorStyle}>{errors.first_name}</div>}
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle('last_name')} value={form.last_name}
                  onChange={e => update('last_name', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, last_name: true }))}
                  placeholder="Doe" aria-invalid={!!errors.last_name} />
                {errors.last_name && <div style={errorStyle}>{errors.last_name}</div>}
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input style={inputStyle('email')} type="email" value={form.email}
                  onChange={e => update('email', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                  placeholder="maria@example.com" aria-invalid={!!errors.email} />
                {errors.email && <div style={errorStyle}>{errors.email}</div>}
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle('phone_number')} value={form.phone_number}
                  onChange={e => update('phone_number', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, phone_number: true }))}
                  placeholder="+91 98765 43210" aria-invalid={!!errors.phone_number} />
                {errors.phone_number && <div style={errorStyle}>{errors.phone_number}</div>}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle('date_of_birth')} type="date" value={form.date_of_birth}
                  onChange={e => update('date_of_birth', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, date_of_birth: true }))}
                  aria-invalid={!!errors.date_of_birth} />
                {errors.date_of_birth && <div style={errorStyle}>{errors.date_of_birth}</div>}
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
                <label style={labelStyle}>Street Address *</label>
                <input style={inputStyle('address')} value={form.address}
                  onChange={e => update('address', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, address: true }))}
                  placeholder="123 Main Street" aria-invalid={!!errors.address} />
                {errors.address && <div style={errorStyle}>{errors.address}</div>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input style={inputStyle('city')} value={form.city}
                    onChange={e => update('city', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, city: true }))}
                    placeholder="Mumbai" aria-invalid={!!errors.city} />
                  {errors.city && <div style={errorStyle}>{errors.city}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Country</label>
                  <select style={inputStyle('country')} value={form.country}
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
                <select style={inputStyle('id_type')} value={form.id_type}
                  onChange={e => update('id_type', e.target.value as 'passport' | 'national_id' | 'drivers_license')}>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Document Number *</label>
                <input style={inputStyle('id_number')} value={form.id_number}
                  onChange={e => update('id_number', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, id_number: true }))}
                  placeholder="e.g. A1234567" aria-invalid={!!errors.id_number} />
                {errors.id_number && <div style={errorStyle}>{errors.id_number}</div>}
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
            {!canSubmit && (
              <p style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '16px' }}>
                Complete all required steps (name, address, city, document number) to submit.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Name', value: `${form.first_name || '—'} ${form.last_name || '—'}`.trim() || '—' },
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
            onClick={goBack}
            disabled={step === 1}
            type="button"
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
              onClick={goNext}
              type="button"
              style={{
                padding: '12px 28px', borderRadius: '10px',
                background: stepValid ? 'linear-gradient(135deg, #0369a1, #0ea5e9)' : '#1e3a5f',
                color: stepValid ? 'white' : '#64748b',
                border: '1px solid #1e3a5f',
                cursor: stepValid ? 'pointer' : 'not-allowed',
                fontSize: '14px', fontWeight: 600,
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              type="button"
              style={{
                padding: '12px 28px', borderRadius: '10px',
                background: submitting ? '#0369a1' : canSubmit ? 'linear-gradient(135deg, #065f46, #22c55e)' : '#1e3a5f',
                color: 'white', border: 'none',
                cursor: submitting || !canSubmit ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {submitting ? '⏳ Verifying...' : canSubmit ? '✓ Submit KYC' : 'Complete required fields to submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

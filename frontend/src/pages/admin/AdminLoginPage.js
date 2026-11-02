import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const CODE_LENGTH = 6;

const OtpInput = ({ value, onChange }) => {
  const refs = useRef([]);
  const digits = value.padEnd(CODE_LENGTH, ' ').split('').slice(0, CODE_LENGTH);

  const setDigit = (index, char) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join('').trimEnd());
  };

  const handleChange = (index, raw) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char) {
      setDigit(index, ' ');
      return;
    }
    setDigit(index, char);
    if (index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index].trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex gap-2.5" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoFocus={i === 0}
          className="w-11 h-12 text-center text-lg font-semibold text-gray-900 rounded-xl border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
        />
      ))}
    </div>
  );
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { adminLogin, verifyAdminLogin, isLoading } = useAuth();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await adminLogin({ email, password });
      setStep('otp');
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Invalid credentials.');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await verifyAdminLogin({ email, code });
      navigate('/admin', { replace: true });
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Invalid or expired code.');
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute -top-40 -left-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/40 border border-white/5 p-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center mb-5">
          <span className="text-white text-sm font-bold">M</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Msafiri Space</p>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 mb-7">Admin sign in</h1>

        {formError && (
          <div className="mb-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
            {formError}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-60 transition-colors mt-2"
            >
              {isLoading ? 'Sending code...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <p className="text-sm text-gray-600">
              We emailed a verification code to <span className="font-medium text-gray-900">{email}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification code</label>
              <OtpInput value={code} onChange={setCode} />
            </div>
            <button
              type="submit"
              disabled={isLoading || code.length < CODE_LENGTH}
              className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify and sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('credentials'); setCode(''); setFormError(''); }}
              className="w-full text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
            >
              Use a different account
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminLoginPage;

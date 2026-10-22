import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const RESEND_COOLDOWN_SECONDS = 60;

const maskEmail = (value) => {
  if (!value || !value.includes('@')) return value || '';
  const [local, domain] = value.split('@');
  if (local.length <= 2) return `${local[0] || ''}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
};

const VerifyAccountPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyCode, resendCode, establishSession } = useAuth();

  const [email, setEmail] = useState(location.state?.email || '');
  const verificationMethod = location.state?.verification_method || 'email';
  const from = location.state?.from || '/';
  const cameFromSignup = Boolean(location.state?.email);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(cameFromSignup ? RESEND_COOLDOWN_SECONDS : 0);
  const [isResending, setIsResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const timerRef = useRef(null);
  const codeInputRef = useRef(null);

  useEffect(() => {
    if (cameFromSignup) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    codeInputRef.current?.focus();
    return () => clearInterval(timerRef.current);
  }, [cameFromSignup]);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const destinationLabel =
    verificationMethod === 'phone'
      ? 'WhatsApp'
      : maskEmail(email.trim()) || 'your email';

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email.trim() || code.trim().length < 4) return;

    setStatus('verifying');
    setErrorMessage('');
    setInfoMessage('');
    try {
      const result = await verifyCode({ email: email.trim(), code: code.trim() });
      establishSession({ user: result.user, tokens: result.tokens });
      setStatus('success');
      setTimeout(() => navigate(from, { replace: true }), 1000);
    } catch (err) {
      setErrorMessage(err?.error || err?.message || 'Invalid or expired verification code.');
      setStatus('error');
    }
  };

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0) return;
    setIsResending(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      await resendCode({ email: email.trim() });
      setInfoMessage(
        verificationMethod === 'phone'
          ? 'A new code was sent to WhatsApp.'
          : `A new code was sent to ${maskEmail(email.trim())}.`
      );
      startCooldown();
    } catch (err) {
      setErrorMessage(err?.error || err?.message || 'Could not resend the code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Verify your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            {verificationMethod === 'phone' ? (
              <>Enter the code we sent via WhatsApp.</>
            ) : (
              <>
                Enter the 6-digit code we sent to{' '}
                <span className="font-medium text-gray-900">{destinationLabel}</span>.
              </>
            )}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
            {status === 'success' ? (
              <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Account verified!</h3>
                <p className="mt-2 text-sm text-gray-600">Redirecting you now...</p>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-6">
                {!location.state?.email && (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Verification code
                  </label>
                  <div className="mt-1">
                    <input
                      ref={codeInputRef}
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-center text-2xl tracking-[0.35em] font-semibold focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="000000"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Code expires in about 10 minutes. Check spam if you don’t see it.
                  </p>
                </div>

                {infoMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm text-green-800">{infoMessage}</p>
                  </div>
                )}

                {status === 'error' && errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-700 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                      {errorMessage}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'verifying' || !email.trim() || code.trim().length < 4}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {status === 'verifying' ? 'Verifying...' : 'Verify account'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || cooldown > 0 || !email.trim()}
                    className="text-sm font-medium text-red-600 hover:text-red-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0
                      ? `Resend code in ${cooldown}s`
                      : isResending
                        ? 'Sending...'
                        : 'Resend code'}
                  </button>
                </div>

                <div className="text-center">
                  <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyAccountPage;

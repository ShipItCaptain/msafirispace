import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMessage, setErrorMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await authAPI.verifyEmail(token);
        if (!cancelled) setStatus('success');
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err?.response?.data?.error || 'This verification link is invalid or has expired.');
          setStatus('error');
        }
      }
    };
    if (token) run();
    return () => { cancelled = true; };
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authAPI.resendVerification();
      setResent(true);
    } catch (_) {
      setErrorMessage('Could not resend verification email. Please try again later.');
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
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200 text-center">
            {status === 'verifying' && (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto" />
                <p className="mt-4 text-sm text-gray-600">Verifying your email...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="mt-4 text-xl font-bold text-gray-900">Email verified!</h2>
                <p className="mt-2 text-sm text-gray-600">Your email address has been confirmed.</p>
                <Link
                  to="/"
                  className="mt-6 inline-block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Continue to Msafiri Space
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="mt-4 text-xl font-bold text-gray-900">Verification failed</h2>
                <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

                {isAuthenticated ? (
                  resent ? (
                    <p className="mt-6 text-sm text-green-700">
                      A new verification email is on its way. Check your inbox.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {isResending ? 'Sending...' : 'Resend verification email'}
                    </button>
                  )
                ) : (
                  <Link
                    to="/login"
                    className="mt-6 inline-block w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Sign in to resend the link
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;

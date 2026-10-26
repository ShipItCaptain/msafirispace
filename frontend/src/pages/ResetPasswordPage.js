import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const next = {};
    if (password.length < 8) next.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) next.confirmPassword = "Passwords don't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await authAPI.confirmPasswordReset({
        token,
        new_password: password,
        new_password_confirm: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const data = err?.response?.data;
      const message = data?.error
        || data?.non_field_errors?.[0]
        || data?.new_password?.[0]
        || data?.token?.[0]
        || 'This reset link is invalid or has expired. Please request a new one.';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
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
          <div className="mx-auto h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Set a new password</h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
            {success ? (
              <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-4 text-sm text-gray-700">
                  Your password has been reset. Redirecting you to sign in...
                </p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm pr-10 ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm new password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Re-enter your new password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-700">{errors.submit}</p>
                    <Link to="/forgot-password" className="text-sm font-medium text-red-600 hover:text-red-500 mt-1 inline-block">
                      Request a new link
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;

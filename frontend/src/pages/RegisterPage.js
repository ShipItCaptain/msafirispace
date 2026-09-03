import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import GuestSignupForm from '../components/auth/GuestSignupForm';

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading, error, clearAuthError } = useAuth();
  // Intended destination (if user was redirected to register/login from a protected page)
  const from = location.state?.from?.pathname || '/';
  // A referral link looks like /register?ref=CODE -- pre-fill the existing
  // referral_code field on the form with it (still editable/overridable).
  const referralCodeFromLink = new URLSearchParams(location.search).get('ref') || '';

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration always creates a plain guest account -- becoming a host
  // is a separate, later decision made through the "Become a Host"
  // onboarding wizard, not a choice made at signup time.
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    country: 'Kenya',
    city: '',
    referral_code: referralCodeFromLink
  });

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (data, agreedToTerms) => {
    const newErrors = {};

    if (!data.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (data.first_name.trim().length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    }

    if (!data.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (data.last_name.trim().length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    }

    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!data.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[0-9\s\-()]{10,}$/.test(data.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!data.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (data.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!data.confirm_password.trim()) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (data.password !== data.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    if (!data.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e, formDataToSubmit, agreedToTerms) => {
    e.preventDefault();

    if (!validateForm(formDataToSubmit, agreedToTerms)) return;

    setIsSubmitting(true);
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        password,
        confirm_password,
        referral_code,
      } = formDataToSubmit;

      const registrationData = {
        email,
        username: email, // backend falls back to email if not provided
        first_name,
        last_name,
        password,
        password_confirm: confirm_password,
        phone_number: phone,
        ...(referral_code ? { referral_code: referral_code.trim() } : {}),
      };

      await register(registrationData);
      // After registration (and auto login), redirect to intended page or home
      navigate(from, { replace: true });
    } catch (error) {
      // Map backend validation errors to local field errors for inline display
      const backend = error || {};
      const mapped = {};
      const pushFirst = (key, targetKey) => {
        const val = backend[key];
        if (!val) return;
        if (Array.isArray(val)) mapped[targetKey] = val[0];
        else if (typeof val === 'string') mapped[targetKey] = val;
      };

      // Common backend keys → local form fields
      pushFirst('email', 'email');
      pushFirst('username', 'email');
      pushFirst('first_name', 'first_name');
      pushFirst('last_name', 'last_name');
      pushFirst('phone_number', 'phone');
      pushFirst('password', 'password');
      pushFirst('password_confirm', 'confirm_password');
      pushFirst('city', 'city');
      pushFirst('country', 'country');

      // non_field_errors or generic detail/message at top
      if (Array.isArray(backend.non_field_errors) && backend.non_field_errors.length) {
        mapped.submit = backend.non_field_errors[0];
      } else if (backend.detail) {
        mapped.submit = backend.detail;
      } else if (backend.message) {
        mapped.submit = backend.message;
      }

      if (Object.keys(mapped).length) setErrors(prev => ({ ...prev, ...mapped }));
      console.error('Registration error:', backend);
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
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join Msafiri Space and start your journey
          </p>
        </div>

        {/* Registration Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
            <GuestSignupForm
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              handleInputChange={handleInputChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              isLoading={isLoading}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-6">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Registration Failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{typeof error === 'string' ? error : error?.detail || error?.message || 'An error occurred'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sign In Link */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  state={{ from: location.state?.from }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;

import React, { useState } from 'react';
import { getApiErrorDetails, paymentsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, booking, onPaymentSuccess }) => {
  const [selectedGateway, setSelectedGateway] = useState('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [intentReference, setIntentReference] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';

  const checkIntentStatus = async (reference, { silent = false } = {}) => {
    if (!reference) return false;
    setIsVerifying(true);
    try {
      const latestIntent = await paymentsAPI.getPaymentIntent(reference);
      if (latestIntent?.status === 'completed') {
        toast.success('Payment verified successfully.');
        onPaymentSuccess?.(latestIntent);
        onClose();
        return true;
      }
      if (!silent) {
        setInfoMessage('Payment not confirmed yet. We will keep checking shortly.');
      }
      return false;
    } catch (err) {
      const { fullMessage } = getApiErrorDetails(err, 'Could not verify payment status.');
      setError(fullMessage);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;

    setIsLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const paymentData = {
        booking_id: booking.id,
        gateway: selectedGateway,
        amount: booking.total_amount,
        ...(selectedGateway === 'mpesa' && { mpesa_phone: mpesaPhone })
      };

      const intent = await paymentsAPI.createPaymentIntent(paymentData);
      setIntentReference(intent.reference);
      
      if (selectedGateway === 'paystack') {
        // User completes card authorization on provider page, then webhook updates status.
        window.open(intent.paystack_authorization_url, '_blank');
        setInfoMessage('Complete card payment in the opened tab, then click "Check Payment Status".');
      } else if (selectedGateway === 'mpesa') {
        const message = `M-Pesa STK Push sent to ${mpesaPhone}. Please check your phone and enter your PIN.`;
        setInfoMessage(message);
        toast.success('M-Pesa prompt sent to your phone');
      }
      // Immediate check handles fast webhook callbacks.
      await checkIntentStatus(intent.reference, { silent: true });
    } catch (err) {
      const { fullMessage } = getApiErrorDetails(err, 'Payment failed. Please try again.');
      setError(fullMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!booking) return;

    setIsLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const paymentData = {
        booking_id: booking.id,
        gateway: selectedGateway,
        amount: booking.total_amount,
        ...(selectedGateway === 'mpesa' && { mpesa_phone: mpesaPhone })
      };

      const intent = await paymentsAPI.createPaymentIntent(paymentData);
      await paymentsAPI.simulatePaymentSuccess(intent.reference);
      await checkIntentStatus(intent.reference);
    } catch (err) {
      const { fullMessage } = getApiErrorDetails(err, 'Simulation failed. Please try again.');
      setError(fullMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const paymentOptions = [
    {
      value: 'mpesa',
      label: 'M-Pesa',
      description: 'Pay via STK push sent straight to your phone.',
    },
    {
      value: 'paystack',
      label: 'Paystack (Card)',
      description: 'Pay by card or mobile money.',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h2>

        {booking && (
          <div className="mb-5 border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Booking Summary</p>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-600">Amount due</span>
              <span className="text-lg font-bold text-gray-900">{booking.currency} {booking.total_amount}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
              <span>{booking.check_in}</span>
              <span className="text-gray-400">→</span>
              <span>{booking.check_out}</span>
            </div>
          </div>
        )}

        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Payment Method</p>
          <div className="space-y-3">
            {paymentOptions.map((option) => (
              <label
                key={option.value}
                className={`flex gap-3 border p-4 cursor-pointer ${
                  selectedGateway === option.value
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={selectedGateway === option.value}
                  onChange={(e) => setSelectedGateway(e.target.value)}
                  className="mt-1 h-4 w-4 accent-red-600"
                />
                <span className="flex-1">
                  <span className="block font-semibold text-gray-900">{option.label}</span>
                  <span className="mt-0.5 block text-sm text-gray-600">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {selectedGateway === 'mpesa' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">M-Pesa Phone Number</label>
            <input
              type="tel"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="254XXXXXXXXX"
              className="w-full border border-gray-300 p-2.5 focus:border-red-500 focus:outline-none focus:ring-0"
              required
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 border border-gray-200 bg-gray-50 text-gray-700 text-sm">
            {infoMessage}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handlePayment}
            disabled={isLoading || (selectedGateway === 'mpesa' && !mpesaPhone)}
            className="w-full bg-red-600 text-white py-3 px-4 font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? 'Processing...' : 'Pay Now'}
          </button>
          {intentReference && (
            <button
              onClick={() => checkIntentStatus(intentReference)}
              disabled={isVerifying}
              className="w-full border border-red-600 text-red-600 py-3 px-4 font-semibold hover:bg-red-50 disabled:opacity-60"
            >
              {isVerifying ? 'Checking...' : 'Check Payment Status'}
            </button>
          )}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full border border-gray-300 text-gray-700 py-2.5 px-4 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {isDev && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSimulateSuccess}
              disabled={isLoading || (selectedGateway === 'mpesa' && !mpesaPhone)}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Simulate Success (Dev)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
        
        {booking && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold">Booking Summary</h3>
            <p>Amount: {booking.currency} {booking.total_amount}</p>
            <p>Check-in: {booking.check_in}</p>
            <p>Check-out: {booking.check_out}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="mpesa"
                checked={selectedGateway === 'mpesa'}
                onChange={(e) => setSelectedGateway(e.target.value)}
                className="mr-2"
              />
              M-Pesa
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="paystack"
                checked={selectedGateway === 'paystack'}
                onChange={(e) => setSelectedGateway(e.target.value)}
                className="mr-2"
              />
              Paystack (Card)
            </label>
          </div>
        </div>

        {selectedGateway === 'mpesa' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">M-Pesa Phone Number</label>
            <input
              type="tel"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="254XXXXXXXXX"
              className="w-full p-2 border rounded"
              required
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded border border-blue-200">
            {infoMessage}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isLoading || (selectedGateway === 'mpesa' && !mpesaPhone)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Pay Now'}
          </button>
          {intentReference && (
            <button
              onClick={() => checkIntentStatus(intentReference)}
              disabled={isVerifying}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isVerifying ? 'Checking...' : 'Check Payment Status'}
            </button>
          )}
        </div>

        {isDev && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSimulateSuccess}
              disabled={isLoading || (selectedGateway === 'mpesa' && !mpesaPhone)}
              className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
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

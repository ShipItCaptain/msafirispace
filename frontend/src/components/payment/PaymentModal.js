import React, { useState } from 'react';
import { paymentsAPI } from '../../services/api';

const PaymentModal = ({ isOpen, onClose, booking, onPaymentSuccess }) => {
  const [selectedGateway, setSelectedGateway] = useState('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!booking) return;

    setIsLoading(true);
    setError('');

    try {
      const paymentData = {
        booking_id: booking.id,
        gateway: selectedGateway,
        amount: booking.total_amount,
        ...(selectedGateway === 'mpesa' && { mpesa_phone: mpesaPhone })
      };

      const intent = await paymentsAPI.createPaymentIntent(paymentData);
      
      if (selectedGateway === 'paystack') {
        // Redirect to Paystack
        window.open(intent.paystack_authorization_url, '_blank');
      } else if (selectedGateway === 'mpesa') {
        // Show M-Pesa instructions
        alert(`M-Pesa STK Push sent to ${mpesaPhone}. Please check your phone and enter your PIN.`);
      }

      onPaymentSuccess?.(intent);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.');
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
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

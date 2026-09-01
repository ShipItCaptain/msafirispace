import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentIcon, GiftIcon, UsersIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../../services/api';

const ReferralsPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await authAPI.getReferralStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load referral stats:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCopy = async () => {
    if (!stats?.referral_link) return;
    try {
      await navigator.clipboard.writeText(stats.referral_link);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading referrals...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12 text-gray-500">Could not load your referral info.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Refer Friends</h2>
        <p className="text-gray-600 mt-1">Share your link. Anyone who signs up through it counts toward your referrals.</p>
      </div>

      {stats.referred_by && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          You joined via a referral from <span className="font-semibold">{stats.referred_by}</span>.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-3">
          <GiftIcon className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-gray-900">Your referral link</h3>
        </div>
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            readOnly
            value={stats.referral_link}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap"
          >
            <ClipboardDocumentIcon className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Or share your code directly: <span className="font-mono font-semibold">{stats.referral_code}</span></p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <UsersIcon className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-gray-900">
            People you've referred ({stats.referred_count})
          </h3>
        </div>
        {stats.referred_users.length === 0 ? (
          <p className="text-sm text-gray-500">No one has signed up with your link yet. Share it to get started!</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.referred_users.map((referred, index) => (
              <div key={index} className="py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{referred.name}</span>
                <span className="text-xs text-gray-500">
                  Joined {new Date(referred.joined_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsPanel;

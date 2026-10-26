import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FireIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { promotionsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const TABS = [
  { type: 'trending', label: 'Trending Now', icon: FireIcon },
  { type: 'last_minute', label: 'Last Minute Deals', icon: ClockIcon },
  { type: 'local_favorites', label: 'Local Favorites', icon: MapPinIcon },
];

const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%25" height="100%25" fill="%23e5e7eb"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">No image</text></svg>';

const DealsSection = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('trending');
  const [dealsByType, setDealsByType] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(TABS.map((tab) => promotionsAPI.getActivePromotions(tab.type)));
        const next = {};
        TABS.forEach((tab, index) => {
          next[tab.type] = Array.isArray(results[index]) ? results[index] : [];
        });
        setDealsByType(next);
      } catch (err) {
        console.error('Failed to load promotions:', err);
        setDealsByType({});
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const hasAnyDeals = TABS.some((tab) => (dealsByType[tab.type] || []).length > 0);

  if (loading || !hasAnyDeals) {
    return null;
  }

  const activeDeals = dealsByType[activeTab] || [];

  const handleDealClick = (promotionId) => {
    if (isAuthenticated) {
      promotionsAPI.trackPromotionClick(promotionId).catch(() => {});
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Deals For You</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Limited-time offers from hotels across the region.
            </p>
          </motion.div>
        </div>

        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = (dealsByType[tab.type] || []).length;
            if (count === 0) return null;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => setActiveTab(tab.type)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  activeTab === tab.type
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-red-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeDeals.map((deal, index) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              viewport={{ once: true }}
            >
              <Link
                to={`/hotel/${deal.hotel}`}
                onClick={() => handleDealClick(deal.id)}
                className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100"
              >
                <div className="relative">
                  <img
                    src={deal.hotel_image || FALLBACK_IMAGE}
                    alt={deal.title}
                    className="w-full h-44 object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    -{deal.discount_percentage}%
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{deal.title}</h3>
                  <p className="text-sm text-gray-500">{deal.hotel_name} &middot; {deal.hotel_city}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {deal.currency} {Number(deal.discounted_price).toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {Number(deal.original_price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealsSection;

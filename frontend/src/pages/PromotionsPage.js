import React, { useState, useEffect, useCallback } from 'react';
import { promotionsAPI } from '../services/api';

const PromotionsPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('trending');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromotion, setNewPromotion] = useState({
    hotel_id: '',
    promotion_type: 'trending',
    title: '',
    description: '',
    original_price: '',
    discounted_price: '',
    start_date: '',
    end_date: ''
  });

  const fetchPromotions = useCallback(async () => {
    try {
      const data = await promotionsAPI.getActivePromotions(selectedType);
      setPromotions(data);
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleCreatePromotion = async (e) => {
    e.preventDefault();
    try {
      const discountPercentage = Math.round(((newPromotion.original_price - newPromotion.discounted_price) / newPromotion.original_price) * 100);
      const promotionData = {
        ...newPromotion,
        discount_percentage: discountPercentage,
        currency: 'KES'
      };
      
      await promotionsAPI.createPromotion(promotionData);
      setShowCreateForm(false);
      setNewPromotion({
        hotel_id: '',
        promotion_type: 'trending',
        title: '',
        description: '',
        original_price: '',
        discounted_price: '',
        start_date: '',
        end_date: ''
      });
      fetchPromotions();
    } catch (err) {
      console.error('Failed to create promotion:', err);
    }
  };

  const handleTrackClick = async (promotionId) => {
    try {
      await promotionsAPI.trackPromotionClick(promotionId);
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  const getPromotionTypeColor = (type) => {
    switch (type) {
      case 'trending': return 'text-purple-600 bg-purple-100';
      case 'last_minute': return 'text-red-600 bg-red-100';
      case 'local_favorites': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-14 lg:pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading promotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Promotions</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Promotion
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex space-x-4 mb-8">
          {['trending', 'last_minute', 'local_favorites'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded capitalize ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Create Promotion Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Promotion</h2>
              <form onSubmit={handleCreatePromotion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Promotion Type</label>
                  <select
                    value={newPromotion.promotion_type}
                    onChange={(e) => setNewPromotion({...newPromotion, promotion_type: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="trending">Trending Now</option>
                    <option value="last_minute">Last Minute Deals</option>
                    <option value="local_favorites">Local Favorites</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Hotel ID</label>
                  <input
                    type="number"
                    value={newPromotion.hotel_id}
                    onChange={(e) => setNewPromotion({...newPromotion, hotel_id: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={newPromotion.title}
                    onChange={(e) => setNewPromotion({...newPromotion, title: e.target.value})}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newPromotion.description}
                    onChange={(e) => setNewPromotion({...newPromotion, description: e.target.value})}
                    className="w-full p-2 border rounded h-24"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Original Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPromotion.original_price}
                      onChange={(e) => setNewPromotion({...newPromotion, original_price: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Discounted Price (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPromotion.discounted_price}
                      onChange={(e) => setNewPromotion({...newPromotion, discounted_price: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={newPromotion.start_date}
                      onChange={(e) => setNewPromotion({...newPromotion, start_date: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={newPromotion.end_date}
                      onChange={(e) => setNewPromotion({...newPromotion, end_date: e.target.value})}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create Promotion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map(promotion => (
            <div
              key={promotion.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              onClick={() => handleTrackClick(promotion.id)}
            >
              {promotion.hotel_image && (
                <img
                  src={promotion.hotel_image}
                  alt={promotion.title}
                  className="w-full h-48 object-cover"
                />
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">{promotion.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPromotionTypeColor(promotion.promotion_type)}`}>
                    {promotion.promotion_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{promotion.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hotel:</span>
                    <span className="text-gray-900">{promotion.hotel_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location:</span>
                    <span className="text-gray-900">{promotion.hotel_city}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Price:</span>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-green-600">
                        KES {promotion.discounted_price}
                      </span>
                      <span className="text-sm text-gray-500 line-through ml-2">
                        KES {promotion.original_price}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount:</span>
                    <span className="text-red-600 font-semibold">
                      {promotion.discount_percentage}% OFF
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {promotion.views_count} views • {promotion.clicks_count} clicks
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {promotions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No {selectedType.replace('_', ' ')} promotions found</p>
            <p className="text-gray-500 mt-2">Create a promotion to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionsPage;

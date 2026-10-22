import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { bnbAPI } from '../../services/api';
import BnBCard from './BnBCard';

const FeaturedBnBs = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBnBs = async () => {
      try {
        setLoading(true);
        const data = await bnbAPI.getListings({ limit: 8 });
        const items = Array.isArray(data?.results) ? data.results : data;
        setListings(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Error fetching BnB listings:', err);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBnBs();
  }, []);

  if (!loading && listings.length === 0) return null;

  return (
    <section className="py-12 sm:py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Popular stays</h2>
          <Link to="/bnbs" className="text-sm font-semibold text-gray-900 hover:text-red-600">
            Show all
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8" aria-busy="true">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="mt-2 h-4 w-3/4 bg-gray-200" />
                <div className="mt-1 h-3 w-1/2 bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-8"
          >
            {listings.slice(0, 4).map((listing) => (
              <BnBCard key={listing.id} listing={listing} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default FeaturedBnBs;

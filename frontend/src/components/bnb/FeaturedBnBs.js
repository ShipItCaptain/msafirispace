import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { bnbAPI } from '../../services/api';
import BnBCard from './BnBCard';

const FeaturedBnBs = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBnBs = async () => {
      try {
        setLoading(true);
        const data = await bnbAPI.getListings({ limit: 8 });
        // API may return {results: [...]} or a bare array
        const items = Array.isArray(data?.results) ? data.results : data;
        setListings(items || []);
      } catch (err) {
        console.error('Error fetching BnB listings:', err);
        setError('Failed to load BnB listings');
      } finally {
        setLoading(false);
      }
    };

    fetchBnBs();
  }, []);

  if (loading) {
    return null;
  }

  if (error || !listings.length) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-gray-900"
          >
            Popular BnB stays
          </motion.h2>
          <p className="mt-3 text-gray-600 text-sm md:text-base">
            Real homes and apartments hosted by our community.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {listings.slice(0, 8).map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <BnBCard listing={listing} />
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 text-center">
          <Link
            to="/bnbs"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
          >
            View all BnBs
            <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBnBs;


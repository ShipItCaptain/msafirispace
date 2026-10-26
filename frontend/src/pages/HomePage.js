import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FeaturedHotels from '../components/hotel/FeaturedHotels';
import FeaturedBnBs from '../components/bnb/FeaturedBnBs';
import DealsSection from '../components/promotions/DealsSection';

const DESTINATIONS = [
  {
    name: 'Nairobi',
    image: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Mombasa',
    image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Kisumu',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Diani',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('stays'); // stays | hotels
  const [where, setWhere] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');

  const searchPath = mode === 'hotels' ? '/hotels' : '/bnbs';

  const buildParams = (overrides = {}) => {
    const params = new URLSearchParams();
    const nextWhere = overrides.where ?? where;
    const nextCheckIn = overrides.checkIn ?? checkIn;
    const nextCheckOut = overrides.checkOut ?? checkOut;
    const nextGuests = overrides.guests ?? guests;
    if (nextWhere.trim()) {
      params.set('where', nextWhere.trim());
      params.set('city', nextWhere.trim());
    }
    if (nextCheckIn) params.set('check_in', nextCheckIn);
    if (nextCheckOut) params.set('check_out', nextCheckOut);
    if (nextGuests) params.set('guests', nextGuests);
    return params.toString();
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const qs = buildParams();
    navigate(qs ? `${searchPath}?${qs}` : searchPath);
  };

  const goDestination = (city) => {
    const path = mode === 'hotels' ? '/hotels' : '/bnbs';
    navigate(`${path}?city=${encodeURIComponent(city)}&where=${encodeURIComponent(city)}`);
  };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="min-h-screen bg-white">
      {/* Search-first hero: no image, thin on every breakpoint */}
      <section className="border-b border-gray-100 px-4 sm:px-6 lg:px-8 pt-20 pb-8 sm:pb-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="inline-flex mb-3 border border-gray-200 bg-gray-50 p-0.5 rounded-full" role="group" aria-label="Search type">
            {[
              { id: 'stays', label: 'Stays' },
              { id: 'hotels', label: 'Hotels' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  mode === item.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Mobile: single thin pill, quick search only. Refine dates/guests on results. */}
            <label className="sm:hidden flex items-center gap-2 w-full rounded-full border border-gray-300 shadow-sm px-4 py-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 shrink-0" />
              <input
                type="search"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Where are you going?"
                className="w-full border-0 p-0 text-sm text-gray-900 placeholder:text-gray-500 focus:ring-0"
                aria-label="Where"
              />
              <button
                type="submit"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white"
                aria-label="Search"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </label>

            {/* Desktop/tablet: full Airbnb-style grouped pill */}
            <div className="hidden sm:flex items-stretch w-full max-w-3xl rounded-full border border-gray-300 shadow-sm divide-x divide-gray-200 overflow-hidden">
              <label className="flex-[1.3] px-5 py-2.5 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Where</span>
                <input
                  type="search"
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  placeholder="Search destinations"
                  className="mt-0.5 w-full border-0 p-0 text-sm text-gray-900 placeholder:text-gray-500 focus:ring-0"
                  aria-label="Where"
                />
              </label>
              <label className="flex-1 px-5 py-2.5 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Check-in</span>
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-0.5 w-full border-0 p-0 text-sm text-gray-900 focus:ring-0"
                  aria-label="Check-in"
                />
              </label>
              <label className="flex-1 px-5 py-2.5 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Check-out</span>
                <input
                  type="date"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-0.5 w-full border-0 p-0 text-sm text-gray-900 focus:ring-0"
                  aria-label="Check-out"
                />
              </label>
              <label className="flex-[0.7] px-5 py-2.5 text-left">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Guests</span>
                <input
                  type="number"
                  min="1"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="Any"
                  className="mt-0.5 w-full border-0 p-0 text-sm text-gray-900 focus:ring-0"
                  aria-label="Guests"
                />
              </label>
              <div className="flex items-center pr-2">
                <button
                  type="submit"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                  aria-label="Search"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </section>

      {/* Inspiration destinations */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Inspiration</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {DESTINATIONS.map((dest, index) => (
              <motion.button
                key={dest.name}
                type="button"
                onClick={() => goDestination(dest.name)}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="group relative aspect-[4/5] overflow-hidden text-left"
              >
                <img
                  src={dest.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 text-white text-lg font-semibold">
                  {dest.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <FeaturedBnBs />
      <FeaturedHotels />
      <DealsSection />

      <footer className="border-t border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Host your place on Msafiri Space
          </p>
          <Link to="/become-host" className="text-sm font-semibold text-red-600 hover:text-red-700">
            Get started →
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import FeaturedHotels from '../components/hotel/FeaturedHotels';
import FeaturedBnBs from '../components/bnb/FeaturedBnBs';
import DealsSection from '../components/promotions/DealsSection';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2400&q=80';

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
      {/* Full-bleed hero */}
      <section className="relative min-h-[78vh] lg:min-h-[88vh] flex flex-col">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/50" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-4xl mx-auto w-full text-center">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-serif text-5xl sm:text-6xl lg:text-7xl tracking-tight text-white"
            >
              Msafiri <span className="text-red-400">Space</span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-3 text-base sm:text-lg text-white/85"
            >
              Stays across East Africa
            </motion.p>

            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.16 }}
              className="mt-8 sm:mt-10 mx-auto w-full max-w-3xl"
            >
              <div className="inline-flex mb-3 border border-white/30 bg-black/25 p-0.5 backdrop-blur-sm" role="group" aria-label="Search type">
                {[
                  { id: 'stays', label: 'Stays' },
                  { id: 'hotels', label: 'Hotels' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    aria-pressed={mode === item.id}
                    className={`px-4 py-1.5 text-sm font-medium ${
                      mode === item.id ? 'bg-white text-gray-900' : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="bg-white border border-white/20 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto]">
                  <label className="px-4 py-3 text-left border-b sm:border-b lg:border-b-0 sm:border-r border-gray-200">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Where</span>
                    <input
                      type="search"
                      value={where}
                      onChange={(e) => setWhere(e.target.value)}
                      placeholder="Search destinations"
                      className="mt-0.5 w-full border-0 p-0 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0"
                      aria-label="Where"
                    />
                  </label>
                  <label className="px-4 py-3 text-left border-b lg:border-b-0 lg:border-r border-gray-200">
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
                  <label className="px-4 py-3 text-left border-b sm:border-b-0 lg:border-r border-gray-200">
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
                  <label className="px-4 py-3 text-left border-b sm:border-b-0 sm:border-r lg:border-r border-gray-200">
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
                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 sm:col-span-2 lg:col-span-1"
                  >
                    Search
                  </button>
                </div>
              </div>
            </motion.form>
          </div>
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

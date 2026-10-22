import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../common/SEO';

const Layout = ({ children, title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-white"
    >
      <SEO title={title} description={description} />
      <main className="flex-1">
        {children}
      </main>
    </motion.div>
  );
};

export default Layout;

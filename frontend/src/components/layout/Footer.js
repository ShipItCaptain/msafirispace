import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Only the browse entry points carry a footer -- booking flows, dashboards,
// and auth pages don't need site-wide links competing for attention.
const FOOTER_PATHS = new Set(['/', '/hotels', '/bnbs']);

const FOOTER_LINKS = {
  Explore: [
    { name: 'Home', href: '/' },
    { name: 'Hotels', href: '/hotels' },
    { name: 'BnBs', href: '/bnbs' },
  ],
  Hosting: [
    { name: 'Become a Host', href: '/become-host' },
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
};

const Footer = () => {
  const location = useLocation();
  if (!FOOTER_PATHS.has(location.pathname)) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{heading}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-150"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="text-sm text-gray-500">
              © {currentYear} Msafiri Space
            </span>
          </div>
          <span className="text-sm text-gray-500">Kenya · KES</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

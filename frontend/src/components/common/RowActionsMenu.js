import React, { useEffect, useRef, useState } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/20/solid';

const TONE_CLASSES = {
  default: 'text-gray-700 hover:bg-gray-50',
  danger: 'text-red-600 hover:bg-red-50',
};

// Hidden until the row is hovered/focused, then reveals a single kebab
// trigger that opens a dropdown -- replaces a row of always-visible text
// links, which gets noisy repeated down every row of a long table.
const RowActionsMenu = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  return (
    <div
      ref={ref}
      className="relative inline-block opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[open=true]:opacity-100 transition-opacity"
      data-open={open}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <EllipsisHorizontalIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60 py-1"
        >
          {visibleActions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => { setOpen(false); action.onClick(); }}
              className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${TONE_CLASSES[action.tone || 'default']}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RowActionsMenu;

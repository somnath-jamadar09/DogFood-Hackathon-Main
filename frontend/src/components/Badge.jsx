import React from 'react';

const variants = {
  success: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  warning: 'bg-amber-950 text-amber-400 border-amber-800',
  danger:  'bg-rose-950 text-rose-400 border-rose-800',
  info:    'bg-blue-950 text-blue-400 border-blue-800',
  muted:   'bg-gray-800 text-gray-400 border-gray-700',
  default: 'bg-surface-raised text-gray-300 border-border-subtle',
};

const dotColors = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-rose-400',
  info:    'bg-blue-400',
  muted:   'bg-gray-500',
  default: 'bg-gray-400',
};

export const Badge = ({ children, variant = 'default', dot = false, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold font-mono border ${variants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

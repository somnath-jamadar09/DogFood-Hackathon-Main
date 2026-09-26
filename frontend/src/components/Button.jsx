import React from 'react';

const variants = {
  primary:
    'bg-blue-600 hover:bg-blue-500 text-white shadow-glow border border-blue-500/30 disabled:bg-blue-900 disabled:text-blue-400 disabled:border-blue-800',
  secondary:
    'bg-surface-raised hover:bg-surface-raised/80 text-gray-200 border border-border-subtle hover:border-gray-500 disabled:text-gray-500',
  danger:
    'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-700/50 hover:border-rose-600 disabled:text-rose-800',
  ghost:
    'bg-transparent hover:bg-surface-raised text-gray-300 hover:text-white border border-transparent disabled:text-gray-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-base rounded-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  id,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-canvas disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
};

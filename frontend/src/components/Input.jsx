import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  id,
  label,
  error,
  helper,
  icon: Icon,
  className = '',
  type = 'text',
  disabled = false,
  required = false,
  ...rest
}, ref) => {
  return (
    <div className="flex flex-col space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          required={required}
          className={`w-full bg-surface-sunken border rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-9' : ''}
            ${error ? 'border-rose-600 focus:ring-rose-500/50 focus:border-rose-500' : 'border-border-subtle hover:border-gray-500'}
            ${className}`}
          {...rest}
        />
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
});

Input.displayName = 'Input';

import React from 'react';

export const Card = ({ children, header, footer, className = '', noPadding = false, ...rest }) => {
  return (
    <div
      className={`bg-surface border border-border-subtle rounded-xl shadow-card ${className}`}
      {...rest}
    >
      {header && (
        <div className="px-5 py-4 border-b border-border-subtle">{header}</div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-border-subtle bg-surface-raised/30 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
};

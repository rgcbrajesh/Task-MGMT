import React from 'react';
import { clsx } from 'clsx';

const TextArea = ({
  label,
  error,
  help,
  className,
  required,
  rows = 3,
  ...props
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={clsx(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {help && !error && (
        <p className="text-sm text-gray-500">{help}</p>
      )}
    </div>
  );
};

export default TextArea;
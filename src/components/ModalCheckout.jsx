// src/components/ModalCheckout.jsx
import React from 'react';

export default function ModalCheckout({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black opacity-30"
        onClick={onClose}
      />
      {/* Modal container */}
      <div className="relative bg-white rounded-lg shadow-xl w-11/12 max-w-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="max-h-80 overflow-y-auto mb-4">{children}</div>
        {/* Footer */}
        {footer && <div className="flex justify-end space-x-2">{footer}</div>}
      </div>
    </div>
  );
}

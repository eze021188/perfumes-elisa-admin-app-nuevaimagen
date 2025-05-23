// src/components/ModalCheckout.jsx
import React from 'react';
import { X } from 'lucide-react';

export default function ModalCheckout({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal container */}
      <div className="relative bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-11/12 max-w-lg p-6 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h3 className="text-lg font-medium text-gray-100">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mb-4">{children}</div>
        {/* Footer */}
        {footer && <div className="flex justify-end space-x-3 pt-3 border-t border-dark-700">{footer}</div>}
      </div>
    </div>
  );
}
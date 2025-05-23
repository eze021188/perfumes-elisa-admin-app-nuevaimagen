// src/components/CartSummaryFooter.jsx
import React from 'react';
import { ChevronRight, ShoppingCart } from 'lucide-react';

export default function CartSummaryFooter({ totalItems, totalAmount, onCheckout }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary-900/90 backdrop-blur-sm text-white p-4 flex justify-between items-center border-t border-primary-800/50 shadow-lg">
      <div className="flex items-center">
        <ShoppingCart size={20} className="mr-2 text-primary-300" />
        <span className="font-semibold">
          {totalItems} items = ${totalAmount.toFixed(2)}
        </span>
      </div>
      <button
        onClick={onCheckout}
        aria-label="Finalizar venta"
        className="p-2 bg-primary-700 rounded-full hover:bg-primary-600 transition-colors shadow-md"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
// src/components/CartSummaryFooter.jsx
import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function CartSummaryFooter({ totalItems, totalAmount, onCheckout }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-teal-500 text-white p-4 flex justify-between items-center">
      <span className="font-semibold">
        {totalItems} items = ${totalAmount.toFixed(2)}
      </span>
      <button
        onClick={onCheckout}
        aria-label="Finalizar venta"
        className="p-2 bg-teal-600 rounded-full hover:bg-teal-700"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

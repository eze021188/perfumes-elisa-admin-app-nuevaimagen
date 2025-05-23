// src/components/checkout/CheckoutCartDisplay.jsx
import React from 'react';
import { Trash2 } from 'lucide-react';

// Helper simple para formatear moneda
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('es-CO', {
       style: 'currency',
       currency: 'COP',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function CheckoutCartDisplay({
    productosVenta,
    onUpdateQuantity,
    onRemoveFromCart,
    processing
}) {
    if (productosVenta.length === 0) {
        return <p className="text-gray-400">No hay productos en la venta.</p>;
    }

    return (
        <div className="mb-4 max-h-60 overflow-y-auto pr-2">
            <h4 className="text-md font-semibold mb-3 text-gray-100">Productos en el Carrito:</h4>
            <ul className="space-y-2">
                {productosVenta.map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm text-gray-200 border-b border-dark-700 pb-2 last:border-b-0">
                        <div className="flex-1 mr-2 min-w-0">
                            <span className="font-medium block truncate">{p.nombre}</span>
                            <div className="text-xs text-gray-400">{formatCurrency(p.promocion ?? 0)} c/u</div>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="number"
                                min="1"
                                value={p.cantidad}
                                onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                className="w-12 text-center bg-dark-900 border border-dark-700 rounded-md mr-2 text-sm py-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                                disabled={processing}
                            />
                            <span className="font-semibold w-20 text-right mr-2 text-gray-200">{formatCurrency(p.total ?? 0)}</span>
                            <button
                                onClick={() => onRemoveFromCart(p.id)}
                                className="ml-2 text-gray-400 hover:text-error-400 disabled:opacity-50 transition-colors"
                                disabled={processing}
                                title="Eliminar producto"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
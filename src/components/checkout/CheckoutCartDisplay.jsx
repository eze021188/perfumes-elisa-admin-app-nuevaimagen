// src/components/checkout/CheckoutCartDisplay.jsx
import React from 'react';

// Helper simple para formatear moneda (debe ser consistente con el resto de tu app)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('es-CO', { // Ajusta 'es-CO' y 'COP' si es necesario
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
        return <p className="text-gray-600">No hay productos en la venta.</p>;
    }

    return (
        <div className="mb-4 max-h-60 overflow-y-auto pr-2"> {/* Ajustado max-h para dar espacio a otros elementos */}
            <h4 className="text-md font-semibold mb-2 text-gray-800">Productos en el Carrito:</h4>
            <ul className="space-y-2">
                {productosVenta.map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm text-gray-800 border-b pb-2 last:border-b-0">
                        <div className="flex-1 mr-2 min-w-0"> {/* min-w-0 para truncar correctamente */}
                            <span className="font-medium block truncate">{p.nombre}</span>
                            <div className="text-xs text-gray-500">{formatCurrency(p.promocion ?? 0)} c/u</div>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="number"
                                min="1"
                                value={p.cantidad}
                                onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                className="w-12 text-center border rounded-md mr-2 text-sm py-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={processing}
                            />
                            <span className="font-semibold w-20 text-right mr-2">{formatCurrency(p.total ?? 0)}</span>
                            <button
                                onClick={() => onRemoveFromCart(p.id)}
                                className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                                disabled={processing}
                                title="Eliminar producto"
                            >
                                &#x2715; {/* Símbolo X más claro */}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

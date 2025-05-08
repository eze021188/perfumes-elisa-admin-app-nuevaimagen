// src/components/ProductCard.jsx
import React from 'react';

export default function ProductCard({ producto, onClick, showStock = false }) {
  // Protege contra props nulos o indefinidos
  if (!producto) return null;

  // Asegura valores numéricos por defecto
  const promocion = Number(producto.promocion) || 0;
  const precioOriginal = producto.precioOriginal != null ? Number(producto.precioOriginal) : null;
  const stock = producto.stock != null ? producto.stock : null;
  const stockMinimo = producto.stockMinimo != null ? producto.stockMinimo : 0;

  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-lg overflow-hidden shadow cursor-pointer w-full"
      style={{ aspectRatio: '1 / 1' }}
    >
      <img
        src={producto.imagenUrl || producto.imagen || ''}
        alt={producto.nombre || ''}
        className="w-full h-full object-cover"
      />

      {/* Indicador de stock mínimo */}
      {stock !== null && stock <= stockMinimo && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Información inferior */}
      <div className="absolute bottom-0 left-0 w-full bg-gray-800 bg-opacity-75 p-1 text-xs">
        <p className="text-white font-medium truncate">{producto.nombre || '—'}</p>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline space-x-1">
            <span className="text-white font-semibold">
              ${promocion.toFixed(2)}
            </span>
            {precioOriginal !== null && (
              <span className="text-gray-400 line-through">
                ${precioOriginal.toFixed(2)}
              </span>
            )}
          </div>
          {/* Mostrar stock si showStock es true */}
          {showStock && stock !== null && (
            <span className="text-gray-200 text-xs">
              Stock: {stock}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
  
// src/components/ProductCard.jsx
import React from 'react';

export default function ProductCard({ producto, onClick, showStock = false }) {
  return (
    <div
      onClick={onClick}
      className="relative bg-white rounded-lg overflow-hidden shadow cursor-pointer w-full"
      style={{ aspectRatio: '1 / 1' }}
    >
      <img
        src={producto.imagenUrl || producto.imagen}
        alt={producto.nombre}
        className="w-full h-full object-cover"
      />

      {/* Indicador de stock mínimo */}
      {producto.stock !== undefined && producto.stock <= (producto.stockMinimo ?? 0) && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Información inferior */}
      <div className="absolute bottom-0 left-0 w-full bg-gray-800 bg-opacity-75 p-1 text-xs">
        <p className="text-white font-medium truncate">{producto.nombre}</p>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline space-x-1">
            <span className="text-white font-semibold">
              ${producto.promocion.toFixed(2)}
            </span>
            {producto.precioOriginal != null && (
              <span className="text-gray-400 line-through">
                ${producto.precioOriginal.toFixed(2)}
              </span>
            )}
          </div>
          {/* Mostrar stock si showStock es true */}
          {showStock && producto.stock !== undefined && (
            <span className="text-gray-200 text-xs">
              Stock: {producto.stock}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

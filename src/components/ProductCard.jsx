// src/components/ProductCard.jsx
import React from 'react';

export default function ProductCard({ producto, onClick }) {
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

      {/* Badge de stock crítico o nuevo */}
      {producto.stock !== undefined && producto.stock <= (producto.stockMinimo ?? 0) && (
        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full" />
      )}

      {/* Overlay con nombre y precios */}
      <div className="absolute bottom-0 left-0 w-full bg-gray-800 bg-opacity-75 p-2">
        <p className="text-white font-semibold truncate">
          {producto.nombre}
        </p>
        <div className="flex items-baseline space-x-2">
          <span className="text-white font-bold">
            ${producto.promocion.toFixed(2)}
          </span>
          {producto.precioOriginal != null && (
            <span className="text-gray-400 line-through text-sm">
              ${producto.precioOriginal.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

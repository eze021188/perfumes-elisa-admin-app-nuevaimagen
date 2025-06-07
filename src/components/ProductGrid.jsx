// src/components/ProductGrid.jsx
import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ productos, onAddToCart, showStock = false }) {
  if (productos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <p className="text-gray-400">No hay productos que coincidan con los criterios de búsqueda</p>
      </div>
    );
  }
  
  return (
    // CAMBIO CLAVE AQUÍ:
    // Por defecto (en pantallas pequeñas), el contenedor es un 'flex flex-col' para que se apilen uno por uno en filas.
    // A partir del breakpoint 'sm' (que es donde antes tenías 'grid-cols-2'), aplicamos las clases de cuadrícula originales.
    // Esto significa:
    // - En dispositivos MUY PEQUEÑOS (menos de 'sm' breakpoint), será una sola columna (flex-col).
    // - En 'sm' y superiores, se activará tu diseño de cuadrícula original.
    <div className="flex flex-col space-y-3 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-dark-800/50 rounded-lg border border-dark-700/50">
      {productos.map((p) => (
        <ProductCard
          key={p.id}
          producto={p}
          onClick={() => onAddToCart(p)}
          showStock={showStock}
          isResponsiveLayout={true} 
        />
      ))}
    </div>
  );
}
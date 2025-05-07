// src/components/ProductGrid.jsx
import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ productos, onAddToCart }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-6 gap-1 p-1">
      {productos.map((p) => (
        <ProductCard
          key={p.id}
          producto={p}
          onClick={() => onAddToCart(p)}
        />
      ))}
    </div>
  );
}

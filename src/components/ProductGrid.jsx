// src/components/ProductGrid.jsx
import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ productos, onAddToCart }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2">
      {productos.map(p => (
        <ProductCard key={p.id} producto={p} onClick={() => onAddToCart(p)} />
      ))}
    </div>
  );
}

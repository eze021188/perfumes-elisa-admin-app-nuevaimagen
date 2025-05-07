// src/components/ProductGrid.jsx
import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ productos, onAddToCart }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {productos.map(p => (
        <ProductCard key={p.id} producto={p} onClick={() => onAddToCart(p)} />
      ))}
    </div>
  );
}

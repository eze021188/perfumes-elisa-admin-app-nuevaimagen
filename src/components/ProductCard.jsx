// src/components/ProductCard.jsx
import React from 'react';
import { ShoppingCart, AlertTriangle } from 'lucide-react';

export default function ProductCard({ producto, onClick, showStock = false }) {
  // Protege contra props nulos o indefinidos
  if (!producto) return null;

  // Asegura valores numéricos por defecto
  const promocion = Number(producto.promocion) || 0;
  const precioOriginal = producto.precioOriginal != null ? Number(producto.precioOriginal) : null;
  const stock = producto.stock != null ? producto.stock : null;
  const stockMinimo = producto.stockMinimo != null ? producto.stockMinimo : 0;
  
  const lowStock = stock !== null && stock <= stockMinimo;
  const noStock = stock !== null && stock <= 0;

  return (
    <div
      onClick={onClick}
      className={`relative bg-dark-800 rounded-lg overflow-hidden shadow-card-dark cursor-pointer w-full border border-dark-700/50 transition-all duration-300 ${noStock ? 'opacity-60' : 'hover:scale-[1.03] hover:shadow-dropdown-dark'}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent opacity-60"></div>
      
      <img
        src={producto.imagenUrl || producto.imagen || 'https://via.placeholder.com/150?text=Sin+Imagen'}
        alt={producto.nombre || ''}
        className="w-full h-full object-cover"
      />

      {/* Indicador de stock mínimo */}
      {lowStock && (
        <div className="absolute top-2 right-2 bg-warning-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <AlertTriangle size={12} className="mr-1" />
          {noStock ? 'Sin stock' : 'Bajo stock'}
        </div>
      )}

      {/* Información inferior */}
      <div className="absolute bottom-0 left-0 w-full p-3 bg-dark-900/90 backdrop-blur-sm">
        <p className="text-gray-100 font-medium truncate mb-1">{producto.nombre || '—'}</p>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline space-x-1">
            <span className="text-white font-semibold">
              ${promocion.toFixed(2)}
            </span>
            {precioOriginal !== null && (
              <span className="text-gray-500 line-through text-xs">
                ${precioOriginal.toFixed(2)}
              </span>
            )}
          </div>
          {/* Mostrar stock si showStock es true */}
          {showStock && stock !== null && (
            <span className={`text-xs ${noStock ? 'text-error-400' : 'text-gray-400'}`}>
              Stock: {stock}
            </span>
          )}
        </div>
        
        {/* Botón de agregar al carrito */}
        <button 
          className={`mt-2 w-full py-1.5 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
            noStock 
              ? 'bg-dark-700 text-gray-500 cursor-not-allowed' 
              : 'bg-primary-600/80 text-white hover:bg-primary-600'
          }`}
          disabled={noStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!noStock) onClick();
          }}
        >
          <ShoppingCart size={14} className="mr-1" />
          {noStock ? 'Sin stock' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
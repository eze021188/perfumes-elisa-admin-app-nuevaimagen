// src/components/ProductCard.jsx
import React from 'react';
import { ShoppingCart, AlertTriangle } from 'lucide-react';

// Se añade la prop isResponsiveLayout para controlar la lógica de visibilidad.
export default function ProductCard({ producto, onClick, showStock = false, isResponsiveLayout = false }) {
  // Protege contra props nulos o indefinidos
  if (!producto) return null;

  // CAMBIO CLAVE AQUÍ: Lógica para determinar el precio de venta principal a mostrar
  let precioVentaDisplay = 0;
  if (producto.descuento_lote > 0) { // Prioridad 1: descuento_lote
      precioVentaDisplay = producto.descuento_lote;
  } else if (producto.promocion > 0) { // Prioridad 2: promocion
      precioVentaDisplay = producto.promocion;
  } else { // Prioridad 3: precio_normal
      precioVentaDisplay = producto.precio_normal;
  }
  // Asegura que el precio para mostrar no sea negativo
  precioVentaDisplay = Math.max(0, precioVentaDisplay);

  // Asegura valores numéricos por defecto
  const promocion = precioVentaDisplay; // Este será el precio que se muestra como "principal" en la tarjeta
  const precioOriginal = producto.precio_normal != null ? Number(producto.precio_normal) : null; 
  const stock = producto.stock != null ? producto.stock : null;
  const stockMinimo = producto.stock_minimo_level != null ? producto.stock_minimo_level : 0; 
  
  const lowStock = stock !== null && stock <= stockMinimo && stock > 0;
  const noStock = stock !== null && stock <= 0;

  // --- Renderizado del modo "fila compacta" para móviles ---
  const renderMobileRowMode = () => (
    <div
      onClick={onClick}
      className={`flex items-center p-2 border border-dark-700/50 rounded-lg shadow-card-dark bg-dark-800/50 text-xs transition-colors hover:bg-dark-700/50 ${noStock ? 'opacity-60' : ''}`}
      style={{ minHeight: '80px' }} 
    >
      {/* Imagen pequeña - Tamaño fijo y cuadrado */}
      <div className="w-14 h-14 flex-shrink-0 bg-dark-900 rounded-md overflow-hidden flex items-center justify-center mr-3">
        {producto.imagen_url ? ( 
          <img
            src={producto.imagen_url}
            alt={producto.nombre || 'Producto sin nombre'}
            className="object-cover w-full h-full"
            onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/1f2937/6b7280?text=Sin+Imagen" }}
          />
        ) : (producto.imagen ? (
          <img
            src={producto.imagen}
            alt={producto.nombre || 'Producto sin nombre'}
            className="object-cover w-full h-full"
            onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/1f2937/6b7280?text=Sin+Imagen" }}
          />
        ) : (
          <span className="text-gray-600 text-[10px] text-center px-1">Sin imagen</span>
        ))}
      </div>

      {/* Información principal (nombre, categoría, stock) - Crece para ocupar espacio */}
      <div className="flex-1 min-w-0 mr-3">
        <p className="font-medium text-gray-200 truncate h-4 overflow-hidden">{producto.nombre || 'Producto sin nombre'}</p> 
        <p className="text-gray-400 text-[11px] truncate h-3.5 overflow-hidden">{producto.categoria || 'Sin categoría'}</p>
        {showStock && stock !== null && (
          <p className={`text-[11px] font-semibold ${noStock ? 'text-error-400' : lowStock ? 'text-warning-400' : 'text-success-400'} h-3.5 overflow-hidden`}>
            Stock: {stock}
          </p>
        )}
      </div>

      {/* Precios y botón de agregar - Alineado a la derecha, apilado verticalmente */}
      <div className="flex flex-col items-end flex-shrink-0 space-y-1">
        <div className="flex items-baseline space-x-1">
          <span className="text-white font-semibold whitespace-nowrap">
            ${promocion.toFixed(2)} {/* Usa el precio principal calculado */}
          </span>
          {/* Muestra precio normal tachado si es diferente del precio de venta principal */}
          {precioOriginal !== null && precioOriginal !== precioVentaDisplay && (
            <span className="text-gray-500 line-through text-xs whitespace-nowrap">
              ${precioOriginal.toFixed(2)}
            </span>
          )}
        </div>
        <button
          className={`py-1 px-2 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
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
          <ShoppingCart size={12} className="mr-1" />
          {noStock ? 'Sin stock' : 'Agregar'}
        </button>
      </div>
    </div>
  );

  // --- ORIGINAL: Renderizado del modo "tarjeta" (desktop) ---
  const renderCardMode = () => (
    <div
      onClick={onClick}
      className={`relative bg-dark-800 rounded-lg overflow-hidden shadow-card-dark cursor-pointer w-full border border-dark-700/50 transition-all duration-300 ${noStock ? 'opacity-60' : 'hover:scale-[1.03] hover:shadow-dropdown-dark'}`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent opacity-60"></div>
      
      <img
        src={producto.imagen_url || producto.imagen || 'https://via.placeholder.com/150?text=Sin+Imagen'}
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
              ${promocion.toFixed(2)} {/* Usa el precio principal calculado */}
            </span>
            {/* Muestra precio normal tachado si es diferente del precio de venta principal */}
            {precioOriginal !== null && precioOriginal !== precioVentaDisplay && (
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

  // Lógica de renderizado principal:
  if (isResponsiveLayout) {
    return (
      <>
        <div className="block md:hidden">
          {renderMobileRowMode()}
        </div>
        <div className="hidden md:block">
          {renderCardMode()}
        </div>
      </>
    );
  } else {
    return renderCardMode();
  }
}
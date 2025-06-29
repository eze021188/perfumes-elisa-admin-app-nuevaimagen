// src/components/compras/ComprasFormularioNueva.jsx
import React, { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Trash2, Save, DollarSign, Calendar, Package, User, Hash } from 'lucide-react';

// Helper simple para formatear moneda
const formatCurrency = (amount, currency = 'USD') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return currency === 'USD' ? '$0.00' : '0.00';
    }
    return numericAmount.toLocaleString('en-US', {
       style: 'currency',
       currency: currency,
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function ComprasFormularioNueva({
  formulario,
  onInputChange, // Para campos de cabecera
  onMonetaryFieldBlur, // Para campos monetarios de cabecera
  onProductoInputChange, // Para campos del producto a agregar
  onProductoMonetaryBlur, // Para campos monetarios del producto a agregar
  productoForm, // Estado del formulario del producto individual
  productosAgregados,
  onAgregarProducto,
  onEliminarProductoForm,
  onGuardarCompra,
  nombresSugeridos, // Lista de todos los nombres de productos para sugerencias
  sugerenciasProducto, // Sugerencias filtradas para el input actual
  mostrarSugerenciasProducto,
  onSeleccionarSugerencia,
  onProductoInputFocus,
  onProductoInputKeyDown,
  productoInputRef,
  sugerenciasRef
}) {

  const calcularSubtotalItems = (items) => {
    return items.reduce((sum, item) => {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precioUnitarioUSD) || 0;
        return sum + (cantidad * precio);
    }, 0);
  };
  
  const calcularTotalCompra = (items, descuentoStr) => {
    return calcularSubtotalItems(items) - (parseFloat(descuentoStr) || 0);
  };

  return (
    <div className="mb-8 p-6 border border-dark-700/50 rounded-lg shadow-card-dark bg-dark-800/50">
      <h2 className="text-2xl font-semibold text-gray-100 mb-6">Registrar Nueva Compra</h2>
      
      {/* Campos de Cabecera de la Compra */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <label htmlFor="numeroPedido" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <Hash size={16} />
            Número de Pedido/Factura
          </label>
          <input 
            type="text" 
            name="numeroPedido" 
            id="numeroPedido"
            placeholder="Ej: PO-12345, INV-001" 
            value={formulario.numeroPedido} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
        </div>
        <div>
          <label htmlFor="proveedor" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <User size={16} />
            Proveedor
          </label>
          <input 
            type="text" 
            name="proveedor" 
            id="proveedor"
            placeholder="Ej: Perfumes Inc." 
            value={formulario.proveedor} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
        </div>
        <div>
          <label htmlFor="fechaCompra" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <Calendar size={16} />
            Fecha de Compra
          </label>
          <input 
            type="date" 
            name="fechaCompra" 
            id="fechaCompra"
            value={formulario.fechaCompra} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
        </div>
        <div>
          <label htmlFor="descuentoTotalUSD" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <DollarSign size={16} />
            Descuento Total (USD)
          </label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="descuentoTotalUSD" 
            id="descuentoTotalUSD"
            value={formulario.descuentoTotalUSD} 
            onChange={(e) => onInputChange(e, true)} 
            onBlur={(e) => onMonetaryFieldBlur(e, 'descuentoTotalUSD')}
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right text-gray-200" />
        </div>
        <div>
          <label htmlFor="gastosEnvioUSA" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <DollarSign size={16} />
            Gastos Envío USA (USD)
          </label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="gastosEnvioUSA" 
            id="gastosEnvioUSA"
            value={formulario.gastosEnvioUSA} 
            onChange={(e) => onInputChange(e, true)}
            onBlur={(e) => onMonetaryFieldBlur(e, 'gastosEnvioUSA')}
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right text-gray-200" />
        </div>
        <div>
          <label htmlFor="tipoCambioDia" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <DollarSign size={16} />
            Tipo de Cambio del Día (USD a MXN)
          </label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="tipoCambioDia" 
            id="tipoCambioDia"
            value={formulario.tipoCambioDia} 
            onChange={(e) => onInputChange(e, true)}
            onBlur={(e) => onMonetaryFieldBlur(e, 'tipoCambioDia')}
            className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right text-gray-200" />
        </div>
      </div>
      
      {/* CAMBIO CLAVE: Sección de Totales y Subtotales (ahora colocada aquí) */}
      {/* Solo se muestra si hay productos agregados */}
      {productosAgregados.length > 0 && (
        <div className="mb-6 p-4 border border-dark-700/50 rounded-lg shadow-inner bg-dark-900/50 text-right font-bold text-gray-100 space-y-1">
          <p>Subtotal (USD): <span className="font-medium text-gray-200">{formatCurrency(calcularSubtotalItems(productosAgregados), 'USD')}</span></p>
          <p>Descuento (USD): <span className="font-medium text-gray-200">{formatCurrency(parseFloat(formulario.descuentoTotalUSD || '0'), 'USD')}</span></p>
          <p>Gastos Envío USA (USD): <span className="font-medium text-gray-200">{formatCurrency(parseFloat(formulario.gastosEnvioUSA || '0'), 'USD')}</span></p>
          <p>Tipo de Cambio Venta: <span className="font-medium text-gray-200">{parseFloat(formulario.tipoCambioDia || '0').toFixed(2)}</span></p>
          <p className="text-xl pt-2 border-t border-dark-700">Total Compra (USD): <span className="text-primary-400">{formatCurrency(calcularTotalCompra(productosAgregados, formulario.descuentoTotalUSD), 'USD')}</span></p>
        </div>
      )}


      {/* Formulario para Agregar Productos a la Nueva Compra */}
      <div className="mb-6 p-4 border border-dashed border-dark-700/70 rounded-md bg-dark-900/50">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Agregar Producto a la Compra</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2 relative" ref={productoInputRef}>
            <label htmlFor="formNombreProducto" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Package size={16} />
              Producto
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-500" />
              </div>
              <input 
                type="text" 
                name="nombreProducto" 
                id="formNombreProducto"
                placeholder="Escribe para buscar o agregar nuevo..." 
                value={productoForm.nombreProducto} 
                onChange={(e) => onProductoInputChange(e, false)}
                onKeyDown={onProductoInputKeyDown} 
                onFocus={onProductoInputFocus}
                className="w-full pl-10 p-3 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
              />
            </div>
            {mostrarSugerenciasProducto && sugerenciasProducto.length > 0 && ( 
              <ul ref={sugerenciasRef} className="absolute z-10 w-full bg-dark-800 border border-dark-700 rounded-md shadow-dropdown-dark mt-1 max-h-60 overflow-y-auto">
                {sugerenciasProducto.map((sug, index) => (
                  <li key={sug.id}>
                    <button 
                      type="button" 
                      onClick={() => onSeleccionarSugerencia(sug)} 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-dark-700 focus:bg-dark-700 focus:outline-none text-gray-300"
                    >
                      {sug.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="formCantidad" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Hash size={16} />
              Cantidad
            </label>
            <input 
              type="number" 
              name="cantidad" 
              id="formCantidad"
              placeholder="Cant." 
              value={productoForm.cantidad} 
              onChange={(e) => onProductoInputChange(e, false)} 
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right text-gray-200" 
            />
          </div>
          <div>
            <label htmlFor="formPrecioUnitarioUSD" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Precio Unit. (USD)
            </label>
            <input 
              type="text" 
              inputMode="decimal" 
              name="precioUnitarioUSD" 
              id="formPrecioUnitarioUSD"
              value={productoForm.precioUnitarioUSD} 
              onChange={(e) => onProductoInputChange(e, true)}
              onBlur={(e) => onProductoMonetaryBlur(e, 'precioUnitarioUSD')}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-right text-gray-200" 
            />
          </div>
        </div>
        <button 
          onClick={onAgregarProducto} 
          type="button"
          className="mt-4 px-6 py-2 bg-success-600 text-white rounded-lg shadow-elegant-dark hover:bg-success-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Agregar Producto
        </button>
      </div>

      {/* Tabla de Productos Agregados a la Nueva Compra */}
      {productosAgregados.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Productos en esta Compra</h3>
          <div className="overflow-x-auto bg-dark-800 rounded-lg shadow-card-dark border border-dark-700/50">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Precio USD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Subtotal USD</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {productosAgregados.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-dark-700/50">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{p.nombreProducto}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{p.cantidad}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatCurrency((p.precioUnitarioUSD || 0), 'USD')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200 text-right">{formatCurrency((p.cantidad || 0) * (p.precioUnitarioUSD || 0), 'USD')}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      <button 
                        onClick={() => onEliminarProductoForm(i)} 
                        className="text-error-400 hover:text-error-300 transition-colors"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* El div de resumen ya no está aquí, fue movido más arriba */}
          <button 
            onClick={onGuardarCompra} 
            type="button"
            className="mt-6 px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-elegant-dark hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            Guardar Compra Completa
          </button>
        </div>
      )}
    </div>
  );
}
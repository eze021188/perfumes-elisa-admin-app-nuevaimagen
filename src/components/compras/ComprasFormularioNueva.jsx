// src/components/compras/ComprasFormularioNueva.jsx
import React, { useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

// Helper simple para formatear moneda (puedes moverlo a utils si es compartido)
const formatCurrency = (amount, currency = 'USD') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return currency === 'USD' ? '$0.00' : '0.00'; // Ajusta el símbolo si es necesario
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
  productoInputRef, // Ref para el input de nombre de producto
  sugerenciasRef // Ref para la lista de sugerencias
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
    <div className="mb-8 p-4 md:p-6 border border-gray-200 rounded-lg shadow-xl bg-white">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Registrar Nueva Compra</h2>
      
      {/* Campos de Cabecera de la Compra */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <label htmlFor="numeroPedido" className="block text-sm font-medium text-gray-700 mb-1">Número de Pedido/Factura</label>
          <input 
            type="text" 
            name="numeroPedido" 
            id="numeroPedido"
            placeholder="Ej: PO-12345, INV-001" 
            value={formulario.numeroPedido} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
          <input 
            type="text" 
            name="proveedor" 
            id="proveedor"
            placeholder="Ej: Perfumes Inc." 
            value={formulario.proveedor} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="fechaCompra" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
          <input 
            type="date" 
            name="fechaCompra" 
            id="fechaCompra"
            value={formulario.fechaCompra} 
            onChange={(e) => onInputChange(e, false)} 
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="descuentoTotalUSD" className="block text-sm font-medium text-gray-700 mb-1">Descuento Total (USD)</label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="descuentoTotalUSD" 
            id="descuentoTotalUSD"
            value={formulario.descuentoTotalUSD} 
            onChange={(e) => onInputChange(e, true)} 
            onBlur={(e) => onMonetaryFieldBlur(e, 'descuentoTotalUSD')}
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right" />
        </div>
        <div>
          <label htmlFor="gastosEnvioUSA" className="block text-sm font-medium text-gray-700 mb-1">Gastos Envío USA (USD)</label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="gastosEnvioUSA" 
            id="gastosEnvioUSA"
            value={formulario.gastosEnvioUSA} 
            onChange={(e) => onInputChange(e, true)}
            onBlur={(e) => onMonetaryFieldBlur(e, 'gastosEnvioUSA')}
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right" />
        </div>
        <div>
          <label htmlFor="tipoCambioDia" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio del Día (USD a MXN)</label>
          <input 
            type="text" 
            inputMode="decimal" 
            name="tipoCambioDia" 
            id="tipoCambioDia"
            value={formulario.tipoCambioDia} 
            onChange={(e) => onInputChange(e, true)}
            onBlur={(e) => onMonetaryFieldBlur(e, 'tipoCambioDia')}
            className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right" />
        </div>
      </div>
      
      {/* Formulario para Agregar Productos a la Nueva Compra */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Producto a la Compra</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2 relative" ref={productoInputRef}>
            <label htmlFor="formNombreProducto" className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <input 
              type="text" 
              name="nombreProducto" 
              id="formNombreProducto"
              placeholder="Escribe para buscar o agregar nuevo..." 
              value={productoForm.nombreProducto} 
              onChange={(e) => onProductoInputChange(e, false)}
              onKeyDown={onProductoInputKeyDown} 
              onFocus={onProductoInputFocus}
              className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
            />
            {mostrarSugerenciasProducto && sugerenciasProducto.length > 0 && (
              <ul ref={sugerenciasRef} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                {sugerenciasProducto.map((nombre, index) => (
                  <li key={index}>
                    <button 
                      type="button" 
                      onClick={() => onSeleccionarSugerencia(nombre)} 
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="formCantidad" className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input 
              type="number" 
              name="cantidad" 
              id="formCantidad"
              placeholder="Cant." 
              value={productoForm.cantidad} 
              onChange={(e) => onProductoInputChange(e, false)} 
              className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right" 
            />
          </div>
          <div>
            <label htmlFor="formPrecioUnitarioUSD" className="block text-sm font-medium text-gray-700 mb-1">Precio Unit. (USD)</label>
            <input 
              type="text" 
              inputMode="decimal" 
              name="precioUnitarioUSD" 
              id="formPrecioUnitarioUSD"
              value={productoForm.precioUnitarioUSD} 
              onChange={(e) => onProductoInputChange(e, true)}
              onBlur={(e) => onProductoMonetaryBlur(e, 'precioUnitarioUSD')}
              className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-right" 
            />
          </div>
        </div>
        <button 
          onClick={onAgregarProducto} 
          type="button"
          className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200"
        >
          Agregar Producto
        </button>
      </div>

      {/* Tabla de Productos Agregados a la Nueva Compra */}
      {productosAgregados.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos en esta Compra</h3>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Cant.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Precio USD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Subtotal USD</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productosAgregados.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nombreProducto}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{p.cantidad}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(p.precioUnitarioUSD, 'USD')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency((p.cantidad || 0) * (p.precioUnitarioUSD || 0), 'USD')}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      <button 
                        onClick={() => onEliminarProductoForm(i)} 
                        className="text-red-600 hover:text-red-800"
                        type="button"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right font-bold text-gray-800 mt-4 space-y-1">
            <p>Subtotal (USD): {formatCurrency(calcularSubtotalItems(productosAgregados), 'USD')}</p>
            <p>Descuento (USD): {formatCurrency(parseFloat(formulario.descuentoTotalUSD || '0'), 'USD')}</p>
            <p className="text-xl">Total Compra (USD): {formatCurrency(calcularTotalCompra(productosAgregados, formulario.descuentoTotalUSD), 'USD')}</p>
          </div>
          <button 
            onClick={onGuardarCompra} 
            type="button"
            className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
          >
            Guardar Compra Completa
          </button>
        </div>
      )}
    </div>
  );
}

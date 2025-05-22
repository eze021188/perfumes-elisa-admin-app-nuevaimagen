// src/components/compras/ComprasHistorialLista.jsx
import React from 'react';

// Helper para formatear moneda (debe ser consistente)
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

// No necesitamos el helper de fecha aquí si se pasa como prop `formatDisplayDate`

export default function ComprasHistorialLista({
  savedCompras,
  expandedIdx,
  onToggleExpand, 
  onEliminarCompra,
  editingPurchaseItems,
  onEditingItemChange,
  onEditingItemBlur,
  itemParaAgregarAExistente,
  onItemParaAgregarChange,
  onItemParaAgregarBlur,
  onAgregarProductoACompraExistente,
  onEliminarItemDeCompraEditandose,
  onGuardarCambiosEnCompraExistente,
  invConfig,
  onInvConfigChange,
  onMonetaryInvConfigBlur, 
  onConfirmarAfectarInventario,
  nombresSugeridos, 
  existenteProductoInputRef, 
  existenteSugerenciasRef,
  formatDisplayDate // --- Recibiendo la función de formateo de fecha ---
}) {

  if (!savedCompras || savedCompras.length === 0) {
    return <p className="text-center text-gray-500 italic mt-4">No hay compras registradas para mostrar.</p>;
  }

  return (
    <div className="space-y-6">
      {savedCompras.map((compraData, index) => (
        <div key={compraData.compra.id} className="border border-gray-200 rounded-lg shadow-md bg-white">
          <div 
            className={`flex justify-between items-center p-4 cursor-pointer ${compraData.compra.inventario_afectado ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
            onClick={() => onToggleExpand(index)}
          >
            <div>
              <div className="font-semibold text-gray-800">Pedido: {compraData.compra.numero_pedido}</div>
              <div className="text-sm text-gray-600">Proveedor: {compraData.compra.proveedor}</div>
              {/* --- MODIFICADO: Usar la función de formateo pasada como prop --- */}
              <div className="text-sm text-gray-600">
                Fecha: {formatDisplayDate ? formatDisplayDate(compraData.compra.fecha_compra || compraData.compra.created_at) : new Date(compraData.compra.fecha_compra || compraData.compra.created_at).toLocaleDateString('es-MX')}
              </div>
            </div>
            <div className="flex items-center space-x-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${compraData.compra.inventario_afectado ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                    {compraData.compra.inventario_afectado ? 'Inventario Afectado' : 'Pendiente Afectar'}
                </span>
                <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onEliminarCompra(compraData.compra.id, compraData.compra.inventario_afectado); 
                    }}
                    className="px-3 py-1 bg-red-500 text-white text-xs rounded-md hover:bg-red-600 disabled:opacity-50"
                    disabled={compraData.compra.inventario_afectado}
                    title={compraData.compra.inventario_afectado ? "No se puede eliminar, inventario afectado" : "Eliminar Compra"}
                >
                    Eliminar
                </button>
                <span className="text-gray-400 text-xl">
                    {expandedIdx === index ? '▲' : '▼'}
                </span>
            </div>
          </div>

          {expandedIdx === index && (
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Ítems de la Compra (Pedido: {compraData.compra.numero_pedido})</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {editingPurchaseItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-2 rounded-md ${item.isNew ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <div className="md:col-span-2 font-medium text-sm text-gray-800 truncate">{item.nombreProducto}</div>
                    <div>
                      <label htmlFor={`qty-${item.id}`} className="block text-xs text-gray-500 mb-0.5">Cantidad</label>
                      <input 
                        id={`qty-${item.id}`}
                        type="number" 
                        value={item.cantidad}
                        disabled={compraData.compra.inventario_afectado}
                        onChange={(e) => onEditingItemChange(item.id, 'cantidad', e.target.value)}
                        className="w-full border border-gray-300 p-1.5 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label htmlFor={`price-${item.id}`} className="block text-xs text-gray-500 mb-0.5">Precio USD</label>
                      <input 
                        id={`price-${item.id}`}
                        type="text" 
                        inputMode="decimal"
                        value={item.precioUnitarioUSD}
                        disabled={compraData.compra.inventario_afectado}
                        onChange={(e) => onEditingItemChange(item.id, 'precioUnitarioUSD', e.target.value)}
                        onBlur={() => onEditingItemBlur(item.id, 'precioUnitarioUSD')}
                        className="w-full border border-gray-300 p-1.5 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                      />
                    </div>
                    {!compraData.compra.inventario_afectado && (
                       <button 
                            onClick={() => onEliminarItemDeCompraEditandose(item.id)} 
                            className="text-red-500 hover:text-red-700 text-xs p-1 self-end mb-1 md:mb-0 md:ml-auto"
                            title="Eliminar este ítem de la compra"
                        >
                         Eliminar Ítem
                       </button>
                    )}
                  </div>
                ))}
              </div>

              {!compraData.compra.inventario_afectado && (
                <>
                <div className="mt-4 p-3 border-t border-dashed border-gray-300">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Añadir Nuevo Producto a esta Compra</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2 relative" ref={existenteProductoInputRef}>
                       <label htmlFor={`addNombreProd-${compraData.compra.id}`} className="block text-xs text-gray-500 mb-0.5">Producto</label>
                       <input 
                            type="text" 
                            name="nombreProducto" 
                            id={`addNombreProd-${compraData.compra.id}`}
                            placeholder="Buscar o agregar nuevo..."
                            value={itemParaAgregarAExistente.nombreProducto}
                            onChange={onItemParaAgregarChange}
                            onFocus={() => onItemParaAgregarChange({target: {name: 'nombreProducto', value: itemParaAgregarAExistente.nombreProducto }})}
                            onKeyDown={(e) => e.key === 'Escape' && onItemParaAgregarChange({target: {name: 'mostrarSugerencias', value: false}})}
                            className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                        {itemParaAgregarAExistente.mostrarSugerencias && itemParaAgregarAExistente.sugerencias.length > 0 && (
                            <ul ref={existenteSugerenciasRef} className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-32 overflow-y-auto">
                                {itemParaAgregarAExistente.sugerencias.map((sug, i) => (
                                    <li key={i}>
                                        <button 
                                            type="button" 
                                            onClick={() => onItemParaAgregarChange({target: {name: 'seleccionarSugerencia', value: sug}})} 
                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
                                        >
                                            {sug}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                       <label htmlFor={`addCant-${compraData.compra.id}`} className="block text-xs text-gray-500 mb-0.5">Cantidad</label>
                       <input 
                            type="number" 
                            name="cantidad" 
                            id={`addCant-${compraData.compra.id}`}
                            placeholder="Cant." 
                            value={itemParaAgregarAExistente.cantidad} 
                            onChange={onItemParaAgregarChange} 
                            className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                    </div>
                    <div>
                       <label htmlFor={`addPrecio-${compraData.compra.id}`} className="block text-xs text-gray-500 mb-0.5">Precio USD</label>
                       <input 
                            type="text" 
                            inputMode="decimal" 
                            name="precioUnitarioUSD" 
                            id={`addPrecio-${compraData.compra.id}`}
                            value={itemParaAgregarAExistente.precioUnitarioUSD} 
                            onChange={onItemParaAgregarChange} 
                            onBlur={onItemParaAgregarBlur}
                            className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                    </div>
                    <button 
                        onClick={onAgregarProductoACompraExistente} 
                        type="button"
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 h-fit self-end"
                    >
                        Añadir
                    </button>
                  </div>
                </div>
                <button 
                    onClick={onGuardarCambiosEnCompraExistente} 
                    type="button"
                    className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-200"
                >
                    Guardar Cambios en esta Compra
                </button>
                </>
              )}

              <div className="mt-6 mb-4 text-sm text-gray-700">
                <div><span className="font-semibold">Descuento Total (USD):</span> {formatCurrency(compraData.compra.descuento_total_usd, 'USD')}</div>
                <div><span className="font-semibold">Gastos Envío USA (USD):</span> {formatCurrency(compraData.compra.gastos_envio_usa, 'USD')}</div>
                <div><span className="font-semibold">Tipo de Cambio Venta:</span> {parseFloat(compraData.compra.tipo_cambio_dia || '0').toFixed(2) || 'N/A'}</div>
                {compraData.compra.inventario_afectado && (
                  <>
                    <div className="mt-2 pt-2 border-t"><span className="font-semibold">Gastos Importación Registrados (USD):</span> {formatCurrency(compraData.compra.gastos_importacion, 'USD')}</div>
                    <div><span className="font-semibold">Tipo de Cambio Importación Registrado:</span> {parseFloat(compraData.compra.tipo_cambio_importacion || '0').toFixed(2) || 'N/A'}</div>
                    <div><span className="font-semibold">Otros Gastos Registrados (USD):</span> {formatCurrency(compraData.compra.otros_gastos, 'USD')}</div>
                  </>
                )}
              </div>
              {!compraData.compra.inventario_afectado && (
                  <div className="p-3 border rounded bg-yellow-50 mt-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">Afectar Inventario con esta Compra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor={`gastosImp-${compraData.compra.id}`} className="block text-sm font-medium text-gray-700">Gastos Importación (USD)</label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="gastosImportacion" 
                            id={`gastosImp-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.gastosImportacion : (compraData.compra.gastos_importacion || 0).toFixed(2) } 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'gastosImportacion', index)}
                            className="w-full border border-gray-300 p-2 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>
                      <div>
                        <label htmlFor={`tipoCambioImp-${compraData.compra.id}`} className="block text-sm font-medium text-gray-700">Tipo Cambio Importación</label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="tipoCambioImportacion" 
                            id={`tipoCambioImp-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.tipoCambioImportacion : (compraData.compra.tipo_cambio_importacion || 0).toFixed(2)} 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'tipoCambioImportacion', index)}
                            className="w-full border border-gray-300 p-2 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>
                      <div>
                        <label htmlFor={`otrosGastos-${compraData.compra.id}`} className="block text-sm font-medium text-gray-700">Otros Gastos (USD)</label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="otrosGastos" 
                            id={`otrosGastos-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.otrosGastos : (compraData.compra.otros_gastos || 0).toFixed(2)} 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'otrosGastos', index)}
                            className="w-full border border-gray-300 p-2 rounded text-right focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => onConfirmarAfectarInventario(index)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                       disabled={
                        (invConfig.targetIdx === index && (
                            invConfig.gastosImportacion === '' || parseFloat(invConfig.gastosImportacion) < 0 || isNaN(parseFloat(invConfig.gastosImportacion)) ||
                            invConfig.tipoCambioImportacion === '' || parseFloat(invConfig.tipoCambioImportacion) <= 0 || isNaN(parseFloat(invConfig.tipoCambioImportacion)) ||
                            invConfig.otrosGastos === '' || parseFloat(invConfig.otrosGastos) < 0 || isNaN(parseFloat(invConfig.otrosGastos))
                        )) || invConfig.targetIdx !== index 
                       }
                    >
                      Confirmar y Afectar Inventario
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

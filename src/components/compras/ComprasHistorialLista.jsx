// src/components/compras/ComprasHistorialLista.jsx
import React, { useEffect } from 'react'; // Importar useEffect para depuración
import { ChevronUp, ChevronDown, Trash2, Plus, Save, DollarSign, Search, Package, AlertTriangle, Hash } from 'lucide-react'; // Asegúrate de importar Hash

// Helper para formatear moneda
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
  formatDisplayDate
}) {

  // Log para depuración: Ver el estado de editingPurchaseItems cuando cambia
  useEffect(() => {
    console.log('ComprasHistorialLista - editingPurchaseItems:', editingPurchaseItems);
    console.log('ComprasHistorialLista - expandedIdx:', expandedIdx);
    if (expandedIdx !== null && savedCompras[expandedIdx]) {
      console.log('ComprasHistorialLista - Compra actual en expandedIdx:', savedCompras[expandedIdx]);
    }
  }, [editingPurchaseItems, expandedIdx, savedCompras]);


  if (!savedCompras || savedCompras.length === 0) {
    return (
      <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <Package size={48} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400 italic">No hay compras registradas para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedCompras.map((compraData, index) => (
        <div key={compraData.compra.id} className="border border-dark-700/50 rounded-lg shadow-card-dark bg-dark-800/50">
          <div 
            className={`flex justify-between items-center p-4 cursor-pointer ${compraData.compra.inventario_afectado ? 'bg-success-900/20 hover:bg-success-900/30' : 'bg-dark-900/50 hover:bg-dark-800'} transition-colors rounded-t-lg`}
            onClick={(e) => {
              // Nuevo log para verificar si el clic se registra en este componente
              console.log('¡Clic registrado en ComprasHistorialLista!', {
                numeroPedido: compraData.compra.numero_pedido,
                index: index,
                inventarioAfectado: compraData.compra.inventario_afectado
              });
              onToggleExpand(index);
            }}
          >
            <div>
              <div className="font-semibold text-gray-100">Pedido: {compraData.compra.numero_pedido}</div>
              <div className="text-sm text-gray-400">Proveedor: {compraData.compra.proveedor}</div>
              <div className="text-sm text-gray-400">
                Fecha: {formatDisplayDate ? formatDisplayDate(compraData.compra.fecha_compra || compraData.compra.created_at) : new Date(compraData.compra.fecha_compra || compraData.compra.created_at).toLocaleDateString('es-MX')}
              </div>
            </div>
            <div className="flex items-center space-x-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${compraData.compra.inventario_afectado ? 'bg-success-900/50 text-success-300 border border-success-800/50' : 'bg-warning-900/50 text-warning-300 border border-warning-800/50'}`}>
                    {compraData.compra.inventario_afectado ? 'Inventario Afectado' : 'Pendiente Afectar'}
                </span>
                <button
                    onClick={(e) => { 
                        e.stopPropagation(); // Detener la propagación para que no se dispare onToggleExpand
                        onEliminarCompra(compraData.compra.id, compraData.compra.inventario_afectado); 
                    }}
                    className="px-3 py-1 bg-error-600 text-white text-xs rounded-md hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={compraData.compra.inventario_afectado}
                    title={compraData.compra.inventario_afectado ? "No se puede eliminar, inventario afectado" : "Eliminar Compra"}
                >
                    <Trash2 size={14} />
                </button>
                <span className="text-gray-400">
                    {expandedIdx === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </span>
            </div>
          </div>

          {expandedIdx === index && (
            <div className="p-4 border-t border-dark-700/50">
              <h3 className="text-md font-semibold text-gray-200 mb-3">Ítems de la Compra (Pedido: {compraData.compra.numero_pedido})</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2">
                {/* Condición para mostrar mensaje si no hay ítems en editingPurchaseItems */}
                {editingPurchaseItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <p>No hay ítems para esta compra o no se pudieron cargar.</p>
                  </div>
                ) : (
                  editingPurchaseItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-2 rounded-md ${item.isNew ? 'bg-primary-900/20 border border-primary-800/50' : 'bg-dark-900/50 border border-dark-700/50'}`}
                    >
                      <div className="md:col-span-2 font-medium text-sm text-gray-200 truncate">{item.nombreProducto}</div>
                      <div>
                        <label htmlFor={`qty-${item.id}`} className="block text-xs text-gray-400 mb-0.5">Cantidad</label>
                        <input 
                          id={`qty-${item.id}`}
                          type="number" 
                          value={item.cantidad}
                          disabled={compraData.compra.inventario_afectado}
                          onChange={(e) => onEditingItemChange(item.id, 'cantidad', e.target.value)}
                          className="w-full border border-dark-700 bg-dark-900 p-1.5 rounded text-sm text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed" 
                        />
                      </div>
                      <div>
                        <label htmlFor={`price-${item.id}`} className="block text-xs text-gray-400 mb-0.5">Precio USD</label>
                        <input 
                          id={`price-${item.id}`}
                          type="text" 
                          inputMode="decimal"
                          value={item.precioUnitarioUSD}
                          disabled={compraData.compra.inventario_afectado} // Corregido: 'inventario_afectado'
                          onChange={(e) => onEditingItemChange(item.id, 'precioUnitarioUSD', e.target.value)}
                          onBlur={() => onEditingItemBlur(item.id, 'precioUnitarioUSD')}
                          className="w-full border border-dark-700 bg-dark-900 p-1.5 rounded text-sm text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed" 
                        />
                      </div>
                      {!compraData.compra.inventario_afectado && (
                         <button 
                              onClick={() => onEliminarItemDeCompraEditandose(item.id)} 
                              className="text-error-400 hover:text-error-300 text-xs p-1 self-end mb-1 md:mb-0 md:ml-auto transition-colors"
                              title="Eliminar este ítem de la compra"
                          >
                           <Trash2 size={16} />
                         </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {!compraData.compra.inventario_afectado && (
                <>
                <div className="mt-4 p-3 border-t border-dashed border-dark-700/70">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">Añadir Nuevo Producto a esta Compra</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2 relative" ref={existenteProductoInputRef}>
                       <label htmlFor={`addNombreProd-${compraData.compra.id}`} className="block text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                         <Package size={14} />
                         Producto
                       </label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                           <Search size={14} className="text-gray-500" />
                         </div>
                         <input 
                              type="text" 
                              name="nombreProducto" 
                              id={`addNombreProd-${compraData.compra.id}`}
                              placeholder="Buscar o agregar nuevo..."
                              value={itemParaAgregarAExistente.nombreProducto}
                              onChange={onItemParaAgregarChange}
                              onFocus={() => onItemParaAgregarChange({target: {name: 'nombreProducto', value: itemParaAgregarAExistente.nombreProducto }})}
                              onKeyDown={(e) => e.key === 'Escape' && onItemParaAgregarChange({target: {name: 'mostrarSugerencias', value: false}})}
                              className="w-full pl-8 border border-dark-700 bg-dark-900 px-2 py-1.5 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                          />
                        </div>
                        {itemParaAgregarAExistente.mostrarSugerencias && itemParaAgregarAExistente.sugerencias.length > 0 && (
                            <ul ref={existenteSugerenciasRef} className="absolute z-20 w-full bg-dark-800 border border-dark-700 rounded-md shadow-dropdown-dark mt-1 max-h-32 overflow-y-auto">
                                {itemParaAgregarAExistente.sugerencias.map((sug, i) => (
                                    <li key={i}>
                                        <button 
                                            type="button" 
                                            onClick={() => onItemParaAgregarChange({target: {name: 'seleccionarSugerencia', value: sug}})} 
                                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-dark-700 text-gray-300"
                                        >
                                            {sug}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div>
                       <label htmlFor={`addCant-${compraData.compra.id}`} className="block text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                         <Hash size={14} />
                         Cantidad
                       </label>
                       <input 
                            type="number" 
                            name="cantidad" 
                            id={`addCant-${compraData.compra.id}`}
                            placeholder="Cant." 
                            value={itemParaAgregarAExistente.cantidad} 
                            onChange={onItemParaAgregarChange} 
                            className="w-full border border-dark-700 bg-dark-900 px-2 py-1.5 rounded-md text-sm text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                        />
                    </div>
                    <div>
                       <label htmlFor={`addPrecio-${compraData.compra.id}`} className="block text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                         <DollarSign size={14} />
                         Precio USD
                       </label>
                       <input 
                            type="text" 
                            inputMode="decimal" 
                            name="precioUnitarioUSD" 
                            id={`addPrecio-${compraData.compra.id}`}
                            value={itemParaAgregarAExistente.precioUnitarioUSD} 
                            onChange={onItemParaAgregarChange} 
                            onBlur={onItemParaAgregarBlur}
                            className="w-full border border-dark-700 bg-dark-900 px-2 py-1.5 rounded-md text-sm text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                        />
                    </div>
                    <button 
                        onClick={onAgregarProductoACompraExistente} 
                        type="button"
                        className="px-3 py-1.5 bg-success-600 text-white text-sm rounded-md hover:bg-success-700 h-fit self-end flex items-center gap-1 transition-colors"
                    >
                        <Plus size={14} />
                        Añadir
                    </button>
                  </div>
                </div>
                <button 
                    onClick={onGuardarCambiosEnCompraExistente} 
                    type="button"
                    className="mt-4 px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-elegant-dark hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                    <Save size={16} />
                    Guardar Cambios en esta Compra
                </button>
                </>
              )}

              <div className="mt-6 mb-4 text-sm text-gray-300">
                <div><span className="font-semibold text-gray-200">Descuento Total (USD):</span> {formatCurrency(compraData.compra.descuento_total_usd, 'USD')}</div>
                <div><span className="font-semibold text-gray-200">Gastos Envío USA (USD):</span> {formatCurrency(compraData.compra.gastos_envio_usa, 'USD')}</div>
                <div><span className="font-semibold text-gray-200">Tipo de Cambio Venta:</span> {parseFloat(compraData.compra.tipo_cambio_dia || '0').toFixed(2) || 'N/A'}</div>
                {compraData.compra.inventario_afectado && (
                  <>
                    <div className="mt-2 pt-2 border-t border-dark-700/50"><span className="font-semibold text-gray-200">Gastos Importación Registrados (USD):</span> {formatCurrency(compraData.compra.gastos_importacion, 'USD')}</div>
                    <div><span className="font-semibold text-gray-200">Tipo de Cambio Importación Registrado:</span> {parseFloat(compraData.compra.tipo_cambio_importacion || '0').toFixed(2) || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-200">Otros Gastos Registrados (USD):</span> {formatCurrency(compraData.compra.otros_gastos, 'USD')}</div>
                  </>
                )}
              </div>
              {!compraData.compra.inventario_afectado && (
                  <div className="p-4 border border-warning-800/30 rounded-lg bg-warning-900/20 mt-4">
                    <h3 className="text-md font-semibold text-warning-300 mb-3 flex items-center gap-2">
                      <AlertTriangle size={18} />
                      Afectar Inventario con esta Compra
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label htmlFor={`gastosImp-${compraData.compra.id}`} className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign size={14} />
                          Gastos Importación (USD)
                        </label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="gastosImportacion" 
                            id={`gastosImp-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.gastosImportacion : (compraData.compra.gastos_importacion || 0).toFixed(2) } 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'gastosImportacion', index)}
                            className="w-full border border-dark-700 bg-dark-900 p-2 rounded text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                        />
                      </div>
                      <div>
                        <label htmlFor={`tipoCambioImp-${compraData.compra.id}`} className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign size={14} />
                          Tipo Cambio Importación
                        </label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="tipoCambioImportacion" 
                            id={`tipoCambioImp-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.tipoCambioImportacion : (compraData.compra.tipo_cambio_importacion || 0).toFixed(2)} 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'tipoCambioImportacion', index)}
                            className="w-full border border-dark-700 bg-dark-900 p-2 rounded text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                        />
                      </div>
                      <div>
                        <label htmlFor={`otrosGastos-${compraData.compra.id}`} className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <DollarSign size={14} />
                          Otros Gastos (USD)
                        </label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            name="otrosGastos" 
                            id={`otrosGastos-${compraData.compra.id}`}
                            value={invConfig.targetIdx === index ? invConfig.otrosGastos : (compraData.compra.otros_gastos || 0).toFixed(2)} 
                            onChange={(e) => onInvConfigChange(e, index)}
                            onBlur={(e) => onMonetaryInvConfigBlur(e, 'otrosGastos', index)}
                            className="w-full border border-dark-700 bg-dark-900 p-2 rounded text-right focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => onConfirmarAfectarInventario(index)}
                      className="px-4 py-2 bg-warning-600 text-white rounded-md hover:bg-warning-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                       disabled={
                        (invConfig.targetIdx === index && (
                            invConfig.gastosImportacion === '' || parseFloat(invConfig.gastosImportacion) < 0 || isNaN(parseFloat(invConfig.gastosImportacion)) ||
                            invConfig.tipoCambioImportacion === '' || parseFloat(invConfig.tipoCambioImportacion) <= 0 || isNaN(parseFloat(invConfig.tipoCambioImportacion)) ||
                            invConfig.otrosGastos === '' || parseFloat(invConfig.otrosGastos) < 0 || isNaN(parseFloat(invConfig.otrosGastos))
                        )) || invConfig.targetIdx !== index 
                       }
                    >
                      <AlertTriangle size={16} />
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
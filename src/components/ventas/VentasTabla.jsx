// src/components/ventas/VentasTabla.jsx
import React from 'react';
import { FileText, Loader } from 'lucide-react';

// Helper para formatear moneda (considera importar desde utils/formatters si lo compartes)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    // Asegura que siempre haya 2 decimales y el símbolo de moneda
    const fixedString = numericAmount.toFixed(2);
    return parseFloat(fixedString).toLocaleString('en-US', {
       style: 'currency',
       currency: 'USD',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function VentasTabla({
  ventasFiltradas,
  onSelectSale,
  loading,
  busqueda,
  formatDateFunction
}) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <Loader size={24} className="text-primary-400 animate-spin mr-2" />
        <p className="text-gray-300 font-medium">Cargando ventas...</p>
      </div>
    );
  }

  if (ventasFiltradas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
        <p className="text-gray-400 italic mb-2">
          {busqueda
            ? `No hay ventas que coincidan con "${busqueda}".`
            : "No hay ventas registradas."
          }
        </p>
        <FileText size={48} className="text-gray-600 opacity-50" />
      </div>
    );
  }

  return (
    // El div con overflow-x-auto ya está en Ventas.jsx envolviendo a VentasTabla
    // Este componente VentasTabla ahora se enfoca en el contenido interno de la tabla.
    <table className="min-w-full divide-y divide-dark-700">
        <thead className="bg-dark-900/50">
            <tr>
                {/* Columna CÓDIGO (ancho, fuente, truncado) */}
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider w-[50px] sm:w-[90px] lg:w-auto truncate overflow-hidden whitespace-nowrap">Código</th>
                {/* Columna CLIENTE */}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[120px] sm:w-[180px] lg:w-auto whitespace-nowrap">Cliente</th> 
                {/* Columna FECHA */}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell md:w-auto whitespace-nowrap">Fecha</th>
                {/* Columna PAGO */}
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell lg:w-auto whitespace-nowrap">Pago</th>
                {/* --- INICIO DE CORRECCIÓN: Columna TOTAL (tamaño de fuente a 12px) --- */}
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider w-[80px] sm:w-[100px] lg:w-auto whitespace-nowrap">Total</th> {/* text-xs (12px) */}
                {/* --- FIN DE CORRECCIÓN --- */}
                {/* Columna ACCIONES */}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-[70px] sm:w-[90px] lg:w-auto whitespace-nowrap">Acciones</th>
            </tr>
        </thead>
        <tbody className="bg-dark-800 divide-y divide-dark-700/50">
            {ventasFiltradas.map(venta => (
                <tr key={venta.id} className="hover:bg-dark-700/50 transition-colors">
                    {/* Celda CÓDIGO */}
                    <td 
                        className="px-3 py-3 text-[11px] font-medium text-primary-400 hover:text-primary-300 cursor-pointer align-top truncate overflow-hidden whitespace-nowrap"
                        onClick={() => onSelectSale(venta)}
                        title={`Ver detalle de venta ${venta.codigo_venta}`}
                    >
                        {venta.codigo_venta}
                    </td>
                    {/* Celda CLIENTE */}
                    <td className="px-3 py-3 text-sm text-gray-300 align-top break-words">{venta.display_cliente_nombre}</td>
                    {/* Celda FECHA */}
                    <td className="px-3 py-3 text-sm text-gray-400 hidden sm:table-cell align-top break-words">
                      {formatDateFunction ? formatDateFunction(venta.fecha || venta.created_at) : new Date(venta.fecha || venta.created_at).toLocaleString()}
                    </td>
                    {/* Celda PAGO */}
                    <td className="px-3 py-3 text-sm text-gray-400 hidden md:table-cell align-top break-words">{venta.forma_pago}</td>
                    {/* --- INICIO DE CORRECCIÓN: Celda TOTAL (tamaño de fuente a 12px) --- */}
                    <td className="px-3 py-3 text-xs text-right font-semibold text-gray-200 align-top"> {/* text-xs (12px) */}
                      {formatCurrency(venta.total ?? 0)}
                    </td>
                    {/* --- FIN DE CORRECCIÓN --- */}
                    {/* Celda ACCIONES */}
                    <td className="px-3 py-3 text-center align-top">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectSale(venta); }}
                        className="px-3 py-1.5 bg-primary-600/80 text-white rounded-md shadow-sm hover:bg-primary-600 transition-colors text-xs flex items-center justify-center gap-1 mx-auto whitespace-nowrap"
                        title="Ver Detalle de la Venta"
                      >
                        <FileText size={14} className="mr-1" />
                        Ver Detalle
                      </button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
  );
}
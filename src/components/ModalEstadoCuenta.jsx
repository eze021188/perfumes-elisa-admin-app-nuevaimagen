// src/components/ModalEstadoCuenta.jsx
import React from 'react';
import toast from 'react-hot-toast';
import { X, FileText, Image, Download } from 'lucide-react';

// Define helpers de formato localmente para asegurar disponibilidad
const formatNumberWithCommas = (amount, includeDecimals = true) => {
    return Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: includeDecimals ? 2 : 0,
        maximumFractionDigits: includeDecimals ? 2 : 0,
    });
};
const formatSaldoDisplay = (saldo, includeDecimals = true) => {
    const formattedAmount = formatNumberWithCommas(Math.abs(saldo), includeDecimals);
    if (saldo > 0) return `-${formattedAmount}`; // Deuda del cliente
    if (saldo < 0) return `$${formattedAmount}`;  // Saldo a favor del cliente
    return '$0.00';
};


export default function ModalEstadoCuenta({ 
    isOpen, 
    onClose, 
    cliente, 
    movimientos, 
    onGeneratePDF,
    onViewAsImage 
}) {

  if (!isOpen || !cliente || !cliente.client_id) return null;

  const saldoActual = movimientos && movimientos.length > 0 
    ? movimientos[movimientos.length - 1].saldo_acumulado 
    : (cliente.balance || 0);


  const handleDownloadPDF = () => {
      if (!movimientos || movimientos.length === 0) {
          toast('No hay datos para generar el PDF.', { icon: 'ℹ️' });
          return;
      }
      onGeneratePDF(cliente, movimientos); 
  };

  const handleViewImage = () => {
    if (!movimientos || movimientos.length === 0) {
        toast('No hay datos para generar la imagen del ticket.', { icon: 'ℹ️' });
        return;
    }
    if (onViewAsImage) {
        onViewAsImage(); 
    }
  };


  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-dark-800 p-6 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-gray-100">Estado de Cuenta</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium text-gray-200">{cliente.client_name}</p>
          <p className={`text-xl font-bold ${saldoActual > 0 ? 'text-error-400' : saldoActual < 0 ? 'text-success-400' : 'text-gray-300'}`}>
             Saldo Actual: {formatSaldoDisplay(saldoActual)}
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-3 text-gray-100">Movimientos:</h3>

        {!movimientos || movimientos.length === 0 ? (
          <div className="text-center py-12 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <p className="text-gray-400">No hay movimientos registrados para este cliente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-dark-900/50 rounded-lg border border-dark-700/50">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[20%]">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[25%]">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[30%]">Referencia / Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-[12.5%]">Monto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-[12.5%]">Saldo</th>
                </tr>
              </thead>
              <tbody className="bg-dark-900/30 divide-y divide-dark-700/50 text-sm">
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">{new Date(mov.created_at).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                    <td className="px-4 py-3 break-words text-gray-300">{mov.tipo_movimiento.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 break-words text-gray-300"> 
                      {mov.referencia_venta_id ? `Venta: ${mov.referencia_venta_id}` : (mov.descripcion || '-')}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-right ${mov.monto >= 0 ? 'text-success-400' : 'text-error-400'}`}>
                       {`${mov.monto >= 0 ? '+' : ''}${formatNumberWithCommas(mov.monto, false)}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-gray-200">
                         {formatSaldoDisplay(mov.saldo_acumulado, false)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end mt-6 space-x-3">
          <button
            onClick={handleViewImage} 
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            disabled={!movimientos || movimientos.length === 0} 
          >
            <Image size={16} />
            Ver Ticket
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            disabled={!movimientos || movimientos.length === 0}
          >
            <Download size={16} />
            Descargar PDF
          </button>
           <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors flex items-center gap-1"
          >
            <X size={16} />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
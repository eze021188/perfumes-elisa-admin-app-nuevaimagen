// src/components/ModalEstadoCuenta.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-semibold">Estado de Cuenta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium">{cliente.client_name}</p>
          <p className={`text-xl font-bold ${saldoActual > 0 ? 'text-red-600' : saldoActual < 0 ? 'text-green-600' : 'text-gray-700'}`}>
             Saldo Actual: {formatSaldoDisplay(saldoActual)}
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-3">Movimientos:</h3>

        {!movimientos || movimientos.length === 0 ? (
          <p className="text-center text-gray-500">No hay movimientos registrados para este cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  {/* MODIFICADO: Ajuste de padding y ancho si es necesario */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">Referencia / Descripción</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12.5%]">Monto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12.5%]">Saldo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {movimientos.map((mov) => (
                  <tr key={mov.id}>
                    {/* MODIFICADO: Ajuste de padding */}
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(mov.created_at).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric'})}</td>
                    {/* MODIFICADO: break-words y padding */}
                    <td className="px-4 py-3 break-words">{mov.tipo_movimiento.replace(/_/g, ' ')}</td>
                    {/* MODIFICADO: De truncate a break-words y padding */}
                    <td className="px-4 py-3 break-words"> 
                      {mov.referencia_venta_id ? `Venta: ${mov.referencia_venta_id}` : (mov.descripcion || '-')}
                    </td>
                     <td className={`px-4 py-3 whitespace-nowrap text-right ${mov.monto >= 0 ? 'text-green-700' : 'text-red-700'}`}> {/* Cambiado color de monto positivo a verde */}
                       {`${mov.monto >= 0 ? '+' : ''}${formatNumberWithCommas(mov.monto)}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                         {formatSaldoDisplay(mov.saldo_acumulado)}
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
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!movimientos || movimientos.length === 0} 
          >
            Ver Ticket (Imagen)
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!movimientos || movimientos.length === 0}
          >
            Descargar Estado PDF
          </button>
           <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

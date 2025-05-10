// src/components/ModalEstadoCuenta.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define helpers de formato localmente para asegurar disponibilidad
const formatNumberWithCommas = (amount) => {
    return Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
const formatSaldoDisplay = (saldo) => {
    const formattedAmount = formatNumberWithCommas(saldo);
    if (saldo > 0) return `-${formattedAmount}`;
    if (saldo < 0) return `$${formattedAmount}`;
    return '$0.00';
};


export default function ModalEstadoCuenta({ isOpen, onClose, cliente, onGeneratePDF }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState(null);

  // Efecto para cargar los movimientos detallados cuando el modal se abre
  useEffect(() => {
    // Verifica que el modal esté abierto Y que cliente.client_id exista (no sea undefined)
    if (isOpen && cliente && cliente.client_id) {
      const fetchMovimientos = async () => {
        setLoadingMovimientos(true);
        setErrorMovimientos(null);
        try {
          // >>> Consulta los movimientos para este cliente usando cliente.client_id <<<
          const { data, error } = await supabase
            .from('movimientos_cuenta_clientes')
            .select('*')
            .eq('cliente_id', cliente.client_id) // <<< Usar cliente.client_id
            .order('created_at', { ascending: true });

          if (error) throw error;

          // >>> Calcular el saldo acumulado <<<
          let saldoAcumulado = 0;
          const movimientosConSaldo = data.map(mov => {
              saldoAcumulado += mov.monto;
              return {
                  ...mov,
                  saldo_acumulado: saldoAcumulado
              };
          });

          setMovimientos(movimientosConSaldo);

        } catch (err) {
          console.error('Error cargando movimientos:', err.message);
          setErrorMovimientos('Error al cargar los movimientos del cliente.');
          toast.error('Error al cargar movimientos.');
        } finally {
          setLoadingMovimientos(false);
        }
      };

      fetchMovimientos();
    } else {
        // Limpiar al cerrar el modal
        setMovimientos([]);
        setLoadingMovimientos(false);
        setErrorMovimientos(null);
    }
  }, [isOpen, cliente]); // Depende de isOpen y cliente (para acceder a cliente.client_id)

  // No renderizar si no está abierto o no hay cliente O el cliente no tiene client_id (evita la consulta inicial con undefined)
  if (!isOpen || !cliente || !cliente.client_id) return null;

   // Calcular el saldo actual sumando todos los montos
  const saldoActual = movimientos.reduce((sum, mov) => sum + mov.monto, 0);


  // Manejador para descargar el PDF
  const handleDownloadPDF = () => {
      if (movimientos.length === 0) {
          toast('No hay datos para generar el PDF.', { icon: 'ℹ️' });
          return;
      }
      // onGeneratePDF recibe el cliente (con client_name) y los movimientos detallados (con saldo_acumulado)
      onGeneratePDF(cliente, movimientos);
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-semibold">Estado de Cuenta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium">{cliente.client_name}</p> {/* Usar client_name */}
          <p className={`text-xl font-bold ${saldoActual > 0 ? 'text-red-600' : saldoActual < 0 ? 'text-green-600' : 'text-gray-700'}`}>
             Saldo Actual: {formatSaldoDisplay(saldoActual)} {/* Usar helper de formato */}
          </p>
        </div>

        <h3 className="text-lg font-semibold mb-3">Movimientos:</h3>

        {loadingMovimientos ? (
          <p className="text-center">Cargando movimientos...</p>
        ) : errorMovimientos ? (
          <p className="text-center text-red-500">{errorMovimientos}</p>
        ) : movimientos.length === 0 ? (
          <p className="text-center text-gray-500">No hay movimientos registrados para este cliente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia / Descripción</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {movimientos.map((mov) => (
                  <tr key={mov.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(mov.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{mov.tipo_movimiento}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]">{mov.referencia_venta_id ? `Venta ID: ${mov.referencia_venta_id.substring(0, 8)}...` : (mov.descripcion || '-')}</td>
                     <td className={`px-4 py-2 whitespace-nowrap text-right ${mov.monto > 0 ? 'text-red-700' : 'text-green-700'}`}>
                       {/* Usar helper para formato de monto */}
                       {`${mov.monto < 0 ? '-' : '+'}${formatNumberWithCommas(mov.monto)}`}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                         {/* Usar helper para formato de saldo acumulado */}
                         {formatSaldoDisplay(mov.saldo_acumulado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={movimientos.length === 0 || loadingMovimientos}
          >
            Descargar Estado PDF
          </button>
           <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
            disabled={loadingMovimientos}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
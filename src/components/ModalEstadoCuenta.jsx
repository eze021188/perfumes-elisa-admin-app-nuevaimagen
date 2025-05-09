// src/components/ModalEstadoCuenta.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf'; // Asegúrate de que jsPDF esté importado si lo usas directamente aquí para la generación
import 'jspdf-autotable'; // Asegúrate de que jspdf-autotable esté importado


export default function ModalEstadoCuenta({ isOpen, onClose, cliente, onGeneratePDF }) {
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState(null);

  // Efecto para cargar los movimientos detallados cuando el modal se abre
  useEffect(() => {
    if (isOpen && cliente) {
      const fetchMovimientos = async () => {
        setLoadingMovimientos(true);
        setErrorMovimientos(null);
        try {
          // >>> Consulta los movimientos para este cliente, ordenados por fecha <<<
          const { data, error } = await supabase
            .from('movimientos_cuenta_clientes')
            .select('*') // Puedes seleccionar columnas específicas si no necesitas todas
            .eq('cliente_id', cliente.id)
            .order('created_at', { ascending: true }); // Ordenar cronológicamente

          if (error) throw error;

          // >>> Calcular el saldo acumulado <<<
          let saldoAcumulado = 0;
          const movimientosConSaldo = data.map(mov => {
              saldoAcumulado += mov.monto; // Suma o resta el monto del movimiento
              return {
                  ...mov,
                  saldo_acumulado: saldoAcumulado // Añade el campo calculado
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
  }, [isOpen, cliente]); // Depende de si el modal está abierto y de qué cliente está seleccionado

  if (!isOpen || !cliente) return null; // No renderizar si no está abierto o no hay cliente

   // Calcular el saldo actual sumando todos los montos (si los movimientos ya están cargados)
   // Aunque ya tenemos saldo_acumulado en el último movimiento, calcularlo aquí resume
   // Esencialmente es lo mismo que movimientos[movimientos.length - 1]?.saldo_acumulado || 0
  const saldoActual = movimientos.reduce((sum, mov) => sum + mov.monto, 0);


  // Manejador para descargar el PDF
  const handleDownloadPDF = () => {
      if (movimientos.length === 0) {
          toast('No hay movimientos para generar el PDF.', { icon: 'ℹ️' });
          return;
      }
      // Llama a la función generarPDFEstadoCuenta pasada desde la página principal
      // Le pasamos el cliente y los movimientos detallados (ya con saldo_acumulado)
      onGeneratePDF(cliente, movimientos);
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"> {/* Añadido padding para móviles */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto"> {/* Max width y scroll */}
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h2 className="text-xl font-semibold">Estado de Cuenta</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium">{cliente.nombre}</p>
          <p className={`text-xl font-bold ${saldoActual > 0 ? 'text-red-600' : saldoActual < 0 ? 'text-green-600' : 'text-gray-700'}`}>
             Saldo Actual: ${saldoActual.toFixed(2)}
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
          <div className="overflow-x-auto"> {/* Permite scroll horizontal en tablas pequeñas */}
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
                    {/* === INICIO: Formato corregido para evitar Whitespace Text Nodes === */}
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(mov.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{mov.tipo_movimiento}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]">{mov.referencia_venta_id ? `Venta ID: ${mov.referencia_venta_id.substring(0, 8)}...` : (mov.descripcion || '-')}</td>
                    <td className={`px-4 py-2 whitespace-nowrap text-right ${mov.monto > 0 ? 'text-red-700' : 'text-green-700'}`}>
                       {mov.monto.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                        {mov.saldo_acumulado.toFixed(2)}
                    </td>
                    {/* === FIN: Formato corregido === */}
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
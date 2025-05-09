// src/pages/SaldosClientes.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Necesario para las tablas en el PDF

// >>> Importa los componentes de modales <<<
import ModalAbono from '../components/ModalAbono'; // Asegúrate de que la ruta sea correcta
import ModalSaldoFavor from '../components/ModalSaldoFavor'; // Asegúrate de que la ruta sea correcta
import ModalEstadoCuenta from '../components/ModalEstadoCuenta'; // Asegúrate de que la ruta sea correcta


export default function SaldosClientes() {
  const navigate = useNavigate();

  const [clientesConSaldo, setClientesConSaldo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para modales/popups
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showSaldoFavorModal, setShowSaldoFavorModal] = useState(false);
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // Cliente para abonos/estado de cuenta

  // Efecto para cargar los datos al iniciar
  useEffect(() => {
    fetchClientesWithSaldo();
  }, []); // Se ejecuta solo una vez al montar

  // Función para cargar clientes con saldo pendiente (saldo > 0)
  const fetchClientesWithSaldo = async () => {
    setLoading(true);
    setError(null);
    try {
      // >>> Consulta para obtener clientes y la suma de sus movimientos <<<
      // Esta consulta obtiene todos los movimientos y luego calculamos el saldo en el frontend.
      // Es una forma simple, pero para muchos movimientos y clientes,
      // una función de base de datos o un View materializado podría ser más eficiente.
      const { data: movimientosData, error: movimientosError } = await supabase
        .from('movimientos_cuenta_clientes')
        .select(`
          cliente_id,
          clientes ( nombre, id ), // Join implícito para obtener nombre y ID del cliente
          monto
        `); // No filtramos aquí, procesamos en el frontend

      if (movimientosError) throw movimientosError;

      // Procesar los datos para calcular el saldo por cliente
      const saldos = {};
      movimientosData.forEach(mov => {
        const clienteId = mov.cliente_id;
        // Asegúrate de que el objeto 'clientes' existe (siempre debería existir si la FK es correcta)
        if (mov.clientes === null) {
             console.warn(`Movimiento ${mov.id} sin cliente asociado!`);
             return; // Saltar este movimiento si no tiene cliente (debería evitarse con FK)
        }
        const clienteNombre = mov.clientes.nombre;
        const monto = mov.monto;

        if (!saldos[clienteId]) {
          saldos[clienteId] = {
            id: clienteId,
            nombre: clienteNombre,
            saldo: 0,
          };
        }
        saldos[clienteId].saldo += monto;
      });

      // Convertir el objeto a un array y filtrar los que tienen saldo > 0
      // Opcional: ordenar por nombre o saldo
      const clientesConSaldoArray = Object.values(saldos)
         .filter(c => c.saldo > 0)
         .sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenar por nombre alfabéticamente

      setClientesConSaldo(clientesConSaldoArray);

    } catch (err) {
      console.error('Error cargando saldos:', err.message);
      setError('Error al cargar los saldos de los clientes.');
      toast.error('Error al cargar los saldos.');
    } finally {
      setLoading(false);
    }
  };

  // --- Funciones para abrir modales ---
  const openAbonoModal = (cliente) => {
    setClienteSeleccionado(cliente);
    setShowAbonoModal(true);
  };

  const openSaldoFavorModal = (cliente) => {
     setClienteSeleccionado(cliente);
     setShowSaldoFavorModal(true);
  };

  const openEstadoCuentaModal = (cliente) => {
    setClienteSeleccionado(cliente);
    setShowEstadoCuentaModal(true);
    // La carga de movimientos detallados se hará dentro del ModalEstadoCuenta
  };


  // --- Funciones para registrar movimientos (serán pasadas a los modales) ---
  // Estas funciones actualizan la base de datos y luego recargan la lista de saldos

  const handleRecordAbono = async (clienteId, montoAbono, descripcion = 'Pago cliente') => {
      if (montoAbono <= 0) {
          toast.error("El monto del abono debe ser positivo.");
          return { success: false }; // Indicar fallo
      }
      const montoMovimiento = -montoAbono; // Monto negativo

      try {
          const { error } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: clienteId,
                  tipo_movimiento: 'ABONO_PAGO',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);

          if (error) {
              console.error('Error al registrar abono:', error.message);
              toast.error(`Error al registrar el abono: ${error.message}`); // Mostrar error específico si es útil
              return { success: false, error: error.message };
          } else {
              toast.success('Abono registrado con éxito.');
              fetchClientesWithSaldo(); // Vuelve a cargar los saldos para actualizar la lista en la página principal
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al registrar abono:', err.message);
          toast.error('Ocurrió un error inesperado al registrar el abono.');
          return { success: false, error: err.message };
      }
  };

  const handleAddCredit = async (clienteId, montoCredito, descripcion = 'Crédito a favor') => {
       if (montoCredito <= 0) {
          toast.error("El monto del crédito debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoCredito; // Monto negativo (a favor del cliente)

      try {
          const { error } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: clienteId,
                  tipo_movimiento: 'CREDITO_FAVOR',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);

          if (error) {
              console.error('Error al añadir crédito:', error.message);
              toast.error(`Error al añadir saldo a favor: ${error.message}`); // Mostrar error específico
               return { success: false, error: error.message };
          } else {
              toast.success('Saldo a favor añadido con éxito.');
              fetchClientesWithSaldo(); // Vuelve a cargar los saldos para actualizar la lista
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al añadir crédito:', err.message);
          toast.error('Ocurrió un error inesperado al añadir saldo a favor.');
          return { success: false, error: err.message };
      }
  };

  // --- Función para generar PDF (Llamada desde ModalEstadoCuenta) ---
  // Esta función necesita recibir el cliente y los movimientos detallados (ya cargados y procesados en el modal)
  const generarPDFEstadoCuenta = (cliente, movimientosDetallados) => {
      if (!cliente || !movimientosDetallados || movimientosDetallados.length === 0) {
          toast('No hay datos para generar el PDF.', { icon: 'ℹ️' });
          return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Estado de Cuenta - ${cliente.nombre}`, 10, 15);
      doc.setFontSize(10);
      doc.text(`Fecha Generación: ${new Date().toLocaleString()}`, 10, 25);

      const rows = movimientosDetallados.map(mov => [
          new Date(mov.created_at).toLocaleDateString(),
          mov.tipo_movimiento,
          // Mostrar referencia de venta si existe, si no la descripción
          mov.referencia_venta_id ? `Venta ID: ${mov.referencia_venta_id.substring(0, 8)}...` : (mov.descripcion || '-'),
          mov.monto.toFixed(2), // Monto del movimiento (+ o -)
          // Usar el saldo acumulado calculado en el modal
          mov.saldo_acumulado.toFixed(2)
      ]);

      // El saldo final ya es el último saldo_acumulado de la lista de movimientos detallados
       const saldoFinal = movimientosDetallados.length > 0 ? movimientosDetallados[movimientosDetallados.length - 1].saldo_acumulado : 0;


      doc.autoTable({
          head: [['Fecha', 'Tipo', 'Referencia / Descripción', 'Monto', 'Saldo Acumulado']],
          body: rows,
          startY: 35,
           didDrawPage: (data) => { // Opcional: Añadir pie de página si es largo
              let pageNumber = doc.internal.getNumberOfPages()
              doc.setFontSize(8)
              // Posicionar el número de página en la parte inferior derecha
              doc.text('Página ' + pageNumber, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 5, { align: 'right' })
           },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
          columnStyles: { // Alineación de columnas
              3: { halign: 'right' }, // Monto a la derecha
              4: { halign: 'right' } // Saldo acumulado a la derecha
          },
          margin: { top: 30, right: 10, bottom: 10, left: 10 } // Márgenes para evitar superposición con encabezado/pie
      });

      // Añadir saldo final después de la tabla
       const finalY = doc.lastAutoTable.finalY + 10;
       doc.text(`Saldo Actual: $${saldoFinal.toFixed(2)}`, 10, finalY);


      // Abrir PDF en una nueva ventana
      doc.output('dataurlnewwindow');
  };


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Saldos de Clientes (Cuentas por Cobrar)
        </h1>
         <div className="w-full md:w-[150px]" /> {/* Spacer */}
      </div>

      {/* Barra de búsqueda (Opcional, implementar si necesitas buscar clientes por nombre) */}
      {/* <div className="mb-6">
           <input type="text" placeholder="Buscar cliente..." className="p-2 border rounded w-full" />
      </div> */}

      {/* Tabla de Clientes con Saldo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-4 text-center">Cargando...</p>
        ) : error ? (
          <p className="p-4 text-center text-red-500">{error}</p>
        ) : clientesConSaldo.length === 0 ? (
          <p className="p-4 text-center">No hay clientes con saldo pendiente actualmente.</p>
        ) : (
          <div className="overflow-x-auto"> {/* Asegura scroll en pantallas pequeñas */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo Pendiente
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientesConSaldo.map(cliente => (
                  // Fila clicable para abrir estado de cuenta
                  <tr key={cliente.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEstadoCuentaModal(cliente)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cliente.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">
                      ${cliente.saldo.toFixed(2)} {/* Mostrar el saldo calculado */}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {/* Botones de acción, prevenimos la propagación del clic */}
                        <button
                            onClick={(e) => { e.stopPropagation(); openAbonoModal(cliente); }}
                            className="text-blue-600 hover:text-blue-900 mr-3 text-sm" // Añadido text-sm
                            title="Registrar Abono"
                        >
                            Abonar
                        </button>
                         <button
                            onClick={(e) => { e.stopPropagation(); openSaldoFavorModal(cliente); }}
                            className="text-green-600 hover:text-green-900 text-sm" // Añadido text-sm
                             title="Añadir Saldo a Favor"
                        >
                            + Saldo Favor
                        </button>
                         {/* El clic en la fila abre el estado de cuenta, no necesitas un botón aquí */}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales (YA NO ESTÁN COMENTADOS) */}

      {/* Modal para registrar Abono */}
      <ModalAbono
          isOpen={showAbonoModal}
          onClose={() => setShowAbonoModal(false)}
          cliente={clienteSeleccionado} // Pasa el cliente seleccionado al modal
          onRecordAbono={handleRecordAbono} // Pasa la función para registrar abono
      />

      {/* Modal para añadir Saldo a Favor */}
      <ModalSaldoFavor
           isOpen={showSaldoFavorModal}
           onClose={() => setShowSaldoFavorModal(false)}
           cliente={clienteSeleccionado} // Pasa el cliente seleccionado al modal
           onAddCredit={handleAddCredit} // Pasa la función para añadir crédito
       />

      {/* Modal para ver Estado de Cuenta y descargar PDF */}
      <ModalEstadoCuenta
           isOpen={showEstadoCuentaModal}
           onClose={() => setShowEstadoCuentaModal(false)}
           cliente={clienteSeleccionado} // Pasa el cliente seleccionado al modal
           onGeneratePDF={generarPDFEstadoCuenta} // Pasa la función para generar PDF
      />

    </div>
  );
}
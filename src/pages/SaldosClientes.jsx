// src/pages/SaldosClientes.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { differenceInDays } from 'date-fns'; // Importa solo differenceInDays

// Importa los componentes de modales
import ModalAbono from '../components/ModalAbono';
import ModalSaldoFavor from '../components/ModalSaldoFavor';
import ModalEstadoCuenta from '../components/ModalEstadoCuenta';


export default function SaldosClientes() {
  const navigate = useNavigate();

  // allClientsData ahora tendrá campos de la RPC (client_id, client_name, balance, etc.)
  const [allClientsData, setAllClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el filtro activo ('owing', 'credit', 'all')
  const [activeFilter, setActiveFilter] = useState('owing');

  // Estado para la búsqueda por nombre
  const [searchText, setSearchText] = useState('');

  // Estados para modales/popups
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showSaldoFavorModal, setShowSaldoFavorModal] = useState(false);
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);
  // clienteSeleccionado ahora tendrá la estructura de datos de la RPC
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Efecto para cargar los datos al iniciar
  useEffect(() => {
    fetchClientsData(); // Llama a la función de fetching con la nueva RPC
  }, []);

  // Función para obtener datos de clientes, saldos y fechas usando la nueva RPC
  const fetchClientsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_clients_balance_and_dates'); // Llama a la RPC

      if (error) throw error;

      const today = new Date(); // Fecha actual

      // Procesar los datos para calcular los días
      const clientsWithCalculatedDays = data.map(client => {
          // Calcular días sin pagar (desde el último abono)
          const daysSinceLastPayment = client.latest_payment_date
              ? differenceInDays(today, new Date(client.latest_payment_date))
              : null; // Null si no hay abonos

          // Calcular días desde la primera compra (desde el primer cargo por venta)
          const daysSinceFirstPurchase = client.first_purchase_date
              ? differenceInDays(today, new Date(client.first_purchase_date))
              : null; // Null si no hay cargos por venta

          return {
              ...client, // Incluye client_id, client_name, balance, latest_payment_date, first_purchase_date
              daysSinceLastPayment,
              daysSinceFirstPurchase,
          };
      }).sort((a, b) => a.client_name.localeCompare(b.client_name)); // Opcional: ordenar por nombre

      setAllClientsData(clientsWithCalculatedDays); // Guarda los datos con días calculados

    } catch (err) {
      console.error('Error cargando datos de clientes con fechas:', err.message);
      setError('Error al cargar los datos de clientes.');
      toast.error('Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  // --- Helper para formatear número con separador de miles y decimales ---
  const formatNumberWithCommas = (amount) => {
       return Math.abs(amount).toLocaleString('en-US', {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
       });
   };

   // --- Helper para formatear el Saldo según las reglas ---
   const formatSaldoDisplay = (saldo) => {
       const formattedAmount = formatNumberWithCommas(saldo);

       if (saldo > 0) {
           return `-${formattedAmount}`;
       } else if (saldo < 0) {
           return `$${formattedAmount}`;
       } else {
           return '$0.00';
       }
   };


  // --- Cálculos de totales (usando useMemo) ---
  const totalPorCobrar = useMemo(() => {
    return allClientsData
      .filter(c => c.balance > 0)
      .reduce((sum, c) => sum + c.balance, 0);
  }, [allClientsData]);

  const totalSaldoFavor = useMemo(() => {
    return allClientsData
      .filter(c => c.balance < 0)
      .reduce((sum, c) => sum + c.balance, 0);
  }, [allClientsData]);


  // --- Aplicar búsqueda y filtro de saldo (usando useMemo) ---
  const filteredAndSearchedClients = useMemo(() => {
    let result = allClientsData; // Usamos allClientsData

    const lowerSearchText = searchText.toLowerCase();

    // 1. Aplicar búsqueda primero, si hay texto
    if (searchText) {
        result = result.filter(c =>
            c.client_name.toLowerCase().includes(lowerSearchText) // Usar client_name para buscar
        );
    }

    // 2. Aplicar filtro de saldo al resultado de la búsqueda (o a la lista completa si no hay búsqueda)
    if (activeFilter === 'owing') {
      result = result.filter(c => c.balance > 0); // Usar balance
    } else if (activeFilter === 'credit') {
      result = result.filter(c => c.balance < 0); // Usar balance
    }
    // Si activeFilter es 'all', no filtramos por saldo en este paso

    return result; // Retorna la lista final filtrada y buscada

  }, [allClientsData, activeFilter, searchText]); // Depende de allClientsData, filtro y texto de búsqueda


  // --- Funciones para abrir modales ---
  // Pasan el objeto cliente completo (con todos sus datos, incluyendo días/fechas)
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
    // El modal EstadoCuenta necesitará usar cliente.client_id para cargar sus movimientos detallados
  };


  // --- Funciones para registrar movimientos ---
  // Pasan cliente.client_id a las llamadas a Supabase
  const handleRecordAbono = async (cliente, montoAbono, descripcion = 'Pago cliente') => { // Recibe el objeto cliente
      if (montoAbono <= 0) {
          toast.error("El monto del abono debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoAbono;

      try {
          const { error } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: cliente.client_id, // <<< Usar cliente.client_id
                  tipo_movimiento: 'ABONO_PAGO',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);

          if (error) {
              console.error('Error al registrar abono:', error.message);
              toast.error(`Error al registrar el abono: ${error.message}`);
              return { success: false, error: error.message };
          } else {
              toast.success('Abono registrado con éxito.');
              fetchClientsData(); // Recarga todos los datos con la nueva RPC
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al registrar abono:', err.message);
          toast.error('Ocurrió un error inesperado al registrar el abono.');
          return { success: false, error: err.message };
      }
  };

  const handleAddCredit = async (cliente, montoCredito, descripcion = 'Crédito a favor') => { // Recibe el objeto cliente
       if (montoCredito <= 0) {
          toast.error("El monto del crédito debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoCredito; // Monto negativo (a favor del cliente)

      try {
          const { error } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: cliente.client_id, // <<< Usar cliente.client_id
                  tipo_movimiento: 'CREDITO_FAVOR',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);

          if (error) {
              console.error('Error al añadir crédito:', error.message);
              toast.error(`Error al añadir saldo a favor: ${error.message}`);
               return { success: false, error: error.message };
          } else {
              toast.success('Saldo a favor añadido con éxito.');
              fetchClientsData(); // Recarga todos los datos con la nueva RPC
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al añadir crédito:', err.message);
          toast.error('Ocurrió un error inesperado al añadir saldo a favor.');
          return { success: false, error: err.message };
      }
  };

  // --- Función para generar PDF (Llamada desde ModalEstadoCuenta) ---
   // Recibe el cliente (con estructura de RPC) y los movimientos detallados (cargados en el modal)
  const generarPDFEstadoCuenta = (cliente, movimientosDetallados) => {
      if (!cliente || !movimientosDetallados || movimientosDetallados.length === 0) {
          toast('No hay datos para generar el PDF.', { icon: 'ℹ️' });
          return;
      }

      const doc = new jsPDF();
      doc.setFontSize(16);
      // Usar client_name del objeto cliente
      doc.text(`Estado de Cuenta - ${cliente.client_name}`, 10, 15);
      doc.setFontSize(10);
      doc.text(`Fecha Generación: ${new Date().toLocaleString()}`, 10, 25);

      const rows = movimientosDetallados.map(mov => [
          new Date(mov.created_at).toLocaleDateString(),
          mov.tipo_movimiento,
          mov.referencia_venta_id ? `Venta ID: ${mov.referencia_venta_id.substring(0, 8)}...` : (mov.descripcion || '-'),
          `${mov.monto < 0 ? '-' : '+'}${formatNumberWithCommas(mov.monto)}`,
          formatSaldoDisplay(mov.saldo_acumulado)
      ]);

      const saldoFinal = movimientosDetallados.length > 0 ? movimientosDetallados[movimientosDetallados.length - 1].saldo_acumulado : 0;
       const saldoFinalDisplay = formatSaldoDisplay(saldoFinal);


      doc.autoTable({
          head: [['Fecha', 'Tipo', 'Referencia / Descripción', 'Monto', 'Saldo Acumulado']],
          body: rows,
          startY: 35,
           didDrawPage: (data) => {
              let pageNumber = doc.internal.getNumberOfPages()
              doc.setFontSize(8)
              doc.text('Página ' + pageNumber, doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 5, { align: 'right' })
           },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
          columnStyles: {
              3: { halign: 'right' },
              4: { halign: 'right' }
          },
          margin: { top: 30, right: 10, bottom: 10, left: 10 }
      });

       const finalY = doc.lastAutoTable.finalY + 10;
       doc.text(`Saldo Actual: ${saldoFinalDisplay}`, 10, finalY);


      doc.output('dataurlnewwindow');
  };


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus::ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto"> {/* Corregido 't ext-center' */}
          Estados de cuenta
        </h1>
         <div className="w-full md:w-[150px]" /> {/* Spacer */}
      </div>

      {/* Área de Resumen de Totales y Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Resumen Por Cobrar */}
              <div className="text-center md:text-left">
                  <p className="text-lg font-medium text-gray-600">Total Por Cobrar</p>
                  {/* Formato específico: -$ seguido del valor absoluto formateado, o $0.00 si es 0 */}
                  <p className="text-2xl font-bold text-red-600">
                      {totalPorCobrar === 0 ? '$0.00' : `-${formatNumberWithCommas(totalPorCobrar)}`}
                  </p>
              </div>

              {/* Resumen Saldo a Favor */}
              <div className="text-center md:text-left">
                   <p className="text-lg font-medium text-gray-600">Total Saldo a Favor</p>
                  <p className="text-2xl font-bold text-green-600">
                       ${formatNumberWithCommas(totalSaldoFavor)}
                  </p>
              </div>

              {/* Controles de Filtro y Búsqueda */}
              <div className="flex flex-col gap-3 justify-center md:justify-end">
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                          onClick={() => setActiveFilter('owing')}
                          className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                              ${activeFilter === 'owing'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                  : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                              }`}
                      >
                          Clientes por Cobrar ({allClientsData.filter(c => c.balance > 0).length})
                      </button>
                       <button
                          onClick={() => setActiveFilter('credit')}
                           className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                               ${activeFilter === 'credit'
                                   ? 'bg-green-600 text-white border-green-600 shadow-md'
                                   : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                               }`}
                      >
                          Clientes Saldo a Favor ({allClientsData.filter(c => c.balance < 0).length})
                      </button>
                  </div>
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                           onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                                ${activeFilter === 'all'
                                    ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-600 hover:bg-gray-100'
                                }`}
                       >
                           Mostrar todos ({allClientsData.length})
                       </button>
                       <input
                           type="text"
                           placeholder="Buscar cliente..."
                           value={searchText}
                           onChange={(e) => setSearchText(e.target.value)}
                           className="p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       />
                  </div>
              </div>
          </div>
      </div>


      {/* Tabla de Clientes Filtrados y Buscados */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-4 text-center">Cargando...</p>
        ) : error ? (
          <p className="p-4 text-center text-red-500">{error}</p>
        ) : filteredAndSearchedClients.length === 0 ? (
          <p className="p-4 text-center text-gray-500">
              {searchText ? `No se encontraron clientes para "${searchText}" con el filtro actual.` : (
                  activeFilter === 'owing' ? "No hay clientes con saldo pendiente actualmente." :
                  activeFilter === 'credit' ? "No hay clientes con saldo a favor actualmente." :
                  "No hay clientes registrados en el sistema."
              )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
  {/* === Formato super compacto para evitar Whitespace Text Nodes en thead === */}
  <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Días sin pagar</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Días desde compra</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th></tr>
  {/* === Fin Formato super compacto en thead === */}
</thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSearchedClients.map(cliente => (
                  // Usa client_id como key
                  <tr key={cliente.client_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEstadoCuentaModal(cliente)}>
                    {/* Celda Cliente */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cliente.client_name} {/* Usar client_name */}
                    </td>

                    {/* === Nuevas Celdas de Datos Condicionales === */}
                     {cliente.balance <= 0 ? (
                         // Si el saldo es cero o negativo, mostrar "Sin adeudo" en ambas celdas
                         <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-600 font-medium" colSpan="2">
                             Sin adeudo
                         </td>
                     ) : (
                         // Si el saldo es positivo (debe), mostrar los días calculados
                         <>
                             <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-800">
                                 {/* Mostrar días sin pagar o '-' si no hay fecha de último pago */}
                                 {cliente.daysSinceLastPayment !== null ? `${cliente.daysSinceLastPayment} días` : '-'}
                             </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-800">
                                 {/* Mostrar días desde primera compra o '-' si no hay fecha (debería haber si debe) */}
                                 {cliente.daysSinceFirstPurchase !== null ? `${cliente.daysSinceFirstPurchase} días` : '-'}
                             </td>
                         </>
                     )}
                    {/* ========================================== */}

                    {/* Celda Saldo */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold
                        ${cliente.balance > 0 ? 'text-red-600' : cliente.balance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {formatSaldoDisplay(cliente.balance)}
                    </td>

                    {/* Celda Acciones */}
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); openAbonoModal(cliente); }}
                            className="text-blue-600 hover:text-blue-900 mr-3 text-sm"
                            title="Registrar Abono"
                        >
                            Abonar
                        </button>
                         <button
                            onClick={(e) => { e.stopPropagation(); openSaldoFavorModal(cliente); }}
                            className="text-green-600 hover:text-green-900 text-sm"
                             title="Añadir Saldo a Favor"
                        >
                            Saldo Favor
                        </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      <ModalAbono
          isOpen={showAbonoModal}
          onClose={() => {setShowAbonoModal(false); setClienteSeleccionado(null);}}
          cliente={clienteSeleccionado} // Pasamos el objeto cliente (con client_id, etc.)
          onRecordAbono={handleRecordAbono} // Esta función ahora espera el objeto cliente
      />
      <ModalSaldoFavor
           isOpen={showSaldoFavorModal}
           onClose={() => {setShowSaldoFavorModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado} // Pasamos el objeto cliente (con client_id, etc.)
           onAddCredit={handleAddCredit} // Esta función ahora espera el objeto cliente
       />
      <ModalEstadoCuenta
           isOpen={showEstadoCuentaModal}
           onClose={() => {setShowEstadoCuentaModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado} // Pasamos el objeto cliente (con client_id, etc.)
           onGeneratePDF={generarPDFEstadoCuenta} // Esta función ahora espera el objeto cliente (con client_name)
      />

    </div>
  );
}
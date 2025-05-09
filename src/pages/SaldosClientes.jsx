// src/pages/SaldosClientes.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Importa los componentes de modales
import ModalAbono from '../components/ModalAbono';
import ModalSaldoFavor from '../components/ModalSaldoFavor';
import ModalEstadoCuenta from '../components/ModalEstadoCuenta';


export default function SaldosClientes() {
  const navigate = useNavigate();

  const [allClientsWithCalculatedBalance, setAllClientsWithCalculatedBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el filtro activo ('owing', 'credit', 'all')
  // Por defecto mostramos solo los que deben (owing)
  const [activeFilter, setActiveFilter] = useState('owing');

  // Estado para la búsqueda por nombre
  const [searchText, setSearchText] = useState('');

  // Estados para modales/popups
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showSaldoFavorModal, setShowSaldoFavorModal] = useState(false);
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Efecto para cargar los datos al iniciar
  useEffect(() => {
    fetchAllClientsAndCalculateBalances();
  }, []);

  // Función para obtener TODOS los clientes y calcular sus saldos
  const fetchAllClientsAndCalculateBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener todos los clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nombre');

      if (clientesError) throw clientesError;

      // 2. Obtener todos los movimientos de cuenta
      const { data: movimientosData, error: movimientosError } = await supabase
        .from('movimientos_cuenta_clientes')
        .select('cliente_id, monto');

      if (movimientosError) throw movimientosError;

      // 3. Calcular saldos fusionando datos de clientes y movimientos
      const clientBalancesMap = {};

      // Inicializar todos los clientes con saldo 0
      clientesData.forEach(cliente => {
        clientBalancesMap[cliente.id] = {
          id: cliente.id,
          nombre: cliente.nombre,
          saldo: 0,
        };
      });

      // Sumar los montos de los movimientos a los saldos correspondientes
      movimientosData.forEach(mov => {
        if (clientBalancesMap[mov.cliente_id]) {
          clientBalancesMap[mov.cliente_id].saldo += mov.monto;
        } else {
            console.warn(`Movimiento encontrado para cliente ID ${mov.cliente_id} que no existe en la tabla clientes!`);
        }
      });

      // Convertir el mapa a un array y ordenar
      const clientsWithBalanceArray = Object.values(clientBalancesMap)
         .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setAllClientsWithCalculatedBalance(clientsWithBalanceArray); // Guarda TODOS los clientes con su saldo

    } catch (err) {
      console.error('Error cargando datos de clientes y saldos:', err.message);
      setError('Error al cargar los datos de los clientes y sus saldos.');
      toast.error('Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  // --- Helper para formatear número con separador de miles y decimales ---
  const formatNumberWithCommas = (amount) => {
       return Math.abs(amount).toLocaleString('en-US', { // Usamos Math.abs porque el signo lo añadimos manualmente
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
       });
   };

   // --- Helper para formatear el Saldo según las reglas ---
   const formatSaldoDisplay = (saldo) => {
       const formattedAmount = formatNumberWithCommas(saldo);

       if (saldo > 0) {
           // Por Cobrar (positivo), mostrar -$ + valor absoluto, color rojo
           return `-${formattedAmount}`;
       } else if (saldo < 0) {
           // Saldo a Favor (negativo), mostrar $ + valor absoluto, color verde
           return `$${formattedAmount}`;
       } else {
           // Saldo Cero, mostrar $0.00, color gris/neutro
           return '$0.00';
       }
   };


  // --- Cálculos de totales (usando useMemo) ---
  const totalPorCobrar = useMemo(() => {
    return allClientsWithCalculatedBalance
      .filter(c => c.saldo > 0)
      .reduce((sum, c) => sum + c.saldo, 0);
  }, [allClientsWithCalculatedBalance]);

  const totalSaldoFavor = useMemo(() => {
    return allClientsWithCalculatedBalance
      .filter(c => c.saldo < 0)
      .reduce((sum, c) => sum + c.saldo, 0);
  }, [allClientsWithCalculatedBalance]);


  // --- Aplicar búsqueda y filtro de saldo (usando useMemo) ---
  const filteredAndSearchedClients = useMemo(() => {
    let result = allClientsWithCalculatedBalance;
    const lowerSearchText = searchText.toLowerCase();

    // 1. Aplicar búsqueda primero, si hay texto
    if (searchText) {
        result = result.filter(c =>
            c.nombre.toLowerCase().includes(lowerSearchText)
        );
    }

    // 2. Aplicar filtro de saldo al resultado de la búsqueda (o a la lista completa si no hay búsqueda)
    if (activeFilter === 'owing') {
      result = result.filter(c => c.saldo > 0);
    } else if (activeFilter === 'credit') {
      result = result.filter(c => c.saldo < 0);
    }
    // Si activeFilter es 'all', no filtramos por saldo en este paso

    return result; // Retorna la lista final filtrada y buscada

  }, [allClientsWithCalculatedBalance, activeFilter, searchText]); // Depende de los datos completos, filtro y texto de búsqueda


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
  // Después de un registro exitoso, volvemos a cargar TODOS los clientes y saldos
  const handleRecordAbono = async (clienteId, montoAbono, descripcion = 'Pago cliente') => {
      if (montoAbono <= 0) {
          toast.error("El monto del abono debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoAbono;

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
              toast.error(`Error al registrar el abono: ${error.message}`);
              return { success: false, error: error.message };
          } else {
              toast.success('Abono registrado con éxito.');
              fetchAllClientsAndCalculateBalances(); // <<< Recarga TODOS los datos
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
      const montoMovimiento = -montoCredito;

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
              toast.error(`Error al añadir saldo a favor: ${error.message}`);
               return { success: false, error: error.message };
          } else {
              toast.success('Saldo a favor añadido con éxito.');
              fetchAllClientsAndCalculateBalances(); // <<< Recarga TODOS los datos
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al añadir crédito:', err.message);
          toast.error('Ocurrió un error inesperado al añadir saldo a favor.');
          return { success: false, error: err.message };
      }
  };

  // --- Función para generar PDF (Llamada desde ModalEstadoCuenta) ---
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
          mov.referencia_venta_id ? `Venta ID: ${mov.referencia_venta_id.substring(0, 8)}...` : (mov.descripcion || '-'),
          // Monto del movimiento: muestra el signo real (+ o -) para que el estado de cuenta tenga sentido
          // Usamos formatNumberWithCommas para el formato, y añadimos el signo manualmente
          `${mov.monto < 0 ? '-' : '+'}${formatNumberWithCommas(mov.monto)}`,
          // Saldo Acumulado: Aplicamos el formato especial condicional
          formatSaldoDisplay(mov.saldo_acumulado)
      ]);

      // Saldo final: Aplicamos el formato especial condicional
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
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Saldos de Clientes (Cuentas por Cobrar)
        </h1>
         <div className="w-full md:w-[150px]" /> {/* Spacer */}
      </div>

      {/* Área de Resumen de Totales y Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Resumen Por Cobrar */}
              <div className="text-center md:text-left">
                  <p className="text-lg font-medium text-gray-600">Total Por Cobrar</p>
                  {/* Formato específico: -$ seguido del valor absoluto formateado */}
                  <p className="text-2xl font-bold text-red-600">
                      -${formatNumberWithCommas(totalPorCobrar)}
                  </p>
              </div>

              {/* Resumen Saldo a Favor */}
              <div className="text-center md:text-left">
                   <p className="text-lg font-medium text-gray-600">Total Saldo a Favor</p>
                  {/* Formato específico: $ seguido del valor absoluto formateado (sin signo negativo) */}
                  <p className="text-2xl font-bold text-green-600">
                       ${formatNumberWithCommas(totalSaldoFavor)}
                  </p>
              </div>

              {/* Controles de Filtro y Búsqueda */}
              {/* Usamos flexbox en columnas con gap para separar las líneas */}
              <div className="flex flex-col gap-3 justify-center md:justify-end"> {/* Cambiado a flex-col con gap */}
                  {/* Primera fila de botones de filtro */}
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                          onClick={() => setActiveFilter('owing')}
                          className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                              ${activeFilter === 'owing'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                  : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                              }`}
                      >
                          Clientes por Cobrar ({allClientsWithCalculatedBalance.filter(c => c.saldo > 0).length})
                      </button>
                       <button
                          onClick={() => setActiveFilter('credit')}
                           className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                               ${activeFilter === 'credit'
                                   ? 'bg-green-600 text-white border-green-600 shadow-md'
                                   : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                               }`}
                      >
                          Clientes Saldo a Favor ({allClientsWithCalculatedBalance.filter(c => c.saldo < 0).length})
                      </button>
                  </div>
                  {/* Segunda fila: Botón "Mostrar todos" y campo de búsqueda */}
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                           onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                                ${activeFilter === 'all'
                                    ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-600 hover:bg-gray-100'
                                }`}
                       >
                           Mostrar todos ({allClientsWithCalculatedBalance.length})
                       </button>
                       {/* Campo de búsqueda */}
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
                {/* === Formato corregido para evitar Whitespace Text Nodes en thead === */}
                <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th></tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSearchedClients.map(cliente => (
                  // Fila clicable para abrir estado de cuenta
                  <tr key={cliente.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEstadoCuentaModal(cliente)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cliente.nombre}
                    </td>
                    {/* Aplicamos el formato especial condicional según el saldo */}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold
                        ${cliente.saldo > 0 ? 'text-red-600' : cliente.saldo < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {formatSaldoDisplay(cliente.saldo)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {/* Botones de acción, prevenimos la propagación del clic */}
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
          cliente={clienteSeleccionado}
          onRecordAbono={handleRecordAbono}
      />
      <ModalSaldoFavor
           isOpen={showSaldoFavorModal}
           onClose={() => {setShowSaldoFavorModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado}
           onAddCredit={handleAddCredit}
       />
      <ModalEstadoCuenta
           isOpen={showEstadoCuentaModal}
           onClose={() => {setShowEstadoCuentaModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado}
           onGeneratePDF={generarPDFEstadoCuenta}
      />

    </div>
  );
}
// src/pages/Clientes.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../contexts/ClientesContext'; // Contexto para clientes
import NewClientModal from '../components/NewClientModal'; // Para agregar/editar clientes
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

// Componentes divididos
import ClientesAccionesBarra from '../components/clientes_temp/ClientesAccionesBarra';
import ClientesTabla from '../components/clientes_temp/ClientesTabla';
import ClientesPaginacion from '../components/clientes_temp/ClientesPaginacion';
import ClienteVentasModal from '../components/clientes_temp/ClienteVentasModal';
import ClienteVentaDetalleModal from '../components/clientes_temp/ClienteVentaDetalleModal'; // El que está en el Canvas
import HtmlTicketDisplay from '../components/HtmlTicketDisplay'; // Para el ticket HTML

import { useAuth } from '../contexts/AuthContext'; // Para info del vendedor

// Helpers (podrían estar en un archivo utils/)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '$0.00';
    return numericAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image for PDF:", error);
        return null;
    }
};

export default function Clientes() {
  const navigate = useNavigate();
  // Usamos el contexto para obtener y manipular la lista global de clientes
  const { clientes, loading: clientesLoadingFromContext, addCliente, actualizarCliente, eliminarCliente: eliminarClienteContext } = useClientes();
  const { user: currentUser } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Para el modal de "Ventas de [Cliente]"
  const [clienteActualParaVentas, setClienteActualParaVentas] = useState(null); 
  const [ventasDelClienteSeleccionado, setVentasDelClienteSeleccionado] = useState([]);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  
  // Para el modal de "Agregar/Editar Cliente"
  const [showNewOrEditClientModal, setShowNewOrEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  
  // Para el modal de "Detalle de Venta" (que se abre desde el modal de ventas del cliente)
  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);
  const [selectedSaleDetailsItems, setSelectedSaleDetailsItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelSaleLoading, setCancelSaleLoading] = useState(false);

  // Para tickets
  const [showHtmlTicket, setShowHtmlTicket] = useState(false);
  const [htmlTicketData, setHtmlTicketData] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [clienteInfoForTicket, setClienteInfoForTicket] = useState(null);
  const [vendedorInfoForTicket, setVendedorInfoForTicket] = useState(null);
  const [clienteBalanceForTicket, setClienteBalanceForTicket] = useState(0);

  // Paginación y ordenamiento para la tabla de clientes
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
      async function loadLogoImg() {
          const base64 = await getBase64Image('/images/PERFUMESELISAwhite.jpg');
          setLogoBase64(base64);
      }
      loadLogoImg();
  }, []);

  const handleSort = (column) => {
      setSortDirection(prevDirection => (sortColumn === column && prevDirection === 'asc' ? 'desc' : 'asc'));
      setSortColumn(column);
      setPagina(1);
  };

  const clientesFiltradosYOrdenados = useMemo(() => {
      let clientesTrabajo = [...clientes];
      if (busqueda) {
          clientesTrabajo = clientesTrabajo.filter(c =>
              Object.values(c).some(val => 
                  String(val).toLowerCase().includes(busqueda.toLowerCase())
              )
          );
      }
      if (sortColumn) {
          clientesTrabajo.sort((a, b) => {
              const aValue = a[sortColumn] || '';
              const bValue = b[sortColumn] || '';
              if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return clientesTrabajo;
  }, [clientes, busqueda, sortColumn, sortDirection]);

  const inicio = (pagina - 1) * porPagina;
  const clientesPag = clientesFiltradosYOrdenados.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(clientesFiltradosYOrdenados.length / porPagina);

  const handleVerCompras = async (cliente) => {
    setClienteActualParaVentas(cliente);
    setVentasDelClienteSeleccionado([]);
    setClientSalesLoading(true);
    try {
        const { data, error } = await supabase
          .from('ventas')
          .select('*, monto_credito_aplicado, enganche, gastos_envio') // Asegurar que se traen estos campos
          .eq('cliente_id', cliente.id)
          .order('fecha', { ascending: false });
        if (error) throw error;
        setVentasDelClienteSeleccionado(data || []);
    } catch (error) {
        console.error('Error al obtener ventas del cliente:', error.message);
        toast.error('Error al cargar historial de ventas.');
    } finally {
        setClientSalesLoading(false);
    }
  };

  const handleSelectSaleForDetail = async (venta) => {
    setSelectedSaleForDetail(venta); // Objeto venta completo, incluyendo monto_credito_aplicado
    setDetailLoading(true);
    setSelectedSaleDetailsItems([]);
    setClienteInfoForTicket(null);
    setVendedorInfoForTicket(null);
    setClienteBalanceForTicket(0);

    try {
        // 1. Cargar detalles de la venta (productos)
        const { data: detalleItems, error: errDetalle } = await supabase
            .from('detalle_venta')
            .select('*, productos(nombre)')
            .eq('venta_id', venta.id);
        if (errDetalle) throw errDetalle;
        const mappedDetails = (detalleItems || []).map(item => ({
            ...item,
            nombreProducto: item.productos?.nombre || 'Producto desconocido'
        }));
        setSelectedSaleDetailsItems(mappedDetails);

        // 2. Cargar info del cliente para el ticket (el cliente de esta venta específica)
        if (venta.cliente_id) {
            const { data: cliData, error: cliError } = await supabase.from('clientes')
                .select('id, nombre, telefono, correo, direccion').eq('id', venta.cliente_id).single();
            if (cliError) console.error("Error cargando cliente para ticket:", cliError);
            setClienteInfoForTicket(cliData || { id: venta.cliente_id, nombre: venta.cliente_nombre || 'Público General' });
        } else {
            setClienteInfoForTicket({ id: null, nombre: venta.cliente_nombre || 'Público General' });
        }

        // 3. Cargar info del vendedor para el ticket
        if (venta.vendedor_id) {
            const { data: vendData, error: vendError } = await supabase.from('usuarios')
                .select('id, nombre').eq('id', venta.vendedor_id).single();
            if (vendError) console.error("Error cargando vendedor para ticket:", vendError);
            setVendedorInfoForTicket(vendData || { nombre: 'N/A' });
        } else {
            setVendedorInfoForTicket({ nombre: currentUser?.email || 'N/A' });
        }
        
        // 4. Cargar balance actual del cliente de la venta
        if (venta.cliente_id) {
            const { data: balanceData, error: balanceError } = await supabase.rpc('get_cliente_con_saldo', { p_cliente_id: venta.cliente_id });
            if (balanceError) console.error("Error cargando balance para ticket:", balanceError);
            setClienteBalanceForTicket(balanceData && balanceData.length > 0 ? balanceData[0].balance : 0);
        }


    } catch (error) {
        toast.error(`Error al cargar detalles: ${error.message}`);
    } finally {
        setDetailLoading(false);
        setShowSaleDetailModal(true); // Abrir el modal de detalle de venta
    }
  };
  
  const handleCancelSale = async (ventaACancelar) => {
    if (cancelSaleLoading) return;
    if (!window.confirm(`¿Seguro que quieres cancelar la venta ${ventaACancelar.codigo_venta}? Se restaurará el stock.`)) return;
    setCancelSaleLoading(true);
    try {
      // Reutilizar la lógica de cancelación que ya tenías, asegurándote que usa selectedSaleDetailsItems
      // y el ID de ventaACancelar
      const { data: detallesVenta = [] } = await supabase.from('detalle_venta').select('producto_id, cantidad').eq('venta_id', ventaACancelar.id);
      for (const item of detallesVenta) {
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', item.producto_id).single();
        const nuevoStock = (prodActual?.stock || 0) + (item.cantidad ?? 0);
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto_id);
      }
      await supabase.from('movimientos_cuenta_clientes').delete().eq('referencia_venta_id', ventaACancelar.id);
      await supabase.from('detalle_venta').delete().eq('venta_id', ventaACancelar.id);
      await supabase.from('ventas').delete().eq('id', ventaACancelar.id);

      toast.success(`Venta ${ventaACancelar.codigo_venta} cancelada.`);
      setShowSaleDetailModal(false); // Cerrar modal de detalle
      setVentasDelClienteSeleccionado(prev => prev.filter(v => v.id !== ventaACancelar.id)); // Actualizar lista en modal de ventas del cliente
      // Opcional: Recargar todas las ventas si la cancelación afecta listas globales
      // cargarVentas(); 
    } catch (err) {
      toast.error(`Error al cancelar venta: ${err.message}`);
    } finally {
      setCancelSaleLoading(false);
    }
  };

  const handleGeneratePDFFromDetail = () => {
      // La función generarPDF ya está definida en el componente ClienteVentaDetalleModal
      // y usa selectedSale, clienteInfoForTicket, vendedorInfoForTicket, clienteBalanceForTicket, logoBase64
      // que se le pasan como props. Aquí solo necesitamos invocarla.
      // Esta función se pasará como prop al ClienteVentaDetalleModal.
      // La lógica de generación del PDF ya está en el componente ClienteVentaDetalleModal.
      // Aquí solo nos aseguramos de que los datos estén listos.
      if (selectedSaleForDetail && clienteInfoForTicket && vendedorInfoForTicket) {
        // La generación real ocurre dentro de ClienteVentaDetalleModal
        // Esta función podría no ser necesaria aquí si el botón está en el modal hijo.
        // Si el botón "Ver PDF" estuviera en Clientes.jsx, aquí llamaríamos a la lógica de jsPDF.
        console.log("Preparando para generar PDF desde Clientes.jsx (los datos se pasan al modal)");
      } else {
        toast.error("Faltan datos para generar el PDF del detalle.");
      }
  };

  const handleShowHtmlTicketFromDetail = () => {
    if (selectedSaleForDetail && clienteInfoForTicket && vendedorInfoForTicket && selectedSaleDetailsItems.length > 0) {
        const fechaVenta = selectedSaleForDetail.fecha || selectedSaleForDetail.created_at;
        const ticketData = {
            codigo_venta: selectedSaleForDetail.codigo_venta,
            cliente: clienteInfoForTicket,
            vendedor: vendedorInfoForTicket,
            fecha: fechaVenta ? new Date(fechaVenta).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A',
            productosVenta: selectedSaleDetailsItems.map(item => ({
                 id: item.producto_id,
                 nombre: item.nombreProducto,
                 cantidad: item.cantidad,
                 precio_unitario: item.precio_unitario,
                 total_parcial: item.total_parcial,
            })),
            originalSubtotal: selectedSaleForDetail.subtotal,
            discountAmount: selectedSaleForDetail.valor_descuento,
            monto_credito_aplicado: selectedSaleForDetail.monto_credito_aplicado, // Asegurarse que esto viene de la BD
            forma_pago: selectedSaleForDetail.forma_pago,
            enganche: selectedSaleForDetail.enganche,
            gastos_envio: selectedSaleForDetail.gastos_envio,
            total_final: selectedSaleForDetail.total,
            balance_cuenta: clienteBalanceForTicket,
        };
        setHtmlTicketData(ticketData);
        setShowHtmlTicket(true);
    } else {
        toast.error("Datos incompletos para mostrar el ticket.");
    }
  };
  
  const closeHtmlTicket = () => {
    setShowHtmlTicket(false);
    setHtmlTicketData(null);
  };

  const handleSelectClienteCheckbox = (clienteId) => {
    setSelectedIds(prev => 
      prev.includes(clienteId) 
        ? prev.filter(id => id !== clienteId) 
        : [...prev, clienteId]
    );
  };

  const handleSelectTodosClientesVisibles = (e) => {
    if (e.target.checked) {
      setSelectedIds(clientesPag.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleEliminarSeleccionados = () => {
    if (selectedIds.length === 0) {
        toast.info("No hay clientes seleccionados para eliminar.");
        return;
    }
    if (window.confirm(`¿Seguro que quieres eliminar ${selectedIds.length} cliente(s) seleccionados? Esta acción también podría eliminar sus ventas y movimientos asociados.`)) {
        // Usar la función del contexto para eliminar múltiples clientes
        // Asumiendo que eliminarClienteContext puede manejar un array o se llama en un loop
        Promise.all(selectedIds.map(id => eliminarClienteContext(id)))
            .then(() => {
                toast.success(`${selectedIds.length} cliente(s) eliminado(s) exitosamente.`);
                setSelectedIds([]); // Limpiar selección
                // El contexto debería actualizar la lista de 'clientes', y el useMemo reaccionará
            })
            .catch(error => {
                console.error("Error eliminando clientes seleccionados:", error);
                toast.error("Error al eliminar algunos clientes.");
            });
    }
  };


  if (clientesLoadingFromContext) {
     return <div className="text-center p-10">Cargando clientes...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800">
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center">Gestión de Clientes</h1>
        <div className="w-full md:w-auto md:min-w-[150px]"></div> {/* Spacer */}
      </div>

      <ClientesAccionesBarra
        busqueda={busqueda}
        onBusquedaChange={(text) => { setBusqueda(text); setPagina(1);}}
        onAbrirNuevoCliente={() => { setEditingClient(null); setShowNewOrEditClientModal(true); }}
        porPagina={porPagina}
        onPorPaginaChange={(num) => { setPorPagina(num); setPagina(1); }}
        onEliminarSeleccionados={handleEliminarSeleccionados}
        selectedIdsCount={selectedIds.length}
        disabledEliminar={selectedIds.length === 0}
      />

      <ClientesTabla
        clientesPag={clientesPag}
        selectedIds={selectedIds}
        onSelectCliente={handleSelectClienteCheckbox}
        onSelectTodosClientes={handleSelectTodosClientesVisibles}
        onAbrirEditar={(cliente) => { setEditingClient(cliente); setShowNewOrEditClientModal(true); }}
        onHandleVerCompras={handleVerCompras}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        areAnyClientesVisible={clientesPag.length > 0}
      />
      
      <ClientesPaginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        onPaginaAnterior={() => setPagina(p => Math.max(1, p - 1))}
        onPaginaSiguiente={() => setPagina(p => Math.min(totalPaginas, p + 1))}
        disabledAnterior={pagina === 1}
        disabledSiguiente={pagina === totalPaginas || totalPaginas === 0}
      />

      <NewClientModal
        isOpen={showNewOrEditClientModal}
        onClose={() => { setShowNewOrEditClientModal(false); setEditingClient(null); }}
        editingClient={editingClient}
        onClientSaved={() => {
            // La lógica de useClientes debería recargar/actualizar la lista de clientes
            setShowNewOrEditClientModal(false);
            setEditingClient(null);
        }}
      />

      {clienteActualParaVentas && (
        <ClienteVentasModal
          isOpen={!!clienteActualParaVentas}
          onClose={() => setClienteActualParaVentas(null)}
          clienteActual={clienteActualParaVentas}
          ventasCliente={ventasDelClienteSeleccionado}
          onSelectSale={handleSelectSaleForDetail}
          loading={clientSalesLoading}
        />
      )}

      {showSaleDetailModal && selectedSaleForDetail && (
        <ClienteVentaDetalleModal
            isOpen={showSaleDetailModal}
            onClose={() => { setShowSaleDetailModal(false); setSelectedSaleForDetail(null); setSelectedSaleDetailsItems([]); }}
            selectedSale={selectedSaleForDetail}
            selectedSaleDetails={selectedSaleDetailsItems}
            detailLoading={detailLoading}
            clienteInfoTicket={clienteInfoForTicket}
            vendedorInfoTicket={vendedorInfoForTicket}
            clienteBalanceTicket={clienteBalanceForTicket}
            onShowHtmlTicket={handleShowHtmlTicketFromDetail}
            onGeneratePDF={() => generarPDF()} // Pasamos la función directamente
            onCancelSale={handleCancelSale}
            cancelLoading={cancelSaleLoading}
            logoBase64={logoBase64} // Pasar el logo
        />
      )}

      {showHtmlTicket && htmlTicketData && (
          <HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />
      )}
    </div>
  );
}

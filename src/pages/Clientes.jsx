// src/pages/Clientes.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../contexts/ClientesContext';
import NewClientModal from '../components/NewClientModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Clientes() {
  const navigate = useNavigate();
  const { clientes, loading: clientesLoading, actualizarCliente, eliminarCliente } = useClientes();

  const [busqueda, setBusqueda] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [clienteActual, setClienteActual] = useState(null);
  const [ventasCliente, setVentasCliente] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState([]);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [clientSalesLoading, setClientSalesLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const filtrados = clientes.filter(c => (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));
  const inicio = (pagina - 1) * porPagina;
  const clientesPag = filtrados.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(filtrados.length / porPagina);

  const handleVerCompras = async c => {
    setClienteActual(c);
    setVentasCliente([]);
    setClientSalesLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('cliente_id', c.id)
      .order('fecha', { ascending: false });
    if (error) {
      console.error('Error al obtener ventas del cliente:', error.message);
      toast.error('Error al cargar historial de ventas.');
      setVentasCliente([]);
    } else {
      setVentasCliente(data || []);
    }
    setClientSalesLoading(false);
  };

  const handlePaginaAnterior = () => {
    if (pagina > 1) setPagina(pagina - 1);
  };

  const handlePaginaSiguiente = () => {
    if (pagina < totalPaginas) setPagina(pagina + 1);
  };
  // --- Funciones de detalle de venta (para el modal) ---
  const handleSelectSale = async (venta) => {
    setSelectedSale(venta);
    setDetailLoading(true); // Iniciar carga de detalle del modal
    setSelectedSaleDetails([]); // Limpiar detalles anteriores

    console.log(`[handleSelectSale] Fetching details for venta ID: ${venta.id}`);
    const { data: detalle, error } = await supabase
        .from('detalle_venta')
        .select('*, productos(nombre)')
        .eq('venta_id', venta.id);

    setDetailLoading(false);

    if (error) {
        console.error('[handleSelectSale] Error al obtener detalles de la venta:', error.message);
        toast.error('Error al cargar detalles de la venta.');
        setSelectedSaleDetails([]);
    } else {
        const mappedDetails = (detalle || []).map(item => ({
            ...item,
            nombreProducto: item.productos ? item.productos.nombre : 'Producto desconocido'
        }));
        setSelectedSaleDetails(mappedDetails);
        setShowSaleDetailModal(true);
    }
};

const handleCloseSaleDetailModal = () => {
    setShowSaleDetailModal(false);
    setSelectedSale(null);
    setSelectedSaleDetails([]);
};

// --- Función para cancelar/eliminar venta ---
const handleCancelSale = async () => {
    if (cancelLoading || !selectedSale) return;

    if (!window.confirm(`¿Estás seguro de cancelar la venta ${selectedSale.codigo_venta || selectedSale.id}? Esta acción eliminará permanentemente la venta y devolverá el stock.`)) return;

    setCancelLoading(true);

    try {
        for (const item of selectedSaleDetails) {
            if (!item.producto_id) {
                toast.error(`Falta ID de producto para un ítem. No se actualizará el stock.`, { duration: 6000 });
                continue;
            }

            // === CORRECCIÓN: Obtener el stock actual y calcular el nuevo stock ===
            const { data: producto, error: errorGetProduct } = await supabase
                .from('productos')
                .select('id, stock')
                .eq('id', item.producto_id)
                .single();

            if (errorGetProduct) {
                console.error(`Error al obtener stock para producto ${item.producto_id}:`, errorGetProduct.message);
                toast.error(`Error al obtener stock del producto. La cancelación podría ser parcial.`, { duration: 6000 });
                continue; // Continuar con otros ítems a pesar de este error
            }

            const nuevoStock = (producto?.stock ?? 0) + (item.cantidad ?? 0); // Calcular el nuevo stock numérico

            // === CORRECCIÓN: Actualizar la base de datos con el valor numérico calculado ===
             const { error: errorUpdateStock } = await supabase
                .from('productos')
                .update({ stock: nuevoStock }) // Enviar el valor numérico
                .eq('id', item.producto_id);


            if (errorUpdateStock) {
                console.error(`Error actualizando stock para producto ${item.producto_id}:`, errorUpdateStock.message);
                toast.error(`Error actualizando stock del producto. La cancelación podría ser parcial.`, { duration: 6000 });
                continue;
            }

            // === Lógica de inserción en movimientos_inventario ELIMINADA (para confiar en el Trigger de DB) ===
            // === Se asume que un trigger de base de datos o lógica de backend lo maneja ===
            // const { error: errorMovimiento } = await supabase.from('movimientos_inventario').insert({...});
            // if (errorMovimiento) { ... }
        } // Fin del bucle for...of

        // Eliminar detalles de venta (esto activará un trigger en detalle_venta si existe)
        const { error: errorDeleteDetails } = await supabase.from('detalle_venta').delete().eq('venta_id', selectedSale.id);
        if (errorDeleteDetails) {
             console.error('Error eliminando detalles de venta:', errorDeleteDetails.message);
             toast.error('Error al eliminar detalles de la venta.');
             throw new Error('Error al eliminar detalles de la venta.');
        }

        // Eliminar venta principal (esto activará un trigger en ventas si existe)
        const { error: errorDeleteSale } = await supabase.from('ventas').delete().eq('id', selectedSale.id);
         if (errorDeleteSale) {
            console.error('Error eliminando venta principal:', errorDeleteSale.message);
            toast.error('Error al eliminar la venta principal.');
             throw new Error('Error al eliminar la venta principal.');
         }

        // Actualizar estado local después de la eliminación exitosa en la BD
        setVentasCliente(prev => prev.filter(v => v.id !== selectedSale.id));
        handleCloseSaleDetailModal();

        toast.success(`✅ Venta cancelada y eliminada exitosamente.`);
    } catch (error) {
        console.error('Error general en cancelación:', error.message);
        toast.error(`Fallo al cancelar venta: ${error.message}`);
    } finally {
        setCancelLoading(false);
    }
};
  // Generar PDF del ticket de venta seleccionado
  const generarPDF = () => {
    if (!selectedSale || !selectedSaleDetails.length) {
        toast.error("No hay datos de venta para generar el PDF.");
        return;
    }

    const doc = new jsPDF();
    doc.setFont('helvetica');

    doc.setFontSize(16);
    doc.text(`Ticket - ${selectedSale.codigo_venta || 'N/A'}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteActual?.nombre || 'Público General'}`, 10, 25);
    doc.text(`Fecha: ${(selectedSale.fecha || selectedSale.created_at) ? new Date(selectedSale.fecha || selectedSale.created_at).toLocaleString() : 'Fecha desconocida'}`, 10, 35);
    doc.text(`Forma de Pago: ${selectedSale.forma_pago || 'Desconocida'}`, 10, 45);

    const rows = selectedSaleDetails.map(p => [
      p.nombreProducto || '–',
      (p.cantidad ?? 0).toString(),
      `$${(p.precio_unitario ?? 0).toFixed(2)}`,
      `$${(p.total_parcial ?? 0).toFixed(2)}`
    ]);

    doc.autoTable({
      head: [['Producto', 'Cant.', 'P.U.', 'Total']],
      body: rows,
      startY: 55,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right' },
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 }
    });

    const y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 65;
    doc.setFont(undefined, 'bold');

    const subtotal = selectedSale.subtotal ?? 0;
    const total = selectedSale.total ?? 0;
    const valorDescuento = selectedSale.valor_descuento ?? 0;

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, y);

    let descuentoTexto = 'Descuento: $0.00';
    if (selectedSale.tipo_descuento === 'porcentaje' && valorDescuento > 0) {
        const montoDescuento = (subtotal * (valorDescuento / 100));
        descuentoTexto = `Descuento: -${valorDescuento}% (-$${montoDescuento.toFixed(2)})`;
    } else if (selectedSale.tipo_descuento === 'fijo' && valorDescuento > 0) {
        descuentoTexto = `Descuento: -$${valorDescuento.toFixed(2)}`;
    }
    doc.text(descuentoTexto, 10, y + 6);
    doc.text(`Total: $${total.toFixed(2)}`, 180, y + 12, { align: 'right' });

    doc.output('dataurlnewwindow');
  };

  // Handler cuando se guarda (nuevo o editado)
  const onClientSaved = async clienteData => {
    if (editingClient) {
      await actualizarCliente(editingClient.id, clienteData);
    }
    setModalOpen(false);
  };

  // Abrir modal en “nuevo”
  const abrirNuevo = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  // Abrir modal en “editar”
  const abrirEditar = c => {
    setEditingClient(c);
    setModalOpen(true);
  };

  // Mostrar carga inicial
  if (clientesLoading) {
     return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
           <p className="text-lg font-semibold text-gray-700">Cargando clientes…</p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Gestión de Clientes
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            className="w-full md:w-64 border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button onClick={abrirNuevo} className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200">
            Agregar cliente
          </button>
        </div>
      </div>
      {/* Acciones masivas y paginación */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-gray-700 text-sm">Mostrar:</label>
          <select
            id="items-per-page"
            value={porPagina}
            onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1); }}
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
        <button
          disabled={selectedIds.length === 0}
          onClick={() => {
            if (confirm(`¿Seguro que quieres eliminar ${selectedIds.length} cliente(s)? Esta acción también eliminará sus ventas.`)) {
              selectedIds.forEach(id => eliminarCliente(id));
              setSelectedIds([]);
            }
          }}
          className="w-full md:w-auto px-6 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Eliminar Cliente(s) ({selectedIds.length})
        </button>
      </div>

      {/* Tabla de clientes */}
<div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-200">
      <tr>
        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          <input
            type="checkbox"
            checked={
              clientesPag.length > 0 &&
              selectedIds.length > 0 &&
              selectedIds.length === clientesPag.length
            }
            onChange={e =>
              setSelectedIds(
                e.target.checked ? clientesPag.map(c => c.id) : []
              )
            }
            className="form-checkbox h-4 w-4 text-blue-600 rounded"
          />
        </th>
        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Nombre
        </th>
        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Teléfono
        </th>
        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
          Correo
        </th>
        <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
          Dirección
        </th>
        <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Acciones
        </th>
      </tr>
    </thead>
    <tbody>
      {clientesPag.map(c => (
        <tr
          key={c.id}
          onClick={() => handleVerCompras(c)}
          className="border-t hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer"
        >
          <td className="p-3 text-center whitespace-nowrap">
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={e => {
                e.stopPropagation();
                setSelectedIds(prev =>
                  prev.includes(c.id)
                    ? prev.filter(x => x !== c.id)
                    : [...prev, c.id]
                );
              }}
              className="form-checkbox h-4 w-4 text-blue-600 rounded"
            />
          </td>
          <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">
            {c.nombre || 'Sin nombre'}
          </td>
          <td className="p-3 whitespace-nowrap text-sm text-gray-500">
            {c.telefono || 'Sin teléfono'}
          </td>
          <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
            {c.correo || 'Sin correo'}
          </td>
          <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
            {c.direccion || 'Sin dirección'}
          </td>
          <td className="p-3 whitespace-nowrap text-center text-sm font-medium">
            <button
              onClick={e => {
                e.stopPropagation();
                abrirEditar(c);
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 text-xs"
            >
              Editar
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      {/* === REINSERTANDO: Historial de ventas === */}
      {clienteActual && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Ventas de {clienteActual.nombre || 'este cliente'}
          </h2>
          {clientSalesLoading ? (
             <p className="text-center text-gray-500">Cargando historial de ventas...</p>
          ) : ventasCliente.length === 0 ? (
            <p className="text-gray-600 italic">Este cliente no tiene ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto shadow-md rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 border-collapse">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pago</th>
                    <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasCliente.map(v => (
                    <tr
                      key={v.id}
                      className="border-t hover:bg-gray-100 transition duration-150 ease-in-out cursor-pointer"
                    >
                      <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{v.codigo_venta || 'N/A'}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">
                        {(v.fecha || v.created_at) ? new Date(v.fecha || v.created_at).toLocaleString() : 'Fecha desconocida'}
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">{v.forma_pago || 'Desconocida'}</td>
                      <td className="p-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">${(v.total ?? 0).toFixed(2)}</td>
                       <td className="p-3 whitespace-nowrap text-center text-sm font-medium">
                           <button
                                onClick={(e) => { e.stopPropagation(); handleSelectSale(v); }}
                                className="px-3 py-1 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 ease-in-out text-xs"
                            >
                                Ver Detalle
                            </button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
           <div className="mt-6 text-center">
                <button
                    onClick={() => setClienteActual(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-400 transition duration-200"
                >
                    Ocultar historial de ventas
                </button>
            </div>
        </div>
      )}

      {/* Modal para crear/editar cliente */}
      <NewClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onClientAdded={onClientSaved}
        cliente={editingClient}
      />

      {/* === REINSERTANDO: Modal de Detalle de Venta === */}
      {showSaleDetailModal && selectedSale && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
              <div className="relative p-8 bg-white w-full max-w-md mx-auto rounded-lg shadow-lg max-h-[95vh] overflow-y-auto">
                  <button
                      className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-3xl font-bold"
                      onClick={handleCloseSaleDetailModal}
                  >
                      &times;
                  </button>

                  <h3 className="text-2xl font-bold mb-4 text-gray-800">Detalle de Venta - {selectedSale.codigo_venta || 'N/A'}</h3>

                  {detailLoading ? (
                      <p className="text-center text-blue-600">Cargando detalles de venta...</p>
                  ) : (
                      <>
                          <div className="mb-4 text-sm text-gray-700">
                              <p><span className="font-semibold">Cliente:</span> {clienteActual?.nombre || 'Público General'}</p>
                              <p><span className="font-semibold">Fecha:</span> {(selectedSale.fecha || selectedSale.created_at) ? new Date(selectedSale.fecha || selectedSale.created_at).toLocaleString() : 'Fecha desconocida'}</p>
                              <p><span className="font-semibold">Forma de Pago:</span> {selectedSale.forma_pago || 'Desconocida'}</p>
                          </div>

                          <div className="mb-4 border-t border-b py-4">
                              <h4 className="font-semibold mb-2">Productos:</h4>
                              <ul className="space-y-2 text-sm">
                                  {selectedSaleDetails.map(item => (
                                      <li key={item.id} className="flex justify-between">
                                          <span className="truncate w-2/3 pr-2">{item.nombreProducto || 'Producto desconocido'}</span>
                                          <span className="flex-shrink-0">x{(item.cantidad ?? 0)}</span>
                                          <span className="font-semibold flex-shrink-0 pl-2">${(item.total_parcial ?? 0).toFixed(2)}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>

                           <div className="mb-6 space-y-1 text-sm text-gray-700">
                              <div className="flex justify-between">
                                <span className="font-semibold">Subtotal:</span>
                                <span>${(selectedSale.subtotal ?? 0).toFixed(2)}</span>
                              </div>
                              { (selectedSale.tipo_descuento === 'porcentaje' && (selectedSale.valor_descuento ?? 0) > 0) || (selectedSale.tipo_descuento === 'fijo' && (selectedSale.valor_descuento ?? 0) > 0) ? (
                                <div className="flex justify-between text-red-600">
                                    <span className="font-semibold">Descuento:</span>
                                    <span>
                                        {selectedSale.tipo_descuento === 'porcentaje'
                                            ? `-${selectedSale.valor_descuento}%`
                                            : `-$${((selectedSale.valor_descuento ?? 0)).toFixed(2)}`}
                                    </span>
                                </div>
                               ) : null}
                              <div className="flex justify-between font-bold text-lg text-green-700 mt-2 pt-2 border-t border-gray-300">
                                <span className="font-semibold">Total:</span>
                                <span>${(selectedSale.total ?? 0).toFixed(2)}</span>
                              </div>
                            </div>

                          <div className="flex flex-wrap justify-end space-x-2 mt-4">
                                <button
                                    onClick={generarPDF}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 ease-in-out text-sm"
                                >
                                    Ver PDF Ticket
                                </button>
                                 <button
                                    onClick={handleCancelSale}
                                    className={`px-4 py-2 rounded-md transition duration-200 ease-in-out text-sm ${cancelLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                                    disabled={cancelLoading}
                                >
                                    {cancelLoading ? 'Cancelando...' : 'Eliminar venta'}
                                </button>
                               <button
                                    onClick={handleCloseSaleDetailModal}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out text-sm"
                                >
                                    Cerrar
                                </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useClientes } from '../contexts/ClientesContext';
import NewClientModal from '../components/NewClientModal';
import jsPDF from 'jspdf'; // Importar jsPDF
import 'jspdf-autotable'; // Importar autotable para jsPDF
import toast from 'react-hot-toast'; // Importar toast para notificaciones

export default function Clientes() {
  const navigate = useNavigate();
  // Asumiendo que useClientes proporciona clientes, loading, actualizarCliente, eliminarCliente
  const { clientes, loading, actualizarCliente, eliminarCliente } = useClientes();

  const [busqueda, setBusqueda] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [clienteActual, setClienteActual] = useState(null); // para historial de ventas
  const [ventasCliente, setVentasCliente] = useState([]);

  const [modalOpen, setModalOpen] = useState(false); // para crear/editar cliente
  const [editingClient, setEditingClient] = useState(null); // null = nuevo, else cliente a editar

  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);

  // --- Estados para el detalle de venta (para el modal) ---
  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false); // Controla la visibilidad del modal de detalle de venta
  const [selectedSale, setSelectedSale] = useState(null); // Almacena los datos de la venta seleccionada para ver detalle
  const [selectedSaleDetails, setSelectedSaleDetails] = useState([]); // Almacena los ítems de la venta seleccionada


  // Filtrado + paginación
  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const inicio = (pagina - 1) * porPagina;
  const clientesPag = filtrados.slice(inicio, inicio + porPagina);
  const totalPaginas = Math.ceil(filtrados.length / porPagina);


  // Historial de ventas
  const handleVerCompras = async c => {
    setClienteActual(c);
    setVentasCliente([]); // Limpiar ventas anteriores al cargar nuevas
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('cliente_id', c.id)
      .order('created_at', { ascending: false });
    if (error) {
        console.error('Error al obtener ventas del cliente:', error.message);
        toast.error('Error al cargar historial de ventas.'); // Puedes usar toast aquí si lo importaste
    } else {
      setVentasCliente(data);
    }
    // No resetear la paginación de clientes al ver compras, solo la lista de ventas
    // setPagina(1);
  };

   // Manejar paginación de clientes
  const handlePaginaAnterior = () => {
      if (pagina > 1) {
          setPagina(pagina - 1);
      }
  };

  const handlePaginaSiguiente = () => {
      if (pagina < totalPaginas) {
          setPagina(pagina + 1);
      }
  };

  // --- Funciones de detalle de venta (para el modal) ---
  const handleSelectSale = async (venta) => {
      setSelectedSale(venta);
      // Cargar los detalles (ítems) de la venta seleccionada
      console.log(`[handleSelectSale] Fetching details for venta ID: ${venta.id}`);
      const { data: detalle, error } = await supabase
          .from('detalle_venta')
          .select('*, productos(nombre)') // Seleccionar todos los campos y el nombre del producto relacionado
          .eq('venta_id', venta.id);

      if (error) {
          console.error('[handleSelectSale] Error al obtener detalles de la venta:', error.message);
          toast.error('Error al cargar detalles de la venta.');
          setSelectedSaleDetails([]); // Limpiar detalles si hay error
      } else {
          console.log('[handleSelectSale] Raw details data:', detalle); // Log raw data
          // Mapear los detalles para incluir el nombre del producto
          const mappedDetails = detalle.map(item => ({
              ...item,
              nombreProducto: item.productos ? item.productos.nombre : 'Producto desconocido'
          }));
          console.log('[handleSelectSale] Mapped details data:', mappedDetails); // Log mapped data
          setSelectedSaleDetails(mappedDetails);
          setShowSaleDetailModal(true); // Mostrar el modal una vez cargados los detalles
      }
  };

  const handleCloseSaleDetailModal = () => {
      setShowSaleDetailModal(false);
      setSelectedSale(null); // Limpiar la venta seleccionada al cerrar el modal
      setSelectedSaleDetails([]); // Limpiar los detalles
  };

  const handleCancelSale = async () => {
      // Confirmación antes de cancelar
      if (!selectedSale || !window.confirm(`¿Estás seguro de cancelar la venta ${selectedSale.codigo_venta}? Esta acción devolverá el stock.`)) {
          return; // No proceder si no hay venta seleccionada o el usuario cancela la confirmación
      }

      try {
          // --- Lógica de cancelación ---

          // 1. Devolver el stock de cada producto y registrar movimiento de entrada en movimientos_inventario
          // Asumimos que selectedSaleDetails ya contiene los items correctos de la venta a cancelar
          console.log("Procesando ítems para devolver stock y registrar en movimientos_inventario...");
          for (const item of selectedSaleDetails) {
              console.log(`[handleCancelSale] Processing item:`, item); // Log the entire item
              console.log(`[handleCancelSale] Item producto_id:`, item.producto_id); // Log producto_id

              // --- VERIFICACIÓN CLAVE: Asegurarse de que producto_id no sea null ---
              if (!item.producto_id) {
                  console.error(`[handleCancelSale] Skipping inventory update and movement for item with missing producto_id:`, item);
                  toast.error(`Advertencia: Falta ID de producto para un ítem en la venta ${selectedSale.codigo_venta}. No se actualizará el inventario para este ítem.`);
                  continue; // Saltar este ítem si producto_id es null
              }
              // --- FIN VERIFICACIÓN CLAVE ---


              // Obtener el stock actual del producto
              const { data: producto, error: errorGetProduct } = await supabase
                  .from('productos')
                  .select('id, stock, nombre') // Seleccionar ID, stock y nombre
                  .eq('id', item.producto_id) // Usando item.producto_id aquí
                  .single();

              if (errorGetProduct) {
                  console.error(`Error al obtener stock para producto ${item.nombreProducto}:`, errorGetProduct.message);
                  // Continuar con otros ítems a pesar de este error
                  continue;
              }

              const nuevoStock = (producto?.stock || 0) + item.cantidad;

              // Actualizar el stock del producto
              const { error: errorUpdateStock } = await supabase
                  .from('productos')
                  .update({ stock: nuevoStock })
                  .eq('id', producto.id); // Usar producto.id ya que lo obtuvimos

              if (errorUpdateStock) {
                  console.error(`Error al actualizar stock para producto ${producto.nombre}:`, errorUpdateStock.message);
                  // Continuar a pesar de este error
                  continue;
              }

              // Registrar movimiento de entrada directamente en movimientos_inventario
              console.log(`[handleCancelSale] Attempting insert into movimientos_inventario for producto_id:`, item.producto_id); // Log before insert
              const { error: errorMovimiento } = await supabase.from('movimientos_inventario').insert({
                  tipo: 'ENTRADA', // Tipo de movimiento de entrada
                  producto_id: item.producto_id, // Insertar el producto_id del ítem
                  cantidad: item.cantidad,
                  // >>> MODIFICADO: Referencia simplificada <<<
                  referencia: `Cancelación Venta ${selectedSale.codigo_venta}`, // Referencia solo con el código de venta
                  fecha: new Date().toISOString(), // Fecha y hora del movimiento
                  motivo: 'cancelacion_venta_item', // Motivo específico para el ítem cancelado
                  // No incluir 'movimiento_id' si no es necesario en movimientos_inventario para ítems individuales
              });
              console.log(`[handleCancelSale] Insert into movimientos_inventario result for producto_id ${item.producto_id}:`, errorMovimiento); // Log after insert


              if (errorMovimiento) {
                  console.error(`Error al registrar movimiento de entrada para producto ${producto.nombre}:`, errorMovimiento.message);
                  // El proceso continuará aunque falle el registro del movimiento para este ítem
              } else {
                  console.log(`Movimiento registrado para item ${producto.nombre} en movimientos_inventario.`);
              }
          } // Fin del bucle for...of sobre los ítems
          console.log("Procesamiento de ítems completado.");


          // 2. Eliminar la venta localmente del estado ventasCliente para que desaparezca de la lista
          // Esto solo afecta la UI, no la base de datos 'ventas'.
          setVentasCliente(prevVentas => prevVentas.filter(v => v.id !== selectedSale.id));
          console.log(`Venta ${selectedSale.codigo_venta} eliminada localmente de la lista.`);


          // 3. Cerrar el modal de detalle de venta
          handleCloseSaleDetailModal();


          toast.success(`Venta ${selectedSale.codigo_venta} cancelada exitosamente. Stock devuelto y movimiento registrado.`);
          console.log("Cancelación de venta finalizada.");

      } catch (error) {
          console.error('Error general al cancelar la venta:', error.message);
           if (!error.message.includes('null value in column "producto_id"')) {
             toast.error('Ocurrió un error al cancelar la venta.');
           }
      }
  };


  const generarPDF = () => {
    if (!selectedSale || !selectedSaleDetails.length) {
        toast.error("No hay datos de venta para generar el PDF.");
        return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket - ${selectedSale.codigo_venta}`, 10, 12);
    if (clienteActual) { // Usar clienteActual que ya tenemos cargado
      doc.text(`Cliente: ${clienteActual.nombre}`, 10, 22);
    }
    doc.text(`Fecha: ${new Date(selectedSale.created_at || selectedSale.fecha).toLocaleString()}`, 10, 30); // Usar la fecha de la venta
    doc.text(`Forma de Pago: ${selectedSale.forma_pago}`, 10, 38); // Añadir forma de pago al PDF

    const rows = selectedSaleDetails.map(p => [
      p.nombreProducto, // Usar el nombre del producto del join
      p.cantidad.toString(),
      `$${(p.precio_unitario ?? 0).toFixed(2)}`, // Usar precio_unitario del detalle
      `$${(p.total_parcial ?? 0).toFixed(2)}` // Usar total_parcial del detalle
    ]);

    doc.autoTable({
      head: [['Producto', 'Cant.', 'P.U.', 'Total']],
      body: rows,
      startY: 50, // Ajustar startY ya que añadimos más info arriba
      // Estilos básicos para la tabla
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
      margin: { top: 10 }
    });

    const y = doc.lastAutoTable.finalY + 10;
    // Mostrar subtotal, descuento y total de la venta seleccionada
    doc.text(`Subtotal: $${(selectedSale.subtotal ?? 0).toFixed(2)}`, 10, y);
    doc.text(`Descuento: -$${(selectedSale.valor_descuento ?? 0).toFixed(2)}`, 10, y + 6); // Usar valor_descuento
    doc.text(`Total: $${(selectedSale.total ?? 0).toFixed(2)}`, 10, y + 12); // Usar total de la venta

    // Abrir PDF en una nueva ventana
    doc.output('dataurlnewwindow');
  };


  // Abrir modal en “nuevo”
  const abrirNuevo = () => {
    setEditingClient(null)
    setModalOpen(true)
  }

  // Abrir modal en “editar”
  const abrirEditar = c => {
    setEditingClient(c)
    setModalOpen(true)
  }

  // Handler cuando se guarda (nuevo o editado)
  const onClientSaved = async clienteData => {
    if (editingClient) {
      // era edición
      await actualizarCliente(editingClient.id, clienteData)
    }
    // para creación, NewClientModal llamará internamente a agregarCliente()
    setModalOpen(false)
  }


  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <p className="text-lg font-semibold text-gray-700">Cargando clientes…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-800 transition duration-200">
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
            onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
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
            onChange={e => { setPorPagina(Number(e.target.value)); setPagina(1) }}
            className="border p-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            {[10,25,50,100].map(n => <option key={n} value={n}>{n} por página</option>)}
          </select>
        </div>
        <button
          disabled={selectedIds.length===0}
          onClick={() => {
            if (confirm(`¿Eliminar ${selectedIds.length}?`)) {
              selectedIds.forEach(id => eliminarCliente(id))
              setSelectedIds([])
            }
          }}
          className="w-full md:w-auto px-6 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Eliminar ({selectedIds.length})
        </button>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-200"><tr>{/* Eliminado whitespace */}
            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"><input type="checkbox"
              checked={clientesPag.length>0 && selectedIds.length===clientesPag.length}
              onChange={e => setSelectedIds(e.target.checked ? clientesPag.map(c=>c.id) : [])}
              className="form-checkbox h-4 w-4 text-blue-600 rounded"
            /></th>
            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Correo</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Dirección</th>
            <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
          </tr></thead>
          <tbody>{/* Eliminado whitespace */}
            {clientesPag.map(c=>(
              <tr key={c.id} className="border-t hover:bg-gray-50 transition duration-150 ease-in-out">
                <td className="p-3 text-center whitespace-nowrap">
                  <input type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={()=>setSelectedIds(prev=>
                      prev.includes(c.id)?prev.filter(x=>x!==c.id):[...prev,c.id]
                    )}
                    className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  />
                </td>
                <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{c.nombre}</td>
                <td className="p-3 whitespace-nowrap text-sm text-gray-500">{c.telefono}</td>
                <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{c.correo}</td>
                <td className="p-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{c.direccion}</td>
                <td className="p-3 whitespace-nowrap text-center text-sm font-medium space-x-2">
                  <button onClick={()=>abrirEditar(c)} className="px-4 py-2 bg-yellow-500 text-white rounded-md shadow-sm hover:bg-yellow-600 transition duration-200 text-xs">Editar</button>
                  <button onClick={()=>handleVerCompras(c)} className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition duration-200 text-xs">Ver compras</button>
                </td>
              </tr>
            ))}
            {clientesPag.length===0 && (
              <tr><td colSpan="6" className="p-4 text-center text-gray-500">No se encontraron clientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación inferior */}
      <div className="flex justify-center items-center space-x-4 mb-6">
        <button onClick={handlePaginaAnterior} disabled={pagina===1} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200">Anterior</button>
        <span className="text-gray-700 text-sm">Página {pagina} de {totalPaginas}</span>
        <button onClick={handlePaginaSiguiente} disabled={pagina===totalPaginas || totalPaginas === 0} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md shadow-sm hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200">Siguiente</button>
      </div>

      {/* Historial de ventas */}
      {clienteActual && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Ventas de {clienteActual.nombre}
          </h2>
          {ventasCliente.length === 0 ? (
            <p className="text-gray-600 italic">Este cliente no tiene ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-200"><tr>{/* Eliminado whitespace */}
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pago</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                   {/* Columna de Acciones para abrir modal */}
                   <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr></thead>
                <tbody>{/* Eliminado whitespace */}
                  {ventasCliente.map(v => (
                    <tr
                      key={v.id}
                      className="border-t hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer"
                      onClick={() => handleSelectSale(v)} // Click en la fila abre el modal de detalle
                    >
                      <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">{v.codigo_venta}</td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(v.created_at || v.fecha).toLocaleString()}
                      </td>
                      <td className="p-3 whitespace-nowrap text-sm text-gray-500">{v.forma_pago}</td>
                      <td className="p-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">${v.total.toFixed(2)}</td>
                       {/* Celda de acciones - Botón para abrir modal (redundante si la fila es clickeable, pero se mantiene por si acaso) */}
                       <td className="p-3 whitespace-nowrap text-center text-sm font-medium space-x-2">
                           <button
                                onClick={(e) => { e.stopPropagation(); handleSelectSale(v); }} // Detener propagación y abrir modal
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
        </div>
      )}


      {/* Modal para crear/editar cliente */}
      <NewClientModal
        isOpen={modalOpen}
        onClose={()=>setModalOpen(false)}
        onClientAdded={onClientSaved}
        cliente={editingClient}
      />

      {/* --- Modal de Detalle de Venta --- */}
      {showSaleDetailModal && selectedSale && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
              <div className="relative p-8 bg-white w-full max-w-md mx-auto rounded-lg shadow-lg">
                  {/* Botón de cerrar */}
                  <button
                      className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-xl font-bold"
                      onClick={handleCloseSaleDetailModal}
                  >
                      &times;
                  </button>

                  {/* Título del modal */}
                  <h3 className="text-2xl font-bold mb-4">Detalle de Venta - {selectedSale.codigo_venta}</h3>

                  {/* Información general de la venta */}
                  <div className="mb-4 text-sm text-gray-700">
                      <p><span className="font-semibold">Cliente:</span> {clienteActual?.nombre || 'N/A'}</p>
                      <p><span className="font-semibold">Fecha:</span> {new Date(selectedSale.created_at || selectedSale.fecha).toLocaleString()}</p>
                      <p><span className="font-semibold">Forma de Pago:</span> {selectedSale.forma_pago}</p>
                       {/* Eliminada la línea que mostraba el estado de la venta */}
                  </div>

                  {/* Lista de ítems de la venta */}
                  <div className="mb-4 border-t border-b py-4">
                      <h4 className="font-semibold mb-2">Productos:</h4>
                      <ul className="space-y-2 text-sm">
                          {selectedSaleDetails.map(item => (
                              <li key={item.id} className="flex justify-between">
                                  <span className="truncate w-2/3">{item.nombreProducto}</span>
                                  <span>x{item.cantidad}</span>
                                  <span className="font-semibold">${(item.total_parcial ?? 0).toFixed(2)}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  {/* Totales de la venta */}
                   <div className="mb-6 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">Subtotal:</span>
                        <span>${(selectedSale.subtotal ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="font-semibold">Descuento:</span>
                        <span>-${(selectedSale.valor_descuento ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-green-700">
                        <span className="font-semibold">Total:</span>
                        <span>${(selectedSale.total ?? 0).toFixed(2)}</span>
                      </div>
                    </div>


                  {/* Botones de acción del modal */}
                  <div className="flex justify-end space-x-4">
                       {/* Botón Ver PDF Ticket */}
                        <button
                            onClick={generarPDF} // Llama a generarPDF con los datos de selectedSale
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 ease-in-out"
                        >
                            Ver PDF Ticket
                        </button>
                        {/* Botón Cancelar Venta */}
                         <button
                            onClick={handleCancelSale} // Llama a handleCancelSale con los datos de selectedSale
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 ease-in-out"
                        >
                            Cancelar Venta
                        </button>
                       <button
                            onClick={handleCloseSaleDetailModal}
                            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out"
                        >
                            Cerrar
                        </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}

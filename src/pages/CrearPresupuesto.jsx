// src/pages/CrearPresupuesto.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Verifica que la ruta sea correcta y el archivo exista para tus contextos y supabase
import { useAuth } from '../contexts/AuthContext';
import { useClientes } from '../contexts/ClientesContext';
import { useProductos } from '../contexts/ProductosContext';
import { supabase } from '../supabase';

// Helper simple para formatear moneda
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    // Ajusta según tu moneda y región
    return numericAmount.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fecha y hora para el código (aaaammddhhmmss)
const formatDateTimeForCode = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`; // Formato sin ':' para el código
};

// Helper para formatear fecha para el nombre del archivo
const formatDateForFilename = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
};


export default function CrearPresupuesto() {
  const navigate = useNavigate();
  const { user } = useAuth(); // El usuario loggeado es el vendedor
  const { clientes } = useClientes();
  const { productos } = useProductos();

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [clienteSugerenciaIndex, setClienteSugerenciaIndex] = useState(-1);

  // La fecha de creación del presupuesto se captura al guardar
  const [fechaPresupuesto] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(''); // Contador de tiempo actual en la UI

  const [detalleBusquedaActual, setDetalleBusquedaActual] = useState({
      id: Date.now(),
      producto_id: '',
      cantidad: 1,
      precio_unitario: 0, // Usar 0 como valor inicial
      productoBusqueda: '',
      sugerenciaIndex: -1
  });

  const [productosEnPresupuesto, setProductosEnPresupuesto] = useState([]);

  const [observaciones, setObservaciones] = useState('');
  const [estado, setEstado] = useState('Pendiente');

  const [formaPago, setFormaPago] = useState('');

  const [descuentoTipo, setDescuentoTipo] = useState('Sin descuento');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0); // Usar 0 como valor inicial
  const [descuentoImporte, setDescuentoImporte] = useState(0); // Usar 0 como valor inicial
  const [descuentoMonto, setDescuentoMonto] = useState(0);

  const [gastosEnvio, setGastosEnvio] = useState(0); // Usar 0 como valor inicial

  const [subtotalGeneral, setSubtotalGeneral] = useState(0);
  const [total, setTotal] = useState(0);

  // --- Estados para listar y ver presupuestos ---
  const [presupuestosGuardados, setPresupuestosGuardados] = useState([]);
  const [isLoadingPresupuestos, setIsLoadingPresupuestos] = useState(false);
  const [isTicketPreviewModalOpen, setIsTicketPreviewModalOpen] = useState(false);
  const [ticketImageUrl, setTicketImageUrl] = useState('');
  const [budgetToDisplayInModal, setBudgetToDisplayInModal] = useState(null); // Estado para el presupuesto a mostrar en el modal

  const ticketContentRef = useRef(null);


  // Efecto para actualizar la hora actual
  useEffect(() => {
      const updateCurrentTime = () => {
          const now = new Date();
          const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
          const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
          const formattedDate = now.toLocaleDateString('es-ES', dateOptions);
          const formattedTime = now.toLocaleTimeString('es-ES', timeOptions);
          setCurrentTime(`${formattedDate} ${formattedTime}`);
      };
      updateCurrentTime();
      const intervalId = setInterval(updateCurrentTime, 1000);
      return () => clearInterval(intervalId);
  }, []);

  // Efecto para calcular totales
  useEffect(() => {
    let subtotalAntesDescuento = productosEnPresupuesto.reduce((sum, item) =>
      sum + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0), 0);

    let currentDescuentoMonto = 0;
    if (descuentoTipo === 'Por porcentaje') {
        const porcentaje = parseFloat(descuentoPorcentaje) || 0;
        currentDescuentoMonto = subtotalAntesDescuento * (porcentaje / 100);
        setDescuentoImporte(0); // Resetear importe si se cambia a porcentaje
    } else if (descuentoTipo === 'Por importe') {
        currentDescuentoMonto = parseFloat(descuentoImporte) || 0;
        // Opcional: Calcular porcentaje para mostrarlo si se desea
        if (subtotalAntesDescuento > 0) {
            setDescuentoPorcentaje((currentDescuentoMonto / subtotalAntesDescuento) * 100);
        } else {
            setDescuentoPorcentaje(0);
        }
    } else { // Sin descuento
        currentDescuentoMonto = 0;
        setDescuentoPorcentaje(0); // Resetear porcentaje y importe si no hay descuento
        setDescuentoImporte(0);
    }

    setDescuentoMonto(currentDescuentoMonto);

    // Calcular subtotal después del descuento
    const subtotalConDescuento = subtotalAntesDescuento - currentDescuentoMonto;
    // Asegurarse de que el subtotal no sea negativo
    const finalSubtotal = Math.max(0, subtotalConDescuento);
    setSubtotalGeneral(finalSubtotal);

    // Calcular el total incluyendo el subtotal con descuento y los gastos de envío
    const currentGastosEnvio = parseFloat(gastosEnvio) || 0;
    setTotal(finalSubtotal + currentGastosEnvio);

  }, [productosEnPresupuesto, descuentoTipo, descuentoPorcentaje, descuentoImporte, gastosEnvio]);


  // Efecto para cargar presupuestos guardados al montar el componente
  useEffect(() => {
      fetchPresupuestos();
  }, [user]); // Depende de user para cargar solo cuando el usuario esté autenticado

  async function fetchPresupuestos() {
    const { data, error } = await supabase
      .from('presupuestos')
      .select(`
        *,
        clientes(id, nombre, telefono),
        presupuesto_items(*, productos(id, nombre)),
        vendedor:usuarios!vendedor_id(id, nombre, email)
      `)
      .eq('vendedor_id', user.id)
      .order('fecha_creacion', { ascending: false });
  
    if (error) {
      console.error('Error fetching presupuestos:', error);
      return;
    }
    setPresupuestosGuardados(data);
  }


  // Lógica de filtrado para clientes y productos (sin cambios relevantes)
  const clientesFiltrados = useMemo(() => {
      if (!clienteBusqueda) return [];
      return clientes.filter(cliente =>
          cliente.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())
      ).slice(0, 10);
  }, [clientes, clienteBusqueda]);

  const productosFiltrados = useMemo(() => {
      if (!detalleBusquedaActual.productoBusqueda) return [];
      return productos.filter(producto =>
          producto.nombre.toLowerCase().includes(detalleBusquedaActual.productoBusqueda.toLowerCase())
      ).slice(0, 10);
  }, [productos, detalleBusquedaActual.productoBusqueda]);

  // Funciones de selección y manejo de inputs (sin cambios relevantes)
  const seleccionarCliente = (cliente) => {
      setClienteSeleccionado(cliente);
      setClienteBusqueda(cliente.nombre);
      setClienteSugerenciaIndex(-1);
  };

  const seleccionarProductoBusqueda = (producto) => {
      setDetalleBusquedaActual(prevDetalle => ({
          ...prevDetalle,
          producto_id: producto.id,
          // Usar 'promocion' como precio unitario si existe y es válido, de lo contrario usar 'precio'
          precio_unitario: (producto.promocion !== null && !isNaN(parseFloat(producto.promocion))) ? parseFloat(producto.promocion) : parseFloat(producto.precio) || 0,
          productoBusqueda: producto.nombre,
          sugerenciaIndex: -1
      }));
  };

   const añadirProductoAlPresupuesto = () => {
       if (!detalleBusquedaActual.producto_id || parseFloat(detalleBusquedaActual.cantidad) <= 0) {
           toast.error("Selecciona un producto y cantidad válida para añadir.");
           return;
       }
       const productoCompleto = productos.find(p => p.id === detalleBusquedaActual.producto_id);
       if (!productoCompleto) {
           toast.error("Error al encontrar la información completa del producto.");
           return;
       }

       const cantidad = parseFloat(detalleBusquedaActual.cantidad) || 0;
       const precioUnitario = parseFloat(detalleBusquedaActual.precio_unitario) || 0;


       const itemPresupuestoId = Date.now() + Math.random();
       const nuevoProductoEnPresupuesto = {
           ...productoCompleto,
           id: itemPresupuestoId, // ID único para este item en la lista del formulario (no el ID del producto de la BD)
           producto_id: productoCompleto.id, // Asegurarse de guardar el ID real del producto de la BD
           cantidad: cantidad,
           precio_unitario: precioUnitario,
           subtotal: cantidad * precioUnitario, // Subtotal calculado para este ítem
           // descripción: productoCompleto.descripcion // Si tienes esta columna en productos
           nombre: productoCompleto.nombre // Usar el nombre para mostrar en el frontend
       };

       setProductosEnPresupuesto([...productosEnPresupuesto, nuevoProductoEnPresupuesto]);
       // Limpiar los campos de añadir producto después de agregarlo
       setDetalleBusquedaActual({
           id: Date.now(),
           producto_id: '',
           cantidad: 1,
           precio_unitario: 0,
           productoBusqueda: '',
           sugerenciaIndex: -1
       });
       toast.success("Producto añadido al presupuesto.");
   };

   const eliminarProductoDelPresupuesto = (itemPresupuestoId) => {
       setProductosEnPresupuesto(prevProductos => prevProductos.filter(item => item.id !== itemPresupuestoId));
       toast.success("Producto eliminado del presupuesto.");
   };

   const manejarCambioDetalleBusqueda = (campo, valor) => {
     // Permitir borrar el precio_unitario para escribir uno nuevo, pero tratar como 0 si está vacío o no es un número
     setDetalleBusquedaActual(prevDetalle => ({ ...prevDetalle, [campo]: valor }));
   };

   const manejarCambioProductoBusquedaInput = (valor) => {
       setDetalleBusquedaActual(prevDetalle => ({
           ...prevDetalle,
           productoBusqueda: valor,
           producto_id: '', // Limpiar campos relacionados al cambiar la búsqueda
           precio_unitario: 0, // Limpiar precio unitario
           sugerenciaIndex: -1
       }));
   };

   // Manejo de teclado para sugerencias (sin cambios)
   const handleClienteKeyDown = useCallback((e) => {
        if (clientesFiltrados.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setClienteSugerenciaIndex(prevIndex => Math.min(prevIndex + 1, clientesFiltrados.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setClienteSugerenciaIndex(prevIndex => Math.max(prevIndex - 1, 0)); }
        else if (e.key === 'Enter') {
            if (clienteSugerenciaIndex >= 0 && clienteSugerenciaIndex < clientesFiltrados.length) {
                e.preventDefault();
                seleccionarCliente(clientesFiltrados[clienteSugerenciaIndex]);
            }
        }
   }, [clientesFiltrados, clienteSugerenciaIndex, seleccionarCliente]);

   const handleProductoKeyDown = useCallback((e) => {
       const filtered = productosFiltrados;
       if (filtered.length === 0) return;
       if (e.key === 'ArrowDown') { e.preventDefault(); setDetalleBusquedaActual(prevDetalle => ({ ...prevDetalle, sugerenciaIndex: Math.min(prevDetalle.sugerenciaIndex + 1, filtered.length - 1) })); }
       else if (e.key === 'ArrowUp') { e.preventDefault(); setDetalleBusquedaActual(prevDetalle => ({ ...prevDetalle, sugerenciaIndex: Math.max(prevDetalle.sugerenciaIndex - 1, 0) })); }
       else if (e.key === 'Enter') {
           if (detalleBusquedaActual.sugerenciaIndex >= 0 && detalleBusquedaActual.sugerenciaIndex < filtered.length) {
               e.preventDefault();
               seleccionarProductoBusqueda(filtered[detalleBusquedaActual.sugerenciaIndex]);
           }
       }
   }, [detalleBusquedaActual, productosFiltrados, seleccionarProductoBusqueda]);


  // Función para guardar el presupuesto en Supabase (ACTUALIZADA con nombres de columnas de tus esquemas)
  const guardarPresupuesto = async () => {
    if (!user) { toast.error('Debes iniciar sesión para crear un presupuesto.'); return; }
    if (!clienteSeleccionado) { toast.error('Debes seleccionar un cliente.'); return; }
    if (productosEnPresupuesto.length === 0) { toast.error('Debes añadir al menos un producto al presupuesto.'); return; }

    // Generar Código de Presupuesto (P#aaaammddhhmmss)
    const now = new Date();
    const codigoPresupuesto = `P#${formatDateTimeForCode(now)}`;

    // 1. Preparar datos para la tabla 'presupuestos'
    const nuevoPresupuestoData = {
      vendedor_id: user.id,
      cliente_id: clienteSeleccionado.id,
      fecha_creacion: now.toISOString(), // Usar la fecha y hora exacta de la creación
      numero_presupuesto: codigoPresupuesto, // <-- Usando el nombre de columna de tu esquema
      notas: observaciones,
      estado: 'Pendiente', // Estado inicial por defecto al crear
      forma_pago: formaPago,
      tipo_descuento: descuentoTipo,
      valor_descuento: descuentoTipo === 'Por porcentaje' ? parseFloat(descuentoPorcentaje) || 0 : parseFloat(descuentoImporte) || 0, // <-- Usando el nombre de columna de tu esquema
      descuento_aplicado: descuentoMonto, // <-- Usando el nombre de columna de tu esquema (monto calculado)
      gastos_envio: parseFloat(gastosEnvio) || 0,
      // impuestos: parseFloat(impuestos) || 0, // <-- Ignorado ya que no está en el formulario/ticket
      subtotal: subtotalGeneral, // Este subtotal ya tiene el descuento aplicado
      total: total, // Total es igual al subtotal con descuento + gastos de envío
      // fecha_validez: <-- Ignorado ya que no está en el formulario
    };

    // 2. Insertar el presupuesto principal para obtener el ID
     const { data: simplePresupuestoData, error: simplePresupuestoError } = await supabase
      .from('presupuestos')
      .insert([nuevoPresupuestoData])
      .select('id'); // Solo necesitamos el ID aquí

    if (simplePresupuestoError) {
        toast.error(`Error al guardar el presupuesto inicial: ${simplePresupuestoError.message}`);
        console.error('Error al guardar presupuesto inicial:', simplePresupuestoError);
        return;
    }

    const presupuestoId = simplePresupuestoData[0].id;
    console.log('Presupuesto principal guardado con ID:', presupuestoId);


    // 3. Preparar y insertar los ítems del presupuesto en 'presupuesto_items' (ACTUALIZADA nombres de columnas)
    const itemsParaInsertar = productosEnPresupuesto.map(item => ({
        presupuesto_id: presupuestoId,
        producto_id: item.producto_id, // El ID del producto original de la BD
        cantidad: parseFloat(item.cantidad) || 0,
        precio_unitario: parseFloat(item.precio_unitario) || 0,
        subtotal_item: parseFloat(item.subtotal) || 0, // <-- Usando el nombre de columna de tu esquema
        descripcion: item.nombre // <-- Usando el nombre de columna 'descripcion' para el nombre del producto
        // nombre_producto: item.nombre // Puedes incluir este también si tu esquema lo requiere, pero 'descripcion' parece ser el nombre principal
    }));

    if (itemsParaInsertar.length > 0) {
        const { error: itemsError } = await supabase
            .from('presupuesto_items') // <-- Nombre de tu tabla de ítems de presupuesto
            .insert(itemsParaInsertar);

        if (itemsError) {
            toast.error(`Error al guardar los detalles del presupuesto: ${itemsError.message}`);
            console.error('Error al guardar ítems del presupuesto:', itemsError);
            // Eliminar el presupuesto principal si falla la inserción de ítems para mantener la consistencia
             await supabase.from('presupuestos').delete().eq('id', presupuestoId);
             toast.error('Presupuesto principal eliminado debido a error en ítems.');
            return;
        }
    }

    // Si llegamos aquí, ambas inserciones (presupuesto e ítems) fueron exitosas
    toast.success('Presupuesto guardado con éxito!');

    // Actualizar la lista de presupuestos guardados (refetch)
    fetchPresupuestos();

    // Ahora, fetch el presupuesto recién guardado con todos los detalles y relaciones para mostrar en el modal
    
    async function fetchPresupuestoDetalle(presupuestoId) {
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          *,
          clientes(id, nombre, telefono),
          presupuesto_items(*, productos(id, nombre)),
          vendedor:usuarios!vendedor_id(id, nombre, email)
        `)
        .eq('id', presupuestoId)
        .single();
    
      if (error) {
        console.error('Error fetching presupuesto detalle:', error);
        return;
      }
      return data;
    }
    setBudgetToDisplayInModal(await fetchPresupuestoDetalle(presupuestoId));
    setIsTicketPreviewModalOpen(true);
    

    // Limpiar el formulario
    setClienteSeleccionado(null);
    setClienteBusqueda('');
    // setFechaPresupuesto(new Date().toISOString().split('T')[0]); // La fecha ya no se resetea aquí, se usa la del momento de la creación
    setDetalleBusquedaActual({ id: Date.now(), producto_id: '', cantidad: 1, precio_unitario: 0, productoBusqueda: '', sugerenciaIndex: -1 });
    setProductosEnPresupuesto([]);
    setObservaciones('');
    setEstado('Pendiente');
    setFormaPago('');
    setDescuentoTipo('Sin descuento');
    setDescuentoPorcentaje(0);
    setDescuentoImporte(0);
    setGastosEnvio(0);
    // Los totales se recalcularán automáticamente al limpiar productosEnPresupuesto
  };


  // Función para generar la imagen del ticket (ACTUALIZADA para usar datos del presupuesto cargado y diseño)
  const generateTicketImage = async (budgetData) => {
      if (!ticketContentRef.current || !budgetData) {
          setTicketImageUrl('');
          return;
      }

      const ticketElement = ticketContentRef.current;
      // Asegurarse de que el contenido esté visible para html2canvas (aunque esté fuera de pantalla)
      ticketElement.style.position = 'relative';
      ticketElement.style.left = '0';
      ticketElement.style.top = '0';
      ticketElement.style.zIndex = '9999';
      ticketElement.style.background = '#fff';
      ticketElement.style.padding = '20px';
      ticketElement.style.width = '300px'; // Ancho fijo para simular ticket
      ticketElement.style.fontSize = '12px';
      ticketElement.style.fontFamily = 'monospace'; // Fuente monoespacio para look de ticket
       // Estilo para evitar saltos de página en la captura si el contenido es largo
      ticketElement.style.height = 'auto';


      const clienteNombre = budgetData.clientes?.nombre || 'Cliente Desconocido'; // Usar datos de la relación 'clientes'
      const clienteTelefono = budgetData.clientes?.telefono || 'N/A'; // Asumiendo que tienes un campo 'telefono' en tu tabla 'clientes'
      // Usar el nombre del vendedor cargado via join (vendedor.full_name)
      const vendedorNombre =
  budgetData.vendedor?.nombre ||           // tu tabla “usuarios.nombre”
  user?.user_metadata?.full_name ||        // fallback al nombre del usuario actual
  'Vendedor Desconocido';


      const fechaPresupuestoFormatted = new Date(budgetData.fecha_creacion).toLocaleDateString('es-ES', {
          year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const horaPresupuestoFormatted = new Date(budgetData.fecha_creacion).toLocaleTimeString('es-ES', {
          hour: '2-digit', minute: '2-digit', hour12: false
      });


      let detallesHtml = budgetData.presupuesto_items?.map(item => {
          // Usar el nombre del producto desde la relación cargada (productos.nombre) o la descripción guardada en el ítem
          const productName = item.productos?.nombre || item.descripcion || 'Producto Desconocido';
          return `
              <p style="margin: 2px 0;">${item.cantidad} x ${productName} @ ${formatCurrency(item.precio_unitario)} = ${formatCurrency(item.subtotal_item)}</p>
          `;
      }).join('') || '<p>Sin detalles de productos.</p>'; // Mostrar mensaje si no hay ítems

       // Recalcular subtotal antes de descuento para el ticket usando los ítems del presupuesto cargado
       let subtotalAntesDescuentoTicket = budgetData.presupuesto_items?.reduce((sum, item) =>
           sum + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0), 0) || 0;


      ticketElement.innerHTML = `
          <div style="text-align: center; margin-bottom: 20px;">
              <img src="/images/PERFUMESELISAwhite.jpg" alt="Logo Empresa" style="width: 80px; margin-bottom: 10px;">
              <h3 style="margin: 0;">Ticket / Presupuesto</h3>
              <p style="margin: 5px 0;">#${budgetData.numero_presupuesto}</p> <p style="margin: 2px 0; font-size: 10px;">81 3080 4010 - Ciudad Apodaca</p>
              <hr style="margin: 10px 0; border-top: 1px dashed #000;">
          </div>
          <div style="margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Cliente:</span><span>${clienteNombre}</span>
              </div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Teléfono:</span><span>${clienteTelefono}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Vendedor:</span><span>${vendedorNombre}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Fecha:</span><span>${fechaPresupuestoFormatted} ${horaPresupuestoFormatted}</span>
              </div>
          </div>
          <hr style="margin: 10px 0; border-top: 1px dashed #000;">
          <div>
              <h4 style="margin: 0 0 10px 0;">Detalle de Presupuesto:</h4>
              ${detallesHtml}
          </div>
          <hr style="margin: 10px 0; border-top: 1px dashed #000;">
          <div style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-weight: bold;">Subtotal:</span><span>${formatCurrency(subtotalAntesDescuentoTicket)}</span>
              </div>
              ${budgetData.descuento_aplicado > 0 ? ` <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: red;">
                <span style="font-weight: bold;">Descuento:</span><span>-${formatCurrency(budgetData.descuento_aplicado)}</span>
              </div>` : ''}
               ${budgetData.gastos_envio > 0 ? `
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                 <span style="font-weight: bold;">Gastos Envío:</span><span>${formatCurrency(budgetData.gastos_envio)}</span>
               </div>` : ''}
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                 <span style="font-weight: bold;">Forma Pago:</span><span>${budgetData.forma_pago || 'N/A'}</span>
               </div>
              <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 1.1em; font-weight: bold;">
                <span>Total:</span><span>${formatCurrency(budgetData.total)}</span>
              </div>
          </div>
          ${budgetData.notas ? `
          <div style="margin-top: 15px; font-size: 10px;">
              <p style="font-weight: bold; margin-bottom: 5px;">Observaciones:</p>
              <p>${budgetData.notas}</p>
          </div>` : ''}
          <div style="text-align: center; margin-top: 20px;">
              <p style="margin: 0;">¡Gracias por tu preferencia!</p>
              <p style="margin: 5px 0 0 0; font-size: 10px;">Visítanos de nuevo pronto.</p>
          </div>
      `;

      try {
          const canvas = await html2canvas(ticketElement, {
              scale: 2, // Aumentar la escala para mejor calidad
              logging: false, // Deshabilitar logs para producción
              useCORS: true // Intentar usar CORS
          });

          const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
          setTicketImageUrl(imageUrl);
      } catch (error) {
          toast.error("Error al generar la imagen del ticket.");
          console.error("Error generating ticket image:", error);
          setTicketImageUrl('');
      } finally {
           // Restaurar la posición y visibilidad original del div oculto
          ticketElement.style.position = 'absolute';
          ticketElement.style.left = '-9999px';
          ticketElement.style.top = '-9999px';
          ticketElement.style.zIndex = '';
          ticketElement.style.height = ''; // Restaurar altura
           ticketElement.innerHTML = ''; // Limpiar el contenido después de la captura
      }
  };

   // Efecto para generar la imagen del ticket cuando se abre el modal Y hay datos para mostrar
   useEffect(() => {
       if (isTicketPreviewModalOpen && budgetToDisplayInModal) {
           generateTicketImage(budgetToDisplayInModal);
       } else if (!isTicketPreviewModalOpen) {
           // Limpiar la URL de la imagen y los datos cuando el modal se cierra
           setTicketImageUrl('');
           setBudgetToDisplayInModal(null); // Limpiar datos del modal al cerrar
       }
   }, [isTicketPreviewModalOpen, budgetToDisplayInModal, user]); // Regenerar si cambian datos relevantes o el usuario

    // Función para abrir el modal con los detalles de un presupuesto existente
    const handleViewDetails = (budget) => {
        // Establecer los datos del presupuesto a mostrar en el modal.
        // Como ya cargamos las relaciones en fetchPresupuestos, usamos esos datos.
        setBudgetToDisplayInModal(budget);
        setIsTicketPreviewModalOpen(true); // Abrir el modal
    };


    // Función para generar la venta (IMPLEMENTACIÓN BASADA EN ESQUEMAS PROPORCIONADOS)
    const handleGenerateSale = async (budget) => {
        if (!user) {
            toast.error('Debes iniciar sesión para generar una venta.');
            return;
        }

        // Confirmar la acción con el usuario
        if (!window.confirm(`¿Estás seguro de generar la venta para el presupuesto ${budget.numero_presupuesto}?`)) {
            return;
        }

        try {
            // 1. Crear un nuevo registro en la tabla 'ventas'.
            // Usar los nombres de columnas confirmados por los esquemas.
            const now = new Date();
            // Generar Código de Venta (VT#aaaammddhhmmss) - Ajusta el prefijo 'VT#' si usas otro.
            const codigoVenta = `VT#${formatDateTimeForCode(now)}`;

            const nuevaVentaData = {
                // id: generado automáticamente (uuid)
                presupuesto_id: budget.id, // Enlazar con el presupuesto
                cliente_id: budget.cliente_id,
                vendedor_id: budget.vendedor_id, // El vendedor que creó el presupuesto
                fecha: now.toISOString(), // Columna 'fecha' en la tabla ventas
                codigo_venta: codigoVenta, // Columna 'codigo_venta' en ventas
                total: budget.total, // Columna 'total' en ventas
                subtotal: budget.subtotal, // Columna 'subtotal' en ventas (después de descuento del presupuesto)
                tipo_descuento: budget.tipo_descuento, // Columna 'tipo_descuento' en ventas
                valor_descuento: budget.valor_descuento, // Columna 'valor_descuento' en ventas (valor del descuento del presupuesto)
                // descuento_aplicado: budget.descuento_aplicado, // Si quieres guardar el monto aplicado, añade la columna en ventas
                gastos_envio: budget.gastos_envio, // Columna 'gastos_envio' en ventas
                forma_pago: budget.forma_pago, // Columna 'forma_pago' en ventas
                // cliente_nombr: budget.clientes?.nombre, // Opcional: si quieres guardar el nombre del cliente directamente en ventas
                // productos: // Ignoramos la columna 'productos' json a menos que se aclare su uso.
                // created_at: generado automáticamente
                // enganche: Ignoramos por ahora
                // estado: 'Completada', // Si tienes columna 'estado' en 'ventas', inclúyela y ajusta el valor.
            };

            // --- IMPORTANTE: Revisa 'nuevaVentaData' y compárala con las columnas de tu tabla 'ventas'
            // --- (imagen image_95cc13.jpg) para asegurar que coinciden exactamente.

            // **ADVERTENCIA:** La inserción directa desde el cliente (como se muestra a continuación)
            // NO garantiza la atomicidad. Si la inserción en 'detalle_venta' falla después de
            // insertar en 'ventas', tendrás una venta sin ítems.
            // Para garantizar la atomicidad (todas las operaciones se completan o ninguna),
            // se recomienda encarecidamente implementar una Función de Base de Datos (RPC)
            // o una Edge Function en Supabase que realice todas las inserciones y actualizaciones en una transacción.


            const { data: ventaData, error: ventaError } = await supabase
                .from('ventas') // <-- Nombre exacto de tu tabla de ventas
                .insert([nuevaVentaData])
                .select('id, codigo_venta'); // Obtener ID y código de la venta creada

            if (ventaError) {
                throw new Error(`Error al crear el registro de venta en tabla 'ventas': ${ventaError.message}`);
            }

            const ventaId = ventaData[0].id;
            const codigoVentaCreada = ventaData[0].codigo_venta;
            console.log('Registro de venta creado con ID:', ventaId, 'Código:', codigoVentaCreada);


            // 2. Crear registros en la tabla 'detalle_venta' para cada ítem del presupuesto.
            // Usar los nombres de columnas confirmados por los esquemas.
            const itemsVentaParaInsertar = budget.presupuesto_items.map(item => ({
                venta_id: ventaId, // Enlazar con la venta recién creada
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario, // Columna 'precio_unitario' en detalle_venta
                total_parcial: item.subtotal_item, // Columna 'total_parcial' en detalle_venta (subtotal por ítem)
                // Si tienes una columna para la descripción/nombre del producto en detalle_venta, inclúyela:
                // descripcion: item.productos?.nombre || item.descripcion, // O usa el nombre que guardaste en presupuesto_items
                // ... otros campos de la tabla 'detalle_venta' que necesites
            }));

             // --- IMPORTANTE: Revisa 'itemsVentaParaInsertar' y compárala con las columnas de tu tabla 'detalle_venta'
             // --- (imagen image_95cb91.png) para asegurar que coinciden exactamente.

            if (itemsVentaParaInsertar.length > 0) {
                 const { error: detalleVentaError } = await supabase
                    .from('detalle_venta') // <-- Nombre exacto de tu tabla de detalles de venta
                    .insert(itemsVentaParaInsertar);

                if (detalleVentaError) {
                     // Si falla la inserción de ítems, intentamos eliminar la venta principal
                     console.error('Error al crear los detalles de la venta:', detalleVentaError);
                     await supabase.from('ventas').delete().eq('id', ventaId); // Intenta revertir
                     throw new Error(`Error al crear los detalles de la venta. Se eliminó la venta principal para evitar inconsistencia. ${detalleVentaError.message}`);
                }
            }

            // 3. Actualizar el estado del presupuesto a 'Convertido a Venta'.
            const { error: updateError } = await supabase
                .from('presupuestos')
                .update({ estado: 'Convertido a Venta' })
                .eq('id', budget.id);

            if (updateError) {
                 console.error('Error al actualizar estado del presupuesto:', updateError);
                 // La venta y los ítems se crearon, pero el presupuesto no se marcó.
                 // Esto es un problema menor, pero notifica.
                 toast.error('Advertencia: El presupuesto no se marcó como "Convertido a Venta".');
            }


            // Si todo fue bien
            toast.success(`Venta generada con éxito para el presupuesto ${budget.numero_presupuesto}! Código de Venta: ${codigoVentaCreada}`);

            // Refrescar la lista de presupuestos guardados para mostrar el estado actualizado
            fetchPresupuestos();

            // Opcional: Navegar a la página de detalles de la venta si tienes una
            // navigate(`/ventas/${ventaId}`);

        } catch (error) {
            toast.error(`Error al generar la venta: ${error.message}`);
            console.error('Error generating sale:', error);
        }
    };


  // Función para descargar la imagen del ticket
  const downloadTicketImage = () => {
      if (ticketImageUrl && budgetToDisplayInModal) {
          const link = document.createElement('a');
          link.href = ticketImageUrl;
          // Usar el código del presupuesto para el nombre del archivo si está disponible
          const filenameCode = budgetToDisplayInModal.numero_presupuesto?.replace('#', '') || formatDateForFilename(new Date().toISOString());
          const filename = `ticket_presupuesto_${filenameCode}.jpg`; // Nombre más descriptivo

          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          toast.error("No hay imagen de ticket para descargar.");
      }
  };

  // Función para cerrar el modal de previsualización del ticket
  const closeTicketPreviewModal = () => {
      setIsTicketPreviewModalOpen(false);
      // Los estados ticketImageUrl y budgetToDisplayInModal se limpian en el useEffect
  };


  return (
    <div className="p-6 max-w-6xl mx-auto"> {/* Aumentado max-width para la lista */}
       {/* Botón Volver al inicio */}
       <button
          onClick={() => navigate('/')}
          className="mb-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-md font-semibold hover:bg-gray-400 transition-colors"
       >
          Volver al inicio
       </button>

       <h1 className="text-2xl font-bold mb-6">Crear Nuevo Presupuesto</h1>

        {/* ... (Sección de Información General, Búsqueda y Adición de Producto, Productos en Presupuesto, Totales y Pagos, Observaciones) ... */}

        {/* Sección de Información General */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Campo de búsqueda de Cliente */}
          <div className="relative">
            <label htmlFor="clienteBusqueda" className="block text-sm font-medium text-gray-700">Cliente</label>
            <input
              type="text"
              id="clienteBusqueda"
              value={clienteBusqueda}
              onChange={(e) => {
                  setClienteBusqueda(e.target.value);
                  setClienteSeleccionado(null);
                  setClienteSugerenciaIndex(-1);
              }}
              onKeyDown={handleClienteKeyDown}
              placeholder="Buscar cliente..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
            {clienteBusqueda && clientesFiltrados.length > 0 && !clienteSeleccionado && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                    {clientesFiltrados.map((cliente, index) => (
                        <li
                            key={cliente.id}
                            onClick={() => seleccionarCliente(cliente)}
                            className={`p-2 text-sm cursor-pointer ${index === clienteSugerenciaIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                        >
                            {cliente.nombre}
                        </li>
                    ))}
                </ul>
            )}
             {clienteSeleccionado && (
                 <p className="mt-2 text-sm text-green-700">Cliente seleccionado: <span className="font-semibold">{clienteSeleccionado.nombre}</span></p>
             )}
          </div>
           {/* Mostrar la fecha y hora actuales */}
           <div>
               <label className="block text-sm font-medium text-gray-700">Fecha y Hora Actual</label>
               <p className="mt-1 block w-full p-2 text-blue-800 font-mono text-lg font-semibold">{currentTime}</p>
           </div>
        </div>

        {/* Sección de Búsqueda y Adición de Producto Único */}
        <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h2 className="text-xl font-semibold mb-3">Añadir Producto</h2>
             <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                 <div className="md:col-span-2 relative">
                    <label htmlFor="productoBusquedaActual" className="block text-sm font-medium text-gray-700">Producto</label>
                    <input
                        type="text"
                        id="productoBusquedaActual"
                        value={detalleBusquedaActual.productoBusqueda}
                        onChange={(e) => manejarCambioProductoBusquedaInput(e.target.value)}
                        onKeyDown={handleProductoKeyDown}
                        placeholder="Buscar producto..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                   {detalleBusquedaActual.productoBusqueda && productosFiltrados.length > 0 && !detalleBusquedaActual.producto_id && (
                        <ul className="absolute z-10 bg-white border border-gray-300 w-full rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                            {productosFiltrados.map((producto, index) => (
                                <li
                                    key={producto.id}
                                    onClick={() => seleccionarProductoBusqueda(producto)}
                                    className={`p-2 text-sm cursor-pointer ${index === detalleBusquedaActual.sugerenciaIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                >
                                    {producto.nombre}
                                </li>
                            ))}
                        </ul>
                     )}
                 </div>
                  <div>
                    <label htmlFor="cantidadActual" className="block text-sm font-medium text-gray-700">Cantidad</label>
                    <input
                      type="number"
                      id="cantidadActual"
                      value={detalleBusquedaActual.cantidad ?? ''}
                      onChange={(e) => manejarCambioDetalleBusqueda('cantidad', e.target.value)}
                      min="1"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="precioActual" className="block text-sm font-medium text-gray-700">Precio Unitario</label>
                    <input
                      type="number"
                      id="precioActual"
                      value={detalleBusquedaActual.precio_unitario ?? ''}
                      onChange={(e) => manejarCambioDetalleBusqueda('precio_unitario', e.target.value)}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>
                  <div className="flex items-end">
                      <button
                          onClick={añadirProductoAlPresupuesto}
                          disabled={!detalleBusquedaActual.producto_id || parseFloat(detalleBusquedaActual.cantidad) <= 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          Añadir al presupuesto
                      </button>
                  </div>
             </div>
        </div>


        {/* Sección de Productos en Presupuesto */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Productos en Presupuesto</h2>
          {productosEnPresupuesto.length === 0 ? (
              <p>No hay productos añadidos al presupuesto aún.</p>
          ) : (
              <div className="border rounded-md p-4 bg-white shadow-sm">
                  {productosEnPresupuesto.map(item => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-3 pb-3 border-b last:border-b-0">
                          <div className="md:col-span-2">
                              <p className="font-semibold">{item.nombre}</p>
                              <p className="text-sm text-gray-600">{item.cantidad} x {formatCurrency(item.precio_unitario)}</p>
                          </div>
                          <div className="text-right font-bold">
                              {formatCurrency(item.subtotal)}
                          </div>
                          <div className="flex justify-end">
                              <button
                                  onClick={() => eliminarProductoDelPresupuesto(item.id)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Eliminar producto del presupuesto"
                              >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm2 4a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                                  </svg>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </div>


        {/* Sección de Totales y Pagos */}
        <div className="mb-6 p-4 border rounded-md bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-3">Resumen y Pagos</h2>
            <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Subtotal (antes descuento):</span>
                <span>{formatCurrency(productosEnPresupuesto.reduce((sum, item) => sum + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0), 0))}</span>
            </div>

            {/* Campo Descuento (Select y campos condicionales) */}
            <div className="grid grid-cols-2 gap-4 items-center mb-2">
                <div>
                    <label htmlFor="descuentoTipo" className="block text-sm font-medium text-gray-700">Descuento:</label>
                    <select
                        id="descuentoTipo"
                        value={descuentoTipo}
                        onChange={(e) => setDescuentoTipo(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="Sin descuento">Sin descuento</option>
                        <option value="Por importe">Por importe ($)</option>
                        <option value="Por porcentaje">Por porcentaje (%)</option>
                    </select>
                </div>
                {descuentoTipo === 'Por porcentaje' && (
                     <div>
                        <label htmlFor="descuentoPorcentaje" className="block text-sm font-medium text-gray-700">%</label>
                         <input
                            type="number"
                            id="descuentoPorcentaje"
                            value={descuentoPorcentaje}
                            onChange={(e) => setDescuentoPorcentaje(parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.1"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-right"
                        />
                     </div>
                )}
                 {descuentoTipo === 'Por importe' && (
                     <div>
                         <label htmlFor="descuentoImporte" className="block text-sm font-medium text-gray-700">$</label>
                         <input
                            type="number"
                            id="descuentoImporte"
                            value={descuentoImporte}
                            onChange={(e) => setDescuentoImporte(parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-right"
                         />
                      </div>
                 )}
            </div>

            {descuentoMonto > 0 ? ( // Solo mostrar si hay descuento aplicado > 0
                 <div className="flex justify-between items-center mb-2 text-red-600">
                     <span className="font-medium">Descuento aplicado:</span>
                     <span>-{formatCurrency(descuentoMonto)}</span>
                 </div>
            ) : null}

            <div className="flex justify-between items-center mb-2 border-t pt-2 mt-2">
                <span className="font-medium">Subtotal con Descuento:</span>
                <span>{formatCurrency(subtotalGeneral)}</span>
            </div>

            {/* Campo Gastos de Envío */}
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="gastosEnvio" className="text-sm font-medium text-gray-700 mr-2">Gastos de Envío:</label>
                <input
                    type="number"
                    id="gastosEnvio"
                    value={gastosEnvio}
                    onChange={(e) => setGastosEnvio(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-32 border border-gray-300 rounded-md shadow-sm p-1 text-right"
                 />
            </div>

            <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
            </div>
             {/* Campo Forma de Pago (ahora select) */}
            <div className="mt-4">
                <label htmlFor="formaPago" className="block text-sm font-medium text-gray-700">Forma de Pago</label>
                <select
                    id="formaPago"
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                    <option value="">Selecciona una forma de pago</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Crédito cliente">Crédito cliente</option>
                </select>
            </div>
        </div>

        {/* Sección de Observaciones */}
        <div className="mb-6">
          <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">Observaciones</label>
          <textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows="4"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          ></textarea>
        </div>

        {/* Botón de Guardar Presupuesto */}
        <button
          onClick={guardarPresupuesto}
          className="px-6 py-3 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors w-full mb-8" // Añadido margen inferior
          disabled={isLoadingPresupuestos} // Deshabilitar mientras carga presupuestos guardados
        >
          {isLoadingPresupuestos ? 'Guardando...' : 'Guardar Presupuesto'}
        </button>

        {/* --- Sección para Listar Presupuestos Guardados --- */}
        <table className="min-w-full bg-white rounded-lg shadow-sm overflow-hidden">
  <thead className="bg-gray-100">
    <tr>
      <th className="p-4 text-left text-gray-700">CÓDIGO</th>
      <th className="p-4 text-left text-gray-700">CLIENTE</th>
      <th className="p-4 text-left text-gray-700">FECHA</th>
      <th className="p-4 text-left text-gray-700">TOTAL</th>
      <th className="p-4 text-left text-gray-700">ESTADO</th>
      <th className="p-4 text-left text-gray-700">ACCIONES</th>
    </tr>
  </thead>
  <tbody>
    {presupuestosGuardados.map(budget => (
      <tr key={budget.id} className="bg-white border-b last:border-none">
        <td className="p-4 font-medium">#{budget.numero_presupuesto}</td>
        <td className="p-4">{budget.clientes?.nombre || 'N/A'}</td>
        <td className="p-4">
          {new Date(budget.fecha_creacion).toLocaleDateString('es-MX')}
        </td>
        <td className="p-4">{formatCurrency(budget.total)}</td>
        <td className="p-4">
          <span
            className={
              budget.estado === 'Pendiente'
                ? 'text-yellow-600 font-semibold'
                : budget.estado === 'Convertido a Venta'
                ? 'text-green-600 font-semibold'
                : 'text-gray-600 font-semibold'
            }
          >
            {budget.estado}
          </span>
        </td>
        <td className="p-4 space-x-2">
          <button
            onClick={() => handleViewDetails(budget)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Ver Detalle
          </button>
          {budget.estado !== 'Convertido a Venta' && (
            <button
              onClick={() => handleGenerateSale(budget)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Generar Venta
            </button>
          )}
        </td>
      </tr>
    ))}
    {presupuestosGuardados.length === 0 && (
      <tr>
        <td colSpan={6} className="p-4 text-center text-gray-500">
          No hay presupuestos guardados.
        </td>
      </tr>
    )}
  </tbody>
</table>


         {/* Modal de Previsualización del Ticket */}
        {isTicketPreviewModalOpen && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                  <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full relative">
                      <h3 className="text-lg font-bold mb-4 text-center">{budgetToDisplayInModal?.numero_presupuesto ? `Ticket / Presupuesto #${budgetToDisplayInModal.numero_presupuesto}` : 'Previsualización del Ticket'}</h3> {/* Usando numero_presupuesto */}

                       {/* Loader simple mientras se genera la imagen */}
                      {!ticketImageUrl && budgetToDisplayInModal && (
                           <div className="flex justify-center items-center h-40 mb-4">
                              <p>Generando ticket...</p> {/* O un spinner */}
                          </div>
                      )}

                      {ticketImageUrl && (
                          <img src={ticketImageUrl} alt="Ticket Preview" className="w-full h-auto mb-4 border" />
                      )}


                      {/* Botones de Acción */}
                      <div className="flex justify-center gap-4 w-full">
                          {ticketImageUrl && ( // Mostrar botón de descarga solo si la imagen ya se generó
                               <button
                                   onClick={downloadTicketImage}
                                   className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                               >
                                   Ticket JPG
                               </button>
                          )}

                          <button
                              onClick={closeTicketPreviewModal}
                              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md font-semibold hover:bg-gray-400 transition-colors"
                          >
                              Cerrar
                          </button>
                      </div>

                  </div>
              </div>
        )}

          {/* >>> Hidden div for html2canvas capture <<< */}
          <div ref={ticketContentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: 'auto' }}>
              {/* The HTML structure for the ticket will be populated here by generateTicketImage */}
          </div>


      </div>
    );
  }
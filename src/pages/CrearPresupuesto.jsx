// src/pages/CrearPresupuesto.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react'; // Importar useRef
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas'; // Importar html2canvas

import { useAuth } from '../contexts/AuthContext';
import { useClientes } from '../contexts/ClientesContext';
import { useProductos } from '../contexts/ProductosContext';
import { supabase } from '../supabase';

// Helper simple para formatear moneda (si no está global)
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
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

// Helper para formatear fecha en formato legible
const formatReadableDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return '-';
    }
};


// >>> Función para cargar una imagen local y convertirla a Base64 para jsPDF <<<
// Asegúrate de que esta función esté definida o importada correctamente
const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
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


export default function CrearPresupuesto() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clientes, loading: loadingClientes, error: errorClientes } = useClientes();
  const { productos, loading: loadingProductos, error: errorProductos } = useProductos();

  // Estados de formulario
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [itemsPresupuesto, setItemsPresupuesto] = useState([]);
  const [tipoDescuento, setTipoDescuento] = useState('ninguno');
  const [valorDescuento, setValorDescuento] = useState(''); // Usar cadena vacía para input
  const [gastosEnvio, setGastosEnvio] = useState(''); // Usar cadena vacía para input
  const [notas, setNotas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Búsqueda de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientSearchInputRef = useRef(null); // Ref para el input de cliente

  // Búsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState(''); // Renombrado para claridad
  const [filteredProductos, setFilteredProductos] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1); // Para navegación con teclado
  const productSearchInputRef = useRef(null); // Ref para el input de producto
  const productSuggestionsRef = useRef(null); // Ref para la lista de sugerencias de producto


  // Historial de presupuestos
  const [presupuestosExistentes, setPresupuestosExistentes] = useState([]);
  const [loadingPresupuestos, setLoadingPresupuestos] = useState(true);
  const [errorPresupuestos, setErrorPresupuestos] = useState(null);
  const [modalHistorialActivo, setModalHistorialActivo] = useState(false); // Estado para el modal de historial
  const [presupuestoSeleccionadoHistorial, setPresupuestoSeleccionadoHistorial] = useState(null); // Presupuesto seleccionado en el historial

  // >>> Estados para la previsualización del ticket (para presupuesto actual o histórico) <<<
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false);
  const [ticketPreviewData, setTicketPreviewData] = useState(null); // Datos del presupuesto para el ticket
  const ticketContentRef = useRef(null); // Ref para el div que contiene el HTML del ticket


  // >>> Estado para almacenar la imagen del logo en Base64 para el PDF/Imagen <<<
  const [logoBase64, setLogoBase64] = useState(null);

  // Carga inicial del historial y logo
  useEffect(() => {
    fetchPresupuestosExistentes();
    async function loadLogo() {
        // Usar la ruta correcta del logo para el ticket (probablemente el blanco)
        const logoUrl = '/images/PERFUMESELISAwhite.jpg'; // Asegúrate que esta ruta sea correcta y accesible públicamente
        const base64 = await getBase64Image(logoUrl);
        setLogoBase64(base64);
    }
    loadLogo();
  }, []);


// --- Nueva versión: primero traemos los presupuestos, luego para cada uno sus ítems ---
const fetchPresupuestosExistentes = async () => {
  setLoadingPresupuestos(true);
  setErrorPresupuestos(null);

  try {
    // 1) Traer los presupuestos con su cliente y el nombre del usuario (vendedor)
    // >>> CORRECCIÓN: Cambiar 'vendedores(nombre)' a 'usuarios(nombre)' <<<
    // Esto asume que la clave foránea en 'presupuestos' que apunta a la tabla 'usuarios'
    // tiene el nombre de relación 'usuarios' en Supabase.
    const { data: presupuestos, error: err1 } = await supabase
      .from('presupuestos')
      .select('id, numero_presupuesto, created_at, total, subtotal, descuento_aplicado, gastos_envio, notas, clientes(nombre), usuarios(nombre)') // Cambiado a usuarios(nombre)
      .order('created_at', { ascending: false });

    if (err1) throw err1;

    // 2) Para cada presupuesto, traer sus ítems
    const presupuestosConItems = await Promise.all(
      presupuestos.map(async p => {
        // 1) Obtén sólo campos básicos del presupuesto_items
        // con el nombre real:
        const { data: items, error: err2 } = await supabase
          .from('presupuesto_items')      // <- fija aquí el nombre correcto de tu tabla
          .select('id, producto_id, descripcion, cantidad, precio_unitario, subtotal_item')
          .eq('presupuesto_id', p.id);


        if (err2) throw err2;

        // 2) Enriquecemos cada ítem con el nombre de producto desde el contexto de productos
        // Esto es útil si la descripción en presupuesto_items no siempre es el nombre completo
        const itemsConNombre = items.map(item => {
           // Buscar el producto en el contexto de productos cargado previamente
           // Asegúrate de que productos no sea null o undefined antes de usar find
           const producto = productos ? productos.find(prod => prod.id === item.producto_id) : null;
           return {
             ...item,
             // Usar el nombre del producto si se encuentra, de lo contrario usar la descripción guardada
             productos: { nombre: producto ? producto.nombre : item.descripcion }
           };
        });


        return {
          ...p,
          presupuesto_items: itemsConNombre // Usar los ítems enriquecidos
          // El nombre del vendedor ahora debería estar en p.usuarios.nombre
        };
      })
    );

    setPresupuestosExistentes(presupuestosConItems);
  } catch (err) {
    console.error('Error al cargar presupuestos existentes:', err);
    // >>> CORRECCIÓN: Mostrar el mensaje de error de Supabase si está disponible <<<
    setErrorPresupuestos(`Error al cargar los presupuestos: ${err.message || err.toString()}`);
    toast.error(`Error al cargar presupuestos: ${err.message || err.toString()}`);
  } finally {
    setLoadingPresupuestos(false);
  }
};

  // Filtrado de clientes al escribir
  useEffect(() => {
    if (clientes && clientSearchTerm.length > 0) { // Filtrar si hay al menos un carácter
      const results = clientes.filter(c =>
        c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase())
      );
      setFilteredClientes(results);
      setShowClientSuggestions(results.length > 0);
    } else {
      setFilteredClientes([]);
      setShowClientSuggestions(false);
      // Si el término de búsqueda está vacío, deseleccionar el cliente
      if (clientSearchTerm === '') {
          setClienteSeleccionado(null);
      }
    }
  }, [clientSearchTerm, clientes]);

  // Filtrado de productos al escribir
  useEffect(() => {
    // Asegurarse de que productos esté cargado antes de filtrar
    if (productos && productSearchTerm.length > 1) {
      const results = productos.filter(p =>
        p.nombre?.toLowerCase().includes(productSearchTerm.toLowerCase()) // Usar ?. por si nombre es null
      );
      setFilteredProductos(results);
      setHighlightedProductIndex(-1); // Resetear el índice resaltado
      setShowProductSuggestions(results.length > 0);
    } else {
      setFilteredProductos([]);
      setShowProductSuggestions(false);
      setHighlightedProductIndex(-1); // Resetear el índice resaltado
    }
  }, [productSearchTerm, productos]); // Asegurarse de que productos es una dependencia

  // Manejar selección de cliente desde sugerencias
  const handleSelectClient = (client) => {
      setClienteSeleccionado(client);
      setClientSearchTerm(client.nombre); // Poner el nombre del cliente en el input
      setShowClientSuggestions(false); // Ocultar sugerencias
  };

   // Manejar blur del input de cliente (para deseleccionar si el texto no coincide)
   const handleClientBlur = () => {
       // Dar un pequeño retraso para permitir clics en las sugerencias
       setTimeout(() => {
           if (clienteSeleccionado && clienteSeleccionado.nombre !== clientSearchTerm) {
               // Si hay un cliente seleccionado pero el texto del input no coincide, deseleccionar
               setClienteSeleccionado(null);
               // Opcional: podrías resetear clientSearchTerm a '' o al nombre del cliente seleccionado
               // setClientSearchTerm('');
           } else if (!clienteSeleccionado && clientSearchTerm !== '') {
               // Si no hay cliente seleccionado y el input no está vacío, limpiar el input
                setClientSearchTerm('');
           }
           setShowClientSuggestions(false); // Asegurarse de ocultar las sugerencias
       }, 100); // Pequeño retraso
   };


  // Añadir ítem
  const handleAddItem = producto => {
    const newItem = {
      idInterno: Date.now() + Math.random(), // Usar timestamp + random para clave única local
      producto_id: producto.id,
      descripcion: producto.nombre,
      // Usar promocion si existe, de lo contrario usar precio normal
      precio_unitario: producto.promocion ?? producto.precio ?? 0 // Usar 0 como fallback final
    };
    setItemsPresupuesto(prev => [...prev, newItem]);
    setProductSearchTerm(''); // Limpiar input de búsqueda de producto
    setFilteredProductos([]); // Limpiar sugerencias
    setShowProductSuggestions(false); // Ocultar sugerencias
    setHighlightedProductIndex(-1); // Resetear índice resaltado
  };

  // Actualizar cantidad
  const handleUpdateItemQuantity = (idInterno, newQuantity) => {
    setItemsPresupuesto(prev =>
      prev.map(item =>
        item.idInterno === idInterno
          ? { ...item, cantidad: newQuantity === '' ? '' : parseFloat(newQuantity) } // Permitir cadena vacía temporalmente para input
          : item
      )
    );
  };

   // Actualizar precio unitario (si permites editarlo en la lista de ítems)
   const handleUpdateItemPrice = (idInterno, newPrice) => {
       setItemsPresupuesto(prev =>
           prev.map(item =>
               item.idInterno === idInterno
                   ? { ...item, precio_unitario: newPrice === '' ? '' : parseFloat(newPrice) } // Permitir cadena vacía temporalmente
                   : item
           )
       );
   };


  // Eliminar ítem
  const handleRemoveItem = idInterno => {
    setItemsPresupuesto(prev => prev.filter(item => item.idInterno !== idInterno));
  };

  // Añadir ítem personalizado (Placeholder)
  const handleAddItemPersonalizado = () => {
    toast('Funcionalidad "Añadir Item Personalizado" pendiente de implementar.', { icon: 'ℹ️' });
    // Aquí podrías desplegar un modal para ingresar descripción/cantidad/precio
  };

  // Cálculos de totales
  const subtotal = useMemo(
    () =>
      itemsPresupuesto.reduce((sum, item) => {
        const qty = parseFloat(item.cantidad) || 0;
        const price = parseFloat(item.precio_unitario) || 0;
        return sum + qty * price;
      }, 0),
    [itemsPresupuesto]
  );

  const valorDescuentoNum = parseFloat(valorDescuento) || 0;
  const descuentoAplicadoFrontend = Math.min(
    tipoDescuento === 'porcentaje'
      ? subtotal * (valorDescuentoNum / 100)
      : tipoDescuento === 'monto'
      ? valorDescuentoNum
      : 0,
    subtotal // El descuento no puede ser mayor que el subtotal
  );

  const gastosEnvioNum = parseFloat(gastosEnvio) || 0;
  const impuestosFrontend = 0; // Placeholder para impuestos si aplica
  const totalFrontend = subtotal - descuentoAplicadoFrontend + gastosEnvioNum + impuestosFrontend;

  // Guardar presupuesto → invoque RPC directamente
  const handleGuardarPresupuesto = async () => {
    if (!clienteSeleccionado) return toast.error('Debes seleccionar un cliente.');
    if (itemsPresupuesto.length === 0) return toast.error('Debes añadir al menos un ítem.');
    if (!user?.id) return toast.error('Debes estar logueado.');

    setIsSaving(true);

    const año = new Date().getFullYear();
    // Generar un número de presupuesto único y legible
    // Podrías necesitar una secuencia en la BD para asegurar unicidad si hay mucha concurrencia
    const numero_presupuesto = `PRESUPUESTO #${año}-${String(Date.now()).slice(-6)}`; // Usar los últimos 6 dígitos del timestamp

    const rpcPayload = {
      p_numero_presupuesto: numero_presupuesto,
      p_cliente_id: clienteSeleccionado.id,
      p_vendedor_id: user.id, // Asumiendo que el user logueado es el vendedor
      p_subtotal: subtotal,
      p_tipo_descuento: tipoDescuento,
      p_valor_descuento: valorDescuentoNum,
      p_descuento_aplicado: descuentoAplicadoFrontend,
      p_gastos_envio: gastosEnvioNum,
      p_impuestos: impuestosFrontend,
      p_total: totalFrontend,
      p_notas: notas,
      p_items: itemsPresupuesto.map(item => ({
          // Asegurarse de que los valores numéricos se envíen como números
          producto_id: item.producto_id,
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio_unitario) || 0,
          subtotal_item:
            (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)
        }))
    };

    try {
      // Asumiendo que la RPC retorna el ID del nuevo presupuesto creado
      const { data: newPresupuestoId, error } = await supabase.rpc(
        'crear_presupuesto_con_items',
        rpcPayload
      );
      if (error) throw error;

      toast.success(`Presupuesto ${numero_presupuesto} creado con éxito!`);
      fetchPresupuestosExistentes(); // Recargar la lista de presupuestos existentes
      // Limpiar formulario después de guardar
      setClienteSeleccionado(null);
      setClientSearchTerm('');
      setItemsPresupuesto([]);
      setTipoDescuento('ninguno');
      setValorDescuento('');
      setGastosEnvio('');
      setNotas('');

    } catch (err) {
      console.error('Error al guardar presupuesto:', err);
      // Si el error es del tipo "cannot extract elements from a scalar",
      // el problema es el formato de p_items enviado (ya corregido en el payload)
      if (err.message.includes('cannot extract elements from a scalar')) {
          toast.error('Error en el formato de los ítems del presupuesto. Verifica los datos.');
      } else {
         toast.error(`Error al crear el presupuesto: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // >>> Lógica para navegación con teclado en sugerencias de producto <<<
  const handleProductKeyDown = (e) => {
      // Si las sugerencias no se muestran o no hay productos filtrados, no hacer nada
      if (!showProductSuggestions || filteredProductos.length === 0) {
          // Permitir que la tecla Enter funcione en el input si no hay sugerencias
           if (e.key === 'Enter' && productSearchTerm.length > 1) {
              // Opcional: Si el usuario presiona Enter y hay texto, podrías intentar buscar/añadir el primer resultado
              // Pero para este caso, simplemente no hacemos nada especial si no hay sugerencias visibles
           }
          return;
      }

      switch (e.key) {
          case 'ArrowDown':
              e.preventDefault(); // Prevenir el desplazamiento de la página
              setHighlightedProductIndex(prevIndex =>
                  (prevIndex + 1) % filteredProductos.length
              );
              // Desplazar la sugerencia resaltada a la vista
              if (productSuggestionsRef.current && highlightedProductIndex !== -1) {
                  const highlightedItem = productSuggestionsRef.current.children[highlightedProductIndex + 1]; // +1 porque el índice inicial es -1
                   if (highlightedItem) {
                       highlightedItem.scrollIntoView({ block: 'nearest' });
                   }
              }
              break;
          case 'ArrowUp':
              e.preventDefault(); // Prevenir el desplazamiento de la página
              setHighlightedProductIndex(prevIndex =>
                  prevIndex <= 0 ? filteredProductos.length - 1 : prevIndex - 1
              );
               // Desplazar la sugerencia resaltada a la vista
              if (productSuggestionsRef.current && highlightedProductIndex > 0) {
                   const highlightedItem = productSuggestionsRef.current.children[highlightedProductIndex - 1];
                    if (highlightedItem) {
                        highlightedItem.scrollIntoView({ block: 'nearest' });
                    }
               }
              break;
          case 'Enter':
              // Si hay una sugerencia resaltada, seleccionarla
              if (highlightedProductIndex >= 0 && highlightedProductIndex < filteredProductos.length) {
                  e.preventDefault(); // Prevenir el envío del formulario si existe
                  handleAddItem(filteredProductos[highlightedProductIndex]);
              } else if (productSearchTerm.length > 1 && filteredProductos.length > 0) {
                  // Si no hay nada resaltado pero hay resultados, seleccionar el primero
                   e.preventDefault();
                   handleAddItem(filteredProductos[0]);
              }
              // Si no hay resultados, simplemente permitir el comportamiento por defecto (ej. envío de formulario)
              break;
          case 'Escape':
              setShowProductSuggestions(false); // Ocultar sugerencias
              setHighlightedProductIndex(-1); // Resetear índice
              break;
          default:
              // No hacer nada especial para otras teclas
              break;
      }
  };

  // >>> Lógica para abrir el modal de detalles del presupuesto histórico <<<
  const handleViewHistoricalBudget = (presupuesto) => {
      setPresupuestoSeleccionadoHistorial(presupuesto);
      setModalHistorialActivo(true);
  };

  // >>> Lógica para cerrar el modal de detalles del presupuesto histórico <<<
  const handleCloseHistoricalModal = () => {
      setModalHistorialActivo(false);
      setPresupuestoSeleccionadoHistorial(null); // Limpiar el presupuesto seleccionado
  };

  // >>> Lógica para verificar si un presupuesto es "viejo" (más de 10 días) <<<
  const isBudgetOld = (createdAt) => {
      if (!createdAt) return true; // Considerar viejo si no tiene fecha
      const createdDate = new Date(createdAt);
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      return createdDate < tenDaysAgo;
  };

  // >>> Lógica para generar el Ticket (Imagen) <<<
  // Esta función se usará tanto para el presupuesto actual como para el histórico
  const generateTicketImage = async (presupuestoData) => {
      if (!presupuestoData || !ticketContentRef.current) {
          toast.error("No hay datos de presupuesto o referencia de ticket.");
          return;
      }

      // Asegurarse de que html2canvas esté cargado antes de usarlo
      if (typeof html2canvas === 'undefined') {
           console.error("html2canvas is not loaded.");
           toast.error("Error interno: la librería de imagen no está cargada.");
           return;
      }

      // Determinar el nombre del vendedor para el ticket
      // Si es un presupuesto histórico, usar el nombre del usuario fetchado (si existe)
      // Si es el presupuesto actual, usar el nombre del usuario logueado
      const vendedorNombre = presupuestoData.usuarios?.nombre // Para histórico (si se fetchó)
                           || presupuestoData.vendedores?.nombre // Fallback por si acaso (del código anterior)
                           || user?.user_metadata?.nombre // Para presupuesto actual (del usuario logueado)
                           || user?.email // Fallback al email si no hay nombre en metadata
                           || 'N/A'; // Fallback final


      // Populate the hidden ticket content div
      // This is a simplified example, you'll need to build the full HTML structure
      // based on your desired ticket format, similar to the image provided.
      // Ensure the structure uses Tailwind classes for styling.
      const ticketHtmlContent = `
        <div class="p-4 text-xs font-mono">
            <div class="text-center mb-4">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo Empresa" class="w-24 mx-auto mb-4"/>` : ''}
                <h4 class="font-bold text-sm">PERFUMES ELISA</h4>
                <p>61 3380 4010 - Ciudad Apodaca</p>
                <p class="mt-2 font-bold">${presupuestoData.numero_presupuesto || 'N/A'}</p>
            </div>
            <div class="mb-4">
                <p>Cliente: ${presupuestoData.clientes?.nombre || 'N/A'}</p>
                <p>Vendedor: ${vendedorNombre}</p> 
                <p>Fecha: ${formatReadableDate(presupuestoData.created_at || new Date())}</p>
            </div>
            <div class="border-t border-b border-gray-400 py-2 mb-4">
                <p class="font-bold mb-2">Detalle:</p>
                 ${presupuestoData.itemsPresupuesto ? // Si es presupuesto actual (usando itemsPresupuesto)
                    presupuestoData.itemsPresupuesto.map(item => `
                        <p class="text-gray-800 mb-1">${item.cantidad}x ${item.descripcion} - ${formatCurrency(item.precio_unitario)}</p>
                    `).join('')
                    : // Si es presupuesto histórico (usando presupuesto_items)
                    presupuestoData.presupuesto_items.map(item => `
                         <p class="text-gray-800 mb-1">${item.cantidad}x ${item.productos?.nombre || item.descripcion} - ${formatCurrency(item.precio_unitario)}</p>
                    `).join('')
                 }
            </div>
            <div class="text-right mb-4">
                <p>Subtotal: ${formatCurrency(presupuestoData.subtotal)}</p>
                ${presupuestoData.descuento_aplicado > 0 ? `<p>Descuento: -${formatCurrency(presupuestoData.descuento_aplicado)}</p>` : ''}
                 <p>Envío: ${formatCurrency(presupuestoData.gastos_envio)}</p>
                <p class="font-bold text-sm mt-2">Total: ${formatCurrency(presupuestoData.total)}</p>
            </div>
            <div class="text-center mt-4">
                <p>¡Gracias por considerar nuestros productos!</p>
                <p>Este es un presupuesto, no un comprobante de venta.</p>
            </div>
        </div>
      `;

      // Limpiar el contenido del ref ANTES de poblarlo y capturar
      ticketContentRef.current.innerHTML = ''; // Limpiar contenido previo
      ticketContentRef.current.innerHTML = ticketHtmlContent; // Populate the hidden div

      try {
          const canvas = await html2canvas(ticketContentRef.current, {
              scale: 2, // Increase scale for better resolution
              logging: true, // Enable logging for debugging
              useCORS: true // Important if loading images from another origin
          });
          const imageData = canvas.toDataURL('image/jpeg'); // Convert canvas to JPG data URL
          setTicketPreviewData(imageData); // Set the image data
          setShowTicketPreviewModal(true); // Open the ticket preview modal
      } catch (error) {
          console.error("Error generating ticket image:", error);
          toast.error("Error al generar la imagen del ticket.");
      } finally {
           // Limpiar el contenido del ref DESPUÉS de capturar
           ticketContentRef.current.innerHTML = ''; // Clear the hidden div after capturing
      }
  };

  // >>> Lógica para descargar el Ticket (Imagen) <<<
  const downloadTicketImage = () => {
      if (ticketPreviewData) {
          const link = document.createElement('a');
          link.href = ticketPreviewData;
          // Generate filename based on budget number or timestamp
          // Usar el número de presupuesto del ticketPreviewData si está disponible
          const filename = `presupuesto_${presupuestoSeleccionadoHistorial?.numero_presupuesto || formatDateForFilename(new Date())}.jpg`; // Usar número del histórico si aplica
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  // >>> Lógica para cerrar el modal de previsualización de ticket <<<
  const closeTicketPreviewModal = () => {
      setShowTicketPreviewModal(false);
      setTicketPreviewData(null);
  };


  // >>> Funciones Placeholder para generar Ticket PDF y Venta desde Historial <<<

  const handleGenerateTicketPDF = (presupuesto) => {
      toast('Generar Ticket (PDF) para presupuesto ' + presupuesto.numero_presupuesto + ' - Pendiente', { icon: 'ℹ️' });
      // Implementar lógica para generar PDF del ticket (formato pequeño)
      // Usar jsPDF y jspdf-autotable para estructurar los datos del presupuesto
      // Abrir el PDF en una nueva ventana: doc.output('dataurlnewwindow');
  };

  const handleGenerateSaleFromBudget = async (presupuesto) => {
      toast('Generar Venta desde presupuesto ' + presupuesto.numero_presupuesto + ' - Pendiente', { icon: 'ℹ️' });
      // Implementar lógica para crear una venta en la BD basada en este presupuesto
      // Esto probablemente requerirá una nueva RPC o función en Supabase
      // Deberías copiar los items del presupuesto a items_venta y crear un registro en ventas
      // Asegurarte de referenciar el numero_presupuesto en la venta
      // Mostrar un toast de éxito/error y recargar la lista de presupuestos o redirigir a la página de ventas
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8 lg:p-12 font-sans text-gray-800"> {/* Fondo degradado sutil */}
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10"> {/* Mayor margen inferior */}
        <button
          onClick={() => navigate('/')}
          // Clases modificadas para que se parezca a la imagen
          className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-lg" // font-bold y colores oscuros
        >
          Volver al inicio
        </button>
        <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm text-center w-full md:w-auto flex-grow tracking-tight"> {/* Fuente más grande y negrita */}
          Crear Nuevo Presupuesto
        </h1>
         <div className="w-full md:w-[150px]" /> {/* Spacer */}
      </div>

      {/* Formulario principal */}
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-10 border border-gray-200"> {/* Estilo de tarjeta */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200">Detalles del Presupuesto</h2> {/* Título con separador */}

        {(loadingClientes || loadingProductos) && (
          <p className="text-blue-600 mb-4 text-center">Cargando datos...</p>
        )}
        {(errorClientes || errorProductos) && (
          <p className="text-red-600 mb-4 text-center">Error al cargar datos: {errorClientes?.message || errorProductos?.message}</p>
        )}

        {/* Selección de cliente con buscador */}
        {!loadingClientes && !errorClientes && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Cliente</h3>
            <div className="relative">
                <input
                  ref={clientSearchInputRef}
                  type="text"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={e => setClientSearchTerm(e.target.value)}
                  onFocus={() => clientSearchTerm.length > 0 && filteredClientes.length > 0 && setShowClientSuggestions(true)}
                  onBlur={handleClientBlur} // Manejar blur
                />
                 {showClientSuggestions && (
                    <ul className="absolute bg-white border border-gray-300 rounded-md w-full max-h-60 overflow-y-auto z-10 shadow-lg mt-1">
                      {filteredClientes.map(c => (
                        <li
                          key={c.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800 text-sm"
                          onClick={() => handleSelectClient(c)}
                          // Añadir onMouseDown para evitar que onBlur cierre antes de onClick
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {c.nombre} {/* Corrected: Use curly braces for JSX expression */}
                        </li>
                      ))}
                    </ul>
                  )}
            </div>

            {/* Mostrar cliente seleccionado */}
            {clienteSeleccionado && (
              <p className="mt-3 text-gray-700 text-sm">
                Cliente seleccionado: <strong className="text-blue-600">{clienteSeleccionado.nombre}</strong>
              </p>
            )}
             {!clienteSeleccionado && clientSearchTerm && filteredClientes.length === 0 && (
                 <p className="mt-3 text-red-600 text-sm">No se encontró el cliente.</p>
             )}
          </div>
        )}

        {/* Añadir productos/servicios con buscador y navegación por teclado */}
        {!loadingProductos && !errorProductos && (
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Productos/Servicios</h3>
            <div className="relative mb-4">
              <input
                ref={productSearchInputRef}
                type="text"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar producto o servicio..."
                value={productSearchTerm}
                onChange={e => setProductSearchTerm(e.target.value)}
                onFocus={() => productSearchTerm.length > 1 && filteredProductos.length > 0 && setShowProductSuggestions(true)}
                onBlur={() => setTimeout(() => setShowProductSuggestions(false), 100)} // Pequeño retraso para permitir clic
                onKeyDown={handleProductKeyDown} // Manejar eventos de teclado
              />
              {showProductSuggestions && (
                <ul ref={productSuggestionsRef} className="absolute bg-white border border-gray-300 rounded-md w-full max-h-60 overflow-y-auto z-10 shadow-lg mt-1">
                  {/* Resaltado */}
                  {filteredProductos.map((p, index) => (
                    <li
                      key={p.id}
                      className={`px-4 py-2 cursor-pointer text-gray-800 text-sm ${index === highlightedProductIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      onClick={() => {
                        handleAddItem(p);
                        setProductSearchTerm('');
                        setFilteredProductos([]);
                        setShowProductSuggestions(false);
                        setHighlightedProductIndex(-1);
                      }}
                       // Añadir onMouseDown para evitar que onBlur cierre antes de onClick
                       onMouseDown={(e) => e.preventDefault()}
                    >
                      {p.nombre} <span className="text-gray-500 text-xs">(${parseFloat(p.promocion ?? p.precio ?? 0).toFixed(2)})</span> {/* Mostrar precio de promoción/normal */} {/* Corrected: Use curly braces for JSX expression */}
                    </li>
                  ))}
                </ul>
              )}
               {showProductSuggestions && productSearchTerm.length > 1 && filteredProductos.length === 0 && (
                  <div className="px-4 py-2 text-gray-500 bg-white border border-gray-300 rounded-md mt-1 text-sm">No se encontraron productos.</div>
              )}
            </div>
            <button
              onClick={handleAddItemPersonalizado}
              className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 transition-colors text-sm"
            >
              Añadir Item Personalizado
            </button>

            {/* Lista de ítems del presupuesto */}
            {itemsPresupuesto.length > 0 && (
              <div className="mt-6 border border-gray-200 rounded-md overflow-hidden shadow-sm"> {/* Sombra sutil */}
                <h4 className="px-4 py-3 bg-gray-100 border-b border-gray-200 text-lg font-semibold text-gray-700">Ítems del Presupuesto</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                      {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <th> tags */}
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Descripción</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-24">Cantidad</th> {/* Ancho ajustado */}
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-28">Precio Unitario</th> {/* Ancho ajustado */}
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-28">Subtotal</th> {/* Ancho ajustado */}
                        <th className="px-4 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <td> tags */}
                      {itemsPresupuesto.map(item => (
                        <tr key={item.idInterno} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 text-gray-800 text-sm">{item.descripcion}</td>
                          <td className="px-4 py-2 text-right text-sm">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-full text-right border rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500 text-sm" /* Estilo de input */
                              value={item.cantidad}
                              onChange={e =>
                                handleUpdateItemQuantity(item.idInterno, e.target.value)
                              }
                              onFocus={(e) => e.target.select()} // Seleccionar texto al enfocar
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700 text-sm">
                             {/* Puedes permitir editar el precio unitario si lo deseas */}
                             {/* <input
                               type="number"
                               min="0"
                               step="0.01"
                               className="w-full text-right border rounded-md px-2 py-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                               value={item.precio_unitario}
                               onChange={e => handleUpdateItemPrice(item.idInterno, e.target.value)}
                               onFocus={(e) => e.target.select()}
                             /> */}
                             {/* Por ahora, solo mostrar el precio unitario */}
                            ${parseFloat(item.precio_unitario).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-700 text-sm">
                            ${((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.idInterno)}
                              className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-100" /* Estilo de botón */
                              title="Eliminar ítem"
                            >
                             {/* Trash icon SVG */}
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                             </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discount, Shipping, and Notes Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Discount */}
          <div className="p-4 border rounded-md border-gray-200 bg-gray-50"> {/* Fondo sutil */}
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Descuento</h3>
            <select
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-3"
              value={tipoDescuento}
              onChange={e => setTipoDescuento(e.target.value)}
            >
              <option value="ninguno">Sin Descuento</option>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto Fijo ($)</option>
            </select>
            {tipoDescuento !== 'ninguno' && (
              <input
                type="number"
                 min="0"
                 step="0.01"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  tipoDescuento === 'porcentaje' ? 'Ej: 10' : 'Ej: 50.00'
                }
                value={valorDescuento}
                onChange={e => setValorDescuento(e.target.value)}
                onFocus={(e) => e.target.select()} // Seleccionar texto al enfocar
              />
            )}
          </div>
          {/* Shipping Costs */}
          <div className="p-4 border rounded-md border-gray-200 bg-gray-50"> {/* Fondo sutil */}
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Gastos de Envío</h3>
            <input
              type="number"
               min="0"
               step="0.01"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: 150.00"
              value={gastosEnvio}
              onChange={e => setGastosEnvio(e.target.value)}
              onFocus={(e) => e.target.select()} // Seleccionar texto al enfocar
            />
          </div>
          {/* Notes */}
          <div className="md:col-span-2 p-4 border rounded-md border-gray-200 bg-gray-50"> {/* Fondo sutil */}
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Notas Adicionales</h3>
            <textarea
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
          </div>
        </div>

        {/* Totals Section (Frontend Preview) */}
        <div className="mb-6 p-6 border rounded-md border-gray-300 bg-blue-50 text-right shadow-inner">
          <h2 className="text-xl font-bold text-blue-800 mb-4">Resumen del Presupuesto</h2>
          <p className="text-lg mb-1 text-gray-700">
            Subtotal: <span className="font-medium">${subtotal.toFixed(2)}</span>
          </p>
          {/* Mostrar solo si hay descuento aplicado > 0 */}
          {tipoDescuento !== 'ninguno' && descuentoAplicadoFrontend > 0 && (
            <p className="text-lg text-red-600 mb-1">
              Descuento: <span className="font-medium">- ${descuentoAplicadoFrontend.toFixed(2)}</span>
            </p>
          )}
          <p className="text-lg mb-1 text-gray-700">
            Gastos de Envío: <span className="font-medium">${gastosEnvioNum.toFixed(2)}</span>
          </p>
          {/* Add taxes if applicable */}
          {/* <p className="text-lg mb-1 text-gray-700">Impuestos: <span className="font-medium">${impuestosFrontend.toFixed(2)}</span></p> */}
          <div className="border-t border-gray-300 mt-4 pt-4">
             <p className="text-3xl font-bold text-blue-700">
               Total: ${totalFrontend.toFixed(2)}
             </p>
          </div>
        </div>

        {/* Ticket/PDF Generation Buttons for CURRENT Budget */}
        {/* Estos botones generarán el ticket/PDF del presupuesto actual ANTES de guardarlo */}
        <div className="flex justify-end gap-4 mb-6">
          <button
            onClick={() => generateTicketImage({ // Pass current budget data structure
                numero_presupuesto: 'PREVIEW', // Use a placeholder for current budget
                clientes: clienteSeleccionado,
                // Pasar info del vendedor actual (user) para el preview
                usuarios: { nombre: user?.user_metadata?.nombre || user?.email || 'N/A' }, // Usar 'usuarios' para consistencia
                created_at: new Date(), // Use current date for preview
                itemsPresupuesto: itemsPresupuesto, // Pass current items
                subtotal: subtotal,
                descuento_aplicado: descuentoAplicadoFrontend,
                gastos_envio: gastosEnvioNum,
                total: totalFrontend,
                notas: notas
            })}
            className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            disabled={itemsPresupuesto.length === 0 || !clienteSeleccionado}
          >
            Generar Ticket (Imagen)
          </button>
          {/* PDF generation for current budget is not requested yet */}
          {/* <button
            onClick={() => handleGenerateTicketPDF(null)}
            className="px-4 py-2 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            disabled={itemsPresupuesto.length === 0 || !clienteSeleccionado}
          >
            Generar Ticket (PDF)
          </button> */}
        </div>


        {/* Save Button */}
        <button
          onClick={handleGuardarPresupuesto}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-md text-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg" /* Sombra añadida */
          disabled={
            isSaving ||
            loadingClientes ||
            loadingProductos ||
            !clienteSeleccionado ||
            itemsPresupuesto.length === 0 ||
            subtotal <= 0 // Deshabilitar si el subtotal es 0 o menos
          }
        >
          {isSaving ? 'Guardando…' : 'Guardar Presupuesto'}
        </button>
      </div>

      {/* Existing Quotes List Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-10 border border-gray-200"> {/* Estilo de tarjeta */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200">Historial de Presupuestos</h2> {/* Título con separador */}
        {/* You can add search or pagination controls for the quote list here */}
        {loadingPresupuestos ? (
          <p className="p-4 text-center text-blue-600">Cargando presupuestos…</p>
        ) : errorPresupuestos ? (
          <p className="p-4 text-center text-red-600">{errorPresupuestos}</p>
        ) : presupuestosExistentes.length === 0 ? (
          <p className="p-4 text-center text-gray-500 italic">No hay presupuestos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <th> tags */}
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Vendedor</th> {/* Añadido Vendedor */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider w-40">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <td> tags */}
                {presupuestosExistentes.map(p => {
                    const isOld = isBudgetOld(p.created_at); // Verificar si es viejo
                    return (
                      <tr
                         key={p.id}
                         className={`hover:bg-gray-100 transition-colors cursor-pointer ${isOld ? 'opacity-70' : ''}`} // Estilo para presupuestos viejos
                         onClick={() => handleViewHistoricalBudget(p)} // Hacer toda la fila clicable para ver detalles
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.numero_presupuesto || p.id?.substring(0, 8)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{p.clientes?.nombre || 'Cliente Desconocido'}</td>
                         {/* >>> CORRECCIÓN: Mostrar nombre del vendedor desde p.usuarios.nombre <<< */}
                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{p.usuarios?.nombre || 'N/A'}</td> {/* Mostrar nombre del vendedor */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatReadableDate(p.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-800">{formatCurrency(p.total)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center space-x-2">
                           {/* Botón para ver detalles (abre el único modal) */}
                           <button
                             onClick={(e) => { e.stopPropagation(); handleViewHistoricalBudget(p); }}
                             className="text-blue-600 hover:text-blue-800 text-sm p-1 rounded-md hover:bg-blue-100"
                             title="Ver Detalle"
                           >
                             Ver
                           </button>
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* >>> El único Modal para ver detalles, historial y acciones <<< */}
      {modalHistorialActivo && presupuestoSeleccionadoHistorial && (
          <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={handleCloseHistoricalModal} // Cerrar al hacer clic fuera
          >
              <div
                  onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
                  className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto relative" // Ancho y alto ajustados
              >
                  {/* Encabezado del Modal */}
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
                      <h3 className="text-xl font-bold text-gray-800">
                          Detalle Presupuesto: {presupuestoSeleccionadoHistorial.numero_presupuesto}
                      </h3>
                      <button
                          onClick={handleCloseHistoricalModal}
                          className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none ml-4"
                      >
                          &times;
                      </button>
                  </div>

                  {/* Contenido del Detalle */}
                  <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-2">
                          Cliente: <span className="font-semibold text-gray-800">{presupuestoSeleccionadoHistorial.clientes?.nombre || 'Cliente Desconocido'}</span>
                      </p>
                       <p className="text-sm text-gray-600 mb-2">
                          Fecha: <span className="font-semibold text-gray-800">{formatReadableDate(presupuestoSeleccionadoHistorial.created_at)}</span>
                       </p>
                        <p className="text-sm text-gray-600 mb-2"> {/* Mostrar Vendedor en el detalle */}
                           {/* >>> CORRECCIÓN: Mostrar nombre del vendedor desde presupuestoSeleccionadoHistorial.usuarios.nombre <<< */}
                           Vendedor: <span className="font-semibold text-gray-800">{presupuestoSeleccionadoHistorial.usuarios?.nombre || 'N/A'}</span>
                        </p>
                       {presupuestoSeleccionadoHistorial.notas && (
                           <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700 italic">
                               <span className="font-semibold not-italic">Notas:</span> {presupuestoSeleccionadoHistorial.notas}
                           </div>
                       )}
                  </div>

                  {/* Tabla de Ítems del Presupuesto Histórico */}
                   {/* Aseguramos que la tabla esté dentro de un div si es necesario para overflow, pero las filas y celdas deben ser directas */}
                   {presupuestoSeleccionadoHistorial.presupuesto_items && presupuestoSeleccionadoHistorial.presupuesto_items.length > 0 && (
                       <div className="mb-6 border border-gray-200 rounded-md overflow-hidden shadow-sm">
                           <h4 className="px-4 py-3 bg-gray-100 border-b border-gray-200 text-lg font-semibold text-gray-700">Ítems</h4>
                           <div className="overflow-x-auto"> {/* Este div es correcto para manejar el scroll horizontal */}
                               <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                                   <thead className="bg-gray-50">
                                       {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <th> tags */}
                                       <tr>
                                           <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Descripción</th>
                                           <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-24">Cantidad</th>
                                           <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-28">Precio Unitario</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider w-28">Subtotal</th>
                                       </tr>
                                   </thead>
                                   <tbody className="divide-y divide-gray-200">
                                       {/* Cada item se renderiza como una fila (tr) */}
                                       {/* CORRECCIÓN: Asegurar que no haya espacios en blanco ni saltos de línea entre <td> tags */}
                                       {presupuestoSeleccionadoHistorial.presupuesto_items.map((item, index) => (
                                           <tr key={item.id || index}> {/* Usar item.id si existe, de lo contrario index */}
                                                <td className="px-4 py-2 text-gray-800">{item.productos?.nombre || item.descripcion || 'Item Desconocido'}</td>
                                                <td className="px-4 py-2 text-right">{item.cantidad ?? 0}</td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(item.precio_unitario ?? 0)}</td>
                                                <td className="px-4 py-2 text-right font-semibold">{formatCurrency((item.cantidad ?? 0) * (item.precio_unitario ?? 0))}</td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div> {/* Cierre correcto del div de overflow */}
                       </div> // Cierre correcto del div contenedor de la tabla
                   )}

                   {/* Totales del Presupuesto Histórico */}
                   <div className="p-4 border rounded-md border-gray-300 bg-blue-50 text-right shadow-inner">
                        <h4 className="text-lg font-bold text-blue-800 mb-2">Totales</h4>
                        <p className="text-sm text-gray-700">Subtotal: <span className="font-medium">{formatCurrency(presupuestoSeleccionadoHistorial.subtotal ?? 0)}</span></p>
                        {presupuestoSeleccionadoHistorial.descuento_aplicado > 0 && (
                            <p className="text-sm text-red-600">Descuento: <span className="font-medium">- {formatCurrency(presupuestoSeleccionadoHistorial.descuento_aplicado)}</span></p>
                        )}
                        <p className="text-sm text-gray-700">Gastos de Envío: <span className="font-medium">{formatCurrency(presupuestoSeleccionadoHistorial.gastos_envio ?? 0)}</span></p>
                        {/* Impuestos si aplican */}
                         <div className="border-t border-gray-300 mt-3 pt-3">
                            <p className="text-xl font-bold text-blue-700">Total: {formatCurrency(presupuestoSeleccionadoHistorial.total ?? 0)}</p>
                         </div>
                   </div>


                   {/* Botones de Acción para Presupuesto Histórico */}
                   <div className="mt-6 flex justify-end gap-4">
                       {/* Verificar si el presupuesto es viejo para deshabilitar botones */}
                       {isBudgetOld(presupuestoSeleccionadoHistorial.created_at) && (
                           <span className="text-orange-600 font-semibold text-sm mr-auto flex items-center">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd" />
                               </svg>
                               Presupuesto de más de 10 días. Algunas acciones están bloqueadas.
                            </span>
                       )}

                       {/* Botón "Ver Ticket" para presupuesto histórico */}
                       <button
                           onClick={() => generateTicketImage(presupuestoSeleccionadoHistorial)} // Pass historical budget data
                           className={`px-4 py-2 bg-purple-600 text-white rounded-md font-semibold hover:bg-purple-700 transition-colors text-sm ${isBudgetOld(presupuestoSeleccionadoHistorial.created_at) ? 'opacity-50 cursor-not-allowed' : ''}`}
                           title="Ver Ticket"
                           disabled={isBudgetOld(presupuestoSeleccionadoHistorial.created_at)} // Deshabilitar si es viejo
                       >
                           Ver Ticket
                       </button>
                       {/* Botón "Generar Venta" para presupuesto histórico */}
                        <button
                           onClick={() => handleGenerateSaleFromBudget(presupuestoSeleccionadoHistorial)}
                           className={`px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-800 transition-colors text-sm ${isBudgetOld(presupuestoSeleccionadoHistorial.created_at) ? 'opacity-50 cursor-not-allowed' : ''}`}
                           title="Generar Venta desde Presupuesto"
                           disabled={isBudgetOld(presupuestoSeleccionadoHistorial.created_at)} // Deshabilitar si es viejo
                       >
                           Generar Venta
                       </button>
                       {/* PDF generation for historical budget is not requested yet */}
                       {/* <button
                           onClick={() => handleGenerateTicketPDF(presupuestoSeleccionadoHistorial)}
                           className={`px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors text-sm ${isBudgetOld(presupuestoSeleccionadoHistorial.created_at) ? 'opacity-50 cursor-not-allowed' : ''}`}
                           title="Generar Ticket (PDF)"
                           disabled={isBudgetOld(presupuestoSeleccionadoHistorial.created_at)}
                       >
                           Ticket (PDF)
                       </button> */}
                   </div>

               </div> {/* Cierre correcto del div principal del contenido del modal */}
           </div> /* Cierre correcto del div del overlay del modal */
       )

       /* >>> Modal para Previsualización del Ticket (JPG) <<< */}
       {showTicketPreviewModal && ticketPreviewData && (
            <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={closeTicketPreviewModal} // Cerrar al hacer clic fuera
            >
                <div
                    onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
                    className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto relative flex flex-col items-center" // Ancho más pequeño, centrado
                >
                    {/* Encabezado del Modal */}
                    <div className="flex justify-between items-center mb-4 w-full border-b pb-3">
                        <h3 className="text-xl font-bold text-gray-800">Previsualización del Ticket</h3>
                        <button
                            onClick={closeTicketPreviewModal}
                            className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none ml-4"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Imagen del Ticket */}
                    <div className="mb-6 border border-gray-300 rounded-md overflow-hidden">
                         <img src={ticketPreviewData} alt="Ticket Preview" className="block w-full h-auto" />
                    </div>


                    {/* Botones de Acción */}
                    <div className="flex justify-center gap-4 w-full">
                        <button
                            onClick={downloadTicketImage}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Descargar Ticket (JPG)
                        </button>
                        <button
                            onClick={closeTicketPreviewModal}
                            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md font-semibold hover:bg-gray-400 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>

                </div> {/* Cierre correcto del div principal del contenido del modal */}
            </div> /* Cierre correcto del div del overlay del modal */
       )}

        {/* >>> Hidden div for html2canvas capture <<< */}
        {/* This div will contain the HTML structure to be converted to image */}
        {/* It should be hidden from view */}
        <div ref={ticketContentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            {/* The HTML structure for the ticket will be populated here by generateTicketImage */}
        </div>


    </div> // Cierre correcto del div principal de la página
  );
}

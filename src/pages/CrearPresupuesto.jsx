import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';

import { useAuth } from '../contexts/AuthContext';
import { useClientes } from '../contexts/ClientesContext';
import { useProductos } from '../contexts/ProductosContext';
import { supabase } from '../supabase';

// Iconos
import { ArrowLeft, Search, Plus, Trash2, Save, ShoppingCart, FileText, Eye, Share2 as ShareIcon, Info, X as IconX } from 'lucide-react'; 

// Componentes
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import HtmlPresupuestoDisplay from '../components/HtmlPresupuestoDisplay'; 

// --- FUNCIONES HELPER ---
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) { return '$0.00'; }
  return numericAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateForFilename = (dateString) => {
    const date = new Date(dateString);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
};

const formatReadableDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-MX', options);
    } catch (e) { return dateString; }
};

const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) { console.warn(`Imagen no encontrada: ${url}`); return null; }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) { console.error("Error cargando imagen:", error); return null;}
};

const isBudgetOld = (createdAt) => {
    if (!createdAt) return true;
    const createdDate = new Date(createdAt);
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    return createdDate < tenDaysAgo;
};

// Helper para convertir Data URL a Blob (necesario para navigator.share)
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/[1]);
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};


// Componente PresupuestoGuardadoPreview - Se mantiene intacto según el último requisito
function PresupuestoGuardadoPreview({ presupuestoData, onClose, onConvertToVenta, currentUserInfo }) { 
    if (!presupuestoData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4 animate-fadeIn">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">
                        Presupuesto Guardado: {presupuestoData.numero_presupuesto}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <IconX size={24} />
                    </button>
                </div>
                <div className="p-6 bg-white text-gray-800 overflow-y-auto flex-grow">
                    <h4 className="text-lg font-semibold mb-2">Cliente: <span className="font-normal">{presupuestoData.clientes?.nombre || 'N/A'}</span></h4>
                    <p className="mb-1 text-sm"><span className="font-semibold">Fecha:</span> {formatReadableDate(presupuestoData.created_at)}</p>
                    <p className="mb-1 text-sm"><span className="font-semibold">Vendedor:</span> {currentUserInfo || 'N/A'}</p> 
                    <p className="mb-4 text-sm"><span className="font-semibold">Válido por:</span> {presupuestoData.validez_dias} días</p>

                    <h5 className="text-md font-semibold mt-4 mb-1 text-gray-700 border-t border-gray-200 pt-2">Ítems:</h5>
                    <div className="space-y-1 text-sm max-h-48 overflow-y-auto mb-3">
                        {(presupuestoData.presupuesto_items || []).map((item, index) => (
                            <div key={item.id || index} className="flex justify-between p-1 hover:bg-gray-50 rounded">
                                <span className="flex-grow pr-2">{item.cantidad} x {item.productos?.nombre || item.descripcion}</span>
                                <span className="text-right">{formatCurrency(item.subtotal_item)}</span>
                            </div>
                        ))}
                         { (presupuestoData.presupuesto_items || []).length === 0 && <p className="text-gray-500 text-xs">No hay ítems.</p>}
                    </div>
                    <div className="border-t border-gray-200 pt-3 text-right">
                        <p className="text-sm text-gray-600">Subtotal: {formatCurrency(presupuestoData.subtotal)}</p>
                        {(presupuestoData.descuento_aplicado || 0) > 0 && (<p className="text-sm text-red-600">Descuento: - {formatCurrency(presupuestoData.descuento_aplicado)}</p>)}
                        {(presupuestoData.gastos_envio || 0) > 0 && (<p className="text-sm text-gray-600">Envío: {formatCurrency(presupuestoData.gastos_envio)}</p>)}
                        <p className="text-lg font-bold mt-1 text-gray-800">Total: {formatCurrency(presupuestoData.total)}</p>
                    </div>
                     {presupuestoData.notas && <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-700 italic"><span className="font-semibold not-italic">Notas:</span> {presupuestoData.notas}</div>}
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-800">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors text-sm">Cerrar</button>
                    <button 
                        onClick={() => onConvertToVenta(presupuestoData)} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center text-sm" 
                        disabled={!currentUserInfo || currentUserInfo === 'N/A'} 
                        title={(!currentUserInfo || currentUserInfo === 'N/A') ? "Debes iniciar sesión" : ""}
                    >
                        <ShoppingCart size={16} className="mr-2"/> Convertir a Venta
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function CrearPresupuesto() {
  const navigate = useNavigate();
  const { user, loading: loadingUser } = useAuth(); 
  const { clientes, loading: loadingClientes, error: errorClientes } = useClientes(); 
  const { productos, loading: loadingProductos, error: errorProductos } = useProductos(); 
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [itemsPresupuesto, setItemsPresupuesto] = useState([]);
  const [tipoDescuento, setTipoDescuento] = useState('Sin descuento');
  const [valorDescuento, setValorDescuento] = useState(0);
  const [gastosEnvio, setGastosEnvio] = useState(0);
  const [formaPago, setFormaPago] = useState(''); 
  const [validezDias, setValidezDias] = useState(15);
  const [notas, setNotas] = useState('');
  
  const [guardando, setGuardando] = useState(false);
  const [showPresupuestoPreview, setShowPresupuestoPreview] = useState(false); 
  const [presupuestoDataPreview, setPresupuestoDataPreview] = useState(null); 

  const [busquedaProductoForm, setBusquedaProductoForm] = useState('');
  const [productosFiltradosForm, setProductosFiltradosForm] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false); 

  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const [presupuestosExistentes, setPresupuestosExistentes] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState(null);
  const [modalDetalleHistorialVisible, setModalDetalleHistorialVisible] = useState(false);
  const [presupuestoSeleccionadoHistorial, setPresupuestoSeleccionadoHistorial] = useState(null);
  
  const [showTicketPreviewModal, setShowTicketPreviewModal] = useState(false);
  const [ticketPreviewData, setTicketPreviewData] = useState(null);
  const ticketContentRef = useRef(null);
  const [logoBase64, setLogoBase64] = useState(null);

  const [showNuevoPresupuestoPreviewModal, setShowNuevoPresupuestoPreviewModal] = useState(false);
  const [nuevoPresupuestoDataPreview, setNuevoPresupuestoDataPreview] = useState(null);

  const clientSearchInputRef = useRef(null);
  const productSearchInputRef = useRef(null);
  const clientSuggestionsRef = useRef(null);
  const productSuggestionsRef = useRef(null);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);

  const [itemEditando, setItemEditando] = useState({
    producto_id: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    subtotal_item: 0,
    es_personalizado: true, 
  });

  // NUEVO ESTADO para el nombre del vendedor
  const [vendedorNombreDisplay, setVendedorNombreDisplay] = useState('N/A');


  useEffect(() => {
    // Solo cargar el historial si el estado de carga del usuario ya se conoce.
    if (!loadingUser) { 
        fetchPresupuestosHistorial();
        // Lógica para obtener el nombre del vendedor de la tabla 'usuarios'
        const fetchVendedorNombre = async () => {
            if (user && user.id) { 
                try {
                    const { data, error } = await supabase
                        .from('usuarios') 
                        .select('nombre') 
                        .eq('id', user.id) 
                        .single();

                    if (error && error.code !== 'PGRST116') { 
                        setVendedorNombreDisplay(user.email || 'N/A'); 
                    } else if (data && data.nombre) {
                        setVendedorNombreDisplay(data.nombre);
                    } else {
                        setVendedorNombreDisplay(user.email || 'N/A');
                    }
                } catch (err) {
                    setVendedorNombreDisplay(user.email || 'N/A'); 
                }
            } else {
                setVendedorNombreDisplay('N/A'); 
            }
        };
        fetchVendedorNombre();
    }
    
    async function loadLogo() {
        const logoUrl = '/images/PERFUMESELISA.png';
        const base64 = await getBase64Image(logoUrl);
        setLogoBase64(base64);
    }
    loadLogo();
  }, [loadingUser, user]); 
  
  const fetchPresupuestosHistorial = async () => {
    setLoadingHistorial(true);
    setErrorHistorial(null);
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          id, numero_presupuesto, created_at, total, estado,
          clientes (id, nombre, telefono, correo),
          presupuesto_items (id, descripcion, cantidad, precio_unitario, subtotal_item, producto_id, productos (id, nombre)),
          vendedor_id, subtotal, tipo_descuento, valor_descuento, descuento_aplicado, gastos_envio, notas, validez_dias
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const processedData = data.map(p => ({ ...p, presupuesto_items: (p.presupuesto_items || []).map(item => ({...item, productos: item.productos || {nombre: item.descripcion}})) }));
      setPresupuestosExistentes(processedData);
    } catch (err) {
      setErrorHistorial("No se pudo cargar el historial.");
      toast.error("Error al cargar historial.");
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (!busquedaProductoForm.trim()) {
      setProductosFiltradosForm(productos || []); 
      setHighlightedProductIndex(-1); 
    } else {
      const lowerBusqueda = busquedaProductoForm.toLowerCase();
      const filtrados = (productos || []).filter(p => 
        p.nombre?.toLowerCase().includes(lowerBusqueda) ||
        (p.codigo && p.codigo.toLowerCase().includes(lowerBusqueda))
      );
      setProductosFiltradosForm(filtrados);
      setHighlightedProductIndex(-1); 
    }
  }, [busquedaProductoForm, productos]); 
  
  const { subtotal, descuento, total } = useMemo(() => {
    const subtotalCalculado = itemsPresupuesto.reduce((sum, item) => sum + ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)), 0);
    let descuentoCalculado = 0;
    const valDesc = parseFloat(valorDescuento) || 0;
    if (tipoDescuento === 'Por importe') { descuentoCalculado = Math.min(valDesc, subtotalCalculado); }
    else if (tipoDescuento === 'Por porcentaje') {
      const porcentaje = Math.min(Math.max(0, valDesc), 100);
      descuentoCalculado = subtotalCalculado * (porcentaje / 100);
    }
    const totalCalculado = subtotalCalculado - descuentoCalculado + (parseFloat(gastosEnvio) || 0);
    return { subtotal: subtotalCalculado, descuento: descuentoCalculado, total: totalCalculado };
  }, [itemsPresupuesto, tipoDescuento, valorDescuento, gastosEnvio]);
  
  const handleSeleccionarProductoParaItem = (producto) => {
    const newItem = {
      idInterno: Date.now() + Math.random(),
      producto_id: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precio_unitario: parseFloat(producto.promocion || producto.precio_normal || 0),
      es_personalizado: false, 
    };
    setItemsPresupuesto(prev => [...prev, newItem]);
    setBusquedaProductoForm('');
    setShowProductSuggestions(false);
    setHighlightedProductIndex(-1);
    if (productSearchInputRef.current) productSearchInputRef.current.focus();
  };
  
  const handleUpdateItem = (idInterno, field, value) => {
    setItemsPresupuesto(prevItems => prevItems.map(item => {
        if (item.idInterno === idInterno) {
            const updatedItem = { ...item, [field]: value };
            updatedItem.subtotal_item = (parseFloat(updatedItem.cantidad) || 0) * (parseFloat(updatedItem.precio_unitario) || 0);
            return updatedItem;
        }
        return item;
    }));
  };
  
  const handleEliminarItemDePresupuesto = (idInterno) => {
    setItemsPresupuesto(itemsPresupuesto.filter(item => item.idInterno !== idInterno));
  };
  
  const handleAddItemPersonalizado = () => {
    const newItem = {
        idInterno: Date.now() + Math.random(), producto_id: null, descripcion: '', 
        precio_unitario: 0, cantidad: 1, es_personalizado: true, subtotal_item: 0
      };
      setItemsPresupuesto(prev => [...prev, newItem]);
  };
  
  const handleUpdateCustomItemDescription = (idInterno, newDescription) => {
    setItemsPresupuesto(prev => prev.map(item => item.idInterno === idInterno && item.es_personalizado ? { ...item, descripcion: newDescription } : item ));
  };

  const handleProductInputBlur = () => {
    setTimeout(() => {
      setShowProductSuggestions(false);
      setHighlightedProductIndex(-1);
    }, 100);
  };

  const handleProductKeyDown = (e) => {
    if (productosFiltradosForm.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedProductIndex(prevIndex => 
        (prevIndex + 1) % productosFiltradosForm.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedProductIndex(prevIndex => 
        (prevIndex - 1 + productosFiltradosForm.length) % productosFiltradosForm.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedProductIndex !== -1) {
        handleSeleccionarProductoParaItem(productosFiltradosForm[highlightedProductIndex]);
      } else if (productosFiltradosForm.length === 1 && busquedaProductoForm.trim() === productosFiltradosForm[0].nombre) {
        handleSeleccionarProductoParaItem(productosFiltradosForm[0]);
      }
    } else if (e.key === 'Escape') {
      setShowProductSuggestions(false);
      setHighlightedProductIndex(-1);
    }
  };

  const generarNumeroPresupuesto = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PRE-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
  };

  const handleGuardarPresupuesto = async () => {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return; }
    if (itemsPresupuesto.length === 0) { toast.error('Agrega productos'); return; }
    
    // Verificación directa y robusta del user aquí
    if (loadingUser) { toast.error("Cargando sesión, por favor espera..."); return; }
    if (!user || !user.id) { // Usar 'user' del hook
        toast.error("Debes iniciar sesión para guardar."); 
        return; 
    } 
    
    for (const item of itemsPresupuesto) {
        if ((parseFloat(item.cantidad) || 0) <= 0 || (parseFloat(item.precio_unitario) || 0) < 0 || (item.es_personalizado && !item.descripcion.trim())) {
            toast.error(`Verifica los datos del item: "${item.descripcion || 'Personalizado'}". Cantidad y precio deben ser válidos, y personalizados tener descripción.`); return;
        }
    }
    setGuardando(true);
    
    const numeroPresupuestoGenerado = generarNumeroPresupuesto();
    const fechaCreacionISO = new Date().toISOString();

    const rpcPayload = {
      p_numero_presupuesto: numeroPresupuestoGenerado, p_cliente_id: clienteSeleccionado.id, p_vendedor_id: user.id, 
      p_subtotal: subtotal, p_tipo_descuento: tipoDescuento === 'Sin descuento' ? null : tipoDescuento,
      p_valor_descuento: tipoDescuento === "Sin descuento" ? 0 : (parseFloat(valorDescuento) || 0),
      p_descuento_aplicado: descuento, p_gastos_envio: parseFloat(gastosEnvio) || 0, p_total: total,
      p_notas: notas || null, p_validez_dias: parseInt(validezDias) || 15,
      p_items: itemsPresupuesto.map(item => ({
        producto_id: item.producto_id, descripcion: item.descripcion, cantidad: parseFloat(item.cantidad) || 0,
        precio_unitario: parseFloat(item.precio_unitario) || 0,
        subtotal_item: (parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)
      }))
    };
    
    try {
      const { data: rpcResponse, error } = await supabase.rpc('crear_presupuesto_con_items', rpcPayload);
      if (error) throw error;
      
      toast.success(`Presupuesto ${numeroPresupuestoGenerado} guardado.`);
      fetchPresupuestosHistorial();
      
      const presupuestoGuardadoData = {
          id: rpcResponse?.presupuesto_id || Date.now(), numero_presupuesto: numeroPresupuestoGenerado,
          created_at: fechaCreacionISO, clientes: clienteSeleccionado, vendedor_id: user.id, 
          presupuesto_items: rpcPayload.p_items.map(it => ({...it, productos: {nombre: it.descripcion}})),
          subtotal: rpcPayload.p_subtotal, descuento_aplicado: rpcPayload.p_descuento_aplicado,
          gastos_envio: rpcPayload.p_gastos_envio, total: rpcPayload.p_total, notas: rpcPayload.p_notas,
          validez_dias: rpcPayload.p_validez_dias, tipo_descuento: rpcPayload.p_tipo_descuento, valor_descuento: rpcPayload.p_valor_descuento,
          estado: 'Pendiente' 
      };
      setNuevoPresupuestoDataPreview(presupuestoGuardadoData);
      setShowNuevoPresupuestoPreviewModal(true); 

      setClienteSeleccionado(null); 
      setItemsPresupuesto([]);
      setTipoDescuento('Sin descuento'); setValorDescuento(0); setGastosEnvio(0);
      setFormaPago(''); setValidezDias(15); setNotas(''); setBusquedaProductoForm('');
    } catch (error) {
      toast.error(`Error al guardar: ${error.message || 'Desconocido.'}`);
    } finally {
      setGuardando(false);
    }
  };
  
  // FUNCIÓN handleConvertirAVentaDesdeHistorial (Ahora usando useCallback y confiando en el 'user' del scope)
  const handleConvertirAVentaDesdeHistorial = useCallback((presupuestoAConvertir) => { 
    if (loadingUser) { 
      toast.error("Cargando sesión, por favor espera...");
      return;
    }
  
    if (!user || !user.id) { 
      toast.error("Debes iniciar sesión para vender.");
      return;
    }
  
    if (!presupuestoAConvertir?.id) {
      toast.error("Presupuesto inválido.");
      return;
    }
    const budgetDataForCheckout = {
      id: presupuestoAConvertir.id,
      numero_presupuesto: presupuestoAConvertir.numero_presupuesto,
      clientes: presupuestoAConvertir.clientes,
      presupuesto_items: (presupuestoAConvertir.presupuesto_items || []).map(item => ({
        id: item.producto_id || item.id,
        producto_id: item.producto_id,
        nombre: item.productos?.nombre || item.descripcion,
        cantidad: item.cantidad,
        promocion: item.precio_unitario,
        precio_unitario: item.precio_unitario,
      })),
      tipo_descuento: presupuestoAConvertir.tipo_descuento || 'Sin descuento',
      valor_descuento: parseFloat(presupuestoAConvertir.valor_descuento || 0),
      gastos_envio: parseFloat(presupuestoAConvertir.gastos_envio || 0),
      notas: presupuestoAConvertir.notas,
      validez_dias: presupuestoAConvertir.validez_dias,
    };
  
    navigate('/checkout', { state: { budgetData: budgetDataForCheckout } });
  }, [loadingUser, user, navigate]); 
  
  const handleVerDetalleHistorial = (presupuesto) => { 
    // NUEVO: Validar que el presupuesto tenga un ID antes de intentar abrir el modal
    if (!presupuesto || !presupuesto.id) {
        toast.error("Datos del presupuesto no disponibles para ver detalle.");
        return;
    }
    setPresupuestoSeleccionadoHistorial(presupuesto);
    setModalDetalleHistorialVisible(true);
  };
  const handleCerrarModalDetalle = () => { 
    setModalDetalleHistorialVisible(false);
    setPresupuestoSeleccionadoHistorial(null);
  };

  const generateTicketImage = useCallback(async (dataPresupuestoTicket) => { 
    if (!dataPresupuestoTicket || !ticketContentRef.current) { toast.error("Faltan datos para ticket."); return; }
    
    if (loadingUser) {
        toast.error("Cargando sesión, por favor espera...");
        return;
    }
    if (!user || !user.id) { 
        toast.error("Inicia sesión para generar el ticket.");
        return;
    }
    
    // **NO** redeclarar vendedorNombre aquí. Ya está disponible desde el scope.
    // let vendedorNombre = 'N/A'; // ELIMINAR ESTA LÍNEA

    // Usar la lógica para obtener el nombre del vendedor desde el estado 'vendedorNombreDisplay' o 'user'
    let currentVendedorName = 'N/A';
    if (dataPresupuestoTicket.vendedor?.nombre) { 
        currentVendedorName = dataPresupuestoTicket.vendedor.nombre; 
    } else if (vendedorNombreDisplay !== 'N/A') { 
        currentVendedorName = vendedorNombreDisplay;
    } else if (user?.email) { 
        currentVendedorName = user.email;
    } else if (dataPresupuestoTicket.vendedor_id) { 
        currentVendedorName = `Vendedor ID: ${dataPresupuestoTicket.vendedor_id.substring(0,8)}...`;
    }


    const ticketStyles = {
      main: `padding: 15px; font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #000000; background-color: #ffffff; width: 300px; border: 1px solid #cccccc;`,
      logoContainer: `min-height: auto; margin-bottom: 0px; padding-top: 2px; text-align: center;`, 
      logoImg: `max-width: 300px; max-height: 154px; height: auto; margin: 0 auto 0 auto; display: block;`, 
      headerText: `text-align: center; margin-top: 0px; margin-bottom: 10px;`, 
      companyName: `font-weight: bold; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;`,
      companyDetails: `margin: 1px 0; font-size: 10px;`,
      ticketNumber: `margin-top: 6px; font-weight: bold; font-size: 12px;`,
      infoSection: `margin-bottom: 10px; font-size: 10px;`,
      infoLine: `margin: 2px 0; line-height: 1.3;`,
      itemsSection: `border-top: 1px dashed #555555; border-bottom: 1px dashed #555555; padding-top: 6px; padding-bottom: 6px; margin-bottom: 10px;`,
      itemsHeader: `display: flex; justify-content: space-between; font-weight: bold; font-size:10px; margin-bottom: 3px;`,
      itemsHeaderQty: `width:30px; text-align:left; padding-right: 5px;`,
      itemsHeaderDesc: `flex-grow: 1; padding-left: 5px; padding-right: 5px; word-break: break-word;`,
      itemsHeaderPrice: `width: 55px; text-align: right; padding-left: 5px;`,
      itemsHeaderAmount: `width: 60px; text-align: right; padding-left: 5px;`,
      itemRow: `display: flex; justify-content: space-between; font-size:10px; margin-top: 2px; padding: 1px 0;`,
      itemQty: `width:30px; text-align: left; padding-right: 5px;`,
      itemDesc: `flex-grow: 1; padding-left: 5px; padding-right: 5px; word-break: break-word;`,
      itemPrice: `width: 55px; text-align: right; padding-left: 5px;`,
      itemAmount: `width: 60px; text-align: right; padding-left: 5px;`,
      totalsSection: `text-align: right; font-size: 11px; margin-bottom: 10px;`,
      totalLine: `margin: 2px 0; display: flex; justify-content: space-between;`,
      totalEmphasis: `font-weight: bold; font-size: 14px; margin-top: 6px; border-top: 1px solid #555555; padding-top: 6px; display: flex; justify-content: space-between;`,
      notesSection: `font-size: 10px; margin-top: 10px; border-top: 1px dashed #cccccc; padding-top: 6px; text-align: left; word-break: break-word; white-space: pre-wrap;`,
      footerText: `text-align: center; margin-top: 15px; font-size: 10px;`,
  };
    const logoImgTag = logoBase64 
        ? `<div style="${ticketStyles.logoContainer}"><img src="${logoBase64}" alt="Logo" style="${ticketStyles.logoImg}" /></div>` 
        : `<div style="${ticketStyles.logoContainer}"></div>`;
    
    const itemsToDisplay = dataPresupuestoTicket.presupuesto_items || dataPresupuestoTicket.itemsPresupuesto || [];
    
    // **NO** redeclarar vendedorNombre aquí tampoco. Utilizar currentVendedorName del ámbito exterior.
    // let vendedorNombre = 'N/A'; // ELIMINAR ESTA LÍNEA si ya se definió afuera.

    const ticketHtmlContent = `
      <div style="${ticketStyles.main}">
          ${logoImgTag}
          <div style="${ticketStyles.headerText}"><h4 style="${ticketStyles.companyName}">PERFUMES ELISA</h4><p style="${ticketStyles.companyDetails}">Tel: 61 3380 4010</p><p style="${ticketStyles.companyDetails}">Ciudad Apodaca</p><p style="${ticketStyles.ticketNumber}">Presupuesto: ${dataPresupuestoTicket.numero_presupuesto || 'BORRADOR'}</p></div>
          <div style="${ticketStyles.infoSection}"><p style="${ticketStyles.infoLine}"><strong>Cliente:</strong> ${dataPresupuestoTicket.clientes?.nombre || 'N/A'}</p><p style="${ticketStyles.infoLine}"><strong>Vendedor:</strong> ${currentVendedorName}</p><p style="${ticketStyles.infoLine}"><strong>Fecha:</strong> ${formatReadableDate(dataPresupuestoTicket.created_at || new Date())}</p></div>
          <div style="${ticketStyles.itemsSection}"><div style="${ticketStyles.itemsHeader}"><span style="${ticketStyles.itemsHeaderQty}">Cant</span><span style="${ticketStyles.itemsHeaderDesc}">Descripción</span><span style="${ticketStyles.itemsHeaderPrice}">P.Unit</span><span style="${ticketStyles.itemsHeaderAmount}">Importe</span></div>
               ${itemsToDisplay.map(item => `<div style="${ticketStyles.itemRow}"><span style="${ticketStyles.itemQty}">${item.cantidad || 0}</span><span style="${ticketStyles.itemDesc}">${item.productos?.nombre || item.descripcion}</span><span style="${ticketStyles.itemPrice}">${formatCurrency(item.precio_unitario)}</span><span style="${ticketStyles.itemAmount}">${formatCurrency(item.subtotal_item || ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0)))}</span></div>`).join('')}
          </div>
          <div style="${ticketStyles.totalsSection}"><p style="${ticketStyles.totalLine}"><span>Subtotal:</span> <span>${formatCurrency(dataPresupuestoTicket.subtotal)}</span></p>
              ${(dataPresupuestoTicket.descuento_aplicado || 0) > 0 ? `<p style="${ticketStyles.totalLine}"><span style="color: #D9534F;">Descuento:</span> <span style="color: #D9534F;">- ${formatCurrency(dataPresupuestoTicket.descuento_aplicado)}</span></p>` : ''}
              ${(dataPresupuestoTicket.gastos_envio || 0) > 0 ? `<p style="${ticketStyles.totalLine}"><span>Envío:</span> <span>${formatCurrency(dataPresupuestoTicket.gastos_envio)}</span></p>` : ''}
              <p style="${ticketStyles.totalEmphasis}"><span>TOTAL:</span> <span>${formatCurrency(dataPresupuestoTicket.total)}</span></p>
          </div>
           ${dataPresupuestoTicket.notas ? `<div style="${ticketStyles.notesSection}"><p><strong>Notas:</strong><br/>${dataPresupuestoTicket.notas.replace(/\n/g, '<br/>')}</p></div>` : ''}
          <div style="${ticketStyles.footerText}"><p>¡Gracias por tu preferencia!</p><p>Presupuesto válido por ${dataPresupuestoTicket.validez_dias || '15'} días.</p></div>
      </div>
    `;
    ticketContentRef.current.innerHTML = ticketHtmlContent;
    try {
        const canvas = await html2canvas(ticketContentRef.current, { scale: 3, logging: false, useCORS: true, backgroundColor: '#ffffff' });
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setTicketPreviewData(imageData); setShowTicketPreviewModal(true); // Abre el modal de ticket
    } catch (error) { console.error("Error generating ticket image:", error); toast.error("Error al generar la imagen del ticket."); }
    finally { ticketContentRef.current.innerHTML = ''; }
  }, [loadingUser, user, vendedorNombreDisplay, logoBase64]); 
  
  // Función para COMPARTIR el ticket como imagen
  const shareTicketImage = async () => { 
    if (!ticketPreviewData) {
        toast.error("No hay imagen de ticket para compartir.");
        return;
    }

    if (navigator.share) { // Verifica si la Web Share API está disponible
        try {
            // **NO** redeclarar vendedorNombre aquí
            // let vendedorNombre = 'N/A'; // ELIMINAR ESTA LÍNEA

            const numeroPresupuestoActivo = presupuestoSeleccionadoHistorial?.numero_presupuesto || 'ticket'; // nuevoPresupuestoDataPreview ya no se usa, pero mantener la lógica de presupuestoSeleccionadoHistorial
            const filename = `presupuesto_${numeroPresupuestoActivo}_${formatDateForFilename(new Date().toISOString())}.jpg`;
            
            // Convertir Data URL a Blob y luego a File
            const blob = dataURLtoBlob(ticketPreviewData);
            const file = new File([blob], filename, { type: 'image/jpeg' });

            await navigator.share({
                files: [file],
                title: `Presupuesto ${numeroPresupuestoActivo}`,
                text: 'Aquí tienes tu presupuesto de Perfumes Elisa.',
            });
            toast.success("Ticket compartido exitosamente.");
        } catch (error) {
            if (error.name === 'AbortError') {
                toast("Compartir cancelado."); 
            } else {
                console.error("Error al compartir el ticket:", error);
                toast.error("Error al compartir. Intenta de nuevo.");
            }
        }
    } else {
        toast.error("La función de compartir no está disponible en este dispositivo/navegador. Puedes descargar la imagen si deseas.");
    }
  };

  const closeTicketPreviewModal = () => { 
    setShowTicketPreviewModal(false); setTicketPreviewData(null);
  };

  const handleConvertirAVentaDesdePreview = (presupuestoParaConvertir) => {
    setShowNuevoPresupuestoPreviewModal(false); 
    handleConvertirAVentaDesdeHistorial(presupuestoParaConvertir); 
  };

  return (
    <div className="min-h-screen bg-dark-900 text-gray-200 p-4 md:p-8 lg:p-12 font-sans">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        > <ArrowLeft size={18} /> Volver al inicio </button>
        <h1 className="text-3xl font-bold text-gray-100 text-center">Crear Presupuesto</h1>
        <div className="w-full md:w-[150px]" />
      </div>
      
      {/* Formulario principal (tarjeta oscura) */}
      <div className="bg-dark-800 rounded-lg shadow-card-dark border border-dark-700/50 p-6">
        {/* ClientSelector y NewClientModal */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
          <ClientSelector
            clientes={clientes} 
            clienteSeleccionado={clienteSeleccionado}
            onSelect={setClienteSeleccionado}
            onCreateNew={() => setShowNewClientModal(true)} 
          />
          <NewClientModal 
            isOpen={showNewClientModal} 
            onClose={() => setShowNewClientModal(false)} 
            onClientAdded={c => { 
              if (c?.id) { 
                toast.success(`Cliente ${c.nombre} añadido y seleccionado.`);
              } 
              setShowNewClientModal(false); 
            }} 
          />
        </div>
        
        {/* Buscador de productos y formulario de item */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Agregar Productos</h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-gray-500" /></div>
                <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={busquedaProductoForm}
                    onChange={e => setBusquedaProductoForm(e.target.value)}
                    onFocus={() => setShowProductSuggestions(true)}
                    onBlur={handleProductInputBlur}
                    onKeyDown={handleProductKeyDown}
                    className="w-full pl-10 p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {showProductSuggestions && busquedaProductoForm && productosFiltradosForm.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto bg-dark-900 border border-dark-700 rounded-lg shadow-elegant-dark">
                    <ul>
                      {productosFiltradosForm.map((producto, index) => (
                        <li key={producto.id}
                          className={`p-3 hover:bg-dark-700 cursor-pointer border-b border-dark-700 last:border-b-0 flex justify-between items-center ${index === highlightedProductIndex ? 'bg-indigo-600' : ''}`}
                          onClick={() => handleSeleccionarProductoParaItem(producto)}
                          onMouseDown={(e) => e.preventDefault()} 
                          >
                          <div><p className="text-gray-200 font-medium">{producto.nombre}</p>
                            <p className="text-gray-400 text-xs">Stock: {producto.stock} - Código: {producto.codigo || 'N/A'}</p></div>
                          <p className="text-primary-400 font-semibold">{formatCurrency(producto.promocion || producto.precio_normal || 0)}</p>
                        </li>))}
                    </ul>
                </div>
              )}
              {showProductSuggestions && busquedaProductoForm.length > 1 && productosFiltradosForm.length === 0 && !loadingProductos && (
                <div className="mt-1 p-2 bg-dark-900 border border-dark-700 rounded-md text-sm text-gray-400">No se encontraron productos.</div>
              )}
            </div>
             <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50"> 
                <button onClick={handleAddItemPersonalizado}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center transition-colors text-sm">
                    <Plus size={18} className="mr-1" /> Añadir Item Personalizado
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">Para items no listados.</p>
            </div>
          </div>
        </div>
        
        {/* Lista de items del presupuesto */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Items del Presupuesto</h2>
          {itemsPresupuesto.length === 0 ? ( 
            <div className="bg-dark-900/50 p-6 rounded-lg border border-dark-700/50 text-center">
              <FileText size={32} className="mx-auto mb-2 text-gray-500" />
              <p className="text-gray-400">Aún no has agregado items al presupuesto.</p>
            </div>
          ) : ( 
            <div className="bg-dark-900/50 rounded-lg border border-dark-700/50 overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-700">
                <thead className="bg-dark-900"><tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-[60%]">Descripción</th> {/* Ancho reducido a 60% */}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Cant.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">P.Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Subtotal</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acción</th>
                </tr></thead>
                <tbody className="bg-dark-900/50 divide-y divide-dark-700/50">
                  {itemsPresupuesto.map(item => (
                    <tr key={item.idInterno} className="hover:bg-dark-800/50">
                        <td className="px-4 py-3 text-sm text-gray-300"> {/* Aumento de alto de fila */}
                            {item.es_personalizado ? (
                                <input type="text" value={item.descripcion} 
                                onChange={(e) => handleUpdateCustomItemDescription(item.idInterno, e.target.value)}
                                className="w-full bg-dark-700 border-dark-600 rounded px-1 py-0.5 text-gray-200 focus:ring-1 focus:ring-primary-500"/>
                            ) : (
                                <span className="break-words"> {/* Permite el salto de línea */}
                                    {item.descripcion}
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center"><input type="number" min="0" value={item.cantidad} onChange={(e) => handleUpdateItem(item.idInterno, 'cantidad', e.target.value)} className="w-16 text-center bg-dark-700 border-dark-600 rounded p-1"/></td>
                        <td className="px-4 py-3 text-sm text-right"><input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => handleUpdateItem(item.idInterno, 'precio_unitario', e.target.value)} className="w-24 text-right bg-dark-700 border-dark-600 rounded p-1"/></td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-200">{formatCurrency((parseFloat(item.cantidad) || 0) * (parseFloat(item.precio_unitario) || 0))}</td>
                        <td className="px-4 py-3 text-sm text-center"><button onClick={() => handleEliminarItemDePresupuesto(item.idInterno)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button></td>
                    </tr>))}
                </tbody></table>
            </div>
          )}
        </div>
        
        {/* Opciones y totales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50 space-y-4">
            <h3 className="text-md font-semibold text-gray-200">Opciones del Presupuesto</h3>
            <div><label htmlFor="tipoDescuento" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Descuento</label>
              <select id="tipoDescuento" value={tipoDescuento} onChange={e => { setTipoDescuento(e.target.value); setValorDescuento(0);}}
                className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="Sin descuento">Sin descuento</option> <option value="Por importe">Por importe ($)</option> <option value="Por porcentaje">Por porcentaje (%)</option>
              </select>
            </div>
            {tipoDescuento !== 'Sin descuento' && (<div><label htmlFor="valorDescuento" className="block text-sm font-medium text-gray-300 mb-1">Valor Descuento</label>
                <input id="valorDescuento" type="number" min="0" value={valorDescuento} onChange={e => setValorDescuento(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" /></div>)}
            <div><label htmlFor="gastosEnvio" className="block text-sm font-medium text-gray-300 mb-1">Gastos de Envío</label>
              <input id="gastosEnvio" type="number" min="0" value={gastosEnvio} onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" /></div>
            <div><label htmlFor="notas" className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
              <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea></div>
            <div><label htmlFor="validezDias" className="block text-sm font-medium text-gray-300 mb-1">Validez (días)</label>
              <input id="validezDias" type="number" min="1" value={validezDias} onChange={e => setValidezDias(parseInt(e.target.value) || 15)}
                className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" /></div>
          </div>
          <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50 flex flex-col">
            <h3 className="text-md font-semibold mb-4 text-gray-200">Resumen</h3>
            <div className="flex-grow space-y-1 text-right mb-3 text-sm">
              <p className="text-gray-300">Subtotal: <span className="font-medium text-gray-200">{formatCurrency(subtotal)}</span></p>
              {descuento > 0 && (<p className="text-red-400">Descuento: <span className="font-medium">- {formatCurrency(descuento)}</span></p>)}
              {gastosEnvio > 0 && (<p className="text-gray-300">Envío: <span className="font-medium text-gray-200">{formatCurrency(gastosEnvio)}</span></p>)}
              <p className="text-lg font-bold text-gray-100 pt-1 border-t border-dark-700 mt-1">Total: <span className="text-primary-400">{formatCurrency(total)}</span></p>
            </div>
            <div className="mt-auto pt-3 border-t border-dark-700 flex flex-col gap-2">
                <button 
                    onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (loadingUser) { toast.error("Cargando sesión, por favor espera..."); return; }
                        if (!user || !user.id) { toast.error("Debes iniciar sesión."); return; } 
                        generateTicketImage({ numero_presupuesto: 'BORRADOR', clientes: clienteSeleccionado, created_at: new Date(), presupuesto_items: itemsPresupuesto, subtotal, descuento_aplicado: descuento, gastos_envio: gastosEnvio, total, notas, validez_dias, vendedor_id: user.id, vendedor: { nombre: vendedorNombreDisplay } });
                    }} 
                    disabled={itemsPresupuesto.length === 0 || !clienteSeleccionado || loadingUser || !user} 
                    title={loadingUser ? "Cargando sesión..." : !user ? "Debes iniciar sesión" : ""}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"><Eye size={16} className="mr-1.5"/> Ver Ticket (Borrador)</button>
                <button onClick={handleGuardarPresupuesto} 
                    disabled={guardando || itemsPresupuesto.length === 0 || !clienteSeleccionado || loadingUser || !user} 
                    title={loadingUser ? "Cargando sesión..." : !user ? "Debes iniciar sesión" : ""}
                    className="w-full py-2.5 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"><Save size={18} className="mr-1.5" /> {guardando ? 'Guardando...' : 'Guardar Presupuesto'}</button>
            </div>
          </div>
        </div>
      </div>
      
      {/* SECCIÓN DE HISTORIAL DE PRESUPUESTOS */}
      <div className="bg-dark-800 rounded-xl shadow-2xl p-6 mt-10 border border-dark-700">
        <h2 className="text-2xl font-semibold text-gray-100 mb-6 border-b border-dark-700 pb-3">Historial de Presupuestos</h2>
        {loadingHistorial || loadingUser ? ( 
          <p className="p-4 text-center text-blue-400">Cargando historial...</p>
        ) : errorHistorial ? ( <p className="p-4 text-center text-red-400">{errorHistorial}</p>
        ) : presupuestosExistentes.length === 0 ? (
          <div className="p-6 text-center text-gray-400"><FileText size={32} className="mx-auto mb-2 opacity-60"/><p>No hay presupuestos.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-700"><tr>
                  {/* Columna "Número" eliminada */}
                  {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Número</th> */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Acciones</th>
              </tr></thead>
              <tbody className="bg-dark-800 divide-y divide-dark-700">
                {presupuestosExistentes.map(p => {
                    const esAntiguo = isBudgetOld(p.created_at); 
                    return (
                      <tr key={p.id} className={`hover:bg-dark-750 ${esAntiguo ? 'opacity-70' : ''}`}>
                        {/* Celda del número eliminada */}
                        {/* <td className="px-4 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 cursor-pointer" onClick={() => handleVerDetalleHistorial(p)}>{p.numero_presupuesto || 'N/A'}</td> */}
                        <td className="px-4 py-3 text-sm text-gray-300">{p.clientes?.nombre || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{formatReadableDate(p.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-100">{formatCurrency(p.total)}</td>
                        <td className="px-4 py-3 text-sm text-center space-x-2">
                          {/* Botón de Ver Detalle (Ojo) - Vuelve al estilo pequeño y con contorno */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleVerDetalleHistorial(p); }} 
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded-md hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" // Cambiado a indigo-400 para un estilo más suave
                            title="Ver Detalle"
                          >
                            <Eye size={16}/>
                          </button>
                          {/* Botón de Ver Ticket (Archivo) - Ahora usa la función Compartir */}
                          <button 
                            onClick={async (e) => { 
                                e.stopPropagation(); 
                                if (loadingUser) { toast.error("Cargando sesión, por favor espera..."); return; }
                                if (!user || !user.id) { toast.error("Debes iniciar sesión."); return; } 
                                generateTicketImage(p); 
                            }} 
                           className={`p-1.5 text-purple-400 hover:text-purple-300 rounded-md hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-purple-500 ${esAntiguo || !user || loadingUser ? 'opacity-50 cursor-not-allowed' : ''}`} 
                           disabled={esAntiguo || !user || loadingUser}
                           title={loadingUser ? "Cargando sesión..." : !user ? "Debes iniciar sesión" : (esAntiguo ? "Presupuesto antiguo" : "")}
                           > <FileText size={16}/> </button> {/* Ícono FileText mantenido */}
                          {/* Botón de Convertir a Venta (Carrito) - Vuelve al estilo pequeño y con contorno */}
                          <button 
                            onClick={async (e) => { 
                                e.stopPropagation(); 
                                if (loadingUser) { toast.error("Cargando sesión, por favor espera..."); return; }
                                if (!user || !user.id) { toast.error("Debes iniciar sesión."); return; } 
                                handleConvertirAVentaDesdeHistorial(p); 
                            }} 
                           className={`p-1.5 text-green-400 hover:text-green-300 rounded-md hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${esAntiguo || !user || loadingUser ? 'opacity-50 cursor-not-allowed' : ''}`} 
                           disabled={esAntiguo || !user || loadingUser}
                           title={loadingUser ? "Cargando sesión..." : !user ? "Debes iniciar sesión" : (esAntiguo ? "Presupuesto antiguo" : "")}
                           > <ShoppingCart size={16}/> </button> {/* Ícono ShoppingCart mantenido */}
                        </td>
                      </tr>);
                })}
              </tbody></table>
          </div>)}
      </div>
      
      {/* MODAL DE VISTA PREVIA DEL NUEVO PRESUPUESTO (SE MANTIENE, YA QUE NO SE PIDIÓ REMOVER) */}
      {showNuevoPresupuestoPreviewModal && nuevoPresupuestoDataPreview && ( 
          <PresupuestoGuardadoPreview
            presupuestoData={nuevoPresupuestoDataPreview} 
            currentUserInfo={vendedorNombreDisplay} 
            onClose={() => setShowNuevoPresupuestoPreviewModal(false)}
            onConvertToVenta={async (data) => { 
                if (loadingUser) { toast.error("Cargando sesión, por favor espera..."); return; }
                if (!user || !user.id) { toast.error("Debes iniciar sesión."); return; } 
                handleConvertirAVentaDesdeHistorial(data);
            }} 
          />
      )}

      {/* MODAL DE DETALLE DE PRESUPUESTO HISTÓRICO (TEMA OSCURO) */}
      {modalDetalleHistorialVisible && presupuestoSeleccionadoHistorial && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[90] p-4 animate-fadeIn" onClick={handleCerrarModalDetalle}> {/* z-index ajustado */}
              <div onClick={(e) => e.stopPropagation()} className="bg-dark-800 text-gray-200 rounded-lg shadow-xl w-full max-w-2xl p-0 max-h-[90vh] flex flex-col border border-dark-700">
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-dark-800 pb-2 border-b border-dark-700"> {/* Ajustado mb-4 y pb-2 */}
                      <h3 className="text-xl font-bold text-gray-100">Detalle: {presupuestoSeleccionadoHistorial.numero_presupuesto || 'N/A'}</h3> {/* Asegurar que numero_presupuesto no sea nulo */}
                      <button onClick={handleCerrarModalDetalle} className="text-gray-400 hover:text-gray-100 text-3xl">&times;</button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-grow space-y-4">
                       <div>
                          <h4 className="text-md font-semibold text-blue-400 mb-1">Cliente:</h4>
                          <p className="text-gray-300">{presupuestoSeleccionadoHistorial.clientes?.nombre || 'N/A'}</p>
                          {presupuestoSeleccionadoHistorial.clientes?.telefono && <p className="text-xs text-gray-400">Tel: {presupuestoSeleccionadoHistorial.clientes.telefono}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p className="text-gray-400"><strong>Fecha:</strong> <span className="text-gray-300">{formatReadableDate(presupuestoSeleccionadoHistorial.created_at)}</span></p>
                        <p className="text-gray-400"><strong>Válido por:</strong> <span className="text-gray-300">{presupuestoSeleccionadoHistorial.validez_dias} días</span></p>
                        <p className="text-gray-400"><strong>Estado:</strong> <span className="text-gray-300">{presupuestoSeleccionadoHistorial.estado}</span></p>
                      </div>
                      {presupuestoSeleccionadoHistorial.notas && (
                          <div className="mt-2"><h4 className="text-md font-semibold text-blue-400 mb-1">Notas:</h4>
                              <p className="p-2 bg-dark-700 rounded text-gray-300 text-xs whitespace-pre-wrap">{presupuestoSeleccionadoHistorial.notas}</p>
                          </div>
                      )}
                      {presupuestoSeleccionadoHistorial.presupuesto_items && presupuestoSeleccionadoHistorial.presupuesto_items.length > 0 && (
                          <div className="mt-3">
                              <h4 className="text-md font-semibold text-blue-400 mb-1">Ítems:</h4>
                              <div className="border border-dark-700 rounded overflow-hidden">
                                  <table className="min-w-full text-xs"><thead className="bg-dark-700"><tr>
                                      <th className="p-2 text-left text-gray-400">Desc.</th><th className="p-2 text-center text-gray-400">Cant.</th>
                                      <th className="p-2 text-right text-gray-400">P.Unit</th><th className="p-2 text-right text-gray-400">Subtotal</th>
                                  </tr></thead>
                                  <tbody className="bg-dark-800 divide-y divide-dark-700">
                                      {/* Aseguramos que item.productos tenga nombre para evitar errores */}
                                      {(presupuestoSeleccionadoHistorial.presupuesto_items || []).map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-dark-750">
                                          <td className="p-2 text-gray-300">{item.productos?.nombre || item.descripcion || 'N/A'}</td>
                                          <td className="p-2 text-center text-gray-300">{item.cantidad}</td>
                                          <td className="p-2 text-right text-gray-300">{formatCurrency(item.precio_unitario)}</td>
                                          <td className="p-2 text-right text-gray-200 font-medium">{formatCurrency(item.subtotal_item)}</td>
                                      </tr>))}
                                  </tbody></table>
                              </div>
                          </div>
                      )}
                       <div className="mt-4 p-3 bg-dark-700 rounded text-right space-y-1">
                            <p className="text-gray-400 text-sm">Subtotal: <span className="text-gray-200 font-medium">{formatCurrency(presupuestoSeleccionadoHistorial.subtotal)}</span></p>
                            {(presupuestoSeleccionadoHistorial.descuento_aplicado || 0) > 0 && (<p className="text-red-400 text-sm">Descuento ({presupuestoSeleccionadoHistorial.tipo_descuento === 'porcentaje' ? `${parseFloat(presupuestoSeleccionadoHistorial.valor_descuento || 0).toFixed(0)}%` : 'Monto Fijo'}): 
                                <span className="text-gray-200 font-medium"> - {formatCurrency(presupuestoSeleccionadoHistorial.descuento_aplicado)}</span></p>
                            )}
                             {(presupuestoSeleccionadoHistorial.gastos_envio || 0) > 0 && (
                                <p className="text-gray-400 text-sm">Envío: <span className="text-gray-200 font-medium">{formatCurrency(presupuestoSeleccionadoHistorial.gastos_envio)}</span></p>
                             )}
                            <div className="border-t border-dark-600 mt-2 pt-2">
                                <p className="text-blue-400 text-lg font-bold">Total: {formatCurrency(presupuestoSeleccionadoHistorial.total)}</p>
                            </div>
                       </div>
                  </div>
                  <div className="p-4 border-t border-dark-700 flex flex-wrap justify-end gap-3 sticky bottom-0 bg-dark-800 z-10">
                        <button onClick={handleCerrarModalDetalle} className="px-4 py-2 bg-dark-600 text-gray-300 rounded hover:bg-dark-500 text-sm">Cerrar</button>
                        {/* Botón de Ver Ticket (Archivo) - Ahora usa la función Compartir */}
                        <button onClick={(e) => { e.stopPropagation(); generateTicketImage(presupuestoSeleccionadoHistorial); }}
                           className={`p-1.5 text-purple-400 hover:text-purple-300 rounded-md hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors text-xs flex items-center ${isBudgetOld(presupuestoSeleccionadoHistorial.created_at) ? 'opacity-50 cursor-not-allowed' : ''}`} 
                           disabled={isBudgetOld(presupuestoSeleccionadoHistorial.created_at)}> <FileText size={16}/> </button> {/* Ícono FileText mantenido */}
                        {/* Botón de Convertir a Venta (Carrito) - Vuelve al estilo pequeño y con contorno */}
                        <button onClick={(e) => { e.stopPropagation(); if (!user) { toast.error("Inicia sesión."); return; } handleConvertirAVentaDesdeHistorial(presupuestoSeleccionadoHistorial); }}
                           className={`p-1.5 text-green-400 hover:text-green-300 rounded-md hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${isBudgetOld(presupuestoSeleccionadoHistorial.created_at) ? 'opacity-50 cursor-not-allowed' : ''}`} 
                           disabled={isBudgetOld(presupuestoSeleccionadoHistorial.created_at)}> <ShoppingCart size={16}/> </button> {/* Ícono ShoppingCart mantenido */}
                   </div>
              </div>
           </div>
       )}

      {/* MODAL PARA PREVISUALIZACIÓN DEL TICKET (IMAGEN) */}
       {showTicketPreviewModal && ticketPreviewData && ( 
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[95] p-4 animate-fadeIn" onClick={closeTicketPreviewModal}> {/* z-index ajustado */}
                <div onClick={(e) => e.stopPropagation()} className="bg-gray-100 rounded-lg shadow-xl w-full max-w-xs sm:max-w-sm p-4 max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center mb-3 w-full border-b border-gray-300 pb-2">
                        <h3 className="text-lg font-bold text-gray-700">Vista Previa del Ticket</h3>
                        <button onClick={closeTicketPreviewModal} className="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none" aria-label="Cerrar"> &times; </button>
                    </div>
                    <div className="overflow-y-auto flex-grow mb-4 w-full flex justify-center bg-gray-200 p-2 rounded">
                        <img src={ticketPreviewData} alt="Vista previa del Ticket" className="block max-w-full h-auto border border-gray-400 shadow-md" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 w-full">
                        {/* Botón de COMPARTIR Ticket */}
                        <button 
                            onClick={shareTicketImage} 
                            className="px-5 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 text-sm w-full sm:w-auto flex items-center justify-center gap-1.5"
                        > 
                            <ShareIcon size={16} /> Compartir Ticket 
                        </button>
                        {/* Botón de Cerrar */}
                        <button onClick={closeTicketPreviewModal} className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md font-semibold hover:bg-gray-400 text-sm w-full sm:w-auto"> Cerrar </button>
                    </div>
                </div>
            </div>
       )}
        <div ref={ticketContentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '300px' }}></div>
    </div>
  );
}
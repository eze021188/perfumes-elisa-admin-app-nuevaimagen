// src/pages/Compras.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

// Importar componentes divididos
import ComprasFormularioNueva from '../components/compras/ComprasFormularioNueva';
import ComprasHistorialLista from '../components/compras/ComprasHistorialLista';

// Helper simple para formatear moneda (podría estar en un archivo utils/)
const formatCurrency = (amount, currency = 'USD') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return currency === 'USD' ? '$0.00' : '0.00';
    }
    return numericAmount.toLocaleString('en-US', { // Ajusta 'en-US' y 'USD' según tu configuración regional
       style: 'currency',
       currency: currency,
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

// --- Helper para formatear fecha y hora para visualización en zona horaria específica ---
const formatDisplayDateTime = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString); 
        return date.toLocaleString('es-MX', { // 'es-MX' para formato mexicano
            timeZone: 'America/Mexico_City', // O 'America/Monterrey'
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit', // Opcional
            hour12: true // Opcional, para formato AM/PM
        });
    } catch (e) {
        console.error("Error formateando fecha de compra:", e, dateString);
        try { 
            // Fallback si la fecha es solo YYYY-MM-DD, la interpreta como local y luego la formatea
            // Esto es importante porque el input type="date" devuelve solo YYYY-MM-DD
            // Ajustamos para que la fecha se interprete correctamente como local antes de formatear
            const dateParts = dateString.split('-');
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) -1; // Meses en JS son 0-indexados
                const day = parseInt(dateParts[2], 10);
                const localDate = new Date(year, month, day); // Crea la fecha asumiendo que es local
                 return localDate.toLocaleDateString('es-MX', {
                    // timeZone: 'America/Mexico_City', // No es necesario si ya es local y solo queremos la fecha
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
            }
            throw new Error("Formato de fecha no reconocido para fallback simple.");
        } catch (e2) {
            // Último fallback si todo falla
            return new Date(dateString).toLocaleString(); 
        }
    }
};


export default function Compras() {
  const navigate = useNavigate();

  const initialFormularioState = {
    numeroPedido: '',
    proveedor: '',
    fechaCompra: new Date().toISOString().split('T')[0], 
    descuentoTotalUSD: '0.00',
    gastosEnvioUSA: '0.00',
    tipoCambioDia: '0.00',
  };

  const initialProductoFormState = {
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: '0.00',
  };

  const initialNewItemState = {
    id: null, 
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: '0.00',
    sugerencias: [],
    mostrarSugerencias: false,
  };

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState({...initialFormularioState});
  const [productoForm, setProductoForm] = useState({...initialProductoFormState});
  const [productosAgregados, setProductosAgregados] = useState([]);
  
  const [savedCompras, setSavedCompras] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  
  const [editingPurchaseItems, setEditingPurchaseItems] = useState([]);
  const [itemParaAgregarAExistente, setItemParaAgregarAExistente] = useState({...initialNewItemState});

  const [invConfig, setInvConfig] = useState({
    gastosImportacion: '0.00',
    tipoCambioImportacion: '0.00',
    otrosGastos: '0.00',
    targetIdx: null
  });
  
  const [nombresSugeridos, setNombresSugeridos] = useState([]);
  const [sugerenciasProductoForm, setSugerenciasProductoForm] = useState([]);
  const [mostrarSugerenciasProductoForm, setMostrarSugerenciasProductoForm] = useState(false);
  
  const productoInputRefNuevaCompra = useRef(null);
  const sugerenciasRefNuevaCompra = useRef(null);
  const existenteProductoInputRef = useRef(null);
  const existenteSugerenciasRef = useRef(null);

  useEffect(() => {
    fetchCompras();
    (async () => {
      const { data, error } = await supabase.from('productos').select('nombre');
      if (!error && data) {
        setNombresSugeridos(Array.from(new Set(data.map(p => p.nombre))).sort());
      } else if (error) {
        console.error('Error al cargar nombres de productos:', error.message);
      }
    })();
  }, []);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        productoInputRefNuevaCompra.current && !productoInputRefNuevaCompra.current.contains(event.target) &&
        sugerenciasRefNuevaCompra.current && !sugerenciasRefNuevaCompra.current.contains(event.target)
      ) {
        setMostrarSugerenciasProductoForm(false);
      }
      if (
        existenteProductoInputRef.current && !existenteProductoInputRef.current.contains(event.target) &&
        existenteSugerenciasRef.current && !existenteSugerenciasRef.current.contains(event.target)
      ) {
        setItemParaAgregarAExistente(prev => ({ ...prev, mostrarSugerencias: false }));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCompras = async () => {
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select('*') 
      .order('created_at', { ascending: false });
    if (errCab) {
      toast.error('Error al cargar compras.'); return;
    }
    const { data: itemsData = [], error: errItems } = await supabase.from('compra_items').select('*');
    if (errItems) {
      toast.error('Error al cargar ítems de compra.'); return;
    }
    const combined = cabeceras.map(c => ({
      compra: c, 
      items: itemsData.filter(i => i.compra_id === c.id).map(i => ({
          id: i.id, nombreProducto: i.nombre_producto,
          cantidad: parseFloat(i.cantidad) || 0,
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0
      }))
    }));
    setSavedCompras(combined);
  };

  const handleToggleExpand = (index) => {
    const newExpandedIdx = expandedIdx === index ? null : index;
    setExpandedIdx(newExpandedIdx);
    if (newExpandedIdx !== null && savedCompras[newExpandedIdx]) {
        const compraActual = savedCompras[newExpandedIdx];
        setEditingPurchaseItems(
            compraActual.items.map(item => ({
                ...item,
                precioUnitarioUSD: (item.precioUnitarioUSD || 0).toFixed(2)
            }))
        );
        setInvConfig({
            gastosImportacion: (compraActual.compra.gastos_importacion || 0).toFixed(2),
            tipoCambioImportacion: (compraActual.compra.tipo_cambio_importacion || 0).toFixed(2),
            otrosGastos: (compraActual.compra.otros_gastos || 0).toFixed(2),
            targetIdx: newExpandedIdx
        });
        setItemParaAgregarAExistente({...initialNewItemState});
    } else {
        setEditingPurchaseItems([]);
        setInvConfig({ gastosImportacion: '0.00', tipoCambioImportacion: '0.00', otrosGastos: '0.00', targetIdx: null });
    }
  };

  const handleFormularioInputChange = (e, isMonetary = false) => {
    const { name, value } = e.target;
    if (isMonetary) {
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      let finalValue = sanitizedValue;
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
      setFormulario(prev => ({ ...prev, [name]: finalValue }));
    } else {
      setFormulario(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFormularioMonetaryBlur = (e, fieldName) => {
    const rawValue = e.target.value;
    let numValue = parseFloat(rawValue);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    setFormulario(prev => ({ ...prev, [fieldName]: numValue.toFixed(2) }));
  };
  
  const handleProductoFormInputChange = (e, isMonetary = false) => {
    const { name, value } = e.target;
    if (isMonetary) {
        const sanitizedValue = value.replace(/[^\d.]/g, '');
        let finalValue = sanitizedValue;
        const parts = sanitizedValue.split('.');
        if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
        setProductoForm(prev => ({ ...prev, [name]: finalValue }));
    } else {
        setProductoForm(prev => ({ ...prev, [name]: value }));
    }
    if (name === 'nombreProducto') {
        if (value.trim() === '') {
            setSugerenciasProductoForm([]);
            setMostrarSugerenciasProductoForm(false);
        } else {
            const filtradas = nombresSugeridos.filter(n => n.toLowerCase().includes(value.toLowerCase()));
            setSugerenciasProductoForm(filtradas.slice(0, 10));
            setMostrarSugerenciasProductoForm(filtradas.length > 0);
        }
    }
  };

  const handleProductoFormMonetaryBlur = (e, fieldName) => {
    const rawValue = e.target.value;
    let numValue = parseFloat(rawValue);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    setProductoForm(prev => ({ ...prev, [fieldName]: numValue.toFixed(2) }));
  };

  const handleSeleccionarSugerenciaNuevaCompra = (nombreSugerido) => {
    setProductoForm(prev => ({ ...prev, nombreProducto: nombreSugerido }));
    setSugerenciasProductoForm([]);
    setMostrarSugerenciasProductoForm(false);
  };
  
  const handleProductoInputFocusNuevaCompra = () => {
    if (productoForm.nombreProducto.trim() !== '' && sugerenciasProductoForm.length > 0) {
        setMostrarSugerenciasProductoForm(true);
    }
  };

  const handleProductoInputKeyDownNuevaCompra = (e) => {
    if (e.key === 'Escape') setMostrarSugerenciasProductoForm(false);
  };

  const agregarProductoNuevaCompra = () => {
    const precioNum = parseFloat(productoForm.precioUnitarioUSD);
    if (!productoForm.nombreProducto || !productoForm.cantidad || isNaN(precioNum) || precioNum < 0) {
      toast.error('Completa los campos del producto. Precio no puede ser negativo.'); return;
    }
    const nuevoProducto = {
      id: Date.now(), nombreProducto: productoForm.nombreProducto.trim(),
      cantidad: parseInt(productoForm.cantidad, 10) || 0,
      precioUnitarioUSD: precioNum 
    };
    if (nuevoProducto.cantidad <= 0) { toast.error('La cantidad debe ser mayor a 0.'); return; }
    setProductosAgregados(prev => [...prev, nuevoProducto]);
    setProductoForm({...initialProductoFormState});
    setMostrarSugerenciasProductoForm(false);
  };

  const eliminarProductoDeFormulario = (index) => {
    setProductosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const guardarCompra = async () => {
    if (!formulario.numeroPedido || !formulario.proveedor || productosAgregados.length === 0) {
      toast.error('Completa la cabecera y agrega al menos un producto.'); return;
    }
    const descuento = parseFloat(formulario.descuentoTotalUSD || '0');
    const gastosEnvio = parseFloat(formulario.gastosEnvioUSA || '0');
    const tipoCambioDia = parseFloat(formulario.tipoCambioDia || '0');
    if (descuento < 0 || gastosEnvio < 0 || tipoCambioDia < 0) {
         toast.error('Valores monetarios no pueden ser negativos.'); return;
    }

    const compraDataToInsert = {
        numero_pedido: formulario.numeroPedido.trim(),
        proveedor: formulario.proveedor.trim(),
        descuento_total_usd: descuento,
        gastos_envio_usa: gastosEnvio,
        tipo_cambio_dia: tipoCambioDia,
        inventario_afectado: false
    };

    // --- MODIFICADO: Manejo de fecha_compra para UTC ---
    if (formulario.fechaCompra) {
        // El input type="date" devuelve "YYYY-MM-DD".
        // Para una columna TIMESTAMPTZ, queremos el inicio de ese día en UTC.
        // O si la columna es solo DATE, formulario.fechaCompra es suficiente.
        // Asumiendo que `fecha_compra` en la BD es TIMESTAMPTZ:
        const dateParts = formulario.fechaCompra.split('-');
        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // Meses en JS son 0-indexados
            const day = parseInt(dateParts[2], 10);
            // Crea la fecha como inicio del día en UTC
            compraDataToInsert.fecha_compra = new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString();
        } else {
            // Si el formato es inesperado, usar la hora actual del cliente en UTC
             compraDataToInsert.fecha_compra = new Date().toISOString();
            console.warn("Formato de fecha de compra inválido, se usó la fecha y hora actual en UTC:", formulario.fechaCompra);
        }
    } else {
        // Si no se proporciona fecha y tu BD tiene un DEFAULT (ej. now() para timestamptz),
        // es mejor NO incluir `fecha_compra` en `compraDataToInsert` para que se use el DEFAULT.
        // Si quieres la hora actual del cliente en UTC si no selecciona nada:
         compraDataToInsert.fecha_compra = new Date().toISOString();
    }
    // --- FIN MODIFICADO ---


    const { data: newCompra, error: errCompra } = await supabase
      .from('compras')
      .insert(compraDataToInsert).select('id').single();

    if (errCompra) { toast.error('Error al guardar la compra: ' + errCompra.message); return; }
    const itemsToInsert = productosAgregados.map(item => ({
      compra_id: newCompra.id, nombre_producto: item.nombreProducto,
      cantidad: item.cantidad, precio_unitario_usd: item.precioUnitarioUSD
    }));
    const { error: errItems } = await supabase.from('compra_items').insert(itemsToInsert);
    if (errItems) { toast.error('Error al guardar ítems. Cabecera pudo ser creada.'); return; }
    
    setFormulario({...initialFormularioState});
    setProductoForm({...initialProductoFormState});
    setProductosAgregados([]);
    setMostrarFormulario(false);
    fetchCompras();
    toast.success('Compra guardada!');
  };

  const eliminarCompra = async (compraId, inventarioAfectado) => {
    if (inventarioAfectado) { toast.error('No se puede eliminar, inventario afectado.'); return; }
    if (!window.confirm('¿Eliminar esta compra y sus ítems?')) return;
    await supabase.from('compra_items').delete().eq('compra_id', compraId);
    await supabase.from('compras').delete().eq('id', compraId);
    fetchCompras();
    toast.success('Compra eliminada.');
  };

    const handleEditingItemChange = (itemOriginalId, fieldName, value) => {
        setEditingPurchaseItems(prevItems =>
        prevItems.map(item => {
            if (item.id === itemOriginalId) {
            if (fieldName === 'precioUnitarioUSD') {
                const sanitizedValue = value.replace(/[^\d.]/g, '');
                let finalValue = sanitizedValue;
                const parts = sanitizedValue.split('.');
                if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
                return { ...item, [fieldName]: finalValue };
            }
            return { ...item, [fieldName]: value };
            }
            return item;
        })
        );
    };
  
    const handleEditingItemBlur = (itemOriginalId, fieldName) => {
        setEditingPurchaseItems(prevItems =>
        prevItems.map(item => {
            if (item.id === itemOriginalId && fieldName === 'precioUnitarioUSD') {
            let numValue = parseFloat(item.precioUnitarioUSD);
            if (isNaN(numValue) || numValue < 0) numValue = 0;
            return { ...item, precioUnitarioUSD: numValue.toFixed(2) };
            }
            return item;
        })
        );
    };

    const handleItemParaAgregarChange = (e) => {
        const { name, value } = e.target;
        if (name === 'precioUnitarioUSD') {
            const sanitizedValue = value.replace(/[^\d.]/g, '');
            let finalValue = sanitizedValue;
            const parts = sanitizedValue.split('.');
            if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
            setItemParaAgregarAExistente(prev => ({ ...prev, [name]: finalValue }));
        } else if (name === 'nombreProducto' || name === 'seleccionarSugerencia') {
            const nombreActual = name === 'seleccionarSugerencia' ? value : e.target.value;
            setItemParaAgregarAExistente(prev => ({ ...prev, nombreProducto: nombreActual, mostrarSugerencias: name !== 'seleccionarSugerencia' }));
            if (nombreActual.trim() === '' || name === 'seleccionarSugerencia') {
                setItemParaAgregarAExistente(prev => ({...prev, sugerencias: [], mostrarSugerencias: false}));
            } else {
                const filtradas = nombresSugeridos.filter(n => n.toLowerCase().includes(nombreActual.toLowerCase()));
                setItemParaAgregarAExistente(prev => ({...prev, sugerencias: filtradas.slice(0,10), mostrarSugerencias: filtradas.length > 0 && name !== 'seleccionarSugerencia'}));
            }
        } else {
            setItemParaAgregarAExistente(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleItemParaAgregarBlur = (e) => {
        const { name } = e.target;
        if (name === 'precioUnitarioUSD') {
        let numValue = parseFloat(itemParaAgregarAExistente.precioUnitarioUSD);
        if (isNaN(numValue) || numValue < 0) numValue = 0;
        setItemParaAgregarAExistente(prev => ({ ...prev, precioUnitarioUSD: numValue.toFixed(2) }));
        }
    };
  
    const agregarProductoACompraExistenteLocal = () => {
        const precioNum = parseFloat(itemParaAgregarAExistente.precioUnitarioUSD);
        if (!itemParaAgregarAExistente.nombreProducto || !itemParaAgregarAExistente.cantidad || isNaN(precioNum) || precioNum < 0) {
        toast.error('Completa los campos del producto. Precio no puede ser negativo.'); return;
        }
        const cantidadNum = parseInt(itemParaAgregarAExistente.cantidad, 10);
        if (cantidadNum <= 0) { toast.error('La cantidad debe ser mayor a 0.'); return; }
        const nuevoItem = {
        id: `new_${Date.now()}`, nombreProducto: itemParaAgregarAExistente.nombreProducto.trim(),
        cantidad: cantidadNum, precioUnitarioUSD: precioNum.toFixed(2), 
        compra_id: (expandedIdx !== null && savedCompras[expandedIdx]) ? savedCompras[expandedIdx].compra.id : null,
        isNew: true 
        };
        if (!nuevoItem.compra_id) { toast.error("No se pudo asociar ítem. Intenta de nuevo."); return; }
        setEditingPurchaseItems(prev => [...prev, nuevoItem]);
        setItemParaAgregarAExistente({...initialNewItemState});
    };

    const eliminarItemDeCompraEditandose = (itemId) => {
        setEditingPurchaseItems(prev => prev.filter(item => item.id !== itemId));
    };

    const guardarCambiosEnCompraExistente = async () => {
        if (expandedIdx === null || !savedCompras[expandedIdx]) { toast.error("No hay compra seleccionada."); return; }
        const compraId = savedCompras[expandedIdx].compra.id;
        const itemsOriginales = savedCompras[expandedIdx].items;
        const promises = [];
        for (const editedItem of editingPurchaseItems) {
            const cantidad = parseInt(editedItem.cantidad, 10);
            const precio = parseFloat(editedItem.precioUnitarioUSD);
            if (isNaN(cantidad) || cantidad <= 0 || isNaN(precio) || precio < 0 || !editedItem.nombreProducto) {
                toast.error(`Datos inválidos para: ${editedItem.nombreProducto || 'Ítem'}.`); return; 
            }
            const payload = { compra_id: compraId, nombre_producto: editedItem.nombreProducto, cantidad: cantidad, precio_unitario_usd: precio };
            if (String(editedItem.id).startsWith('new_')) { 
                promises.push(supabase.from('compra_items').insert(payload).select().single());
            } else { 
                const original = itemsOriginales.find(i => i.id === editedItem.id);
                if (original && (original.cantidad !== cantidad || 
                                 parseFloat(original.precioUnitarioUSD).toFixed(2) !== precio.toFixed(2) ||
                                 original.nombreProducto !== editedItem.nombreProducto)) {
                    promises.push(supabase.from('compra_items').update(payload).eq('id', editedItem.id).select().single());
                }
            }
        }
        const idsEditados = editingPurchaseItems.map(ei => ei.id);
        for (const original of itemsOriginales) {
            if (!String(original.id).startsWith('new_') && !idsEditados.includes(original.id)) {
                promises.push(supabase.from('compra_items').delete().eq('id', original.id));
            }
        }
        try {
            const results = await Promise.all(promises);
            if (results.some(res => res && res.error)) {
                toast.error('Algunos cambios no se guardaron.');
                 results.forEach(res => { if(res && res.error) console.error('Error en op item:', res.error); });
            } else {
                 toast.success('Cambios en la compra guardados exitosamente.');
            }
            await fetchCompras(); 
            if (expandedIdx !== null) {
                 const compraActualizada = savedCompras.find(c => c.compra.id === compraId); 
                 if (compraActualizada) {
                    // Lógica para actualizar editingPurchaseItems si es necesario,
                    // aunque el useEffect de expandedIdx debería manejarlo al cambiar savedCompras.
                 } else {
                    setExpandedIdx(null); 
                 }
            }
        } catch (error) { toast.error(`Error al procesar cambios en la compra: ${error.message}`);}
    };

    const handleInvConfigChange = (e, index) => {
        const { name, value } = e.target;
        const sanitizedValue = value.replace(/[^\d.]/g, '');
        let finalValue = sanitizedValue;
        const parts = sanitizedValue.split('.');
        if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
        setInvConfig(prev => ({ ...prev, [name]: finalValue, targetIdx: index }));
    };

    const handleMonetaryInvConfigBlur = (e, fieldName, index) => {
        const rawValue = e.target.value;
        let numValue = parseFloat(rawValue);
        if (isNaN(numValue) || numValue < 0) numValue = 0;
        setInvConfig(prev => ({ ...prev, [fieldName]: numValue.toFixed(2), targetIdx: index }));
    };
    
    const confirmarAfectarInventario = async (targetPurchaseIndex) => {
        const { gastosImportacion, tipoCambioImportacion, otrosGastos } = invConfig;
        const gastosImportacionNum = parseFloat(gastosImportacion || '0');
        const tipoCambioImportacionNum = parseFloat(tipoCambioImportacion || '0');
        const otrosGastosNum = parseFloat(otrosGastos || '0');
    
        if (targetPurchaseIndex === null || gastosImportacion === '' || tipoCambioImportacion === '' || otrosGastos === '') {
            toast.error('Completa los campos de gastos, tipo de cambio y otros gastos.'); return;
        }
        const compraActualData = savedCompras[targetPurchaseIndex];
        if (!compraActualData) { toast.error("Compra no encontrada."); return; }

        const compra = compraActualData.compra;
        const itemsToProcess = editingPurchaseItems.length > 0 && expandedIdx === targetPurchaseIndex 
                               ? editingPurchaseItems 
                               : compraActualData.items;
    
        if (compra.inventario_afectado) { toast.error('Inventario ya afectado.'); return; }
        if (itemsToProcess.length === 0) { toast.error('No hay ítems en la compra.'); return; }
        if (gastosImportacionNum < 0 || tipoCambioImportacionNum <= 0 || otrosGastosNum < 0) {
             toast.error('Valores de gastos inválidos. Tipo de cambio debe ser > 0.'); return;
        }
    
        const { error: errCab } = await supabase.from('compras').update({
            gastos_importacion: gastosImportacionNum, tipo_cambio_importacion: tipoCambioImportacionNum,
            otros_gastos: otrosGastosNum, inventario_afectado: true
        }).eq('id', compra.id);
        if (errCab) { toast.error('Error al actualizar cabecera de compra: ' + errCab.message); return; }
        
        const { data: catalogo = [] } = await supabase.from('productos').select('id, nombre, stock, costo_final_usd, costo_final_mxn');
        
        const subtotalBrutoUSD = itemsToProcess.reduce((sum, p) => sum + ((parseFloat(p.cantidad) || 0) * (parseFloat(p.precioUnitarioUSD) || 0)), 0) || 1;
        const gastosTotalesUSD = (parseFloat(compra.descuento_total_usd) || 0) * -1 + (parseFloat(compra.gastos_envio_usa) || 0) + gastosImportacionNum + otrosGastosNum;
        
        const productOperations = []; 
    
        for (const p of itemsToProcess) {
            const cantidadCompra = parseFloat(p.cantidad) || 0;
            const precioUnitarioUSD = parseFloat(p.precioUnitarioUSD) || 0;
            const aporteItemUSD = (cantidadCompra * precioUnitarioUSD) / subtotalBrutoUSD;
            const costoAjustePorItemUSD = (aporteItemUSD * gastosTotalesUSD) / (cantidadCompra || 1);
            const costoFinalUSDItem = precioUnitarioUSD + costoAjustePorItemUSD;
            const costoFinalMXNItem = costoFinalUSDItem * tipoCambioImportacionNum;
    
            let prodEnCatalogo = catalogo.find(x => x.nombre === p.nombreProducto);
            
            if (prodEnCatalogo) {
                const stockActual = parseFloat(prodEnCatalogo.stock) || 0;
                const costoActualUSD = parseFloat(prodEnCatalogo.costo_final_usd) || 0;
                const costoActualMXN = parseFloat(prodEnCatalogo.costo_final_mxn) || 0;
                const nuevoStockTotal = stockActual + cantidadCompra;
                let nuevoCostoPromedioUSD = costoActualUSD, nuevoCostoPromedioMXN = costoActualMXN;

                if (nuevoStockTotal > 0) {
                    nuevoCostoPromedioUSD = ((stockActual * costoActualUSD) + (cantidadCompra * costoFinalUSDItem)) / nuevoStockTotal;
                    nuevoCostoPromedioMXN = ((stockActual * costoActualMXN) + (cantidadCompra * costoFinalMXNItem)) / nuevoStockTotal;
                } else if (cantidadCompra > 0) { 
                    nuevoCostoPromedioUSD = costoFinalUSDItem;
                    nuevoCostoPromedioMXN = costoFinalMXNItem;
                }
                productOperations.push(
                    supabase.from('productos').update({
                        stock: nuevoStockTotal, 
                        costo_final_usd: parseFloat(nuevoCostoPromedioUSD.toFixed(4)),
                        costo_final_mxn: parseFloat(nuevoCostoPromedioMXN.toFixed(2))
                    }).eq('id', prodEnCatalogo.id).then(response => ({...response, producto_id_original: prodEnCatalogo.id, cantidad_comprada: cantidadCompra})) 
                );
            } else { 
                productOperations.push(
                    supabase.from('productos').insert({
                        nombre: p.nombreProducto, stock: cantidadCompra,
                        costo_final_usd: parseFloat(costoFinalUSDItem.toFixed(4)),
                        costo_final_mxn: parseFloat(costoFinalMXNItem.toFixed(2))
                    }).select('id').single().then(response => ({...response, cantidad_comprada: cantidadCompra})) 
                );
            }
        }
        
        try {
            const productResults = await Promise.all(productOperations);
            const inventoryMovements = [];

            for(const result of productResults){
                if(result.error){
                    console.error("Error en operación de producto:", result.error);
                    toast.error("Error al actualizar/crear un producto. El inventario podría estar inconsistente.");
                    continue; 
                }
                const productoIdParaMov = result.data?.id || result.producto_id_original; 
                const cantidadComprada = result.cantidad_comprada;

                if(productoIdParaMov && cantidadComprada > 0){
                    inventoryMovements.push({ 
                        tipo: 'ENTRADA', 
                        producto_id: productoIdParaMov, 
                        cantidad: cantidadComprada,
                        referencia: compra.numero_pedido, 
                        motivo: 'compra', 
                        fecha: new Date().toISOString() 
                    });
                }
            }
            
            if(inventoryMovements.length > 0) {
                 const { error: errMovs } = await supabase.from('movimientos_inventario').insert(inventoryMovements);
                 if (errMovs) {
                    console.error("Error crítico al registrar movimientos de inventario:", errMovs);
                    toast.error("Error al registrar movimientos de inventario. Revisar consistencia.");
                 }
            }
        } catch (error) {
            console.error("Error durante la actualización/inserción de productos o movimientos:", error);
            toast.error("Error al actualizar/crear algunos productos o sus movimientos. El inventario podría no estar completamente afectado.");
            // No revertir 'inventario_afectado' automáticamente, requiere revisión.
            return; 
        }

        fetchCompras(); 
        setInvConfig({ gastosImportacion: '0.00', tipoCambioImportacion: '0.00', otrosGastos: '0.00', targetIdx: null });
        setExpandedIdx(null); 
        toast.success(`Inventario afectado para pedido ${compra.numero_pedido}`);
    };


  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800"
        >
          Volver al inicio
        </button>
      </div>
      <div className="mt-6 bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Compras</h1>
        <button
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            if (!mostrarFormulario) {
                setFormulario({...initialFormularioState});
                setProductoForm({...initialProductoFormState});
                setProductosAgregados([]);
            }
          }}
          className={`mb-6 px-6 py-2 rounded-lg shadow-md transition duration-200 ${mostrarFormulario ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {mostrarFormulario ? 'Cancelar Nueva Compra' : 'Registrar Nueva Compra'}
        </button>

        {mostrarFormulario && (
          <ComprasFormularioNueva
            formulario={formulario}
            onInputChange={handleFormularioInputChange}
            onMonetaryFieldBlur={handleFormularioMonetaryBlur}
            productoForm={productoForm}
            onProductoInputChange={handleProductoFormInputChange}
            onProductoMonetaryBlur={handleProductoFormMonetaryBlur}
            productosAgregados={productosAgregados}
            onAgregarProducto={agregarProductoNuevaCompra}
            onEliminarProductoForm={eliminarProductoDeFormulario}
            onGuardarCompra={guardarCompra}
            nombresSugeridos={nombresSugeridos}
            sugerenciasProducto={sugerenciasProductoForm} 
            mostrarSugerenciasProducto={mostrarSugerenciasProductoForm} 
            onSeleccionarSugerencia={handleSeleccionarSugerenciaNuevaCompra}
            onProductoInputFocus={handleProductoInputFocusNuevaCompra} 
            onProductoInputKeyDown={handleProductoInputKeyDownNuevaCompra} 
            productoInputRef={productoInputRefNuevaCompra} 
            sugerenciasRef={sugerenciasRefNuevaCompra} 
          />
        )}

        <h2 className="text-2xl font-bold text-gray-800 mb-6 mt-8">Historial de Compras</h2>
        <ComprasHistorialLista
            savedCompras={savedCompras}
            expandedIdx={expandedIdx}
            onToggleExpand={handleToggleExpand}
            onEliminarCompra={eliminarCompra}
            editingPurchaseItems={editingPurchaseItems}
            onEditingItemChange={handleEditingItemChange}
            onEditingItemBlur={handleEditingItemBlur}
            itemParaAgregarAExistente={itemParaAgregarAExistente}
            onItemParaAgregarChange={handleItemParaAgregarChange}
            onItemParaAgregarBlur={handleItemParaAgregarBlur}
            onAgregarProductoACompraExistente={agregarProductoACompraExistenteLocal}
            onEliminarItemDeCompraEditandose={eliminarItemDeCompraEditandose}
            onGuardarCambiosEnCompraExistente={guardarCambiosEnCompraExistente}
            invConfig={invConfig}
            onInvConfigChange={handleInvConfigChange}
            onMonetaryInvConfigBlur={handleMonetaryInvConfigBlur}
            onConfirmarAfectarInventario={confirmarAfectarInventario}
            nombresSugeridos={nombresSugeridos}
            existenteProductoInputRef={existenteProductoInputRef}
            existenteSugerenciasRef={existenteSugerenciasRef}
            formatDisplayDate={formatDisplayDateTime} // --- Pasar helper de fecha ---
        />
      </div>
    </div>
  );
}

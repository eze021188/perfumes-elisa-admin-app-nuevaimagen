// src/pages/Compras.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function Compras() {
  const navigate = useNavigate();

  const initialFormularioState = {
    numeroPedido: '',
    proveedor: '',
    fechaCompra: '',
    descuentoTotalUSD: '0.00',
    gastosEnvioUSA: '0.00',
    tipoCambioDia: '0.00',
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: '0.00'
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

  const [sugerenciasProducto, setSugerenciasProducto] = useState([]);
  const [mostrarSugerenciasProducto, setMostrarSugerenciasProducto] = useState(false);
  const productoInputRef = useRef(null);
  const sugerenciasRef = useRef(null);

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
        productoInputRef.current && !productoInputRef.current.contains(event.target) &&
        sugerenciasRef.current && !sugerenciasRef.current.contains(event.target)
      ) {
        setMostrarSugerenciasProducto(false);
      }
      if (
        existenteProductoInputRef.current && !existenteProductoInputRef.current.contains(event.target) &&
        existenteSugerenciasRef.current && !existenteSugerenciasRef.current.contains(event.target)
      ) {
        setItemParaAgregarAExistente(prev => ({ ...prev, mostrarSugerencias: false }));
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchCompras = async () => {
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select('*')
      .order('created_at', { ascending: false });
    if (errCab) {
      console.error('Error al obtener compras:', errCab.message);
      toast.error('Error al cargar compras.');
      return;
    }
    const { data: itemsData = [], error: errItems } = await supabase
      .from('compra_items')
      .select('*');
    if (errItems) {
      console.error('Error al obtener ítems de compra:', errItems.message);
      toast.error('Error al cargar ítems de compra.');
      return;
    }
    const combined = cabeceras.map(c => ({
      compra: c,
      items: itemsData
        .filter(i => i.compra_id === c.id)
        .map(i => ({
          id: i.id,
          nombreProducto: i.nombre_producto,
          cantidad: parseFloat(i.cantidad) || 0,
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0
        }))
    }));
    setSavedCompras(combined);
  };

  useEffect(() => {
    if (expandedIdx !== null && savedCompras[expandedIdx]) {
      const compraActual = savedCompras[expandedIdx];
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
        targetIdx: expandedIdx
      });
      setItemParaAgregarAExistente({...initialNewItemState});
    } else {
      setEditingPurchaseItems([]);
      setInvConfig({ gastosImportacion: '0.00', tipoCambioImportacion: '0.00', otrosGastos: '0.00', targetIdx: null });
    }
  }, [expandedIdx, savedCompras]);

  const eliminarProductoForm = (index) => {
    setProductosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const calcularSubtotal = (items) => {
    return items.reduce((sum, item) => {
        const cantidad = parseFloat(item.cantidad) || 0;
        const precio = parseFloat(item.precioUnitarioUSD) || 0; // precioUnitarioUSD es string "X.XX" o número
        return sum + (cantidad * precio);
    }, 0);
  };
  
  const calcularTotal = (items, descuentoStr) => {
    return calcularSubtotal(items) - (parseFloat(descuentoStr) || 0);
  };
  
  const handleMonetaryFieldBlur = (e, setterFunction, fieldName) => {
    const rawValue = e.target.value;
    let numValue = parseFloat(rawValue);
    if (isNaN(numValue) || numValue < 0) {
      numValue = 0;
    }
    setterFunction(prev => ({ ...prev, [fieldName]: numValue.toFixed(2) }));
  };
  
  const handleInputChange = (e, setter = setFormulario, isMonetary = false) => {
    const { name, value } = e.target;

    if (isMonetary) {
      const sanitizedValue = value.replace(/[^\d.]/g, '');
      let finalValue = sanitizedValue;
      const parts = sanitizedValue.split('.');
      if (parts.length > 2) {
        finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
      }
      setter(prev => ({ ...prev, [name]: finalValue }));
    } else {
      setter(prev => ({ ...prev, [name]: value }));
    }

    if (setter === setFormulario && name === 'nombreProducto') {
      if (value.trim() === '') {
        setSugerenciasProducto([]);
        setMostrarSugerenciasProducto(false);
      } else {
        const filtradas = nombresSugeridos.filter(n => n.toLowerCase().includes(value.toLowerCase()));
        setSugerenciasProducto(filtradas.slice(0, 10));
        setMostrarSugerenciasProducto(filtradas.length > 0);
      }
    }
  };

  const handleSeleccionarSugerencia = (nombreSugerido) => {
    setFormulario(prev => ({ ...prev, nombreProducto: nombreSugerido }));
    setSugerenciasProducto([]);
    setMostrarSugerenciasProducto(false);
  };
  
  const handleProductoInputKeyDown = (e) => {
    if (e.key === 'Escape') {
        setMostrarSugerenciasProducto(false);
    }
  };

  const agregarProducto = () => {
    const precioNum = parseFloat(formulario.precioUnitarioUSD);
    if (!formulario.nombreProducto || !formulario.cantidad || isNaN(precioNum) || precioNum < 0) {
      toast.error('Completa los campos del producto. Precio no puede ser negativo.');
      return;
    }
    const nuevoProducto = {
      id: Date.now(),
      nombreProducto: formulario.nombreProducto.trim(),
      cantidad: parseInt(formulario.cantidad, 10) || 0,
      precioUnitarioUSD: precioNum 
    };
    if (nuevoProducto.cantidad <= 0) {
         toast.error('La cantidad debe ser mayor a 0.');
         return;
    }
    setProductosAgregados(prev => [...prev, nuevoProducto]);
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '0.00' }));
    setMostrarSugerenciasProducto(false);
  };

  const guardarCompra = async () => {
    if (!formulario.numeroPedido || !formulario.proveedor || productosAgregados.length === 0) {
      toast.error('Completa la cabecera y agrega al menos un producto.');
      return;
    }
    const descuento = parseFloat(formulario.descuentoTotalUSD || '0');
    const gastosEnvio = parseFloat(formulario.gastosEnvioUSA || '0');
    const tipoCambioDia = parseFloat(formulario.tipoCambioDia || '0');

    if (descuento < 0 || gastosEnvio < 0 || tipoCambioDia < 0) {
         toast.error('Los valores de descuento, gastos de envío y tipo de cambio no pueden ser negativos.');
         return;
    }
     if (tipoCambioDia === 0 && (descuento > 0 || gastosEnvio > 0)) {
          toast.warn('Advertencia: El tipo de cambio es 0, los gastos y descuentos en USD no se convertirán a MXN correctamente.');
     }

    const { data: newCompra, error: errCompra } = await supabase
      .from('compras')
      .insert({
        numero_pedido: formulario.numeroPedido.trim(),
        proveedor: formulario.proveedor.trim(),
        fecha_compra: formulario.fechaCompra || new Date().toISOString().split('T')[0],
        descuento_total_usd: descuento,
        gastos_envio_usa: gastosEnvio,
        tipo_cambio_dia: tipoCambioDia,
        inventario_afectado: false
      })
      .select('id')
      .single();

    if (errCompra) {
      console.error('Error al guardar compra:', errCompra.message);
      toast.error('Error al guardar la compra: ' + errCompra.message);
      return;
    }

    const itemsToInsert = productosAgregados.map(item => ({
      compra_id: newCompra.id,
      nombre_producto: item.nombreProducto,
      cantidad: item.cantidad,
      precio_unitario_usd: item.precioUnitarioUSD
    }));

    const { error: errItems } = await supabase.from('compra_items').insert(itemsToInsert);
    if (errItems) {
      console.error('Error al guardar ítems de compra:', errItems.message);
      toast.error('Error al guardar ítems de compra. La cabecera de compra pudo haber sido creada.');
      // Considerar borrar la cabecera de compra si los ítems fallan
      // await supabase.from('compras').delete().eq('id', newCompra.id);
      return;
    }
    setFormulario({...initialFormularioState});
    setProductosAgregados([]);
    setMostrarFormulario(false);
    fetchCompras();
    toast.success('Compra guardada exitosamente!');
  };

  const eliminarCompra = async (compraId, inventarioAfectado) => {
    if (inventarioAfectado) {
         toast.error('No se puede eliminar una compra que ya ha afectado el inventario.');
         return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta compra y todos sus ítems?')) return;
    
    const { error: errItems } = await supabase.from('compra_items').delete().eq('compra_id', compraId);
    if (errItems) {
      console.error('Error al eliminar ítems de compra:', errItems.message);
      toast.error('Error al eliminar ítems de compra.');
      return;
    }
    const { error: errCompra } = await supabase.from('compras').delete().eq('id', compraId);
    if (errCompra) {
      console.error('Error al eliminar compra:', errCompra.message);
      toast.error('Error al eliminar la compra.');
    } else {
      fetchCompras();
      toast.success('Compra eliminada exitosamente.');
    }
  };

  const confirmarAfectInventory = async () => {
    const { targetIdx } = invConfig;
    const gastosImportacionNum = parseFloat(invConfig.gastosImportacion || '0');
    const tipoCambioImportacionNum = parseFloat(invConfig.tipoCambioImportacion || '0');
    const otrosGastosNum = parseFloat(invConfig.otrosGastos || '0');

    if (targetIdx === null || invConfig.gastosImportacion === '' || invConfig.tipoCambioImportacion === '' || invConfig.otrosGastos === '') {
        toast.error('Selecciona una compra y completa los campos de gastos, tipo de cambio y otros gastos.');
        return;
    }
    const compraActualData = savedCompras[targetIdx]; // Usar los datos de savedCompras para la cabecera
    const compra = compraActualData.compra;
    
    // Usar editingPurchaseItems para los items si la compra está expandida y es la que se está editando
    // De lo contrario, usar los items de savedCompras.
    const itemsToProcess = (expandedIdx === targetIdx && editingPurchaseItems.length > 0) 
                           ? editingPurchaseItems 
                           : compraActualData.items;


    if (compra.inventario_afectado) {
         toast.error('Esta compra ya ha afectado el inventario.');
         return;
    }
    if (itemsToProcess.length === 0) {
      toast.error('La compra seleccionada no tiene ítems para afectar el inventario.');
      return;
    }
    
    const descuentoTotalUSDNum = parseFloat(compra.descuento_total_usd) || 0;
    const gastosEnvioUSANum = parseFloat(compra.gastos_envio_usa) || 0;
    const tipoCambioDiaNum = parseFloat(compra.tipo_cambio_dia) || 0;

    if (gastosImportacionNum < 0 || tipoCambioImportacionNum < 0 || otrosGastosNum < 0) {
         toast.error('Los valores de gastos no pueden ser negativos.');
         return;
    }
     if (tipoCambioImportacionNum === 0 && (gastosImportacionNum > 0 || otrosGastosNum > 0)) {
          toast.warn('Advertencia: El tipo de cambio de importación es 0.');
     }

    const { error: errCab } = await supabase
      .from('compras')
      .update({
        gastos_importacion: gastosImportacionNum,
        tipo_cambio_importacion: tipoCambioImportacionNum,
        otros_gastos: otrosGastosNum,
        inventario_afectado: true
      })
      .eq('id', compra.id);
    if (errCab) {
      console.error('[Afectar Inventario] Error al actualizar cabecera:', errCab.message);
      toast.error('Error al actualizar compra: ' + errCab.message);
      return;
    }
    
    const { data: catalogo = [], error: errCat } = await supabase.from('productos').select('id, nombre, stock, costo_final_usd, costo_final_mxn');
    if (errCat) {
      console.error('[Afectar Inventario] Error al cargar catálogo:', errCat.message);
      toast.error('Error al cargar catálogo: ' + errCat.message);
      return;
    }

    const subtotalBrutoCompraActual = itemsToProcess.reduce((sum, p) => sum + ((parseFloat(p.cantidad) || 0) * (parseFloat(p.precioUnitarioUSD) || 0)), 0) || 1;
    const gastosTotalesCompraActual = descuentoTotalUSDNum * -1 + gastosEnvioUSANum + gastosImportacionNum + otrosGastosNum;
    
    const updatePromises = [];
    const movimientoPromises = [];

    for (const p of itemsToProcess) {
        const cantidadCompraActual = parseFloat(p.cantidad) || 0;
        const precioUnitarioUSDCompraActual = parseFloat(p.precioUnitarioUSD) || 0;
        const aporteItemCompraActual = (cantidadCompraActual * precioUnitarioUSDCompraActual) / subtotalBrutoCompraActual;
        const costoAjustePorItemUSD = (aporteItemCompraActual * gastosTotalesCompraActual) / (cantidadCompraActual || 1);
        const costoFinalUSDCompraActual = precioUnitarioUSDCompraActual + costoAjustePorItemUSD;
        const costoFinalMXNCompraActual = costoFinalUSDCompraActual * (tipoCambioImportacionNum > 0 ? tipoCambioImportacionNum : (tipoCambioDiaNum > 0 ? tipoCambioDiaNum : 1));

        let prod = catalogo.find(x => x.nombre === p.nombreProducto);
        let productoIdParaMovimiento = null;

        if (prod) {
            const stockActual = prod.stock || 0;
            const costoActualUSD = prod.costo_final_usd || 0;
            const costoActualMXN = prod.costo_final_mxn || 0;
            const nuevoStockTotal = stockActual + cantidadCompraActual;
            let nuevoCostoPromedioUSD = costoActualUSD, nuevoCostoPromedioMXN = costoActualMXN;
            if (nuevoStockTotal > 0) {
                nuevoCostoPromedioUSD = ((stockActual * costoActualUSD) + (cantidadCompraActual * costoFinalUSDCompraActual)) / nuevoStockTotal;
                nuevoCostoPromedioMXN = ((stockActual * costoActualMXN) + (cantidadCompraActual * costoFinalMXNCompraActual)) / nuevoStockTotal;
            }
            updatePromises.push(
                supabase.from('productos').update({
                    stock: nuevoStockTotal,
                    costo_final_usd: parseFloat(nuevoCostoPromedioUSD.toFixed(4)),
                    costo_final_mxn: parseFloat(nuevoCostoPromedioMXN.toFixed(2))
                }).eq('id', prod.id)
            );
            productoIdParaMovimiento = prod.id;
        } else {
             updatePromises.push(
                supabase.from('productos').insert({
                    nombre: p.nombreProducto, stock: cantidadCompraActual,
                    precio_unitario_usd: precioUnitarioUSDCompraActual,
                    costo_final_usd: parseFloat(costoFinalUSDCompraActual.toFixed(4)),
                    costo_final_mxn: parseFloat(costoFinalMXNCompraActual.toFixed(2))
                }).select('id').single().then(({ data: newProdData, error: errIns }) => {
                    if (errIns) { console.error(`Error creando "${p.nombreProducto}":`, errIns.message); toast.error(`Error creando ${p.nombreProducto}.`); return null; }
                    if (newProdData && newProdData.id) { return newProdData.id; }
                    return null;
                }).then(newProdId => {
                    if (newProdId) {
                        movimientoPromises.push(
                            supabase.from('movimientos_inventario').insert({
                                tipo: 'ENTRADA', producto_id: newProdId, cantidad: cantidadCompraActual,
                                referencia: compra.numero_pedido, motivo: 'compra', fecha: new Date().toISOString()
                            })
                        );
                    }
                })
            );
            productoIdParaMovimiento = 'handled_in_promise'; // Indica que el movimiento se maneja en la promesa de inserción
        }
         if (prod && productoIdParaMovimiento !== 'handled_in_promise') {
             movimientoPromises.push(
                 supabase.from('movimientos_inventario').insert({
                     tipo: 'ENTRADA', producto_id: productoIdParaMovimiento, cantidad: cantidadCompraActual,
                     referencia: compra.numero_pedido, motivo: 'compra', fecha: new Date().toISOString()
                 })
             );
        }
    }
    await Promise.all([...updatePromises, ...movimientoPromises]);
    fetchCompras();
    setInvConfig({ gastosImportacion: '0.00', tipoCambioImportacion: '0.00', otrosGastos: '0.00', targetIdx: null });
    toast.success(`Inventario afectado para pedido ${compra.numero_pedido}`);
  };

  const handleEditingItemChange = (itemOriginalId, fieldName, value) => {
    setEditingPurchaseItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemOriginalId) {
          if (fieldName === 'precioUnitarioUSD') {
            const sanitizedValue = value.replace(/[^\d.]/g, '');
            let finalValue = sanitizedValue;
            const parts = sanitizedValue.split('.');
            if (parts.length > 2) {
              finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
            }
            return { ...item, [fieldName]: finalValue };
          }
          return { ...item, [fieldName]: value }; // Para cantidad u otros campos
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
        if (parts.length > 2) {
            finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
        }
        setItemParaAgregarAExistente(prev => ({ ...prev, [name]: finalValue }));
    } else if (name === 'nombreProducto') {
        setItemParaAgregarAExistente(prev => ({ ...prev, [name]: value, mostrarSugerencias: true }));
        if (value.trim() === '') {
            setItemParaAgregarAExistente(prev => ({...prev, nombreProducto: value, sugerencias: [], mostrarSugerencias: false}));
        } else {
            const filtradas = nombresSugeridos.filter(n => n.toLowerCase().includes(value.toLowerCase()));
            setItemParaAgregarAExistente(prev => ({...prev, nombreProducto: value, sugerencias: filtradas.slice(0,10), mostrarSugerencias: filtradas.length > 0}));
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
  
  const seleccionarSugerenciaParaExistente = (nombre) => {
    setItemParaAgregarAExistente(prev => ({ ...prev, nombreProducto: nombre, sugerencias: [], mostrarSugerencias: false }));
  };

  const agregarProductoACompraExistenteLocal = () => {
    const precioNum = parseFloat(itemParaAgregarAExistente.precioUnitarioUSD);
    if (!itemParaAgregarAExistente.nombreProducto || !itemParaAgregarAExistente.cantidad || isNaN(precioNum) || precioNum < 0) {
      toast.error('Completa los campos del producto. Precio no puede ser negativo.');
      return;
    }
    const cantidadNum = parseInt(itemParaAgregarAExistente.cantidad, 10);
    if (cantidadNum <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }
    const nuevoItem = {
      id: `new_${Date.now()}`, 
      nombreProducto: itemParaAgregarAExistente.nombreProducto.trim(),
      cantidad: cantidadNum,
      precioUnitarioUSD: precioNum.toFixed(2), 
      compra_id: (expandedIdx !== null && savedCompras[expandedIdx]) ? savedCompras[expandedIdx].compra.id : null,
      isNew: true 
    };
    if (!nuevoItem.compra_id) {
        toast.error("No se pudo asociar el ítem a una compra. Intenta de nuevo.");
        return;
    }
    setEditingPurchaseItems(prev => [...prev, nuevoItem]);
    setItemParaAgregarAExistente({...initialNewItemState});
  };

  const eliminarItemDeCompraEditandose = (itemId) => {
    setEditingPurchaseItems(prev => prev.filter(item => item.id !== itemId));
  };

  const guardarCambiosEnCompraExistente = async () => {
    if (expandedIdx === null || !savedCompras[expandedIdx]) {
        toast.error("No hay una compra seleccionada para guardar cambios.");
        return;
    }
    const compraId = savedCompras[expandedIdx].compra.id;
    const itemsOriginales = savedCompras[expandedIdx].items;

    const promises = [];
    const itemsActualizadosEnUi = [];

    for (const editedItem of editingPurchaseItems) {
      const cantidad = parseInt(editedItem.cantidad, 10);
      const precio = parseFloat(editedItem.precioUnitarioUSD);

      if (isNaN(cantidad) || cantidad <= 0 || isNaN(precio) || precio < 0 || !editedItem.nombreProducto) {
        toast.error(`Datos inválidos para: ${editedItem.nombreProducto || 'Ítem sin nombre'}. Verifica cantidad y precio.`);
        return; 
      }
      
      const payload = {
        compra_id: compraId,
        nombre_producto: editedItem.nombreProducto,
        cantidad: cantidad,
        precio_unitario_usd: precio
      };

      if (editedItem.isNew) { 
        promises.push(supabase.from('compra_items').insert(payload).select().single());
      } else { 
        const originalItem = itemsOriginales.find(item => item.id === editedItem.id);
        if (originalItem && (originalItem.cantidad !== cantidad || originalItem.precioUnitarioUSD !== precio)) {
          promises.push(supabase.from('compra_items').update(payload).eq('id', editedItem.id).select().single());
        } else {
          // Si no hay cambios, simplemente lo mantenemos para la UI local
          itemsActualizadosEnUi.push({ ...editedItem, precioUnitarioUSD: precio.toFixed(2) });
        }
      }
    }

    const idsDeItemsEditados = editingPurchaseItems.map(ei => ei.id);
    for (const originalItem of itemsOriginales) {
      if (!idsDeItemsEditados.includes(originalItem.id)) {
        promises.push(supabase.from('compra_items').delete().eq('id', originalItem.id));
      }
    }

    try {
      const results = await Promise.all(promises);
      let huboErrores = false;
      results.forEach(res => {
        if (res && res.error) {
          console.error('Error en operación de item:', res.error);
          huboErrores = true;
        }
      });

      if (huboErrores) {
        toast.error('Algunos cambios no se pudieron guardar. Revisa la consola.');
      } else {
        toast.success('Cambios en la compra guardados exitosamente.');
      }
      
      // Forzar refresco completo para asegurar consistencia
      // y que `editingPurchaseItems` se repueble correctamente
      const currentExpanded = expandedIdx; // Guardar el índice expandido
      setExpandedIdx(null); // Colapsar para forzar el remonte del useEffect
      await fetchCompras(); 
      // Volver a expandir si es necesario, el useEffect de expandedIdx repoblará editingPurchaseItems
      // Esta parte puede necesitar ajuste si el re-fetch no es síncrono con el setExpandedIdx
      // Una forma más simple es solo fetchCompras y dejar que el usuario re-expanda o que el useEffect lo maneje.
      // Por ahora, solo fetch, el usuario puede tener que re-expandir para ver los cambios si la UI no se actualiza perfecto.
      // O mejor, después de fetchCompras, si currentExpanded no es null, forzar el setExpandedIdx de nuevo.
      if (currentExpanded !== null) {
          // Para asegurar que el useEffect de expandedIdx se dispare con los nuevos datos de savedCompras:
          // Es un poco un hack, pero forzar un cambio en expandedIdx puede funcionar.
          // O mejor, confiar en que el useEffect [expandedIdx, savedCompras] ya maneja esto.
      }


    } catch (error) {
      console.error('Error procesando cambios en la compra:', error);
      toast.error(`Error al procesar cambios: ${error.message}`);
    }
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
                setProductosAgregados([]);
            }
          }}
          className={`mb-6 px-6 py-2 rounded-lg shadow-md transition duration-200 ${mostrarFormulario ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
        >
          {mostrarFormulario ? 'Cancelar Registro' : 'Registrar Nueva Compra'}
        </button>

        {mostrarFormulario && (
          <div className="mb-8 p-6 border border-gray-200 rounded-lg shadow-xl bg-white">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Nueva Compra</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Pedido</label>
                <input type="text" name="numeroPedido" placeholder="Ej: 12345" value={formulario.numeroPedido} onChange={(e) => handleInputChange(e, setFormulario)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input type="text" name="proveedor" placeholder="Ej: Proveedor A" value={formulario.proveedor} onChange={(e) => handleInputChange(e, setFormulario)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                <input type="date" name="fechaCompra" value={formulario.fechaCompra} onChange={(e) => handleInputChange(e, setFormulario)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Total (USD)</label>
                <input type="text" inputMode="decimal" name="descuentoTotalUSD" value={formulario.descuentoTotalUSD} 
                       onChange={(e) => handleInputChange(e, setFormulario, true)} 
                       onBlur={(e) => handleMonetaryFieldBlur(e, setFormulario, 'descuentoTotalUSD')}
                       className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gastos Envío USA (USD)</label>
                <input type="text" inputMode="decimal" name="gastosEnvioUSA" value={formulario.gastosEnvioUSA} 
                       onChange={(e) => handleInputChange(e, setFormulario, true)}
                       onBlur={(e) => handleMonetaryFieldBlur(e, setFormulario, 'gastosEnvioUSA')}
                       className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio del Día</label>
                <input type="text" inputMode="decimal" name="tipoCambioDia" value={formulario.tipoCambioDia} 
                       onChange={(e) => handleInputChange(e, setFormulario, true)}
                       onBlur={(e) => handleMonetaryFieldBlur(e, setFormulario, 'tipoCambioDia')}
                       className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
              </div>
            </div>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Producto a la Compra</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 relative" ref={productoInputRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <input type="text" name="nombreProducto" placeholder="Escribe para buscar..." value={formulario.nombreProducto} 
                         onChange={(e) => handleInputChange(e, setFormulario)}
                         onKeyDown={handleProductoInputKeyDown} onFocus={() => setMostrarSugerenciasProducto(true)}
                         className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                  {mostrarSugerenciasProducto && sugerenciasProducto.length > 0 && ( <ul ref={sugerenciasRef} className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"> {sugerenciasProducto.map((nombre, index) => ( <li key={index}> <button type="button" onClick={() => handleSeleccionarSugerencia(nombre)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">{nombre}</button> </li> ))} </ul> )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" name="cantidad" placeholder="Cant." value={formulario.cantidad} onChange={(e) => handleInputChange(e, setFormulario)} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio USD</label>
                  <input type="text" inputMode="decimal" name="precioUnitarioUSD" value={formulario.precioUnitarioUSD} 
                         onChange={(e) => handleInputChange(e, setFormulario, true)}
                         onBlur={(e) => handleMonetaryFieldBlur(e, setFormulario, 'precioUnitarioUSD')}
                         className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
                </div>
              </div>
              <button onClick={agregarProducto} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700">Agregar Producto</button>
            </div>

            {productosAgregados.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Agregados (Nueva Compra)</h3>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Precio USD</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Subtotal</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productosAgregados.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nombreProducto}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{p.cantidad}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">${(p.precioUnitarioUSD || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${((p.cantidad || 0) * (p.precioUnitarioUSD || 0)).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            <button onClick={() => eliminarProductoForm(i)} className="text-red-600 hover:text-red-800">Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-bold text-gray-800 mt-4 space-y-1">
                  <p>Subtotal: ${calcularSubtotal(productosAgregados).toFixed(2)}</p>
                  <p>Descuento: ${parseFloat(formulario.descuentoTotalUSD || '0').toFixed(2)}</p>
                  <p className="text-xl">Total: ${calcularTotal(productosAgregados, formulario.descuentoTotalUSD).toFixed(2)}</p>
                </div>
                <button onClick={guardarCompra} className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Guardar Compra</button>
              </div>
            )}
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Compras</h2>
        <div className="space-y-6">
          {savedCompras.map((compraData, index) => (
            <div key={compraData.compra.id} className="border border-gray-200 rounded-lg shadow-md bg-white">
              <div className={`flex justify-between items-center p-4 cursor-pointer ${compraData.compra.inventario_afectado ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                   onClick={() => setExpandedIdx(expandedIdx === index ? null : index)}>
                <div>
                  <div className="font-semibold text-gray-800">Pedido: {compraData.compra.numero_pedido}</div>
                  <div className="text-sm text-gray-600">Proveedor: {compraData.compra.proveedor}</div>
                  <div className="text-sm text-gray-600">Fecha: {new Date(compraData.compra.fecha_compra).toLocaleDateString()}</div>
                </div>
                <div className={`text-sm font-semibold ${compraData.compra.inventario_afectado ? 'text-green-700' : 'text-yellow-700'}`}>
                  {compraData.compra.inventario_afectado ? 'Inventario Afectado' : 'Pendiente Afectar'}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarCompra(compraData.compra.id, compraData.compra.inventario_afectado); }}
                  className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                   disabled={compraData.compra.inventario_afectado}
                >Eliminar</button>
              </div>

              {expandedIdx === index && (
                <div className="p-4 border-t">
                  <h3 className="text-lg font-medium mb-3">Ítems de la Compra (Pedido: {compraData.compra.numero_pedido})</h3>
                  <div className="space-y-3 mb-4">
                    {editingPurchaseItems.map((item) => (
                      <div key={item.id} className={`grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-2 rounded-md ${item.isNew ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <div className="md:col-span-2 font-medium text-sm text-gray-800">{item.nombreProducto}</div>
                        <div>
                          <label htmlFor={`qty-${item.id}`} className="block text-xs text-gray-500 mb-1">Cantidad</label>
                          <input 
                            id={`qty-${item.id}`}
                            type="number" 
                            value={item.cantidad}
                            disabled={compraData.compra.inventario_afectado}
                            onChange={(e) => handleEditingItemChange(item.id, 'cantidad', e.target.value)}
                            className="w-full border border-gray-300 p-1.5 rounded text-sm text-right" />
                        </div>
                        <div>
                          <label htmlFor={`price-${item.id}`} className="block text-xs text-gray-500 mb-1">Precio USD</label>
                          <input 
                            id={`price-${item.id}`}
                            type="text" 
                            inputMode="decimal"
                            value={item.precioUnitarioUSD}
                            disabled={compraData.compra.inventario_afectado}
                            onChange={(e) => handleEditingItemChange(item.id, 'precioUnitarioUSD', e.target.value)}
                            onBlur={() => handleEditingItemBlur(item.id, 'precioUnitarioUSD')}
                            className="w-full border border-gray-300 p-1.5 rounded text-sm text-right" />
                        </div>
                        {!compraData.compra.inventario_afectado && (
                           <button onClick={() => eliminarItemDeCompraEditandose(item.id)} 
                                   className="text-red-500 hover:text-red-700 text-xs p-1 self-end mb-1">
                             Eliminar Ítem
                           </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {!compraData.compra.inventario_afectado && (
                    <>
                    <div className="mt-4 p-3 border-t border-dashed border-gray-300">
                      <h4 className="text-md font-semibold text-gray-700 mb-2">Añadir Nuevo Producto a esta Compra</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-2 relative" ref={existenteProductoInputRef}>
                           <label className="block text-xs text-gray-500 mb-1">Producto</label>
                           <input type="text" name="nombreProducto" placeholder="Buscar producto..."
                                  value={itemParaAgregarAExistente.nombreProducto}
                                  onChange={handleItemParaAgregarChange}
                                  onFocus={() => setItemParaAgregarAExistente(prev => ({ ...prev, mostrarSugerencias: true}))}
                                  onKeyDown={(e) => e.key === 'Escape' && setItemParaAgregarAExistente(prev => ({ ...prev, mostrarSugerencias: false}))}
                                  className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm" />
                            {itemParaAgregarAExistente.mostrarSugerencias && itemParaAgregarAExistente.sugerencias.length > 0 && (
                                <ul ref={existenteSugerenciasRef} className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-32 overflow-y-auto">
                                    {itemParaAgregarAExistente.sugerencias.map((sug, i) => (
                                        <li key={i}><button type="button" onClick={() => seleccionarSugerenciaParaExistente(sug)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100">{sug}</button></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                           <input type="number" name="cantidad" placeholder="Cant." value={itemParaAgregarAExistente.cantidad} onChange={handleItemParaAgregarChange} className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm text-right" />
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Precio USD</label>
                           <input type="text" inputMode="decimal" name="precioUnitarioUSD" value={itemParaAgregarAExistente.precioUnitarioUSD} 
                                  onChange={handleItemParaAgregarChange} 
                                  onBlur={handleItemParaAgregarBlur}
                                  className="w-full border border-gray-300 px-2 py-1.5 rounded-md text-sm text-right" />
                        </div>
                        <button onClick={agregarProductoACompraExistenteLocal} className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 h-fit">Añadir</button>
                      </div>
                    </div>
                    <button onClick={guardarCambiosEnCompraExistente} className="mt-4 px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700">
                        Guardar Cambios en esta Compra
                    </button>
                    </>
                  )}

                  <div className="mt-6 mb-4 text-sm text-gray-700">
                    <div><span className="font-semibold">Descuento Total (USD):</span> ${parseFloat(compraData.compra.descuento_total_usd || '0').toFixed(2)}</div>
                    <div><span className="font-semibold">Gastos Envío USA (USD):</span> ${parseFloat(compraData.compra.gastos_envio_usa || '0').toFixed(2)}</div>
                    <div><span className="font-semibold">Tipo de Cambio Venta:</span> {parseFloat(compraData.compra.tipo_cambio_dia || '0').toFixed(2) || 'N/A'}</div>
                    {compraData.compra.inventario_afectado && (
                      <>
                        <div><span className="font-semibold">Gastos Importación Registrados:</span> ${parseFloat(compraData.compra.gastos_importacion || '0').toFixed(2)}</div>
                        <div><span className="font-semibold">Tipo de Cambio Importación Registrado:</span> {parseFloat(compraData.compra.tipo_cambio_importacion || '0').toFixed(2) || 'N/A'}</div>
                        <div><span className="font-semibold">Otros Gastos Registrados:</span> ${parseFloat(compraData.compra.otros_gastos || '0').toFixed(2)}</div>
                      </>
                    )}
                  </div>
                  {!compraData.compra.inventario_afectado && (
                      <div className="p-3 border rounded bg-yellow-50">
                        <h3 className="text-lg font-medium mb-3">Afectar Inventario con esta Compra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Gastos Importación (USD)</label>
                            <input type="text" inputMode="decimal" name="gastosImportacion" 
                                   value={invConfig.targetIdx === index ? invConfig.gastosImportacion : '0.00'} 
                                   onChange={(e) => { // Corregido para que setInvConfig reciba el objeto a fusionar
                                      const { name, value } = e.target;
                                      const sanitizedValue = value.replace(/[^\d.]/g, '');
                                      let finalValue = sanitizedValue;
                                      const parts = sanitizedValue.split('.');
                                      if (parts.length > 2) {
                                        finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
                                      }
                                      setInvConfig(prev => ({...prev, [name]: finalValue, targetIdx: index}));
                                   }}
                                   onBlur={(e) => handleMonetaryFieldBlur(e, setInvConfig, 'gastosImportacion')}
                                   className="w-full border border-gray-300 p-2 rounded text-right" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Cambio Importación</label>
                            <input type="text" inputMode="decimal" name="tipoCambioImportacion" 
                                   value={invConfig.targetIdx === index ? invConfig.tipoCambioImportacion : '0.00'} 
                                   onChange={(e) => {
                                      const { name, value } = e.target;
                                      const sanitizedValue = value.replace(/[^\d.]/g, '');
                                      let finalValue = sanitizedValue;
                                      const parts = sanitizedValue.split('.');
                                      if (parts.length > 2) {
                                        finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
                                      }
                                      setInvConfig(prev => ({...prev, [name]: finalValue, targetIdx: index}));
                                   }}
                                   onBlur={(e) => handleMonetaryFieldBlur(e, setInvConfig, 'tipoCambioImportacion')}
                                   className="w-full border border-gray-300 p-2 rounded text-right" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Otros Gastos (USD)</label>
                            <input type="text" inputMode="decimal" name="otrosGastos" 
                                   value={invConfig.targetIdx === index ? invConfig.otrosGastos : '0.00'} 
                                   onChange={(e) => {
                                      const { name, value } = e.target;
                                      const sanitizedValue = value.replace(/[^\d.]/g, '');
                                      let finalValue = sanitizedValue;
                                      const parts = sanitizedValue.split('.');
                                      if (parts.length > 2) {
                                        finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
                                      }
                                      setInvConfig(prev => ({...prev, [name]: finalValue, targetIdx: index}));
                                   }}
                                   onBlur={(e) => handleMonetaryFieldBlur(e, setInvConfig, 'otrosGastos')}
                                   className="w-full border border-gray-300 p-2 rounded text-right" />
                          </div>
                        </div>
                        <button
                          onClick={confirmarAfectInventory}
                          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                           disabled={
                            invConfig.targetIdx !== index ||
                            invConfig.gastosImportacion === '' || parseFloat(invConfig.gastosImportacion) < 0 || isNaN(parseFloat(invConfig.gastosImportacion)) ||
                            invConfig.tipoCambioImportacion === '' || parseFloat(invConfig.tipoCambioImportacion) < 0 || isNaN(parseFloat(invConfig.tipoCambioImportacion)) ||
                            invConfig.otrosGastos === '' || parseFloat(invConfig.otrosGastos) < 0 || isNaN(parseFloat(invConfig.otrosGastos))
                           }
                        >
                          Confirmar y Afectar Inventario
                        </button>
                      </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
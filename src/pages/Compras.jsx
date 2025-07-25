// src/pages/Compras.jsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Package, AlertTriangle, DollarSign, Search, Hash } from 'lucide-react';

// Importar componentes divididos
import ComprasFormularioNueva from '../components/compras/ComprasFormularioNueva';
import ComprasHistorialLista from '../components/compras/ComprasHistorialLista';

// Helper simple para formatear moneda (podría estar en un archivo utils/)
const formatCurrency = (amount, currency = 'USD') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return currency === 'USD' ? '$0.00' : '0.00';
    }
    return numericAmount.toLocaleString('en-US', {
       style: 'currency',
       currency: currency,
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

// Helper para formatear fecha y hora para visualización en zona horaria específica
const formatDisplayDateTime = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString); 
        return date.toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (e) {
        console.error("Error formateando fecha de compra:", e, dateString);
        try { 
            const dateParts = dateString.split('-');
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) - 1;
                const day = parseInt(dateParts[2], 10);
                const localDate = new Date(year, month, day);
                 return localDate.toLocaleDateString('es-MX', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
            }
            throw new Error("Formato de fecha no reconocido para fallback simple.");
        } catch (e2) {
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
    producto_id: null, // Asegurarse de tener producto_id para nuevos ítems
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
    tipoCambioImportacion: '0.00', // Tipo de cambio para los gastos de importación
    otrosGastos: '0.00',
    targetIdx: null
  });
  
  const [nombresSugeridos, setNombresSugeridos] = useState([]); // Lista de objetos {id, nombre}
  const [sugerenciasProductoForm, setSugerenciasProductoForm] = useState([]); // Array de objetos {id, nombre} filtrados
  const [mostrarSugerenciasProductoForm, setMostrarSugerenciasProductoForm] = useState(false); // Control de visibilidad
  
  const productoInputRefNuevaCompra = useRef(null);
  const sugerenciasRefNuevaCompra = useRef(null);
  const existenteProductoInputRef = useRef(null);
  const existenteSugerenciasRef = useRef(null);

  const [loading, setLoading] = useState(true); 

  // Nuevo useEffect para cargar los nombres de los productos para las sugerencias
  useEffect(() => {
    const fetchProductNames = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, nombre'); // Obtener solo ID y nombre

      if (error) {
        console.error('Error al cargar nombres de productos para sugerencias:', error.message);
        toast.error('Error al cargar nombres de productos para sugerencias.');
      } else {
        setNombresSugeridos(data || []);
      }
    };

    fetchProductNames();
  }, []); // Se ejecuta una sola vez al montar el componente

  const fetchComprasMemoized = useCallback(async () => {
    setLoading(true); 
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select('*') 
      .order('created_at', { ascending: false });
    if (errCab) {
      toast.error('Error al cargar compras.'); return;
    }
    const { data: itemsData = [], error: errItems } = await supabase.from('compra_items').select('id, compra_id, nombre_producto, cantidad, precio_unitario_usd, producto_id'); 
    if (errItems) {
      toast.error('Error al cargar ítems de compra.'); return;
    }
    const combined = cabeceras.map(c => ({
      compra: c, 
      items: itemsData.filter(i => i.compra_id === c.id).map(i => ({
          id: i.id, nombreProducto: i.nombre_producto,
          cantidad: parseFloat(i.cantidad) || 0,
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0,
          producto_id: i.producto_id
      }))
    }));
    setSavedCompras(combined);
    setLoading(false); 
  }, []); 

  const revertirAfectarInventario = useCallback(async (compraId) => {
    if (!window.confirm('¿Estás seguro de revertir la afectación del inventario para esta compra? Se restará el stock añadido y la compra se marcará como no afectada.')) {
        return;
    }

    toast.loading('Revirtiendo afectación de inventario...', { id: 'revertirInv' });

    try {
        const { data: compraItems, error: itemsError } = await supabase
            .from('compra_items')
            .select('producto_id, cantidad, nombre_producto') 
            .eq('compra_id', compraId);

        if (itemsError) throw itemsError;
        if (!compraItems || compraItems.length === 0) {
            toast('No se encontraron ítems para esta compra.', { id: 'revertirInv' }); 
            return;
        }

        for (const item of compraItems) {
            if (!item.producto_id) {
                console.warn(`Ítem ${item.nombre_producto} no tiene producto_id, no se puede revertir stock.`);
                toast(`Advertencia: Ítem "${item.nombre_producto}" no tiene ID de producto, no se revirtió stock.`, { id: 'revertirInv' }); 
                continue; 
            }

            const { data: productoActual, error: prodError } = await supabase
                .from('productos')
                .select('stock')
                .eq('id', item.producto_id) 
                .single();

            if (prodError) {
                console.error(`Error al obtener stock de ${item.nombre_producto} (ID: ${item.producto_id}):`, prodError.message);
                toast.error(`Error: No se pudo revertir stock de ${item.nombre_producto}.`, { id: 'revertirInv' });
                continue; 
            }

            const nuevoStock = (parseFloat(productoActual.stock) || 0) - (parseFloat(item.cantidad) || 0);
            if (nuevoStock < 0) { 
                console.warn(`Intento de stock negativo al revertir para ${item.nombre_producto}. Ajustando a 0.`);
                toast(`Stock de ${item.nombre_producto} sería negativo. Ajustado a 0.`, { id: 'revertirInv' }); 
            }

            const { error: updateStockError } = await supabase
                .from('productos')
                .update({ stock: Math.max(0, nuevoStock) }) 
                .eq('id', item.producto_id); 

            if (updateStockError) {
                console.error(`Error al actualizar stock de ${item.nombre_producto}:`, updateStockError.message);
                toast.error(`Error: No se pudo revertir stock de ${item.nombre_producto}.`, { id: 'revertirInv' });
            } else {
                const { error: movError } = await supabase.from('movimientos_inventario').insert({
                    producto_id: item.producto_id,
                    tipo: 'SALIDA', 
                    cantidad: item.cantidad,
                    referencia: `REVERTIR-${compraId.substring(0, 8)}`,
                    motivo: 'reversion_compra',
                    fecha: new Date().toISOString()
                });
                if (movError) console.error("Error al registrar movimiento de reversión:", movError.message);
            }
        }

        const compraInfo = savedCompras.find(c => c.compra.id === compraId);
        if (compraInfo?.compra?.numero_pedido) {
            const { error: deleteMovError } = await supabase
                .from('movimientos_inventario')
                .delete()
                .eq('referencia', compraInfo.compra.numero_pedido)
                .eq('motivo', 'compra')
                .eq('tipo', 'ENTRADA'); 

            if (deleteMovError) {
                console.error("Error al eliminar movimientos de inventario de la compra:", deleteMovError.message);
                toast.error("Error al eliminar movimientos de inventario asociados. Revisar.", { id: 'revertirInv' });
            }
        }

        const { error: updateCompraError } = await supabase
            .from('compras')
            .update({ inventario_afectado: false, gastos_importacion: 0, tipo_cambio_importacion: 0, otros_gastos: 0 }) 
            .eq('id', compraId);

        if (updateCompraError) throw updateCompraError;

        toast.success('Inventario revertido con éxito. Compra modificable.', { id: 'revertirInv' });
        fetchComprasMemoized(); 
        setExpandedIdx(null); 
    }
    catch (err) {
        toast.error(`Error al revertir inventario: ${err.message}`, { id: 'revertirInv' });
        console.error("Error general en revertirAfectarInventario:", err);
    }
  }, [savedCompras, fetchComprasMemoized]); 

  useEffect(() => {
    fetchComprasMemoized();
  }, [fetchComprasMemoized]);


  const handleToggleExpand = (index) => {
    const newExpandedIdx = expandedIdx === index ? null : index;
    setExpandedIdx(newExpandedIdx);
    if (newExpandedIdx !== null && savedCompras[newExpandedIdx]) {
        const compraActual = savedCompras[newExpandedIdx];
        console.log(`Expandiendo compra: ${compraActual.compra.numero_pedido}`);
        console.log(`Inventario afectado: ${compraActual.compra.inventario_afectado}`);
        console.log(`Número de ítems en compraActual.items: ${compraActual.items.length}`);
        console.log('Ítems:', compraActual.items); 

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
  
  // CORRECCIÓN CLAVE: Ajustar la lógica de visibilidad de sugerencias
  const handleProductoFormInputChange = useCallback((e, isMonetary = false) => {
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
        const trimmedValue = value.trim();
        console.log("DEBUG: handleProductoFormInputChange - Typed value:", trimmedValue); 
        
        if (trimmedValue === '') {
            console.log("DEBUG: handleProductoFormInputChange - Value is empty, hiding suggestions.");
            setSugerenciasProductoForm([]);
            setMostrarSugerenciasProductoForm(false);
            setProductoForm(prev => ({...prev, producto_id: null, precioUnitarioUSD: '0.00'})); // Reset price
        } else {
            console.log("DEBUG: handleProductoFormInputChange - Nombres sugeridos (master list):", nombresSugeridos); 
            const filtradas = nombresSugeridos.filter(p => p.nombre.toLowerCase().includes(trimmedValue.toLowerCase()));
            console.log("DEBUG: handleProductoFormInputChange - Filtered suggestions:", filtradas); 
            
            setSugerenciasProductoForm(filtradas.slice(0, 10)); 
            setMostrarSugerenciasProductoForm(true); 
            
            // Eliminar la lógica de autocompletado de precio aquí ya que no se usará last_cost_usd
            if (filtradas.length === 1 && filtradas[0].nombre.toLowerCase() === trimmedValue.toLowerCase()) {
                console.log("DEBUG: handleProductoFormInputChange - Exact match found, auto-selecting:", filtradas[0].nombre);
                setProductoForm(prev => ({ 
                    ...prev, 
                    producto_id: filtradas[0].id, 
                    // precioUnitarioUSD ya no se autocompleta aquí
                }));
            } else {
                setProductoForm(prev => ({...prev, producto_id: null, precioUnitarioUSD: '0.00'})); // Reset price if no exact match
            }
        }
    }
  }, [nombresSugeridos]); 

  const handleProductoFormMonetaryBlur = (e, fieldName) => {
    const rawValue = e.target.value;
    let numValue = parseFloat(rawValue);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    setProductoForm(prev => ({ ...prev, [fieldName]: numValue.toFixed(2) }));
  };

  const handleSeleccionarSugerenciaNuevaCompra = useCallback((sugerencia) => {
    console.log("DEBUG: handleSeleccionarSugerenciaNuevaCompra - Selected suggestion:", sugerencia);
    setProductoForm(prev => ({ 
        ...prev, 
        nombreProducto: sugerencia.nombre, 
        producto_id: sugerencia.id,
        // Eliminar el autocompletado de precio aquí ya que no se usará last_cost_usd
        // precioUnitarioUSD: (sugerencia.last_cost_usd || 0).toFixed(2) 
    }));
    setSugerenciasProductoForm([]);
    setMostrarSugerenciasProductoForm(false);
  }, []);
  
  // CORRECCIÓN CLAVE: Ajustar la lógica de visibilidad de sugerencias en focus
  const handleProductoInputFocusNuevaCompra = useCallback(() => {
      if (productoForm.nombreProducto.trim() !== '') {
          const filtradas = nombresSugeridos.filter(p => p.nombre.toLowerCase().includes(productoForm.nombreProducto.trim().toLowerCase()));
          if (filtradas.length > 0) {
              console.log("DEBUG: handleProductoInputFocusNuevaCompra - Showing suggestions on focus.");
              setSugerenciasProductoForm(filtradas.slice(0, 10));
              setMostrarSugerenciasProductoForm(true);
          } else {
              console.log("DEBUG: handleProductoInputFocusNuevaCompra - No filtered suggestions on focus, hiding.");
              setMostrarSugerenciasProductoForm(false);
          }
      } else {
          console.log("DEBUG: handleProductoInputFocusNuevaCompra - Input empty on focus, hiding suggestions.");
          setSugerenciasProductoForm([]); 
          setMostrarSugerenciasProductoForm(false);
      }
  }, [productoForm.nombreProducto, nombresSugeridos]);


  const handleProductoInputKeyDownNuevaCompra = useCallback((e) => {
    if (e.key === 'Escape') {
      console.log("DEBUG: handleProductoInputKeyDownNuevaCompra - Escape pressed, hiding suggestions.");
      setMostrarSugerenciasProductoForm(false);
    } else if (e.key === 'Enter') {
      e.preventDefault(); 
      if (sugerenciasProductoForm.length > 0) {
        console.log("DEBUG: handleProductoInputKeyDownNuevaCompra - Enter pressed, selecting first suggestion.");
        handleSeleccionarSugerenciaNuevaCompra(sugerenciasProductoForm[0]);
      }
    }
  }, [sugerenciasProductoForm, handleSeleccionarSugerenciaNuevaCompra]); 

  const agregarProductoNuevaCompra = () => {
    const precioNum = parseFloat(productoForm.precioUnitarioUSD);
    if (!productoForm.nombreProducto || !productoForm.cantidad || isNaN(precioNum) || precioNum < 0) {
      toast.error('Completa los campos del producto. Precio no puede ser negativo.'); return;
    }
    const nuevoProducto = {
      id: Date.now(), 
      producto_id: productoForm.producto_id, 
      nombreProducto: productoForm.nombreProducto.trim(),
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

    if (formulario.fechaCompra) {
        const dateParts = formulario.fechaCompra.split('-');
        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const day = parseInt(dateParts[2], 10);
            compraDataToInsert.fecha_compra = new Date(Date.UTC(year, month, day, 0, 0, 0)).toISOString();
        } else {
             compraDataToInsert.fecha_compra = new Date().toISOString();
            console.warn("Formato de fecha de compra inválido, se usó la fecha y hora actual en UTC:", formulario.fechaCompra);
        }
    } else {
         compraDataToInsert.fecha_compra = new Date().toISOString();
    }

    const { data: newCompra, error: errCompra } = await supabase
      .from('compras')
      .insert(compraDataToInsert).select('id').single();

    if (errCompra) { toast.error('Error al guardar la compra: ' + errCompra.message); return; }
    
    // --- Lógica para manejar productos nuevos y existentes ---
    const itemsToInsert = [];
    for (const item of productosAgregados) {
        let currentProductId = item.producto_id;

        // Si el producto no tiene un ID asociado, intentar crearlo en la tabla 'productos'
        if (!currentProductId) {
            const { data: newProduct, error: newProductError } = await supabase
                .from('productos')
                .insert({
                    nombre: item.nombreProducto,
                    stock: 0, // El stock se ajustará al afectar inventario
                    costo_final_usd: parseFloat(item.precioUnitarioUSD || '0'),
                    costo_final_mxn: parseFloat(item.precioUnitarioUSD || '0') * (parseFloat(formulario.tipoCambioDia || '0') || 1),
                    last_cost_usd: parseFloat(item.precioUnitarioUSD || '0') // Establecer el last_cost_usd inicial
                })
                .select('id')
                .single();

            if (newProductError) {
                console.error('Error al crear nuevo producto:', newProductError.message);
                toast.error(`Error al crear producto "${item.nombreProducto}". No se registrará en esta compra.`);
                continue; // Saltar este ítem si no se puede crear el producto
            }
            currentProductId = newProduct.id; // Asignar el ID del nuevo producto
            toast.success(`Producto "${item.nombreProducto}" creado y asociado.`);
        }

        itemsToInsert.push({
            compra_id: newCompra.id,
            nombre_producto: item.nombreProducto,
            cantidad: item.cantidad,
            precio_unitario_usd: item.precioUnitarioUSD,
            producto_id: currentProductId // Usar el ID (existente o recién creado)
        });
    }

    if (itemsToInsert.length === 0 && productosAgregados.length > 0) {
        toast.error('No se pudieron agregar productos a la compra. Revisa los errores.');
        return;
    }

    const { error: errItems } = await supabase.from('compra_items').insert(itemsToInsert);
    if (errItems) { toast.error('Error al guardar ítems. Cabecera pudo ser creada.'); return; }
    
    setFormulario({...initialFormularioState});
    setProductoForm({...initialProductoFormState});
    setProductosAgregados([]);
    setMostrarFormulario(false);
    fetchComprasMemoized(); 
    toast.success('Compra guardada!');
  };

  const eliminarCompra = async (compraId, inventarioAfectado) => {
    if (inventarioAfectado) { toast.error('No se puede eliminar, inventario afectado.'); return; }
    if (!window.confirm('¿Eliminar esta compra y sus ítems?')) return;
    await supabase.from('compra_items').delete().eq('compra_id', compraId);
    await supabase.from('compras').delete().eq('id', compraId);
    fetchComprasMemoized(); 
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

    const handleItemParaAgregarChange = useCallback((e) => {
        const { name, value } = e.target;
        if (name === 'precioUnitarioUSD') {
            const sanitizedValue = value.replace(/[^\d.]/g, '');
            let finalValue = sanitizedValue;
            const parts = sanitizedValue.split('.');
            if (parts.length > 2) finalValue = `${parts[0]}.${parts.slice(1).join('')}`;
            setItemParaAgregarAExistente(prev => ({ ...prev, [name]: finalValue }));
        } else if (name === 'nombreProducto' || name === 'seleccionarSugerencia') {
            const nombreActual = name === 'seleccionarSugerencia' ? value.nombre : e.target.value; 
            const selectedProduct = nombresSugeridos.find(p => p.nombre === nombreActual);
            setItemParaAgregarAExistente(prev => ({ 
                ...prev, 
                nombreProducto: nombreActual, 
                producto_id: selectedProduct ? selectedProduct.id : null, 
                mostrarSugerencias: name !== 'seleccionarSugerencia',
                // Eliminado: precioUnitarioUSD: selectedProduct ? (selectedProduct.last_cost_usd || 0).toFixed(2) : '0.00' 
            }));
            
            if (nombreActual.trim() === '' || name === 'seleccionarSugerencia') {
                setItemParaAgregarAExistente(prev => ({...prev, sugerencias: [], mostrarSugerencias: false, producto_id: null, precioUnitarioUSD: '0.00'})); // Reset price
            } else {
                const filtradas = nombresSugeridos.filter(p => p.nombre.toLowerCase().includes(nombreActual.toLowerCase()));
                setItemParaAgregarAExistente(prev => ({...prev, sugerencias: filtradas.slice(0,10), mostrarSugerencias: filtradas.length > 0 && name !== 'seleccionarSugerencia'}));
            }
        } else {
            setItemParaAgregarAExistente(prev => ({ ...prev, [name]: value }));
        }
    }, [nombresSugeridos]); 

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
        producto_id: itemParaAgregarAExistente.producto_id, 
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
            const payload = { 
                compra_id: compraId, 
                nombre_producto: editedItem.nombreProducto, 
                cantidad: cantidad, 
                precio_unitario_usd: precio,
                producto_id: editedItem.producto_id 
            };
            if (String(editedItem.id).startsWith('new_')) { 
                promises.push(supabase.from('compra_items').insert(payload).select().single());
            } else { 
                const original = itemsOriginales.find(i => i.id === editedItem.id);
                if (original && (original.cantidad !== cantidad || 
                                 parseFloat(original.precioUnitarioUSD).toFixed(2) !== precio.toFixed(2) ||
                                 original.nombreProducto !== editedItem.nombreProducto ||
                                 original.producto_id !== editedItem.producto_id)) { 
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
            await fetchComprasMemoized(); 
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
        
        // --- CALCULO DE GASTOS TOTALES A PRORRATEAR EN MXN (basado en la nueva interpretación) ---
        // gasto_envio_usa se toma de compra.gastos_envio_usa
        const gastosEnvioUSADelCompra = parseFloat(compra.gastos_envio_usa || 0);
        // tipo_cambio_dia se toma de compra.tipo_cambio_dia
        const tipoCambioDiaDelCompra = parseFloat(compra.tipo_cambio_dia || 0);

        const gastosEnvioUSAMXN = gastosEnvioUSADelCompra * tipoCambioDiaDelCompra; // Gastos de envío convertidos a MXN
        const gastosImportacionMXN = gastosImportacionNum * tipoCambioImportacionNum; // Gastos de importación convertidos a MXN (con su propio TC)
        const otrosGastosMXN = otrosGastosNum * tipoCambioDiaDelCompra; // Otros gastos convertidos a MXN (usando TC del día)
        
        // El descuento total de la compra (compra.descuento_total_usd) no se prorratea como un gasto, sino que se resta del total de la compra
        const totalGastosAProrratearMXN = gastosEnvioUSAMXN + gastosImportacionMXN + otrosGastosMXN; // Solo gastos a distribuir
        // --- FIN CALCULO DE GASTOS TOTALES A PRORRATEAR EN MXN ---

        const productOperations = []; 
    
        for (const p of itemsToProcess) {
            const cantidadCompra = parseFloat(p.cantidad) || 0;
            const precioUnitarioUSD = parseFloat(p.precioUnitarioUSD) || 0;
            
            // 1. Calcular la proporción del ítem sobre el subtotal bruto en USD
            const proporcionItem = (cantidadCompra * precioUnitarioUSD) / subtotalBrutoUSD;
            
            // 2. Calcular la Parte Prorrateada de Gastos para el Ítem (MXN)
            const parteProrrateadaGastosItemMXN = proporcionItem * totalGastosAProrratearMXN;

            // 3. Calcular el Costo Original del Ítem en MXN (precio de compra * tipo de cambio general de la compra)
            const costoOriginalItemMXN = precioUnitarioUSD * tipoCambioDiaDelCompra;

            // 4. Calcular el Costo Total del Ítem en MXN (suma del costo original convertido y el ajuste prorrateado)
            const costoTotalItemMXN = (costoOriginalItemMXN * cantidadCompra) + parteProrrateadaGastosItemMXN;
            
            // 5. Calcular el Costo Unitario Final en MXN
            const costoUnitarioFinalMXN = costoTotalItemMXN / cantidadCompra; // Dividir por cantidad para obtener el unitario

            // 6. Convertir el costo unitario final MXN de vuelta a USD (usando el tipo de cambio general de la compra)
            const costoUnitarioFinalUSD = costoUnitarioFinalMXN / (tipoCambioDiaDelCompra || 1);


            let prodEnCatalogo = catalogo.find(x => x.id === p.producto_id); // Buscar por ID, que es más fiable
            
            if (prodEnCatalogo) {
                const stockActual = parseFloat(prodEnCatalogo.stock) || 0;
                const costoActualUSD = parseFloat(prodEnCatalogo.costo_final_usd) || 0;
                const costoActualMXN = parseFloat(prodEnCatalogo.costo_final_mxn) || 0;
                const nuevoStockTotal = stockActual + cantidadCompra;
                let nuevoCostoPromedioUSD = costoActualUSD, nuevoCostoPromedioMXN = costoActualMXN;

                if (nuevoStockTotal > 0) {
                    nuevoCostoPromedioUSD = ((stockActual * costoActualUSD) + (cantidadCompra * costoUnitarioFinalUSD)) / nuevoStockTotal;
                    nuevoCostoPromedioMXN = ((stockActual * costoActualMXN) + (cantidadCompra * costoUnitarioFinalMXN)) / nuevoStockTotal;
                } else if (cantidadCompra > 0) { 
                    nuevoCostoPromedioUSD = costoUnitarioFinalUSD;
                    nuevoCostoPromedioMXN = costoUnitarioFinalMXN;
                }
                productOperations.push(
                    supabase.from('productos').update({
                        stock: nuevoStockTotal, 
                        costo_final_usd: parseFloat(nuevoCostoPromedioUSD.toFixed(4)),
                        costo_final_mxn: parseFloat(nuevoCostoPromedioMXN.toFixed(2)),
                        // last_cost_usd ya no se actualiza aquí
                    }).eq('id', prodEnCatalogo.id).then(response => ({...response, producto_id_original: prodEnCatalogo.id, cantidad_comprada: cantidadCompra})) 
                );
            } else { 
                // Esto no debería ocurrir si la lógica de `guardarCompra` funciona correctamente
                // creando el producto si no existe. Pero como fallback, lo manejamos.
                console.error(`Producto con ID ${p.producto_id} y nombre "${p.nombreProducto}" no encontrado en el catálogo para afectar inventario.`);
                toast.error(`Error: Producto "${p.nombreProducto}" no encontrado en el catálogo para afectar inventario.`);
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
            return; 
        }

        fetchComprasMemoized(); 
        setInvConfig({ gastosImportacion: '0.00', tipoCambioImportacion: '0.00', otrosGastos: '0.00', targetIdx: null });
        setExpandedIdx(null); 
        toast.success(`Inventario afectado para pedido ${compra.numero_pedido}`);
    };


  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>
      </div>
      <div className="mt-6 bg-dark-800 shadow-card-dark rounded-lg p-6 md:p-8 border border-dark-700/50">
        <h1 className="text-3xl font-bold text-gray-100 mb-6 text-center">Gestión de Compras</h1>
        <button
          onClick={() => {
            setMostrarFormulario(!mostrarFormulario);
            if (!mostrarFormulario) {
                setFormulario({...initialFormularioState});
                setProductoForm({...initialProductoFormState});
                setProductosAgregados([]);
            }
          }}
          className={`mb-6 px-6 py-2 rounded-lg shadow-elegant-dark transition-colors flex items-center gap-2 ${mostrarFormulario ? 'bg-error-600 hover:bg-error-700' : 'bg-primary-600 hover:bg-primary-700'} text-white`}
        >
          {mostrarFormulario ? (
            <>
              <X size={18} />
              Cancelar Nueva Compra
            </>
          ) : (
            <>
              <Plus size={18} />
              Registrar Nueva Compra
            </>
          )}
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

        <h2 className="text-2xl font-bold text-gray-100 mb-6 mt-8">Historial de Compras</h2>
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
            formatDisplayDate={formatDisplayDateTime}
            onRevertirAfectarInventario={revertirAfectarInventario}
        />
      </div>
    </div>
  );
}

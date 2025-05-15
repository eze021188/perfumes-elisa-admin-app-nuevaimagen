// src/pages/Compras.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react'; // Añadido useRef
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';

export default function Compras() {
  const navigate = useNavigate();

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState({
    numeroPedido: '',
    proveedor: '',
    fechaCompra: '',
    descuentoTotalUSD: '',
    gastosEnvioUSA: '',
    tipoCambioDia: '',
    nombreProducto: '', // Este campo será el de búsqueda con autocompletado
    cantidad: '',
    precioUnitarioUSD: ''
  });
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [savedCompras, setSavedCompras] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [currentEditingItems, setCurrentEditingItems] = useState(null);
  
  const [invConfig, setInvConfig] = useState({
    gastosImportacion: '',
    tipoCambioImportacion: '',
    otrosGastos: '',
    targetIdx: null
  });
  const [nombresSugeridos, setNombresSugeridos] = useState([]); // Lista de todos los nombres de productos

  // >>> Nuevos estados para el autocompletado del campo producto <<<
  const [sugerenciasProducto, setSugerenciasProducto] = useState([]);
  const [mostrarSugerenciasProducto, setMostrarSugerenciasProducto] = useState(false);
  const productoInputRef = useRef(null); // Ref para el input de producto
  const sugerenciasRef = useRef(null); // Ref para el contenedor de sugerencias

  useEffect(() => {
    fetchCompras();
    // Carga inicial de nombres de productos para sugerencias
    (async () => {
      const { data, error } = await supabase.from('productos').select('nombre');
      if (!error && data) {
        setNombresSugeridos(Array.from(new Set(data.map(p => p.nombre))).sort()); // Ordenar alfabéticamente
      } else if (error) {
        console.error('Error al cargar nombres de productos:', error.message);
      }
    })();
  }, []);
  
  // Efecto para cerrar sugerencias si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        productoInputRef.current && !productoInputRef.current.contains(event.target) &&
        sugerenciasRef.current && !sugerenciasRef.current.contains(event.target)
      ) {
        setMostrarSugerenciasProducto(false);
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
    const { data: items = [], error: errItems } = await supabase
      .from('compra_items')
      .select('*');
    if (errItems) {
      console.error('Error al obtener ítems de compra:', errItems.message);
      toast.error('Error al cargar ítems de compra.');
      return;
    }
    const combined = cabeceras.map(c => ({
      compra: c,
      items: items
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
      const selectedCompra = savedCompras[expandedIdx].compra;
      setCurrentEditingItems([...savedCompras[expandedIdx].items]);
      setInvConfig({
        gastosImportacion: selectedCompra.gastos_importacion ?? '',
        tipoCambioImportacion: selectedCompra.tipo_cambio_importacion ?? '',
        otrosGastos: selectedCompra.otros_gastos ?? '',
        targetIdx: expandedIdx
      });
    } else {
      setCurrentEditingItems(null);
      setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null });
    }
  }, [expandedIdx, savedCompras]);

  const eliminarProductoForm = (index) => {
    setProductosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const calcularSubtotal = (items) => {
    return items.reduce((sum, item) => sum + ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnitarioUSD) || 0)), 0);
  };

  const calcularTotal = (items, descuento) => {
    return calcularSubtotal(items) - (parseFloat(descuento) || 0);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));

    if (name === 'nombreProducto') {
      if (value.trim() === '') {
        setSugerenciasProducto([]);
        setMostrarSugerenciasProducto(false);
      } else {
        const filtradas = nombresSugeridos.filter(nombre =>
          nombre.toLowerCase().includes(value.toLowerCase())
        );
        setSugerenciasProducto(filtradas.slice(0, 10)); // Mostrar un máximo de 10 sugerencias
        setMostrarSugerenciasProducto(filtradas.length > 0);
      }
    }
  };

  const handleSeleccionarSugerencia = (nombreSugerido) => {
    setFormulario(prev => ({ ...prev, nombreProducto: nombreSugerido }));
    setSugerenciasProducto([]);
    setMostrarSugerenciasProducto(false);
    // Opcional: mover el foco al siguiente campo, por ejemplo, cantidad
    // document.getElementsByName('cantidad')[0]?.focus(); 
  };
  
  // Manejar Escape en el input de producto para cerrar sugerencias
  const handleProductoInputKeyDown = (e) => {
    if (e.key === 'Escape') {
        setMostrarSugerenciasProducto(false);
    }
    // Aquí se podría añadir navegación por teclado para las sugerencias (ArrowUp, ArrowDown, Enter)
  };

  const agregarProducto = () => {
    if (!formulario.nombreProducto || !formulario.cantidad || !formulario.precioUnitarioUSD) {
      toast.error('Completa los campos del producto');
      return;
    }
    const nuevoProducto = {
      id: Date.now(),
      nombreProducto: formulario.nombreProducto.trim(),
      cantidad: parseInt(formulario.cantidad, 10) || 0,
      precioUnitarioUSD: parseFloat(formulario.precioUnitarioUSD) || 0
    };
    if (nuevoProducto.cantidad <= 0 || nuevoProducto.precioUnitarioUSD < 0) {
         toast.error('La cantidad debe ser mayor a 0 y el precio unitario no puede ser negativo.');
         return;
    }
    setProductosAgregados(prev => [...prev, nuevoProducto]);
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' }));
    setMostrarSugerenciasProducto(false); // Ocultar sugerencias después de agregar
  };

  const guardarCompra = async () => {
    if (!formulario.numeroPedido || !formulario.proveedor || productosAgregados.length === 0) {
      toast.error('Completa la cabecera y agrega al menos un producto.');
      return;
    }
    const descuento = parseFloat(formulario.descuentoTotalUSD || 0);
    const gastosEnvio = parseFloat(formulario.gastosEnvioUSA || 0);
    const tipoCambioDia = parseFloat(formulario.tipoCambioDia || 0);

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
      return;
    }
    setFormulario({
      numeroPedido: '', proveedor: '', fechaCompra: '', descuentoTotalUSD: '', gastosEnvioUSA: '',
      tipoCambioDia: '', nombreProducto: '', cantidad: '', precioUnitarioUSD: ''
    });
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
    const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig;
    if (targetIdx === null || gastosImportacion === '' || tipoCambioImportacion === '' || otrosGastos === '') {
      toast.error('Selecciona una compra y completa los campos de gastos, tipo de cambio y otros gastos.');
      return;
    }
    const { compra } = savedCompras[targetIdx];
    if (compra.inventario_afectado) {
         toast.error('Esta compra ya ha afectado el inventario.');
         return;
    }
    const itemsToProcess = savedCompras[targetIdx].items;
    if (itemsToProcess.length === 0) {
      toast.error('La compra seleccionada no tiene ítems para afectar el inventario.');
      return;
    }
    const gastosImportacionNum = parseFloat(gastosImportacion) || 0;
    const tipoCambioImportacionNum = parseFloat(tipoCambioImportacion) || 0;
    const otrosGastosNum = parseFloat(otrosGastos) || 0;
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

    console.log(`[Afectar Inventario] Actualizando cabecera de compra ${compra.id}...`);
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
    console.log(`[Afectar Inventario] Cabecera ${compra.id} actualizada.`);

    console.log('[Afectar Inventario] Cargando catálogo...');
    const { data: catalogo = [], error: errCat } = await supabase
      .from('productos')
      .select('id, nombre, stock, costo_final_usd, costo_final_mxn');
    if (errCat) {
      console.error('[Afectar Inventario] Error al cargar catálogo:', errCat.message);
      toast.error('Error al cargar catálogo: ' + errCat.message);
      return;
    }
    console.log(`[Afectar Inventario] Catálogo cargado: ${catalogo.length} productos.`);

    const subtotalBrutoCompraActual = itemsToProcess.reduce((sum, p) => sum + ((p.cantidad || 0) * (p.precioUnitarioUSD || 0)), 0) || 1;
    const gastosTotalesCompraActual = descuentoTotalUSDNum * -1 + gastosEnvioUSANum + gastosImportacionNum + otrosGastosNum;
    console.log(`[Afectar Inventario] Subtotal Bruto: ${subtotalBrutoCompraActual.toFixed(2)} USD, Gastos Totales: ${gastosTotalesCompraActual.toFixed(2)} USD`);

    const updatePromises = [];
    const movimientoPromises = [];

    for (const p of itemsToProcess) {
        const cantidadCompraActual = p.cantidad || 0;
        const precioUnitarioUSDCompraActual = p.precioUnitarioUSD || 0;
        const aporteItemCompraActual = (cantidadCompraActual * precioUnitarioUSDCompraActual) / subtotalBrutoCompraActual;
        const costoAjustePorItemUSD = (aporteItemCompraActual * gastosTotalesCompraActual) / (cantidadCompraActual || 1);
        const costoFinalUSDCompraActual = precioUnitarioUSDCompraActual + costoAjustePorItemUSD;
        const costoFinalMXNCompraActual = costoFinalUSDCompraActual * (tipoCambioImportacionNum > 0 ? tipoCambioImportacionNum : (tipoCambioDiaNum > 0 ? tipoCambioDiaNum : 1));

        console.log(`[Afectar Inventario] Item "${p.nombreProducto}": Costo USD (Compra): ${costoFinalUSDCompraActual.toFixed(4)}, Costo MXN (Compra): ${costoFinalMXNCompraActual.toFixed(2)}`);

        let prod = catalogo.find(x => x.nombre === p.nombreProducto);
        let productoIdParaMovimiento = null;

        if (prod) {
            console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" (ID: ${prod.id}) encontrado. Calculando promedio...`);
            const stockActual = prod.stock || 0;
            const costoActualUSD = prod.costo_final_usd || 0;
            const costoActualMXN = prod.costo_final_mxn || 0;
            const nuevoStockTotal = stockActual + cantidadCompraActual;
            let nuevoCostoPromedioUSD = costoActualUSD, nuevoCostoPromedioMXN = costoActualMXN;
            if (nuevoStockTotal > 0) {
                nuevoCostoPromedioUSD = ((stockActual * costoActualUSD) + (cantidadCompraActual * costoFinalUSDCompraActual)) / nuevoStockTotal;
                nuevoCostoPromedioMXN = ((stockActual * costoActualMXN) + (cantidadCompraActual * costoFinalMXNCompraActual)) / nuevoStockTotal;
            }
            console.log(`  Nuevo Stock: ${nuevoStockTotal}, Nuevo Costo USD: ${nuevoCostoPromedioUSD.toFixed(4)}, Nuevo Costo MXN: ${nuevoCostoPromedioMXN.toFixed(2)}`);
            updatePromises.push(
                supabase.from('productos').update({
                    stock: nuevoStockTotal,
                    costo_final_usd: parseFloat(nuevoCostoPromedioUSD.toFixed(4)),
                    costo_final_mxn: parseFloat(nuevoCostoPromedioMXN.toFixed(2))
                }).eq('id', prod.id)
            );
            productoIdParaMovimiento = prod.id;
        } else {
            console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" NO encontrado. Insertando...`);
            updatePromises.push(
                supabase.from('productos').insert({
                    nombre: p.nombreProducto, stock: cantidadCompraActual,
                    precio_unitario_usd: precioUnitarioUSDCompraActual, // Ojo: Este es el precio de compra, no necesariamente el de venta
                    costo_final_usd: parseFloat(costoFinalUSDCompraActual.toFixed(4)),
                    costo_final_mxn: parseFloat(costoFinalMXNCompraActual.toFixed(2))
                }).select('id').single().then(({ data: newProdData, error: errIns }) => {
                    if (errIns) { console.error(`Error creando "${p.nombreProducto}":`, errIns.message); toast.error(`Error creando ${p.nombreProducto}.`); return null; }
                    if (newProdData && newProdData.id) { console.log(`"${p.nombreProducto}" creado (ID: ${newProdData.id}).`); return newProdData.id; }
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
            productoIdParaMovimiento = 'handled_in_promise';
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
    console.log('[Afectar Inventario] Esperando promesas...');
    await Promise.all([...updatePromises, ...movimientoPromises]);
    console.log('[Afectar Inventario] Promesas completadas.');
    fetchCompras();
    setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null });
    setCurrentEditingItems(null);
    toast.success(`Inventario afectado para pedido ${compra.numero_pedido}`);
    console.log('[Afectar Inventario] Proceso finalizado.');
  };
  

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <div className="w-full md:w-[150px]" />
      </div>
      <div className="mt-6 bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Compras</h1>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className={`mb-6 px-6 py-2 rounded-lg shadow-md transition duration-200 ${mostrarFormulario ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {mostrarFormulario ? 'Cancelar Registro' : 'Registrar Nueva Compra'}
        </button>
        {mostrarFormulario && (
          <div className="mb-8 p-6 border border-gray-200 rounded-lg shadow-xl bg-white">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Nueva Compra</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Pedido</label>
                <input type="text" name="numeroPedido" placeholder="Ej: 12345" value={formulario.numeroPedido} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input type="text" name="proveedor" placeholder="Ej: Proveedor A" value={formulario.proveedor} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                <input type="date" name="fechaCompra" value={formulario.fechaCompra} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Total (USD)</label>
                <input type="number" name="descuentoTotalUSD" placeholder="Ej: 10.50" value={formulario.descuentoTotalUSD} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gastos Envío USA (USD)</label>
                <input type="number" name="gastosEnvioUSA" placeholder="Ej: 25.00" value={formulario.gastosEnvioUSA} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio del Día</label>
                <input type="number" name="tipoCambioDia" placeholder="Ej: 20.00" value={formulario.tipoCambioDia} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            
            {/* Sección para agregar ítems a la compra MODIFICADA */}
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Producto a la Compra</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2 relative" ref={productoInputRef}> {/* Añadido ref y relative */}
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <input
                    type="text"
                    name="nombreProducto"
                    placeholder="Escribe para buscar un producto..." // Placeholder actualizado
                    value={formulario.nombreProducto}
                    onChange={handleInputChange}
                    onKeyDown={handleProductoInputKeyDown} // Para cerrar con Escape
                    onFocus={() => setMostrarSugerenciasProducto(true)} // Mostrar al enfocar
                    // No usar 'list' si implementamos sugerencias personalizadas
                    className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {/* Lista de sugerencias desplegable */}
                  {mostrarSugerenciasProducto && sugerenciasProducto.length > 0 && (
                    <ul 
                        ref={sugerenciasRef} // Añadido ref
                        className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"
                    >
                      {sugerenciasProducto.map((nombre, index) => (
                        <li key={index}>
                          <button
                            type="button" // Importante para no enviar el formulario
                            onClick={() => handleSeleccionarSugerencia(nombre)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            {nombre}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" name="cantidad" placeholder="Cant." value={formulario.cantidad} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio USD</label>
                  <input type="number" name="precioUnitarioUSD" placeholder="Precio USD" value={formulario.precioUnitarioUSD} onChange={handleInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right" />
                </div>
              </div>
              <button onClick={agregarProducto} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                Agregar Producto
              </button>
            </div>
            {/* ... resto del formulario de nueva compra ... */}
             {productosAgregados.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos Agregados</h3>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio USD</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productosAgregados.map((p, i) => (
                        <tr key={p.id || i} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{p.nombreProducto}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{p.cantidad}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">${(p.precioUnitarioUSD || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">${((p.cantidad || 0) * (p.precioUnitarioUSD || 0)).toFixed(2)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                            <button onClick={() => eliminarProductoForm(i)} className="text-red-600 hover:text-red-800 transition duration-150 ease-in-out">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-bold text-gray-800 mt-4 space-y-1">
                  <p>Subtotal: ${calcularSubtotal(productosAgregados).toFixed(2)}</p>
                  <p>Descuento: ${(+formulario.descuentoTotalUSD || 0).toFixed(2)}</p>
                  <p className="text-xl">Total: ${calcularTotal(productosAgregados, +formulario.descuentoTotalUSD).toFixed(2)}</p>
                </div>
                <button onClick={guardarCompra} className="mt-6 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                  Guardar Compra
                </button>
              </div>
            )}
          </div>
        )}
        {/* ... resto del componente (Historial de Compras, Afectar Inventario, etc.) ... */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Compras</h2>
        <div className="space-y-6">
          {savedCompras.map((compraData, index) => (
            <div key={compraData.compra.id} className="border border-gray-200 rounded-lg shadow-md overflow-hidden bg-white">
              <div
                className={`flex justify-between items-center p-4 cursor-pointer transition duration-150 ease-in-out ${compraData.compra.inventario_afectado ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setExpandedIdx(expandedIdx === index ? null : index)}
              >
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
                >
                  Eliminar
                </button>
              </div>
              {expandedIdx === index && (
                <div className="p-4 bg-white border-t">
                  <h3 className="text-lg font-medium mb-3">Ítems de la Compra:</h3>
                   <div className="space-y-3 mb-4">
                       {savedCompras[index].items.map((item) => ( // No necesitas itemIndex si no lo usas como key
                           <div key={item.id} className="grid grid-cols-3 gap-4 items-center text-sm text-gray-700">
                               <div className="font-medium">{item.nombreProducto}</div>
                               <div>
                                   <label className="block text-xs text-gray-500">Cantidad</label>
                                   <span className="block w-full border border-gray-300 p-1 rounded text-right text-sm bg-gray-100">
                                       {item.cantidad}
                                   </span>
                               </div>
                               <div>
                                   <label className="block text-xs text-gray-500">Precio Unitario (USD)</label>
                                    <span className="block w-full border border-gray-300 p-1 rounded text-right text-sm bg-gray-100">
                                       ${(item.precioUnitarioUSD || 0).toFixed(2)}
                                    </span>
                               </div>
                           </div>
                       ))}
                   </div>
                  <div className="mb-4 text-sm text-gray-700">
                    <div><span className="font-semibold">Descuento Total (USD):</span> ${compraData.compra.descuento_total_usd?.toFixed(2) || '0.00'}</div>
                    <div><span className="font-semibold">Gastos Envío USA (USD):</span> ${compraData.compra.gastos_envio_usa?.toFixed(2) || '0.00'}</div>
                    <div><span className="font-semibold">Tipo de Cambio Venta:</span> {compraData.compra.tipo_cambio_dia?.toFixed(2) || 'N/A'}</div>
                    {compraData.compra.inventario_afectado && (
                      <>
                        <div><span className="font-semibold">Gastos Importación Registrados:</span> ${compraData.compra.gastos_importacion?.toFixed(2) || '0.00'}</div>
                        <div><span className="font-semibold">Tipo de Cambio Importación Registrado:</span> {compraData.compra.tipo_cambio_importacion?.toFixed(2) || 'N/A'}</div>
                        <div><span className="font-semibold">Otros Gastos Registrados:</span> ${compraData.compra.otros_gastos?.toFixed(2) || '0.00'}</div>
                      </>
                    )}
                  </div>
                  {!compraData.compra.inventario_afectado && (
                      <div className="p-3 border rounded bg-yellow-50">
                        <h3 className="text-lg font-medium mb-3">Afectar Inventario con esta Compra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Gastos Importación</label>
                            <input type="number" placeholder="Ej: 79.00" value={invConfig.targetIdx === index ? invConfig.gastosImportacion : ''} onChange={(e) => setInvConfig(prev => ({ ...prev, gastosImportacion: e.target.value, targetIdx: index }))} className="w-full border border-gray-300 p-2 rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Cambio Importación</label>
                            <input type="number" placeholder="Ej: 20.35" value={invConfig.targetIdx === index ? invConfig.tipoCambioImportacion : ''} onChange={(e) => setInvConfig(prev => ({ ...prev, tipoCambioImportacion: e.target.value, targetIdx: index }))} className="w-full border border-gray-300 p-2 rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Otros Gastos</label>
                            <input type="number" placeholder="Ej: 0.00" value={invConfig.targetIdx === index ? invConfig.otrosGastos : ''} onChange={(e) => setInvConfig(prev => ({ ...prev, otrosGastos: e.target.value, targetIdx: index }))} className="w-full border border-gray-300 p-2 rounded" />
                          </div>
                        </div>
                        <button
                          onClick={confirmarAfectInventory}
                          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                           disabled={invConfig.targetIdx !== index || invConfig.gastosImportacion === '' || invConfig.tipoCambioImportacion === '' || invConfig.otrosGastos === ''}
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


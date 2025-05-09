import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';

export default function Compras() {
  // Estados para manejar el formulario, lista de compras y demás
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formulario, setFormulario] = useState({
    numeroPedido: '',
    proveedor: '',
    fechaCompra: '',
    descuentoTotalUSD: '',
    gastosEnvioUSA: '',
    tipoCambioDia: '',
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: ''
  });
  const [productosAgregados, setProductosAgregados] = useState([]);
  const [savedCompras, setSavedCompras] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [currentEditingItems, setCurrentEditingItems] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [invConfig, setInvConfig] = useState({
    gastosImportacion: '',
    tipoCambioImportacion: '',
    otrosGastos: '',
    targetIdx: null
  });
  const [nombresSugeridos, setNombresSugeridos] = useState([]);

  // Funciones auxiliares para el listado de productos
  const eliminarProductoForm = (index) => {
    setProductosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const calcularSubtotal = (items) => {
    return items.reduce((sum, item) => sum + ((item.cantidad || 0) * (item.precioUnitarioUSD || 0)), 0);
  };

  const calcularTotal = (items, descuento) => {
    return calcularSubtotal(items) - descuento;
  };

  // Función para obtener las compras y sus ítems desde Supabase
  async function fetchCompras() {
    // Obtener cabeceras de compra ordenadas por fecha descendente
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select('*')
      .order('created_at', { ascending: false });
    if (errCab) {
      console.error('Error al obtener compras:', errCab.message);
      toast.error('Error al cargar compras.');
      return;
    }

    // Obtener todos los ítems de compra
    const { data: items = [], error: errItems } = await supabase
      .from('compra_items')
      .select('*');
    if (errItems) {
      console.error('Error al obtener ítems de compra:', errItems.message);
      toast.error('Error al cargar ítems de compra.');
      return;
    }

    // Combinar cabeceras con sus ítems correspondientes
    const combined = cabeceras.map(c => ({
      compra: c,
      items: items
        .filter(i => i.compra_id === c.id)
        .map(i => ({
          id: i.id,
          nombreProducto: i.nombre_producto,
          cantidad: i.cantidad,
          // Asegurarse de que el precio sea un número flotante
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0
        }))
    }));
    setSavedCompras(combined);
  }

  // Efecto para inicializar currentEditingItems cuando se expande una compra  
  useEffect(() => {
    if (expandedIdx !== null && savedCompras[expandedIdx]) {
      // Copiar los ítems de la compra expandida al estado de edición
      setCurrentEditingItems([...savedCompras[expandedIdx].items]);
      // Establecer el targetIdx para la afectación de inventario
      setInvConfig(prev => ({ ...prev, targetIdx: expandedIdx }));
    } else {
      setCurrentEditingItems(null);
      setInvConfig(prev => ({ ...prev, targetIdx: null }));
    }
  }, [expandedIdx, savedCompras]);

  // Carga inicial de compras al montar el componente
  useEffect(() => {
    fetchCompras();
  }, []);

  // Carga inicial de nombres de productos para sugerencias
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('productos').select('nombre');
      if (!error && data) {
        // Usamos Set para obtener nombres únicos
        setNombresSugeridos(Array.from(new Set(data.map(p => p.nombre))));
      } else if (error) {
        console.error('Error al cargar nombres de productos:', error.message);
      }
    })();
  }, []);

  // Manejador para actualizar los valores de los ítems en el estado de edición
  const handleItemInputChange = (index, field, value) => {
    if (!currentEditingItems) return;
    const updatedItems = [...currentEditingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'cantidad' ? parseInt(value, 10) || 0 : parseFloat(value) || 0
    };
    setCurrentEditingItems(updatedItems);
  };

  // Manejador para los cambios en los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  // Agregar producto a la lista del formulario
  const agregarProducto = () => {
    if (!formulario.nombreProducto || !formulario.cantidad || !formulario.precioUnitarioUSD) {
      toast.error('Completa los campos del producto');
      return;
    }
    const nuevoProducto = {
      id: Date.now(),
      nombreProducto: formulario.nombreProducto,
      cantidad: parseInt(formulario.cantidad, 10),
      precioUnitarioUSD: parseFloat(formulario.precioUnitarioUSD)
    };
    setProductosAgregados(prev => [...prev, nuevoProducto]);
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' }));
  };

  // Guardar compra en la base de datos
  const guardarCompra = async () => {
    if (!formulario.numeroPedido || !formulario.proveedor || productosAgregados.length === 0) {
      toast.error('Completa la cabecera y agrega al menos un producto.');
      return;
    }
    // Insertar cabecera de compra
    const { data: newCompra, error: errCompra } = await supabase
      .from('compras')
      .insert({
        numero_pedido: formulario.numeroPedido,
        proveedor: formulario.proveedor,
        fecha_compra: formulario.fechaCompra || new Date().toISOString().split('T')[0],
        descuento_total_usd: parseFloat(formulario.descuentoTotalUSD || 0),
        gastos_envio_usa: parseFloat(formulario.gastosEnvioUSA || 0),
        tipo_cambio_dia: parseFloat(formulario.tipoCambioDia || 0),
        inventario_afectado: false
      })
      .select('id')
      .single();
    if (errCompra) {
      console.error('Error al guardar compra:', errCompra.message);
      toast.error('Error al guardar la compra: ' + errCompra.message);
      return;
    }
    // Preparar ítems a insertar
    const itemsToInsert = productosAgregados.map(item => ({
      compra_id: newCompra.id,
      nombre_producto: item.nombreProducto,
      cantidad: item.cantidad,
      precio_unitario_usd: item.precioUnitarioUSD
    }));
    // Insertar ítems
    const { error: errItems } = await supabase
      .from('compra_items')
      .insert(itemsToInsert);
    if (errItems) {
      console.error('Error al guardar ítems de compra:', errItems.message);
      toast.error('Error al guardar ítems de compra. La cabecera de compra pudo haber sido creada.');
      return;
    }
    // Limpiar formulario y volver a cargar compras
    setFormulario({
      numeroPedido: '',
      proveedor: '',
      fechaCompra: '',
      descuentoTotalUSD: '',
      gastosEnvioUSA: '',
      tipoCambioDia: '',
      nombreProducto: '',
      cantidad: '',
      precioUnitarioUSD: ''
    });
    setProductosAgregados([]);
    setMostrarFormulario(false);
    fetchCompras();
    toast.success('Compra guardada exitosamente!');
  };

  // Eliminar una compra (cabecera e ítems)
  const eliminarCompra = async (compraId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta compra y todos sus ítems?')) {
      return;
    }
    const { error: errItems } = await supabase
      .from('compra_items')
      .delete()
      .eq('compra_id', compraId);
    if (errItems) {
      console.error('Error al eliminar ítems de compra:', errItems.message);
      toast.error('Error al eliminar ítems de compra.');
      return;
    }
    const { error: errCompra } = await supabase
      .from('compras')
      .delete()
      .eq('id', compraId);
    if (errCompra) {
      console.error('Error al eliminar compra:', errCompra.message);
      toast.error('Error al eliminar la compra.');
    } else {
      fetchCompras();
      toast.success('Compra eliminada exitosamente.');
    }
  };

  // Función para afectar inventario con prorrateo de costos
  const confirmarAfectInventory = async () => {
    const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig;
    if (targetIdx === null || gastosImportacion === '' || tipoCambioImportacion === '' || otrosGastos === '') {
      toast.error('Selecciona una compra y completa los campos de gastos de importación y otros gastos.');
      return;
    }
    const { compra } = savedCompras[targetIdx];
    const itemsToProcess = expandedIdx === targetIdx && currentEditingItems
      ? currentEditingItems
      : savedCompras[targetIdx].items;
    if (itemsToProcess.length === 0) {
      toast.error('La compra seleccionada no tiene ítems para afectar el inventario.');
      return;
    }
    // 8.1) Actualizar cabecera de la compra
    console.log(`[Afectar Inventario] Actualizando/Re-afectando cabecera de compra ${compra.id}...`);
    const { error: errCab } = await supabase
      .from('compras')
      .update({
        gastos_importacion: Number(gastosImportacion),
        tipo_cambio_importacion: Number(tipoCambioImportacion),
        otros_gastos: Number(otrosGastos),
        inventario_afectado: true
      })
      .eq('id', compra.id);
    if (errCab) {
      console.error('[Afectar Inventario] Error al actualizar cabecera de compra:', errCab.message);
      toast.error('Error al actualizar compra para afectar inventario: ' + errCab.message);
      return;
    }
    console.log(`[Afectar Inventario] Cabecera de compra ${compra.id} actualizada/re-afectada.`);
    // 8.2) Traer catálogo actual de productos
    console.log('[Afectar Inventario] Cargando catálogo de productos...');
    const { data: catalogo = [], error: errCat } = await supabase
      .from('productos')
      .select('id, nombre, stock');
    if (errCat) {
      console.error('[Afectar Inventario] Error al cargar catálogo de productos:', errCat.message);
      toast.error('Error al cargar catálogo de productos: ' + errCat.message);
      return;
    }
    console.log(`[Afectar Inventario] Catálogo cargado. ${catalogo.length} productos encontrados.`);
    // 8.3) Prorrateo de costos
    console.log('[Afectar Inventario] Calculando prorrateo de costos...');
    const subtotalBruto = itemsToProcess.reduce((sum, p) => sum + ((p.cantidad || 0) * (p.precioUnitarioUSD || 0)), 0) || 1;
    const gastosTotales =
      Number(compra.descuento_total_usd || 0) * -1 +
      Number(compra.gastos_envio_usa || 0) +
      Number(gastosImportacion) +
      Number(otrosGastos);
    console.log(`[Afectar Inventario] Subtotal Bruto: ${subtotalBruto.toFixed(2)} USD`);
    console.log(`[Afectar Inventario] Gastos Totales Netos: ${gastosTotales.toFixed(2)} USD`);
    itemsToProcess.forEach(p => {
      const aporte = ((p.cantidad || 0) * (p.precioUnitarioUSD || 0)) / subtotalBruto;
      const costoBruto = (p.precioUnitarioUSD || 0);
      const costoAjuste = (aporte * gastosTotales) / (p.cantidad || 1);
      const costoFinalUSD = costoBruto + costoAjuste;
      p.costoFinalUSD = parseFloat(costoFinalUSD.toFixed(4));
      const tipoCambioVenta = Number(compra.tipo_cambio_dia || 0);
      const tipoCambioImport = Number(tipoCambioImportacion);
      const tipoCambioPromedio = (tipoCambioVenta > 0 && tipoCambioImport > 0)
        ? (tipoCambioVenta + tipoCambioImport) / 2
        : (tipoCambioVenta > 0 ? tipoCambioVenta : (tipoCambioImport > 0 ? tipoCambioImport : 1));
      p.costoFinalMXN = parseFloat((p.costoFinalUSD * tipoCambioPromedio).toFixed(2));
      console.log(`[Afectar Inventario] Item "${p.nombreProducto}": Costo Final USD=${p.costoFinalUSD}, Tipo Cambio Promedio=${tipoCambioPromedio.toFixed(4)}, Costo Final MXN=${p.costoFinalMXN}`);
    });
    console.log('[Afectar Inventario] Prorrateo completado.');
    // 8.4) Procesar cada ítem para actualizar/insertar productos y registrar movimientos
    console.log('[Afectar Inventario] Procesando ítems para actualizar/insertar productos y registrar movimientos...');
    for (const p of itemsToProcess) {
      let prod = catalogo.find(x => x.nombre === p.nombreProducto);
      let productoIdParaMovimiento = null;
      if (prod) {
        console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" encontrado en catálogo (ID: ${prod.id}). Actualizando...`);
        console.log(`[Afectar Inventario] Valores a actualizar para "${p.nombreProducto}": stock=${(prod.stock || 0) + (p.cantidad || 0)}, precio_unitario_usd=${(p.precioUnitarioUSD || 0)}, costo_final_usd=${p.costoFinalUSD}, costo_final_mxn=${p.costoFinalMXN}`);
        const { error: errUpd } = await supabase
          .from('productos')
          .update({
            stock: (prod.stock || 0) + (p.cantidad || 0),
            precio_unitario_usd: (p.precioUnitarioUSD || 0),
            costo_final_usd: p.costoFinalUSD,
            costo_final_mxn: p.costoFinalMXN
          })
          .eq('id', prod.id);
        if (errUpd) {
          console.error(`[Afectar Inventario] Error al actualizar producto "${p.nombreProducto}" (ID: ${prod.id}):`, errUpd.message);
          toast.error(`Error al actualizar producto ${p.nombreProducto}.`);
        } else {
          console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" actualizado exitosamente.`);
        }
        productoIdParaMovimiento = prod.id;
      } else {
        console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" NO encontrado en catálogo. Insertando nuevo producto...`);
        console.log(`[Afectar Inventario] Valores a insertar para "${p.nombreProducto}": nombre=${p.nombreProducto}, stock=${(p.cantidad || 0)}, precio_unitario_usd=${(p.precioUnitarioUSD || 0)}, costo_final_usd=${p.costoFinalUSD}, costo_final_mxn=${p.costoFinalMXN}`);
        const { data: newProd, error: errIns } = await supabase
          .from('productos')
          .insert({
            nombre: p.nombreProducto,
            stock: (p.cantidad || 0),
            precio_unitario_usd: (p.precioUnitarioUSD || 0),
            costo_final_usd: p.costoFinalUSD,
            costo_final_mxn: p.costoFinalMXN
          })
          .select('id')
          .single();
        if (errIns) {
          console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}":`, errIns.message);
          toast.error(`Error al crear producto ${p.nombreProducto}.`);
        } else if (newProd && newProd.id) {
          console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" creado exitosamente (ID: ${newProd.id}).`);
          productoIdParaMovimiento = newProd.id;
        } else {
          console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}": No se recibió ID del nuevo producto.`);
          toast.error(`Error al crear producto ${p.nombreProducto}: No se recibió ID.`);
        }
      }
      // Registrar movimiento de entrada si se cuenta con un productoId
      console.log(`[Afectar Inventario] Verificando productoIdParaMovimiento para "${p.nombreProducto}":`, productoIdParaMovimiento);
      if (productoIdParaMovimiento) {
        console.log(`[Afectar Inventario] Registrando movimiento de entrada para producto ID ${productoIdParaMovimiento}...`);
        const { error: errMov } = await supabase.from('movimientos_inventario').insert({
          tipo: 'ENTRADA',
          producto_id: productoIdParaMovimiento,
          cantidad: (p.cantidad || 0),
          referencia: compra.numero_pedido,
          motivo: 'compra',
          fecha: new Date().toISOString()
        });
        if (errMov) {
          console.error(`[Afectar Inventario] Error al registrar movimiento para producto ID ${productoIdParaMovimiento}:`, errMov.message);
          toast.error(`Error al registrar movimiento para ${p.nombreProducto}.`);
        } else {
          console.log(`[Afectar Inventario] Movimiento de entrada registrado para producto ID ${productoIdParaMovimiento}.`);
        }
      } else {
        console.warn(`[Afectar Inventario] No se pudo obtener ID de producto para "${p.nombreProducto}". No se registrará movimiento de entrada.`);
        toast.warn(`Advertencia: No se pudo registrar movimiento para ${p.nombreProducto}.`);
      }
    }
    console.log('[Afectar Inventario] Procesamiento de ítems completado.');
    // 8.5) Refrescar lista de compras y limpiar formulario de afectación
    console.log('[Afectar Inventario] Refrescando lista de compras y limpiando formulario...');
    fetchCompras();
    setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null });
    setCurrentEditingItems(null);
    toast.success(`Inventario afectado exitosamente para pedido ${compra.numero_pedido}`);
    console.log('[Afectar Inventario] Proceso de afectación de inventario finalizado.');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado responsive */}
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
        {/* Botón para mostrar/ocultar formulario */}
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
                <input
                  type="text"
                  name="numeroPedido"
                  placeholder="Ej: 12345"
                  value={formulario.numeroPedido}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  name="proveedor"
                  placeholder="Ej: Proveedor A"
                  value={formulario.proveedor}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                <input
                  type="date"
                  name="fechaCompra"
                  value={formulario.fechaCompra}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descuento Total (USD)</label>
                <input
                  type="number"
                  name="descuentoTotalUSD"
                  placeholder="Ej: 10.50"
                  value={formulario.descuentoTotalUSD}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gastos Envío USA (USD)</label>
                <input
                  type="number"
                  name="gastosEnvioUSA"
                  placeholder="Ej: 25.00"
                  value={formulario.gastosEnvioUSA}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cambio del Día</label>
                <input
                  type="number"
                  name="tipoCambioDia"
                  placeholder="Ej: 20.00"
                  value={formulario.tipoCambioDia}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {/* Sección para agregar ítems a la compra */}
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Producto a la Compra</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <input
                    type="text"
                    name="nombreProducto"
                    placeholder="Selecciona o escribe un producto"
                    value={formulario.nombreProducto}
                    onChange={handleInputChange}
                    list="nombres-sugeridos"
                    className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <datalist id="nombres-sugeridos">
                    {nombresSugeridos.map((nombre, index) => (
                      <option key={index} value={nombre} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    name="cantidad"
                    placeholder="Cant."
                    value={formulario.cantidad}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio USD</label>
                  <input
                    type="number"
                    name="precioUnitarioUSD"
                    placeholder="Precio USD"
                    value={formulario.precioUnitarioUSD}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-right"
                  />
                </div>
              </div>
              <button
                onClick={agregarProducto}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              >
                Agregar Producto
              </button>
            </div>
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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Compras</h2>
        <div className="space-y-6">
          {savedCompras.map((compraData, index) => (
            <div key={compraData.compra.id} className="border border-gray-200 rounded-lg shadow-md overflow-hidden bg-white">
              {/* Cabecera de la compra */}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarCompra(compraData.compra.id);
                  }}
                  className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
              {/* Detalles de la compra */}
              {expandedIdx === index && (
                <div className="p-4 bg-white border-t">
                  <h3 className="text-lg font-medium mb-3">Ítems de la Compra:</h3>
                  {currentEditingItems && expandedIdx === index ? (
                    <div className="space-y-3 mb-4">
                      {currentEditingItems.map((item, itemIndex) => (
                        <div key={item.id} className="grid grid-cols-3 gap-4 items-center text-sm text-gray-700">
                          <div className="font-medium">{item.nombreProducto}</div>
                          <div>
                            <label className="block text-xs text-gray-500">Cantidad</label>
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => handleItemInputChange(itemIndex, 'cantidad', e.target.value)}
                              className="w-full border border-gray-300 p-1 rounded text-right text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500">Precio Unitario (USD)</label>
                            <input
                              type="number"
                              value={item.precioUnitarioUSD}
                              onChange={(e) => handleItemInputChange(itemIndex, 'precioUnitarioUSD', e.target.value)}
                              className="w-full border border-gray-300 p-1 rounded text-right text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul className="list-disc pl-5 mb-4">
                      {compraData.items.map(item => (
                        <li key={item.id} className="text-sm text-gray-700">
                          {item.nombreProducto} - Cantidad: {item.cantidad} - Precio Unitario (USD): ${item.precioUnitarioUSD.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Información de gastos de la cabecera */}
                  <div className="mb-4 text-sm text-gray-700">
                    <div>
                      <span className="font-semibold">Descuento Total (USD):</span> ${compraData.compra.descuento_total_usd?.toFixed(2) || '0.00'}
                    </div>
                    <div>
                      <span className="font-semibold">Gastos Envío USA (USD):</span> ${compraData.compra.gastos_envio_usa?.toFixed(2) || '0.00'}
                    </div>
                    <div>
                      <span className="font-semibold">Tipo de Cambio Venta:</span> {compraData.compra.tipo_cambio_dia?.toFixed(2) || 'N/A'}
                    </div>
                    {compraData.compra.inventario_afectado && (
                      <>
                        <div>
                          <span className="font-semibold">Gastos Importación Registrados:</span> ${compraData.compra.gastos_importacion?.toFixed(2) || '0.00'}
                        </div>
                        <div>
                          <span className="font-semibold">Tipo de Cambio Importación Registrado:</span> {compraData.compra.tipo_cambio_importacion?.toFixed(2) || 'N/A'}
                        </div>
                        <div>
                          <span className="font-semibold">Otros Gastos Registrados:</span> ${compraData.compra.otros_gastos?.toFixed(2) || '0.00'}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Sección para afectar inventario */}
                  <div className="p-3 border rounded bg-yellow-50">
                    <h3 className="text-lg font-medium mb-3">Afectar Inventario con esta Compra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gastos Importación</label>
                        <input
                          type="number"
                          placeholder="Ej: 79.00"
                          value={invConfig.targetIdx === index ? (invConfig.gastosImportacion === '' ? compraData.compra.gastos_importacion ?? '' : invConfig.gastosImportacion) : ''}
                          onChange={(e) => setInvConfig(prev => ({ ...prev, gastosImportacion: e.target.value, targetIdx: index }))}
                          className="w-full border border-gray-300 p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Cambio Importación</label>
                        <input
                          type="number"
                          placeholder="Ej: 20.35"
                          value={invConfig.targetIdx === index ? (invConfig.tipoCambioImportacion === '' ? compraData.compra.tipo_cambio_importacion ?? '' : invConfig.tipoCambioImportacion) : ''}
                          onChange={(e) => setInvConfig(prev => ({ ...prev, tipoCambioImportacion: e.target.value, targetIdx: index }))}
                          className="w-full border border-gray-300 p-2 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Otros Gastos</label>
                        <input
                          type="number"
                          placeholder="Ej: 0.00"
                          value={invConfig.targetIdx === index ? (invConfig.otrosGastos === '' ? compraData.compra.otros_gastos ?? '' : invConfig.otrosGastos) : ''}
                          onChange={(e) => setInvConfig(prev => ({ ...prev, otrosGastos: e.target.value, targetIdx: index }))}
                          className="w-full border border-gray-300 p-2 rounded"
                        />
                      </div>
                    </div>
                    <button
                      onClick={confirmarAfectInventory}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      Confirmar y Afectar Inventario
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

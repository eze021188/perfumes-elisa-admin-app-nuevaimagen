import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; // Esta ruta '../supabase' debería ser correcta si supabase.js está en src/
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';

export default function Compras() {
  const navigate = useNavigate(); // Hook para navegación

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
  const [editingIdx, setEditingIdx] = useState(null); // Estado no utilizado actualmente, considerar remover si no se implementa edición de ítems guardados
  const [editItems, setEditItems] = useState([]); // Estado no utilizado actualmente, considerar remover si no se implementa edición de ítems guardados
  const [invConfig, setInvConfig] = useState({
    gastosImportacion: '',
    tipoCambioImportacion: '',
    otrosGastos: '',
    targetIdx: null // Índice de la compra a la que se aplicará la afectación de inventario
  });
  const [nombresSugeridos, setNombresSugeridos] = useState([]);

  // Funciones auxiliares para el listado de productos en el formulario
  const eliminarProductoForm = (index) => {
    setProductosAgregados(prev => prev.filter((_, i) => i !== index));
  };

  const calcularSubtotal = (items) => {
    return items.reduce((sum, item) => sum + ((parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnitarioUSD) || 0)), 0);
  };

  const calcularTotal = (items, descuento) => {
    return calcularSubtotal(items) - (parseFloat(descuento) || 0);
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
          cantidad: parseFloat(i.cantidad) || 0, // Asegurarse de que la cantidad sea un número
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0 // Asegurarse de que el precio sea un número flotante
        }))
    }));
    setSavedCompras(combined);
  }

  // Efecto para inicializar currentEditingItems cuando se expande una compra
  // y cargar la configuración de inventario si ya existe en la compra
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

  // Manejador para actualizar los valores de los ítems en el estado de edición (si se implementa edición de ítems guardados)
  // Actualmente, este estado se usa para mostrar los ítems de la compra expandida.
  const handleItemInputChange = (index, field, value) => {
    if (!currentEditingItems) return;
    const updatedItems = [...currentEditingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'cantidad' ? parseInt(value, 10) || 0 : parseFloat(value) || 0
    };
    setCurrentEditingItems(updatedItems);
  };

  // Manejador para los cambios en los inputs del formulario de nueva compra
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  // Agregar producto a la lista del formulario de nueva compra
  const agregarProducto = () => {
    if (!formulario.nombreProducto || !formulario.cantidad || !formulario.precioUnitarioUSD) {
      toast.error('Completa los campos del producto');
      return;
    }
    const nuevoProducto = {
      id: Date.now(), // Usar timestamp temporal como ID para la lista del formulario
      nombreProducto: formulario.nombreProducto.trim(), // Limpiar espacios
      cantidad: parseInt(formulario.cantidad, 10) || 0,
      precioUnitarioUSD: parseFloat(formulario.precioUnitarioUSD) || 0
    };

    if (nuevoProducto.cantidad <= 0 || nuevoProducto.precioUnitarioUSD < 0) {
         toast.error('La cantidad debe ser mayor a 0 y el precio unitario no puede ser negativo.');
         return;
    }

    setProductosAgregados(prev => [...prev, nuevoProducto]);
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' }));
  };

  // Guardar compra en la base de datos
  const guardarCompra = async () => {
    // Validaciones básicas
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


    // Insertar cabecera de compra
    const { data: newCompra, error: errCompra } = await supabase
      .from('compras')
      .insert({
        numero_pedido: formulario.numeroPedido.trim(), // Limpiar espacios
        proveedor: formulario.proveedor.trim(), // Limpiar espacios
        fecha_compra: formulario.fechaCompra || new Date().toISOString().split('T')[0],
        descuento_total_usd: descuento,
        gastos_envio_usa: gastosEnvio,
        tipo_cambio_dia: tipoCambioDia,
        inventario_afectado: false // Inicialmente no afectado
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
      // Considerar eliminar la cabecera si fallan los ítems para mantener consistencia
      // await supabase.from('compras').delete().eq('id', newCompra.id);
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
    fetchCompras(); // Recargar la lista para mostrar la nueva compra
    toast.success('Compra guardada exitosamente!');
  };

  // Eliminar una compra (cabecera e ítems)
  const eliminarCompra = async (compraId, inventarioAfectado) => {
    if (inventarioAfectado) {
         toast.error('No se puede eliminar una compra que ya ha afectado el inventario.');
         return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta compra y todos sus ítems?')) {
      return;
    }
    // Eliminar ítems primero (por la relación de clave foránea)
    const { error: errItems } = await supabase
      .from('compra_items')
      .delete()
      .eq('compra_id', compraId);
    if (errItems) {
      console.error('Error al eliminar ítems de compra:', errItems.message);
      toast.error('Error al eliminar ítems de compra.');
      return;
    }
    // Eliminar cabecera de compra
    const { error: errCompra } = await supabase
      .from('compras')
      .delete()
      .eq('id', compraId);
    if (errCompra) {
      console.error('Error al eliminar compra:', errCompra.message);
      toast.error('Error al eliminar la compra.');
    } else {
      fetchCompras(); // Recargar la lista
      toast.success('Compra eliminada exitosamente.');
    }
  };

  // Función para afectar inventario con prorrateo de costos y costo promedio ponderado
  const confirmarAfectInventory = async () => {
    const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig;

    // Validar que se haya seleccionado una compra y los campos de gastos
    if (targetIdx === null || gastosImportacion === '' || tipoCambioImportacion === '' || otrosGastos === '') {
      toast.error('Selecciona una compra y completa los campos de gastos de importación, tipo de cambio y otros gastos.');
      return;
    }

    const { compra } = savedCompras[targetIdx];

    // Validar que la compra no haya afectado el inventario previamente (opcional, pero recomendado para evitar doble afectación sin lógica de reversión)
    // Si necesitas re-afectar, deberías implementar una lógica para revertir el movimiento anterior primero.
    if (compra.inventario_afectado) {
         toast.error('Esta compra ya ha afectado el inventario. No se puede afectar nuevamente.');
         return;
    }


    const itemsToProcess = savedCompras[targetIdx].items; // Usar los ítems guardados para la afectación

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
         toast.error('Los valores de gastos de importación, tipo de cambio de importación y otros gastos no pueden ser negativos.');
         return;
    }
     if (tipoCambioImportacionNum === 0 && (gastosImportacionNum > 0 || otrosGastosNum > 0)) {
          toast.warn('Advertencia: El tipo de cambio de importación es 0, los gastos en USD no se convertirán a MXN correctamente para el cálculo del costo final.');
     }


    // 1. Actualizar cabecera de la compra con los gastos de importación y marcar como afectado
    console.log(`[Afectar Inventario] Actualizando cabecera de compra ${compra.id} con gastos...`);
    const { error: errCab } = await supabase
      .from('compras')
      .update({
        gastos_importacion: gastosImportacionNum,
        tipo_cambio_importacion: tipoCambioImportacionNum,
        otros_gastos: otrosGastosNum,
        inventario_afectado: true // Marcar como afectado
      })
      .eq('id', compra.id);

    if (errCab) {
      console.error('[Afectar Inventario] Error al actualizar cabecera de compra:', errCab.message);
      toast.error('Error al actualizar compra para afectar inventario: ' + errCab.message);
      return; // Detener el proceso si falla la actualización de la cabecera
    }
    console.log(`[Afectar Inventario] Cabecera de compra ${compra.id} actualizada.`);

    // 2. Traer catálogo actual de productos
    console.log('[Afectar Inventario] Cargando catálogo de productos...');
    const { data: catalogo = [], error: errCat } = await supabase
      .from('productos')
      .select('id, nombre, stock, costo_final_usd, costo_final_mxn'); // Incluir costos actuales
    if (errCat) {
      console.error('[Afectar Inventario] Error al cargar catálogo de productos:', errCat.message);
      toast.error('Error al cargar catálogo de productos: ' + errCat.message);
      // Considerar revertir la cabecera de compra si falla la carga del catálogo
      return; // Detener el proceso
    }
    console.log(`[Afectar Inventario] Catálogo cargado. ${catalogo.length} productos encontrados.`);

    // 3. Prorrateo de costos y cálculo del costo promedio ponderado para cada ítem
    console.log('[Afectar Inventario] Calculando prorrateo y costo promedio ponderado...');

    // Calcular el subtotal bruto de la compra actual
    const subtotalBrutoCompraActual = itemsToProcess.reduce((sum, p) => sum + ((p.cantidad || 0) * (p.precioUnitarioUSD || 0)), 0) || 1;

    // Calcular los gastos totales netos de la compra actual (incluyendo descuento como negativo)
    const gastosTotalesCompraActual =
      descuentoTotalUSDNum * -1 +
      gastosEnvioUSANum +
      gastosImportacionNum +
      otrosGastosNum;

    console.log(`[Afectar Inventario] Subtotal Bruto Compra Actual: ${subtotalBrutoCompraActual.toFixed(2)} USD`);
    console.log(`[Afectar Inventario] Gastos Totales Netos Compra Actual: ${gastosTotalesCompraActual.toFixed(2)} USD`);

    // Usar un array para almacenar las promesas de actualización/inserción de productos
    const updatePromises = [];
    const movimientoPromises = [];


    for (const p of itemsToProcess) {
        const cantidadCompraActual = p.cantidad || 0;
        const precioUnitarioUSDCompraActual = p.precioUnitarioUSD || 0;

        // Calcular el costo final por unidad para este ÍTEM en la COMPRA ACTUAL
        const aporteItemCompraActual = (cantidadCompraActual * precioUnitarioUSDCompraActual) / subtotalBrutoCompraActual;
        const costoAjustePorItemUSD = (aporteItemCompraActual * gastosTotalesCompraActual) / (cantidadCompraActual || 1); // Dividir por cantidad para obtener ajuste por unidad
        const costoFinalUSDCompraActual = precioUnitarioUSDCompraActual + costoAjustePorItemUSD;

        // Calcular el costo final en MXN para este ÍTEM en la COMPRA ACTUAL
        // Usar el tipo de cambio de importación para la conversión a MXN en el cálculo del costo final unitario de esta compra
        const costoFinalMXNCompraActual = costoFinalUSDCompraActual * (tipoCambioImportacionNum > 0 ? tipoCambioImportacionNum : (tipoCambioDiaNum > 0 ? tipoCambioDiaNum : 1)); // Usar tipo de cambio importación, fallback al del día, fallback a 1

        console.log(`[Afectar Inventario] Item "${p.nombreProducto}":`);
        console.log(`  Costo Final USD (Compra Actual): ${costoFinalUSDCompraActual.toFixed(4)}`);
        console.log(`  Costo Final MXN (Compra Actual): ${costoFinalMXNCompraActual.toFixed(2)}`);


        let prod = catalogo.find(x => x.nombre === p.nombreProducto);
        let productoIdParaMovimiento = null;

        if (prod) {
            // El producto ya existe, calcular promedio ponderado
            console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" encontrado en catálogo (ID: ${prod.id}). Calculando promedio ponderado...`);

            const stockActual = prod.stock || 0;
            const costoActualUSD = prod.costo_final_usd || 0;
            const costoActualMXN = prod.costo_final_mxn || 0;

            const nuevoStockTotal = stockActual + cantidadCompraActual;

            let nuevoCostoPromedioUSD = costoActualUSD; // Valor por defecto si el nuevo stock es 0
            let nuevoCostoPromedioMXN = costoActualMXN; // Valor por defecto si el nuevo stock es 0

            if (nuevoStockTotal > 0) {
                const costoTotalUSDPonderado = (stockActual * costoActualUSD) + (cantidadCompraActual * costoFinalUSDCompraActual);
                const costoTotalMXNPonderado = (stockActual * costoActualMXN) + (cantidadCompraActual * costoFinalMXNCompraActual);

                nuevoCostoPromedioUSD = costoTotalUSDPonderado / nuevoStockTotal;
                nuevoCostoPromedioMXN = costoTotalMXNPonderado / nuevoStockTotal;
            }

            console.log(`[Afectar Inventario] Producto "${p.nombreProducto}":`);
            console.log(`  Stock Actual: ${stockActual}, Costo Actual USD: ${costoActualUSD.toFixed(4)}, Costo Actual MXN: ${costoActualMXN.toFixed(2)}`);
            console.log(`  Cantidad Compra Actual: ${cantidadCompraActual}, Costo Compra Actual USD: ${costoFinalUSDCompraActual.toFixed(4)}, Costo Compra Actual MXN: ${costoFinalMXNCompraActual.toFixed(2)}`);
            console.log(`  Nuevo Stock Total: ${nuevoStockTotal}`);
            console.log(`  Nuevo Costo Promedio USD: ${nuevoCostoPromedioUSD.toFixed(4)}`);
            console.log(`  Nuevo Costo Promedio MXN: ${nuevoCostoPromedioMXN.toFixed(2)}`);


            // Actualizar producto existente con el nuevo stock total y costos promedio
            updatePromises.push(
                supabase
                .from('productos')
                .update({
                    stock: nuevoStockTotal,
                    costo_final_usd: parseFloat(nuevoCostoPromedioUSD.toFixed(4)),
                    costo_final_mxn: parseFloat(nuevoCostoPromedioMXN.toFixed(2))
                })
                .eq('id', prod.id)
                .then(({ error: errUpd }) => {
                    if (errUpd) {
                        console.error(`[Afectar Inventario] Error al actualizar producto "${p.nombreProducto}" (ID: ${prod.id}):`, errUpd.message);
                        toast.error(`Error al actualizar producto ${p.nombreProducto}.`);
                    } else {
                        console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" actualizado exitosamente.`);
                    }
                })
            );
            productoIdParaMovimiento = prod.id;

        } else {
            // El producto no existe, insertarlo con el stock y costos de esta compra
            console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" NO encontrado en catálogo. Insertando nuevo producto...`);
            console.log(`[Afectar Inventario] Valores a insertar para "${p.nombreProducto}": nombre=${p.nombreProducto}, stock=${cantidadCompraActual}, precio_unitario_usd=${precioUnitarioUSDCompraActual.toFixed(2)}, costo_final_usd=${costoFinalUSDCompraActual.toFixed(4)}, costo_final_mxn=${costoFinalMXNCompraActual.toFixed(2)}`);

            updatePromises.push(
                supabase
                .from('productos')
                .insert({
                    nombre: p.nombreProducto,
                    stock: cantidadCompraActual,
                    // El precio unitario de venta inicial podría ser el precio de compra o calcularse aparte
                    precio_unitario_usd: precioUnitarioUSDCompraActual, // O definir un precio de venta inicial diferente
                    costo_final_usd: parseFloat(costoFinalUSDCompraActual.toFixed(4)),
                    costo_final_mxn: parseFloat(costoFinalMXNCompraActual.toFixed(2))
                })
                .select('id') // Seleccionar el ID del nuevo producto insertado
                .single()
                .then(({ data: newProd, error: errIns }) => {
                    if (errIns) {
                        console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}":`, errIns.message);
                        toast.error(`Error al crear producto ${p.nombreProducto}.`);
                        return { productoId: null }; // Indicar que no se obtuvo ID
                    } else if (newProd && newProd.id) {
                        console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" creado exitosamente (ID: ${newProd.id}).`);
                        return { productoId: newProd.id }; // Retornar el ID del nuevo producto
                    } else {
                         console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}": No se recibió ID del nuevo producto.`);
                         toast.error(`Error al crear producto ${p.nombreProducto}: No se recibió ID.`);
                         return { productoId: null }; // Indicar que no se obtuvo ID
                    }
                })
                .then(({ productoId }) => {
                    // Registrar movimiento de entrada solo si se obtuvo un productoId válido
                    if (productoId) {
                        console.log(`[Afectar Inventario] Registrando movimiento de entrada para nuevo producto ID ${productoId}...`);
                        movimientoPromises.push(
                            supabase.from('movimientos_inventario').insert({
                                tipo: 'ENTRADA',
                                producto_id: productoId,
                                cantidad: cantidadCompraActual,
                                referencia: compra.numero_pedido,
                                motivo: 'compra',
                                fecha: new Date().toISOString()
                            }).then(({ error: errMov }) => {
                                if (errMov) {
                                    console.error(`[Afectar Inventario] Error al registrar movimiento para producto ID ${productoId}:`, errMov.message);
                                    toast.error(`Error al registrar movimiento para ${p.nombreProducto}.`);
                                } else {
                                    console.log(`[Afectar Inventario] Movimiento de entrada registrado para producto ID ${productoId}.`);
                                }
                            })
                        );
                    } else {
                         console.warn(`[Afectar Inventario] No se pudo obtener ID para registrar movimiento de entrada para "${p.nombreProducto}".`);
                         toast.warn(`Advertencia: No se pudo registrar movimiento para ${p.nombreProducto}.`);
                    }
                })
            );
             // Para el caso de inserción, el movimiento se registra DENTRO de la promesa de inserción
             // para asegurar que tenemos el ID del nuevo producto.
             productoIdParaMovimiento = 'handled_in_promise'; // Marcar como manejado en la promesa
        }

        // Registrar movimiento de entrada para productos EXISTENTES
        if (prod && productoIdParaMovimiento !== 'handled_in_promise') {
             console.log(`[Afectar Inventario] Registrando movimiento de entrada para producto ID ${productoIdParaMovimiento}...`);
             movimientoPromises.push(
                 supabase.from('movimientos_inventario').insert({
                     tipo: 'ENTRADA',
                     producto_id: productoIdParaMovimiento,
                     cantidad: cantidadCompraActual,
                     referencia: compra.numero_pedido,
                     motivo: 'compra',
                     fecha: new Date().toISOString()
                 }).then(({ error: errMov }) => {
                     if (errMov) {
                         console.error(`[Afectar Inventario] Error al registrar movimiento para producto ID ${productoIdParaMovimiento}:`, errMov.message);
                         toast.error(`Error al registrar movimiento para ${p.nombreProducto}.`);
                     } else {
                         console.log(`[Afectar Inventario] Movimiento de entrada registrado para producto ID ${productoIdParaMovimiento}.`);
                     }
                 })
             );
        }
    } // Fin del bucle for...of

    // Esperar a que todas las promesas de actualización/inserción y movimientos se completen
    console.log('[Afectar Inventario] Esperando a que se completen las operaciones de base de datos...');
    await Promise.all([...updatePromises, ...movimientoPromises]);
    console.log('[Afectar Inventario] Operaciones de base de datos completadas.');


    // 4. Refrescar lista de compras y limpiar formulario de afectación
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

        <div className="w-full md:w-[150px]" /> {/* Espaciador para alinear */}
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
                    e.stopPropagation(); // Evita que se expanda/colapse al hacer clic en eliminar
                    eliminarCompra(compraData.compra.id, compraData.compra.inventario_afectado); // Pasar estado de afectado
                  }}
                  className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                   disabled={compraData.compra.inventario_afectado} // Deshabilitar si ya afectó inventario
                >
                  Eliminar
                </button>
              </div>
              {/* Detalles de la compra */}
              {expandedIdx === index && (
                <div className="p-4 bg-white border-t">
                  <h3 className="text-lg font-medium mb-3">Ítems de la Compra:</h3>
                  {/* Sección de visualización/edición de ítems (actualmente solo visualización de ítems guardados) */}
                  {/* Si deseas editar ítems de compras guardadas, necesitarías una lógica más compleja aquí */}
                   <div className="space-y-3 mb-4">
                       {savedCompras[index].items.map((item, itemIndex) => (
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
                  {!compraData.compra.inventario_afectado && ( // Mostrar solo si no ha afectado inventario
                      <div className="p-3 border rounded bg-yellow-50">
                        <h3 className="text-lg font-medium mb-3">Afectar Inventario con esta Compra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Gastos Importación</label>
                            <input
                              type="number"
                              placeholder="Ej: 79.00"
                              value={invConfig.targetIdx === index ? invConfig.gastosImportacion : ''}
                              onChange={(e) => setInvConfig(prev => ({ ...prev, gastosImportacion: e.target.value, targetIdx: index }))}
                              className="w-full border border-gray-300 p-2 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Cambio Importación</label>
                            <input
                              type="number"
                              placeholder="Ej: 20.35"
                              value={invConfig.targetIdx === index ? invConfig.tipoCambioImportacion : ''}
                              onChange={(e) => setInvConfig(prev => ({ ...prev, tipoCambioImportacion: e.target.value, targetIdx: index }))}
                              className="w-full border border-gray-300 p-2 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Otros Gastos</label>
                            <input
                              type="number"
                              placeholder="Ej: 0.00"
                              value={invConfig.targetIdx === index ? invConfig.otrosGastos : ''}
                              onChange={(e) => setInvConfig(prev => ({ ...prev, otrosGastos: e.target.value, targetIdx: index }))}
                              className="w-full border border-gray-300 p-2 rounded"
                            />
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

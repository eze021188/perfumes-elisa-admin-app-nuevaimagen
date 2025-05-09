import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast'; // Asegúrate de tener react-hot-toast instalado
// Asegúrate de que ModalEditarProducto esté importado correctamente si lo necesitas en este archivo
// import ModalEditarProducto from './ModalEditarProducto'; // Si este modal se usa aquí, descomentar

export default function Compras() {
  // Estados para manejar el formulario, lista de productos, compras guardadas, etc.
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
  const [productosAgregados, setProductosAgregados] = useState([]); // Productos agregados al formulario actual
  const [savedCompras, setSavedCompras] = useState([]); // Compras ya guardadas en la BD
  const [expandedIdx, setExpandedIdx] = useState(null); // Índice de la compra expandida en la lista
  // Estado para manejar los ítems de la compra actualmente expandida y editada
  const [currentEditingItems, setCurrentEditingItems] = useState(null);

  const [editingIdx, setEditingIdx] = useState(null); // Índice de la compra que se está editando (parece no usarse para edición de ítems aquí)
  const [editItems, setEditItems] = useState([]); // Ítems de la compra que se está editando (parece no usarse para edición de ítems aquí)

  const [invConfig, setInvConfig] = useState({ // Configuración para afectar inventario
    gastosImportacion: '',
    tipoCambioImportacion: '',
    otrosGastos: '',
    targetIdx: null // Índice de la compra seleccionada para afectar inventario
  });
  const [nombresSugeridos, setNombresSugeridos] = useState([]); // Sugerencias de nombres de producto

  // 1) Carga inicial de compras e ítems al montar el componente
  useEffect(() => {
    fetchCompras();
  }, []);

  // Carga inicial de nombres de productos para sugerencias
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('productos').select('nombre');
      if (!error && data) {
        // Usamos Set para obtener nombres únicos
        setNombresSugeridos(Array.from(new Set(data.map(p => p.nombre))));
      } else if (error) {
        console.error('Error al cargar nombres de productos:', error.message);
      }
    })();
  }, []);

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
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd) || 0 // Asegurar número
        }))
    }));
    setSavedCompras(combined);
  }

  // Efecto para inicializar currentEditingItems cuando se expande una compra
  useEffect(() => {
    if (expandedIdx !== null && savedCompras[expandedIdx]) {
      // Copiar los ítems de la compra expandida al estado de edición
      setCurrentEditingItems([...savedCompras[expandedIdx].items]);
      // También establecer el targetIdx para la afectación de inventario automáticamente
      setInvConfig(prev => ({ ...prev, targetIdx: expandedIdx }));
    } else {
      // Limpiar el estado de edición y targetIdx cuando se colapsa
      setCurrentEditingItems(null);
      setInvConfig(prev => ({ ...prev, targetIdx: null }));
    }
  }, [expandedIdx, savedCompras]); // Depende del índice expandido y de la lista de compras guardadas

  // Manejador para actualizar los valores de los ítems en el estado de edición
  const handleItemInputChange = (index, field, value) => {
    if (!currentEditingItems) return; // Solo actualizar si hay ítems en edición

    const updatedItems = [...currentEditingItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'cantidad' ? parseInt(value, 10) || 0 : parseFloat(value) || 0 // Convertir a número
    };
    setCurrentEditingItems(updatedItems);
  };


  // --- Funciones de manejo de formulario, agregar productos, etc. (Mantener o implementar según tu UI) ---
  // Ejemplo básico:
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  const agregarProducto = () => {
    // Validación básica
    if (!formulario.nombreProducto || !formulario.cantidad || !formulario.precioUnitarioUSD) {
      toast.error('Completa los campos del producto');
      return;
    }
    const nuevoProducto = {
      // Generar un ID temporal para la lista del formulario
      id: Date.now(),
      nombreProducto: formulario.nombreProducto,
      cantidad: parseInt(formulario.cantidad, 10), // Asegurarse de que sea un número entero
      precioUnitarioUSD: parseFloat(formulario.precioUnitarioUSD) // Asegurarse de que sea flotante
    };
    setProductosAgregados(prev => [...prev, nuevoProducto]);
    // Limpiar campos del producto en el formulario
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' }));
  };

  const guardarCompra = async () => {
    // Validación básica de la cabecera y ítems
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
        fecha_compra: formulario.fechaCompra || new Date().toISOString().split('T')[0], // Usar fecha actual si no se especifica
        descuento_total_usd: parseFloat(formulario.descuentoTotalUSD || 0),
        gastos_envio_usa: parseFloat(formulario.gastosEnvioUSA || 0),
        tipo_cambio_dia: parseFloat(formulario.tipoCambioDia || 0),
        inventario_afectado: false // Por defecto, no afectado al guardar
      })
      .select('id') // Seleccionar el ID de la nueva compra insertada
      .single();

    if (errCompra) {
      console.error('Error al guardar compra:', errCompra.message);
      toast.error('Error al guardar la compra: ' + errCompra.message);
      return;
    }

    // Preparar ítems para insertar, vinculados a la nueva compra
    const itemsToInsert = productosAgregados.map(item => ({
      compra_id: newCompra.id,
      nombre_producto: item.nombreProducto,
      cantidad: item.cantidad,
      precio_unitario_usd: item.precioUnitarioUSD
    }));

    // Insertar ítems de compra
    const { error: errItems } = await supabase
      .from('compra_items')
      .insert(itemsToInsert);

    if (errItems) {
      // Si falla la inserción de ítems, considera eliminar la cabecera de compra recién creada para evitar inconsistencia
      console.error('Error al guardar ítems de compra:', errItems.message);
      toast.error('Error al guardar ítems de compra. La cabecera de compra pudo haber sido creada.');
      // Opcional: Lógica para eliminar la cabecera si fallan los ítems
      // await supabase.from('compras').delete().eq('id', newCompra.id);
      return;
    }

    // Limpiar formulario y productos agregados, refrescar lista de compras
    setFormulario({
      numeroPedido: '', proveedor: '', fechaCompra: '', descuentoTotalUSD: '',
      gastosEnvioUSA: '', tipoCambioDia: '', nombreProducto: '', cantidad: '', precioUnitarioUSD: ''
    });
    setProductosAgregados([]);
    setMostrarFormulario(false); // Opcional: ocultar formulario después de guardar
    fetchCompras(); // Recargar la lista de compras guardadas
    toast.success('Compra guardada exitosamente!');
  };

  // Función para eliminar una compra completa (cabecera e ítems)
  const eliminarCompra = async (compraId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta compra y todos sus ítems?')) {
      return;
    }

    // Primero eliminar ítems relacionados
    const { error: errItems } = await supabase
      .from('compra_items')
      .delete()
      .eq('compra_id', compraId);

    if (errItems) {
      console.error('Error al eliminar ítems de compra:', errItems.message);
      toast.error('Error al eliminar ítems de compra.');
      return;
    }

    // Luego eliminar la cabecera de compra
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

  // --- Lógica de edición (Si la necesitas, asegúrate de que esté completa) ---
  // Por ahora, solo se usa para el modal de edición de producto en ProductosItems.jsx,
  // pero si quieres editar compras aquí, necesitarías implementar estas funciones.

  // --- Lógica para afectar inventario con prorrateo de costos ---

    // 8) Afectar inventario con prorrateo de costos
    const confirmarAfectInventory = async () => {
      // Obtener configuración de gastos y el índice de la compra seleccionada
      const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig;

      // Validar que se haya seleccionado una compra y completado los campos de gastos
      // Aunque el botón esté siempre visible, la lógica de afectación solo tiene sentido si una compra está seleccionada (expandida)
      // y los campos de gastos tienen valores.
      if (targetIdx === null || gastosImportacion === '' || tipoCambioImportacion === '' || otrosGastos === '') {
        toast.error('Selecciona una compra y completa los campos de gastos de importación y otros gastos.');
        return;
      }

      // Obtener los datos de la compra seleccionada (cabecera)
      const { compra } = savedCompras[targetIdx];
      // <<< USAR LOS ÍTEMS DEL ESTADO DE EDICIÓN SI LA COMPRA ACTUALMENTE EXPANDIDA ES LA SELECCIONADA >>>
      // Si la compra expandida es la misma que la seleccionada para afectar Y hay ítems en edición, usar esos ítems
      // De lo contrario, usar los ítems originales de savedCompras (esto último no debería ocurrir con la UI actual)
      const itemsToProcess = expandedIdx === targetIdx && currentEditingItems ? currentEditingItems : savedCompras[targetIdx].items;

      // Validar si hay ítems para procesar
      if (itemsToProcess.length === 0) {
          toast.error('La compra seleccionada no tiene ítems para afectar el inventario.');
          return;
      }


      // Ya no validamos si la compra ya afectó el inventario aquí,
      // permitiendo re-afectar si se desea.
      // if (compra.inventario_afectado) { ... }


      // 8.1) Actualizar cabecera de la compra para registrar los gastos y marcar como afectada
      // Aunque se re-afecte, volvemos a marcar como true y actualizamos los gastos
      console.log(`[Afectar Inventario] Actualizando/Re-afectando cabecera de compra ${compra.id}...`);
      const { error: errCab } = await supabase
        .from('compras')
        .update({
          gastos_importacion: Number(gastosImportacion),
          tipo_cambio_importacion: Number(tipoCambioImportacion),
          otros_gastos: Number(otrosGastos),
          inventario_afectado: true // Siempre marcamos como afectada (o re-marcamos)
        })
        .eq('id', compra.id); // Actualizar la compra específica

      if (errCab) {
        console.error('[Afectar Inventario] Error al actualizar cabecera de compra:', errCab.message);
        toast.error('Error al actualizar compra para afectar inventario: ' + errCab.message);
        return; // Detener si hay un error
      }
      console.log(`[Afectar Inventario] Cabecera de compra ${compra.id} actualizada/re-afectada.`);


      // 8.2) Traer catálogo actual de productos para verificar existencia y stock
      console.log('[Afectar Inventario] Cargando catálogo de productos...');
      const { data: catalogo = [], error: errCat } = await supabase
        .from('productos')
        .select('id, nombre, stock'); // Seleccionar ID, nombre y stock

      if (errCat) {
        console.error('[Afectar Inventario] Error al cargar catálogo de productos:', errCat.message);
        toast.error('Error al cargar catálogo de productos: ' + errCat.message);
        return; // Detener si hay un error
      }
      console.log(`[Afectar Inventario] Catálogo cargado. ${catalogo.length} productos encontrados.`);


      // 8.3) Prorrateo de costos: calcular subtotales y repartir gastos
      console.log('[Afectar Inventario] Calculando prorrateo de costos...');
      // Calcular el subtotal bruto de la compra (suma de cantidad * precio unitario USD)
      // <<< USAR itemsToProcess AQUÍ >>>
      const subtotalBruto = itemsToProcess.reduce((sum, p) => sum + (p.cantidad || 0) * (p.precioUnitarioUSD || 0), 0) || 1; // Evitar división por cero

      // Sumar todos los gastos adicionales
      const gastosTotales =
        Number(compra.descuento_total_usd || 0) * -1 + // El descuento se suma como gasto negativo
        Number(compra.gastos_envio_usa || 0) +
        Number(gastosImportacion) +
        Number(otrosGastos);

      console.log(`[Afectar Inventario] Subtotal Bruto: ${subtotalBruto.toFixed(2)} USD`);
      console.log(`[Afectar Inventario] Gastos Totales Netos: ${gastosTotales.toFixed(2)} USD`);

      // Recorrer cada ítem de la compra para calcular sus costos finales
      // <<< USAR itemsToProcess AQUÍ >>>
      itemsToProcess.forEach(p => {
        const aporte = ((p.cantidad || 0) * (p.precioUnitarioUSD || 0)) / subtotalBruto;
        const costoBruto = (p.precioUnitarioUSD || 0);
        const costoAjuste = (aporte * gastosTotales) / (p.cantidad || 1); // Evitar división por cero
        const costoFinalUSD = costoBruto + costoAjuste;

        p.costoFinalUSD = parseFloat(costoFinalUSD.toFixed(4));

        // <<< MODIFICACIÓN AQUÍ: CALCULAR COSTO FINAL MXN PROMEDIANDO TIPOS DE CAMBIO >>>
        const tipoCambioVenta = Number(compra.tipo_cambio_dia || 0); // Obtener Tipo de Cambio Venta de la cabecera
        const tipoCambioImport = Number(tipoCambioImportacion); // Obtener Tipo de Cambio Importación del formulario
        // Asegurarse de que ambos tipos de cambio sean válidos antes de promediar
        const tipoCambioPromedio = (tipoCambioVenta > 0 && tipoCambioImport > 0) ? (tipoCambioVenta + tipoCambioImport) / 2 : (tipoCambioVenta > 0 ? tipoCambioVenta : (tipoCambioImport > 0 ? tipoCambioImport : 1)); // Promedio o el que sea válido, por defecto 1

        p.costoFinalMXN = parseFloat((p.costoFinalUSD * tipoCambioPromedio).toFixed(2)); // Multiplicar costo USD por promedio


        console.log(`[Afectar Inventario] Item "${p.nombreProducto}": Costo Final USD=${p.costoFinalUSD}, Tipo Cambio Promedio=${tipoCambioPromedio.toFixed(4)}, Costo Final MXN=${p.costoFinalMXN}`);
      });
      console.log('[Afectar Inventario] Prorrateo completado.');


      // 8.4) Recorrer los ítems con costos prorrateados y actualizar/insertar productos + registrar movimiento
      console.log('[Afectar Inventario] Procesando ítems para actualizar/insertar productos y registrar movimientos...');
       // <<< USAR itemsToProcess AQUÍ >>>
      for (const p of itemsToProcess) {
        // Buscar si el producto ya existe en el catálogo cargado
        let prod = catalogo.find(x => x.nombre === p.nombreProducto);
        let productoIdParaMovimiento = null; // Variable para guardar el ID del producto (existente o nuevo)

        if (prod) {
          console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" encontrado en catálogo (ID: ${prod.id}). Actualizando...`);
          console.log(`[Afectar Inventario] Valores a actualizar para "${p.nombreProducto}": stock=${(prod.stock || 0) + (p.cantidad || 0)}, precio_unitario_usd=${(p.precioUnitarioUSD || 0)}, costo_final_usd=${p.costoFinalUSD}, costo_final_mxn=${p.costoFinalMXN}`);

          // Si el producto existe: actualizar stock y costos
          // NOTA IMPORTANTE: Al re-afectar, esto SUMARÁ la cantidad al stock existente CADA VEZ.
          // Si necesitas que re-afectar CORRIJA el stock en lugar de sumarlo,
          // la lógica aquí debería ser diferente (ej: calcular la diferencia de stock
          // entre los ítems originales y los editados, o resetear el stock y volver a sumar).
          // Por ahora, mantiene la lógica de sumar la cantidad del ítem.
          const { error: errUpd } = await supabase
            .from('productos')
            .update({
              stock: (prod.stock || 0) + (p.cantidad || 0), // Esto sumará la cantidad CADA VEZ que se afecte
              // Nota: precio_unitario_usd se actualiza con el precio original de la compra,
              // mientras que costo_final_usd/mxn se actualizan con los costos prorrateados.
              precio_unitario_usd: (p.precioUnitarioUSD || 0), // Precio original de esta compra (editado si se modificó)
              costo_final_usd: p.costoFinalUSD, // Costo calculado con prorrateo
              costo_final_mxn: p.costoFinalMXN // Costo calculado en MXN
            })
            .eq('id', prod.id);

          if (errUpd) {
            console.error(`[Afectar Inventario] Error al actualizar producto "${p.nombreProducto}" (ID: ${prod.id}):`, errUpd.message);
            toast.error(`Error al actualizar producto ${p.nombreProducto}.`);
            // No usamos 'return' aquí para intentar procesar los demás ítems
          } else {
             console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" actualizado exitosamente.`);
          }
          productoIdParaMovimiento = prod.id; // Usar el ID del producto existente

        } else {
          console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" NO encontrado en catálogo. Insertando nuevo producto...`);
           console.log(`[Afectar Inventario] Valores a insertar para "${p.nombreProducto}": nombre=${p.nombreProducto}, stock=${(p.cantidad || 0)}, precio_unitario_usd=${(p.precioUnitarioUSD || 0)}, costo_final_usd=${p.costoFinalUSD}, costo_final_mxn=${p.costoFinalMXN}`);

          // Si el producto NO existe: insertar un nuevo producto
          const { data: newProd, error: errIns } = await supabase
            .from('productos')
            .insert({
              nombre: p.nombreProducto,
              stock: (p.cantidad || 0),
              precio_unitario_usd: (p.precioUnitarioUSD || 0),
              costo_final_usd: p.costoFinalUSD,
              costo_final_mxn: p.costoFinalMXN
              // Otros campos del producto deberían tener valores por defecto o ser añadidos aquí si son obligatorios
            })
            .select('id')
            .single();

          if (errIns) {
            console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}":`, errIns.message);
            toast.error(`Error al crear producto ${p.nombreProducto}.`);
             // No usamos 'return' aquí
          } else if (newProd && newProd.id) {
             console.log(`[Afectar Inventario] Producto "${p.nombreProducto}" creado exitosamente (ID: ${newProd.id}).`);
             productoIdParaMovimiento = newProd.id; // Usar el ID del producto recién creado
          } else {
             console.error(`[Afectar Inventario] Error al crear producto "${p.nombreProducto}": No se recibió ID del nuevo producto.`);
             toast.error(`Error al crear producto ${p.nombreProducto}: No se recibió ID.`);
          }
        }

        // Si se obtuvo un ID de producto (ya sea existente o nuevo), registrar el movimiento de entrada
        console.log(`[Afectar Inventario] Verificando productoIdParaMovimiento para "${p.nombreProducto}":`, productoIdParaMovimiento);
        if (productoIdParaMovimiento) {
            // NOTA IMPORTANTE: Al re-afectar, esto registrará un NUEVO movimiento de entrada CADA VEZ.
            // Si necesitas evitar movimientos duplicados al re-afectar, podrías necesitar
            // verificar si ya existe un movimiento para esta compra/producto o tener una lógica diferente.
            console.log(`[Afectar Inventario] Registrando movimiento de entrada para producto ID ${productoIdParaMovimiento}...`);
            const { error: errMov } = await supabase.from('movimientos_inventario').insert({
                tipo: 'ENTRADA', // <<< CORREGIDO: Usar 'ENTRADA'
                producto_id: productoIdParaMovimiento,
                cantidad: (p.cantidad || 0), // Cantidad del ítem (editada si se modificó)
                referencia: compra.numero_pedido,
                motivo: 'compra', // Añadido motivo
                fecha: new Date().toISOString() // Fecha y hora actual del movimiento
            });

            if (errMov) {
                console.error(`[Afectar Inventario] Error al registrar movimiento para producto ID ${productoIdParaMovimiento}:`, errMov.message);
                toast.error(`Error al registrar movimiento para ${p.nombreProducto}.`);
                // El proceso continuará aunque falle el registro del movimiento para este ítem
            } else {
                console.log(`[Afectar Inventario] Movimiento de entrada registrado para producto ID ${productoIdParaMovimiento}.`);
            }
        } else {
            console.warn(`[Afectar Inventario] No se pudo obtener ID de producto para "${p.nombreProducto}". No se registrará movimiento de entrada.`);
            toast.warn(`Advertencia: No se pudo registrar movimiento para ${p.nombreProducto}.`);
        }
      } // Fin del bucle for...of sobre los ítems
      console.log('[Afectar Inventario] Procesamiento de ítems completado.');


      // 8.5) Refrescar la lista de compras y limpiar el formulario de afectación
      console.log('[Afectar Inventario] Refrescando lista de compras y limpiando formulario...');
      fetchCompras(); // Recargar la lista para mostrar el estado 'inventario_afectado' (que siempre será true ahora)
      // Limpiar los campos de configuración de inventario
      setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null });
      // Limpiar el estado de edición de ítems
      setCurrentEditingItems(null);
      // Mostrar mensaje de éxito
      // Considera si quieres un mensaje diferente al re-afectar
      toast.success(`Inventario afectado exitosamente para pedido ${compra.numero_pedido}`);
      console.log('[Afectar Inventario] Proceso de afectación de inventario finalizado.');
    };


  // --- JSX para renderizar la UI ---
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-100 rounded-lg shadow-xl"> {/* Contenedor principal con estilos mejorados */}
      {/* Botón Volver al inicio */}
      <button
        onClick={() => navigate('/')}
        className="mb-6 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
      >
        Volver al inicio
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Gestión de Compras</h1>

      {/* Botón para mostrar/ocultar formulario */}
      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        className={`mb-6 px-6 py-2 rounded-lg shadow-md transition duration-200 ${mostrarFormulario ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        {mostrarFormulario ? 'Cancelar Registro' : 'Registrar Nueva Compra'}
      </button>

      {/* Formulario de registro de nueva compra */}
      {mostrarFormulario && (
        <div className="mb-8 p-6 border border-gray-200 rounded-lg shadow-xl bg-white">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Nueva Compra</h2>
          {/* Campos de cabecera */}
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
                type="date" // Cambiado a type="date" para un mejor selector
                name="fechaCompra"
                placeholder="Fecha de Compra" // Placeholder puede ser redundante con type="date"
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
                  list="nombres-sugeridos" // Enlazar con la lista de sugerencias
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
             <button onClick={agregarProducto} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                Agregar Producto
              </button>
          </div>


          {/* Tabla productos agregados */}
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

      {/* Lista de compras guardadas */}
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
              {/* Botón para eliminar la compra */}
              <button
                onClick={(e) => {
                    e.stopPropagation(); // Evitar que el clic expanda/colapse
                    eliminarCompra(compraData.compra.id);
                }}
                className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>

            {/* Detalles de la compra (ítems) - visible cuando se expande */}
            {expandedIdx === index && (
              <div className="p-4 bg-white border-t">
                <h3 className="text-lg font-medium mb-3">Ítems de la Compra:</h3>
                {/* Mostrar ítems editables si la compra actual es la expandida */}
                {currentEditingItems && expandedIdx === index ? (
                    <div className="space-y-3 mb-4">
                        {currentEditingItems.map((item, itemIndex) => (
                            <div key={item.id} className="grid grid-cols-3 gap-4 items-center text-sm text-gray-700">
                                {/* Nombre del producto (no editable) */}
                                <div className="font-medium">{item.nombreProducto}</div>
                                {/* Cantidad (editable) */}
                                <div>
                                    <label className="block text-xs text-gray-500">Cantidad</label>
                                    <input
                                        type="number"
                                        value={item.cantidad}
                                        onChange={(e) => handleItemInputChange(itemIndex, 'cantidad', e.target.value)}
                                        className="w-full border border-gray-300 p-1 rounded text-right text-sm"
                                    />
                                </div>
                                {/* Precio Unitario USD (editable) */}
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
                    // Esto no debería ocurrir con la lógica actual, pero se mantiene como fallback
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
                    <div><span className="font-semibold">Descuento Total (USD):</span> ${compraData.compra.descuento_total_usd?.toFixed(2) || '0.00'}</div>
                    <div><span className="font-semibold">Gastos Envío USA (USD):</span> ${compraData.compra.gastos_envio_usa?.toFixed(2) || '0.00'}</div>
                     {/* >>> AÑADIDA LÍNEA PARA MOSTRAR TIPO DE CAMBIO VENTA <<< */}
                    <div><span className="font-semibold">Tipo de Cambio Venta:</span> {compraData.compra.tipo_cambio_dia?.toFixed(2) || 'N/A'}</div>
                    {/* Mostrar gastos de importación y tipo de cambio si ya fueron afectados */}
                    {/* Esta sección se muestra si inventario_afectado es true, mostrando los gastos registrados */}
                    {compraData.compra.inventario_afectado && (
                         <>
                            <div><span className="font-semibold">Gastos Importación Registrados:</span> ${compraData.compra.gastos_importacion?.toFixed(2) || '0.00'}</div>
                            <div><span className="font-semibold">Tipo de Cambio Importación Registrado:</span> {compraData.compra.tipo_cambio_importacion?.toFixed(2) || 'N/A'}</div>
                            <div><span className="font-semibold">Otros Gastos Registrados:</span> ${compraData.compra.otros_gastos?.toFixed(2) || '0.00'}</div>
                         </>
                    )}
                </div>

                {/* Sección para afectar inventario - SIEMPRE VISIBLE AL EXPANDIR */}
                {/* Eliminamos la condición !compraData.compra.inventario_afectado */}
                <div className="p-3 border rounded bg-yellow-50"> {/* Podrías cambiar el color si ya está afectado */}
                    <h3 className="text-lg font-medium mb-3">Afectar Inventario con esta Compra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Campo para Gastos Importación con Label */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Gastos Importación</label>
                            <input
                                type="number"
                                placeholder="Ej: 79.00" // Añadido placeholder de ejemplo
                                // Inicializar con los valores guardados si existen, de lo contrario vacío
                                value={invConfig.targetIdx === index ? (invConfig.gastosImportacion === '' ? compraData.compra.gastos_importacion ?? '' : invConfig.gastosImportacion) : ''}
                                onChange={(e) => setInvConfig(prev => ({ ...prev, gastosImportacion: e.target.value, targetIdx: index }))}
                                className="w-full border border-gray-300 p-2 rounded"
                            />
                        </div>
                        {/* Campo para Tipo de Cambio Importación con Label */}
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Cambio Importación</label>
                            <input
                                type="number"
                                placeholder="Ej: 20.35" // Añadido placeholder de ejemplo
                                 // Inicializar con los valores guardados si existen, de lo contrario vacío
                                value={invConfig.targetIdx === index ? (invConfig.tipoCambioImportacion === '' ? compraData.compra.tipo_cambio_importacion ?? '' : invConfig.tipoCambioImportacion) : ''}
                                onChange={(e) => setInvConfig(prev => ({ ...prev, tipoCambioImportacion: e.target.value, targetIdx: index }))}
                                className="w-full border border-gray-300 p-2 rounded"
                            />
                        </div>
                        {/* Campo para Otros Gastos con Label */}
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Otros Gastos</label>
                            <input
                                type="number"
                                placeholder="Ej: 0.00" // Añadido placeholder de ejemplo
                                 // Inicializar con los valores guardados si existen, de lo contrario vacío
                                value={invConfig.targetIdx === index ? (invConfig.otrosGastos === '' ? compraData.compra.otros_gastos ?? '' : invConfig.otrosGastos) : ''}
                                onChange={(e) => setInvConfig(prev => ({ ...prev, otrosGastos: e.target.value, targetIdx: index }))}
                                className="w-full border border-gray-300 p-2 rounded"
                            />
                        </div>
                    </div>
                    <button
                        onClick={confirmarAfectInventory}
                        // Eliminamos la condición 'disabled' para que el botón esté siempre habilitado
                        // disabled={invConfig.targetIdx !== index || !invConfig.gastosImportacion || !invConfig.tipoCambioImportacion || !invConfig.otrosGastos}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50" // La clase disabled:opacity-50 aún se puede aplicar si el botón se desabilita por JS en el futuro
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
  );
}

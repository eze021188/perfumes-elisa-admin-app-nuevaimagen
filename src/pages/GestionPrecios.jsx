// src/pages/GestionPrecios.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Tag,
  DollarSign,
  Layers,
  Percent,
  CheckSquare,
  Square,
  ChevronUp, // Para iconos de ordenamiento
  ChevronDown, // Para iconos de ordenamiento
  Filter,
  Package,
  Save,
  Trash2,
  Coins, // Usado como icono para la gestión de precios
  Download // Importar el icono de descarga
} from 'lucide-react';

// Helper para formatear moneda (asegúrate de que esta función esté disponible globalmente o sea importada)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN', // Moneda en MXN para esta página
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// NUEVA FUNCIÓN: Redondeo personalizado al múltiplo de 5 más cercano según tus ejemplos
const roundToNearestFiveSpecific = (num) => {
    const integerPart = Math.round(num); // Redondea al entero más cercano primero
    const remainder = integerPart % 5;

    if (remainder === 0) {
        return integerPart;
    } else if (remainder <= 2) { // Si el resto es 0, 1, 2, redondea hacia abajo al múltiplo de 5
        return integerPart - remainder;
    } else { // Si el resto es 3, 4, redondea hacia arriba al múltiplo de 5
        return integerPart + (5 - remainder);
    }
};

export default function GestionPrecios() {
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de filtro y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('All');
  // CAMBIO: `filtroPromocion` ahora manejará opciones de stock también.
  const [filtroPromocion, setFiltroPromocion] = useState('All'); // 'All', 'Con Promoción', 'Sin Promoción', 'Con stock', 'Sin stock'
  const [filtroMargen, setFiltroMargen] = useState('All'); // 'All', 'Bajo', 'Medio', 'Alto', 'Personalizado'
  const [margenMin, setMargenMin] = useState('');
  const [margenMax, setMargenMax] = useState('');
  const [filtroPreciosInvalidos, setFiltroPreciosInvalidos] = useState(false); // true/false

  // Estados de ordenamiento
  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  // Estado para la selección de productos (para acciones masivas)
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Estado para acciones masivas
  const [accionMasiva, setAccionMasiva] = useState(''); // 'descuento_porcentaje', 'incremento_monto', 'establecer_margen_porcentaje_normal', etc.
  const [valorAccionMasiva, setValorAccionMasiva] = useState('');
  const [applyingMassiveAction, setApplyingMassiveAction] = useState(false); // Nuevo estado para feedback visual

  // Estado para controlar la edición individual de precios en la tabla
  const [editingCell, setEditingCell] = useState(null); // { id: productId, field: 'precio_normal' }

  // Obtener lista de categorías únicas para el filtro
  const categorias = useMemo(() => {
    const uniqueCategories = new Set(productos.map(p => p.categoria).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories).sort()];
  }, [productos]);


  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Traer todos los datos necesarios para precios y márgenes
      const { data, error } = await supabase.from('productos').select(`
        id,
        nombre,
        categoria,
        stock,
        costo_final_mxn,
        precio_normal,
        promocion,
        descuento_lote,
        codigo,
        imagen_url
      `);

      if (error) throw error;

      // Calcular márgenes y otros datos derivados
      const productosCalculados = data.map(p => {
        const costo = parseFloat(p.costo_final_mxn || 0);
        const precioNormal = parseFloat(p.precio_normal || 0);
        const precioPromocion = parseFloat(p.promocion || 0);
        const descuentoLote = parseFloat(p.descuento_lote || 0);

        // Lógica para determinar el precio de venta efectivo para el cálculo del margen
        // 1. descuento_lote, 2. promocion, 3. precio_normal
        let precioVentaEfectivo = 0;
        if (descuentoLote > 0) {
            precioVentaEfectivo = descuentoLote;
        } else if (precioPromocion > 0) {
            precioVentaEfectivo = precioPromocion;
        } else {
            precioVentaEfectivo = precioNormal;
        }
        
        let margenBrutoMXN = 0;
        let margenBrutoPorcentaje = 0;

        if (precioVentaEfectivo > 0 && costo > 0) { // Solo calcular si hay precio de venta y costo válidos
            margenBrutoMXN = precioVentaEfectivo - costo;
            margenBrutoPorcentaje = (margenBrutoMXN / precioVentaEfectivo) * 100;
        } else if (precioVentaEfectivo > 0 && costo === 0) { // Si hay precio pero no costo, margen es 100% (si el costo es 0)
            margenBrutoMXN = precioVentaEfectivo;
            margenBrutoPorcentaje = 100;
        }


        return {
          ...p,
          costo_final_mxn: costo,
          precio_normal: precioNormal,
          promocion: precioPromocion,
          descuento_lote: descuentoLote, // Asegurarse de que el valor exista
          margen_bruto_mxn: margenBrutoMXN,
          margen_bruto_porcentaje: margenBrutoPorcentaje,
          en_promocion: precioPromocion > 0 || descuentoLote > 0, // Considerar si descuento_lote también indica promoción
          precios_validos: precioNormal > 0 && costo >= 0, // Definir "válido": precio normal > 0 y costo >= 0
        };
      });

      setProductos(productosCalculados);
    } catch (err) {
      console.error('Error al cargar productos:', err.message);
      setError('Error al cargar productos para la gestión de precios.');
      toast.error('Error al cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtrado y ordenamiento
  const productosFiltradosYOrdenados = useMemo(() => {
    let productosTrabajo = [...productos];

    // 1. Filtrar por búsqueda
    if (busqueda) {
      const lowerBusqueda = busqueda.toLowerCase();
      productosTrabajo = productosTrabajo.filter(p =>
        (p.nombre || '').toLowerCase().includes(lowerBusqueda) ||
        (p.codigo || '').toLowerCase().includes(lowerBusqueda) ||
        (p.categoria || '').toLowerCase().includes(lowerBusqueda)
      );
    }

    // 2. Filtrar por categoría
    if (filtroCategoria !== 'All') {
      productosTrabajo = productosTrabajo.filter(p => p.categoria === filtroCategoria);
    }

    // 3. Filtrar por promoción Y/O stock (Ahora combinados en filtroPromocion)
    if (filtroPromocion === 'Con Promoción') {
      productosTrabajo = productosTrabajo.filter(p => p.en_promocion);
    } else if (filtroPromocion === 'Sin Promoción') {
      productosTrabajo = productosTrabajo.filter(p => !p.en_promocion);
    } else if (filtroPromocion === 'Con stock') { // NUEVO FILTRO DE STOCK
        productosTrabajo = productosTrabajo.filter(p => p.stock && parseFloat(p.stock) > 0);
    } else if (filtroPromocion === 'Sin stock') { // NUEVO FILTRO DE STOCK
        productosTrabajo = productosTrabajo.filter(p => !p.stock || parseFloat(p.stock) <= 0);
    }

    // 4. Filtrar por precios inválidos
    if (filtroPreciosInvalidos) {
      productosTrabajo = productosTrabajo.filter(p => !p.precios_validos);
    }

    // 5. Filtrar por margen de ganancia
    if (filtroMargen !== 'All') {
        if (filtroMargen === 'Bajo') { // Ejemplo: margen < 20%
            productosTrabajo = productosTrabajo.filter(p => p.margen_bruto_porcentaje < 20);
        } else if (filtroMargen === 'Medio') { // Ejemplo: margen entre 20% y 50%
            productosTrabajo = productosTrabajo.filter(p => p.margen_bruto_porcentaje >= 20 && p.margen_bruto_porcentaje < 50);
        } else if (filtroMargen === 'Alto') { // Ejemplo: margen >= 50%
            productosTrabajo = productosTrabajo.filter(p => p.margen_bruto_porcentaje >= 50);
        } else if (filtroMargen === 'Personalizado') {
            const min = parseFloat(margenMin);
            const max = parseFloat(margenMax);
            if (!isNaN(min)) productosTrabajo = productosTrabajo.filter(p => p.margen_bruto_porcentaje >= min);
            if (!isNaN(max)) productosTrabajo = productosTrabajo.filter(p => p.margen_bruto_porcentaje <= max);
        }
    }


    // 6. Ordenar
    if (sortColumn) {
      productosTrabajo.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

        // Ordenamiento numérico para columnas de precios y stock
        if (['stock', 'costo_final_mxn', 'precio_normal', 'promocion', 'descuento_lote', 'margen_bruto_mxn', 'margen_bruto_porcentaje'].includes(sortColumn)) {
          const numA = parseFloat(aValue);
          const numB = parseFloat(bValue);
          if (numA < numB) return sortDirection === 'asc' ? -1 : 1;
          if (numA > numB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        }

        // Ordenamiento alfabético para texto
        const stringA = String(aValue).toLowerCase();
        const stringB = String(bValue).toLowerCase();
        if (stringA < stringB) return sortDirection === 'asc' ? -1 : 1;
        if (stringA > stringB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return productosTrabajo;
  }, [productos, busqueda, filtroCategoria, filtroPromocion, filtroMargen, margenMin, margenMax, filtroPreciosInvalidos, sortColumn, sortDirection]);

  // Manejo de selección de productos
  const toggleSelectAll = useCallback(() => {
    if (selectedProductIds.size === productosFiltradosYOrdenados.length && productosFiltradosYOrdenados.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(productosFiltradosYOrdenados.map(p => p.id)));
    }
  }, [selectedProductIds, productosFiltradosYOrdenados]);

  const toggleSelectProduct = useCallback((id) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Manejo de ordenamiento de tabla
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Manejo de edición de celdas individuales (precios)
  const handleCellClick = (productId, fieldName) => {
    // Si se hace clic en 'promocion', en realidad editamos 'descuento_lote'
    const actualFieldName = fieldName === 'promocion' ? 'descuento_lote' : fieldName;
    setEditingCell({ id: productId, field: actualFieldName });
  };

  const handlePriceChange = (e, productId, fieldName) => {
    const newValue = e.target.value;
    setProductos(prev => prev.map(p => 
      p.id === productId ? { ...p, [fieldName]: newValue } : p
    ));
  };

  const handlePriceBlur = async (e, productId, fieldName) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value) || value < 0) {
      toast.error('El valor debe ser un número positivo.');
      // Revertir al valor anterior si es inválido
      setProductos(prev => prev.map(p => 
        p.id === productId ? { ...p, [fieldName]: productos.find(prod => prod.id === productId)[fieldName] } : p
      ));
      setEditingCell(null);
      return;
    }

    const updatedValue = value.toFixed(2);
    setProductos(prev => prev.map(p => 
      p.id === productId ? { ...p, [fieldName]: updatedValue } : p
    ));
    setEditingCell(null);

    // Llamada a Supabase para actualizar el producto individual
    // Aquí fieldName será 'precio_normal' o 'descuento_lote' o 'costo_final_mxn'
    const { error } = await supabase
        .from('productos')
        .update({ [fieldName]: updatedValue })
        .eq('id', productId);

    if (error) {
        toast.error(`Error al actualizar ${fieldName}: ${error.message}`);
        cargarProductos(); // Recargar productos para asegurar consistencia
    } else {
        toast.success('Precio actualizado.');
        cargarProductos(); // Recargar para recalcular márgenes
    }
  };

  // Acciones masivas
  const handleApplyMassiveAction = async () => {
    if (selectedProductIds.size === 0) {
      toast.error('Selecciona al menos un producto.');
      return;
    }
    if (!accionMasiva || (accionMasiva !== 'limpiar_promocion' && (!valorAccionMasiva || isNaN(parseFloat(valorAccionMasiva))))) {
      toast.error('Selecciona una acción y un valor válido.');
      return;
    }

    const valorNum = parseFloat(valorAccionMasiva);
    // Validaciones
    if (accionMasiva !== 'limpiar_promocion') {
        if (isNaN(valorNum) || valorNum < 0) {
            toast.error('El valor para la acción debe ser un número positivo.');
            return;
        }
        if (accionMasiva.includes('porcentaje') && (valorNum < 0 || valorNum > 100)) {
            toast.error('El porcentaje debe estar entre 0 y 100.');
            return;
        }
        // Validación para Establecer Margen %
        if (accionMasiva.includes('establecer_margen_porcentaje') && (valorNum >= 100)) { // Margen no puede ser 100% o más
             toast.error('El margen de ganancia debe ser menor al 100%.');
             return;
        }
    }


    const confirmMessage = `¿Estás seguro de aplicar la acción "${accionMasiva}" con valor "${valorAccionMasiva}" a ${selectedProductIds.size} producto(s)? Esta acción es irreversible.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setApplyingMassiveAction(true);
    let updates = [];

    // Pre-calcular las actualizaciones para todos los productos seleccionados
    productosFiltradosYOrdenados.forEach(p => {
        if (selectedProductIds.has(p.id)) {
            let newPrice = null;
            let targetField = ''; 
            let currentPrice = 0; 

            // Determinar el campo objetivo y el precio/costo base para el cálculo
            if (accionMasiva.includes('normal')) {
                targetField = 'precio_normal';
                currentPrice = p.precio_normal;
            } else if (accionMasiva.includes('promocion') && !accionMasiva.includes('margen')) { // Las acciones de "promoción" (excepto margen) afectan "descuento_lote"
                targetField = 'descuento_lote';
                currentPrice = p.descuento_lote > 0 ? p.descuento_lote : p.promocion > 0 ? p.promocion : p.precio_normal;
            } else if (accionMasiva.includes('costo_mxn') && !accionMasiva.includes('margen')) { // ACCIÓN: Costo MXN, ahora afecta a 'promocion'
                targetField = 'promocion'; // CAMBIO CLAVE: Afectar 'promocion'
                currentPrice = p.costo_final_mxn; // Base del cálculo es el costo_final_mxn
            } else if (accionMasiva.includes('establecer_margen_porcentaje_normal')) {
                targetField = 'precio_normal';
                currentPrice = p.costo_final_mxn; // Base del cálculo es el costo_final_mxn
            } else if (accionMasiva.includes('establecer_margen_porcentaje_promocion')) {
                targetField = 'descuento_lote'; // Afecta descuento_lote para margen sobre promocion
                currentPrice = p.costo_final_mxn; // Base del cálculo es el costo_final_mxn
            } else if (accionMasiva.includes('establecer_margen_porcentaje_costo_mxn')) { // Nueva opción de margen en costo, afecta 'promocion'
                targetField = 'promocion'; // CAMBIO CLAVE: Afectar 'promocion'
                currentPrice = p.costo_final_mxn; // Base del cálculo es el costo_final_mxn
            }

            switch (accionMasiva) {
                case 'descuento_porcentaje_normal':
                case 'descuento_monto_normal':
                case 'incremento_porcentaje_normal':
                case 'incremento_monto_normal':
                case 'establecer_normal':
                    newPrice = (accionMasiva === 'establecer_normal') ? valorNum :
                                (accionMasiva.includes('porcentaje')) ? currentPrice * (1 + (valorNum / 100) * (accionMasiva.includes('descuento') ? -1 : 1)) :
                                currentPrice + valorNum * (accionMasiva.includes('descuento') ? -1 : 1);
                    break;

                case 'descuento_porcentaje_promocion':
                case 'descuento_monto_promocion':
                case 'incremento_porcentaje_promocion':
                case 'incremento_monto_promocion':
                case 'establecer_promocion':
                    newPrice = (accionMasiva === 'establecer_promocion') ? valorNum :
                                (accionMasiva.includes('porcentaje')) ? currentPrice * (1 + (valorNum / 100) * (accionMasiva.includes('descuento') ? -1 : 1)) :
                                currentPrice + valorNum * (accionMasiva.includes('descuento') ? -1 : 1);
                    break;
                
                case 'descuento_porcentaje_costo_mxn': 
                case 'descuento_monto_costo_mxn': 
                case 'incremento_porcentaje_costo_mxn': 
                case 'incremento_monto_costo_mxn': 
                case 'establecer_costo_mxn': 
                    newPrice = (accionMasiva === 'establecer_costo_mxn') ? valorNum :
                                (accionMasiva.includes('porcentaje')) ? currentPrice * (1 + (valorNum / 100) * (accionMasiva.includes('descuento') ? -1 : 1)) :
                                currentPrice + valorNum * (accionMasiva.includes('descuento') ? -1 : 1);
                    break;

                case 'establecer_margen_porcentaje_normal': 
                case 'establecer_margen_porcentaje_promocion': 
                case 'establecer_margen_porcentaje_costo_mxn': 
                    if (currentPrice === 0) { 
                         toast.error(`No se puede establecer margen para productos con costo MXN de $0.00.`);
                         return; 
                    }
                    newPrice = currentPrice / (1 - (valorNum / 100));
                    // Aplicar redondeo al 5 más cercano para margen de ganancia
                    newPrice = roundToNearestFiveSpecific(newPrice); // CAMBIO CLAVE: Aplicar redondeo
                    break;

                case 'limpiar_promocion':
                    newPrice = null; 
                    targetField = 'descuento_lote'; 
                    break;
                default:
                    break;
            }
            
            // Asegurar que los precios no sean negativos y formatear a 2 decimales, o dejar null si es limpiar promoción
            if (newPrice !== null || accionMasiva === 'limpiar_promocion') {
                updates.push({
                    id: p.id,
                    nombre: p.nombre, 
                    [targetField]: (newPrice !== null) ? Math.max(0, newPrice).toFixed(2) : null 
                });
            }
        }
    });

    if (updates.length === 0) {
        toast.info('No hay productos para actualizar o la acción no resultó en cambios.');
        setApplyingMassiveAction(false);
        return;
    }

    try {
        const { error: batchError } = await supabase.from('productos').upsert(updates, { onConflict: 'id' });

        if (batchError) {
            throw batchError;
        }

        toast.success(`${updates.length} productos actualizados exitosamente.`);
        setSelectedProductIds(new Set()); 
        setAccionMasiva('');
        setValorAccionMasiva('');
        cargarProductos(); 
    } catch (err) {
        toast.error(`Error al aplicar acción masiva: ${err.message}`);
        console.error('Error masivo de Supabase:', err);
    } finally {
        setApplyingMassiveAction(false);
    }
  };

  // Función para exportar a Excel
  const handleExportToExcel = () => {
    if (productosFiltradosYOrdenados.length === 0) {
      toast.info('No hay datos para exportar.');
      return;
    }

    const headers = [
      "Nombre",
      "Categoría",
      "Stock",
      "Costo MXN",
      "P. Normal MXN",
      "Promoción MXN",
      "Descuento Lote MXN", 
      "Margen MXN",
      "Margen %"
    ];

    const dataRows = productosFiltradosYOrdenados.map(p => [
      p.nombre,
      p.categoria || 'N/A',
      p.stock ?? 0,
      p.costo_final_mxn.toFixed(2),
      p.precio_normal.toFixed(2),
      p.promocion > 0 ? p.promocion.toFixed(2) : 'N/A',
      p.descuento_lote > 0 ? p.descuento_lote.toFixed(2) : 'N/A', 
      p.margen_bruto_mxn.toFixed(2),
      p.margen_bruto_porcentaje.toFixed(1) + '%'
    ]);

    const csvContent = [headers.join(','), ...dataRows.map(e => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'gestion_precios_productos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href); 
    
    toast.success('Datos exportados a Excel (CSV).');
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 p-4 md:p-8 flex items-center justify-center">
        <p className="text-error-400 text-center text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-100 text-center">Gestión de Precios (MXN)</h1>
        <div className="w-full md:w-[150px]" />
      </div>

      {/* Controles de Filtro y Búsqueda */}
      <div className="bg-dark-800 p-6 rounded-lg shadow-card-dark border border-dark-700/50 mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Filter size={20} className="text-primary-400" />
          Filtros y Búsqueda
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Búsqueda por Nombre/Código/Categoría */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          {/* Filtro por Categoría */}
          <div>
            <label htmlFor="filtroCategoria" className="sr-only">Categoría</label>
            <select
              id="filtroCategoria"
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat === 'All' ? 'Todas las Categorías' : cat}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Promoción / Stock */}
          <div>
            <label htmlFor="filtroPromocion" className="sr-only">Promoción / Stock</label>
            <select
              id="filtroPromocion"
              value={filtroPromocion}
              onChange={e => setFiltroPromocion(e.target.value)}
              className="w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            >
              <option value="All">Todos los Productos</option>
              <option value="Con Promoción">Solo con Promoción</option>
              <option value="Sin Promoción">Solo sin Promoción</option>
              <option value="Con stock">Sólo con stock</option>
              <option value="Sin stock">Sólo sin stock</option>
            </select>
          </div>

          {/* Filtro por Precios Inválidos */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="filtroPreciosInvalidos"
              checked={filtroPreciosInvalidos}
              onChange={e => setFiltroPreciosInvalidos(e.target.checked)}
              className="form-checkbox h-5 w-5 text-primary-600 rounded focus:ring-primary-500 bg-dark-900 border-dark-700"
            />
            <label htmlFor="filtroPreciosInvalidos" className="ml-2 text-sm text-gray-300">
              Mostrar solo Precios Inválidos
            </label>
          </div>

          {/* Filtro por Margen de Ganancia */}
          <div>
            <label htmlFor="filtroMargen" className="sr-only">Margen de Ganancia</label>
            <select
              id="filtroMargen"
              value={filtroMargen}
              onChange={e => setFiltroMargen(e.target.value)}
              className="w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            >
              <option value="All">Todos los Márgenes</option>
              <option value="Bajo">Margen Bajo (&lt;20%)</option>
              <option value="Medio">Margen Medio (20%-50%)</option>
              <option value="Alto">Margen Alto (&gt;50%)</option>
              <option value="Personalizado">Margen Personalizado</option>
            </select>
          </div>
          {filtroMargen === 'Personalizado' && (
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min %"
                value={margenMin}
                onChange={e => setMargenMin(e.target.value)}
                className="w-1/2 p-2 bg-dark-900 border border-dark-700 rounded-md text-gray-200"
              />
              <input
                type="number"
                placeholder="Max %"
                value={margenMax}
                onChange={e => setMargenMax(e.target.value)}
                className="w-1/2 p-2 bg-dark-900 border border-dark-700 rounded-md text-gray-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Acciones Masivas y Exportar */}
      <div className="bg-dark-800 p-6 rounded-lg shadow-card-dark border border-dark-700/50 mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Save size={20} className="text-primary-400" />
          Acciones Masivas ({selectedProductIds.size} productos seleccionados)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="accionMasiva" className="sr-only">Acción</label>
            <select
              id="accionMasiva"
              value={accionMasiva}
              onChange={e => setAccionMasiva(e.target.value)}
              className="w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            >
              <option value="">-- Selecciona una Acción --</option>
              <optgroup label="Descuentos">
                <option value="descuento_porcentaje_normal">Descuento % (P. Normal)</option>
                <option value="descuento_monto_normal">Descuento $ (P. Normal)</option>
                <option value="descuento_porcentaje_promocion">Descuento % (Promoción)</option>
                <option value="descuento_monto_promocion">Descuento $ (Promoción)</option>
              </optgroup>
              <optgroup label="Incrementos">
                <option value="incremento_porcentaje_normal">Incremento % (P. Normal)</option>
                <option value="incremento_monto_normal">Incremento $ (P. Normal)</option>
                <option value="incremento_porcentaje_promocion">Incremento % (Promoción)</option>
                <option value="incremento_monto_promocion">Incremento $ (Promoción)</option>
              </optgroup>
              <optgroup label="Costos">
                <option value="incremento_porcentaje_costo_mxn">Incremento % (Costo MXN)</option>
                <option value="incremento_monto_costo_mxn">Incremento $ (Costo MXN)</option>
                <option value="descuento_porcentaje_costo_mxn">Descuento % (Costo MXN)</option>
                <option value="descuento_monto_costo_mxn">Descuento $ (Costo MXN)</option>
                <option value="establecer_costo_mxn">Establecer Costo MXN</option>
              </optgroup>
              <optgroup label="Establecer Valor">
                <option value="establecer_normal">Establecer P. Normal</option>
                <option value="establecer_promocion">Establecer Promoción</option>
                <option value="establecer_margen_porcentaje_normal">Establecer Margen % (P. Normal)</option>
                <option value="establecer_margen_porcentaje_promocion">Establecer Margen % (Promoción)</option>
                <option value="establecer_margen_porcentaje_costo_mxn">Establecer Margen % (Costo MXN)</option>
                <option value="limpiar_promocion">Limpiar Promoción</option>
              </optgroup>
            </select>
          </div>
          {(accionMasiva !== 'limpiar_promocion' && accionMasiva !== '') && (
            <div>
              <label htmlFor="valorAccionMasiva" className="sr-only">Valor</label>
              <input
                type="number"
                placeholder="Valor a aplicar"
                value={valorAccionMasiva}
                onChange={e => setValorAccionMasiva(e.target.value)}
                className="w-full p-2 bg-dark-900 border border-dark-700 rounded-md text-gray-200"
              />
            </div>
          )}
          <button
            onClick={handleApplyMassiveAction}
            disabled={selectedProductIds.size === 0 || applyingMassiveAction || !accionMasiva || (accionMasiva !== 'limpiar_promocion' && (valorAccionMasiva === '' || isNaN(parseFloat(valorAccionMasiva))))}
            className="px-6 py-2 bg-success-600 text-white rounded-md shadow-elegant-dark hover:bg-success-700 transition-colors flex items-center gap-2 justify-center"
          >
            {applyingMassiveAction ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Aplicar Acción</span>
              </>
            )}
          </button>
        </div>

        {/* Botón Exportar a Excel */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExportToExcel}
            className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-elegant-dark hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Exportar a Excel
          </button>
        </div>
      </div>


      {/* Tabla de Productos */}
      <div className="bg-dark-800 rounded-lg shadow-card-dark border border-dark-700/50 overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-700">
          <thead className="bg-dark-900">
            <tr>
              {/* Checkbox global */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
                <div onClick={toggleSelectAll} className="cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">
                  {selectedProductIds.size === productosFiltradosYOrdenados.length && productosFiltradosYOrdenados.length > 0 ? (
                    <CheckSquare size={18} className="text-primary-400" />
                  ) : (
                    <Square size={18} />
                  )}
                </div>
              </th>
              {/* Columnas con ordenamiento */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('nombre')}>
                <div className="flex items-center gap-1"><span>Nombre</span> <Tag size={14}/> {sortColumn === 'nombre' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('categoria')}>
                <div className="flex items-center gap-1"><span>Categoría</span> <Layers size={14}/> {sortColumn === 'categoria' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('stock')}>
                <div className="flex items-center gap-1"><span>Stock</span> <Package size={14}/> {sortColumn === 'stock' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('costo_final_mxn')}>
                <div className="flex items-center gap-1"><span>Costo MXN</span> <DollarSign size={14}/> {sortColumn === 'costo_final_mxn' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('precio_normal')}>
                <div className="flex items-center gap-1"><span>P. Normal MXN</span> <DollarSign size={14}/> {sortColumn === 'precio_normal' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('descuento_lote')}>
                <div className="flex items-center gap-1"><span>Dscto. Lote MXN</span> <DollarSign size={14}/> {sortColumn === 'descuento_lote' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('promocion')}>
                <div className="flex items-center gap-1"><span>Promoción MXN</span> <DollarSign size={14}/> {sortColumn === 'promocion' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('margen_bruto_mxn')}>
                <div className="flex items-center gap-1"><span>Margen MXN</span> <DollarSign size={14}/> {sortColumn === 'margen_bruto_mxn' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200" onClick={() => handleSort('margen_bruto_porcentaje')}>
                <div className="flex items-center gap-1"><span>Margen %</span> <Percent size={14}/> {sortColumn === 'margen_bruto_porcentaje' && (sortDirection === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>)}</div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
            {productosFiltradosYOrdenados.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-12 text-center text-gray-500 italic">
                  No hay productos que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              productosFiltradosYOrdenados.map(p => (
                <tr key={p.id} className={`hover:bg-dark-700/50 transition-colors ${!p.precios_validos ? 'bg-error-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <div onClick={() => toggleSelectProduct(p.id)} className="cursor-pointer text-gray-400 hover:text-gray-200 transition-colors">
                      {selectedProductIds.has(p.id) ? (
                        <CheckSquare size={18} className="text-primary-400" />
                      ) : (
                        <Square size={18} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-200">{p.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{p.categoria || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 text-right">{p.stock ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatCurrency(p.costo_final_mxn)}</td>
                  
                  {/* Celda editable para Precio Normal */}
                  <td className="px-4 py-3 text-sm text-right">
                    {editingCell?.id === p.id && editingCell?.field === 'precio_normal' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={p.precio_normal}
                        onChange={(e) => handlePriceChange(e, p.id, 'precio_normal')}
                        onBlur={(e) => handlePriceBlur(e, p.id, 'precio_normal')}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        className="w-24 bg-dark-700 border-dark-600 rounded px-2 py-1 text-right text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                    ) : (
                      <span onClick={() => handleCellClick(p.id, 'precio_normal')} className="cursor-pointer hover:text-primary-400 transition-colors">
                        {formatCurrency(p.precio_normal)}
                      </span>
                    )}
                  </td>
                  
                  {/* Celda editable para Descuento Lote (antes Promoción) */}
                  <td className="px-4 py-3 text-sm text-right">
                    {editingCell?.id === p.id && editingCell?.field === 'descuento_lote' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={p.descuento_lote}
                        onChange={(e) => handlePriceChange(e, p.id, 'descuento_lote')}
                        onBlur={(e) => handlePriceBlur(e, p.id, 'descuento_lote')}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        className="w-24 bg-dark-700 border-dark-600 rounded px-2 py-1 text-right text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                    ) : (
                      <span onClick={() => handleCellClick(p.id, 'promocion')} className={`cursor-pointer hover:text-primary-400 transition-colors ${p.descuento_lote > 0 ? 'text-success-400' : 'text-gray-400'}`}>
                        {p.descuento_lote > 0 ? formatCurrency(p.descuento_lote) : 'N/A'}
                      </span>
                    )}
                  </td>

                  {/* Nueva columna para Promoción (solo lectura) */}
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={p.promocion > 0 ? 'text-gray-300' : 'text-gray-400'}>
                      {p.promocion > 0 ? formatCurrency(p.promocion) : 'N/A'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={p.margen_bruto_mxn < 0 ? 'text-error-400' : p.margen_bruto_porcentaje < 20 ? 'text-warning-400' : 'text-success-400'}>
                        {formatCurrency(p.margen_bruto_mxn)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={p.margen_bruto_porcentaje < 0 ? 'text-error-400' : p.margen_bruto_porcentaje < 20 ? 'text-warning-400' : 'text-success-400'}>
                        {p.margen_bruto_porcentaje.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
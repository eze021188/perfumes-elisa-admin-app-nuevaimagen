import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  ShoppingCart, 
  FileText, 
  Download, 
  Share2 
} from 'lucide-react';

// Componentes
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import HtmlPresupuestoDisplay from '../components/HtmlPresupuestoDisplay';

// Helper para formatear moneda
const formatCurrency = (amount) => {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) {
    return '$0.00';
  }
  return numericAmount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function CrearPresupuesto() {
  const navigate = useNavigate();
  
  // Estados para cliente
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  
  // Estados para productos
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  
  // Estados para items del presupuesto
  const [itemsPresupuesto, setItemsPresupuesto] = useState([]);
  const [itemEditando, setItemEditando] = useState({
    producto_id: '',
    descripcion: '',
    cantidad: 1,
    precio_unitario: 0,
    subtotal_item: 0
  });
  
  // Estados para totales y opciones
  const [tipoDescuento, setTipoDescuento] = useState('Sin descuento');
  const [valorDescuento, setValorDescuento] = useState(0);
  const [gastosEnvio, setGastosEnvio] = useState(0);
  const [formaPago, setFormaPago] = useState('');
  const [validezDias, setValidezDias] = useState(15);
  
  // Estados para UI
  const [guardando, setGuardando] = useState(false);
  const [showPresupuestoPreview, setShowPresupuestoPreview] = useState(false);
  const [presupuestoData, setPresupuestoData] = useState(null);
  const [presupuestoGuardadoId, setPresupuestoGuardadoId] = useState(null);
  
  // Cargar datos iniciales
  useEffect(() => {
    async function cargarDatos() {
      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, correo, direccion');
      
      if (clientesError) {
        toast.error('Error al cargar clientes');
        console.error(clientesError);
      } else {
        setClientes(clientesData || []);
      }
      
      // Cargar productos
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('*')
        .gt('stock', 0);
      
      if (productosError) {
        toast.error('Error al cargar productos');
        console.error(productosError);
      } else {
        setProductos(productosData || []);
        setProductosFiltrados(productosData || []);
      }
    }
    
    cargarDatos();
  }, []);
  
  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    if (!busquedaProducto.trim()) {
      setProductosFiltrados(productos);
    } else {
      const filtrados = productos.filter(p => 
        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        (p.codigo && p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase()))
      );
      setProductosFiltrados(filtrados);
    }
  }, [busquedaProducto, productos]);
  
  // Calcular subtotal, descuento y total
  const { subtotal, descuento, total } = useMemo(() => {
    const subtotalCalculado = itemsPresupuesto.reduce((sum, item) => sum + item.subtotal_item, 0);
    
    let descuentoCalculado = 0;
    if (tipoDescuento === 'Por importe') {
      descuentoCalculado = Math.min(parseFloat(valorDescuento) || 0, subtotalCalculado);
    } else if (tipoDescuento === 'Por porcentaje') {
      const porcentaje = Math.min(Math.max(0, parseFloat(valorDescuento) || 0), 100);
      descuentoCalculado = subtotalCalculado * (porcentaje / 100);
    }
    
    const totalCalculado = subtotalCalculado - descuentoCalculado + (parseFloat(gastosEnvio) || 0);
    
    return {
      subtotal: subtotalCalculado,
      descuento: descuentoCalculado,
      total: totalCalculado
    };
  }, [itemsPresupuesto, tipoDescuento, valorDescuento, gastosEnvio]);
  
  // Manejar selección de producto
  const handleSeleccionarProducto = (producto) => {
    setItemEditando({
      producto_id: producto.id,
      descripcion: producto.nombre,
      cantidad: 1,
      precio_unitario: producto.promocion || producto.precio_normal || 0,
      subtotal_item: (producto.promocion || producto.precio_normal || 0) * 1
    });
  };
  
  // Actualizar subtotal al cambiar cantidad o precio
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    const newItem = { ...itemEditando };
    
    if (name === 'cantidad' || name === 'precio_unitario') {
      newItem[name] = parseFloat(value) || 0;
      newItem.subtotal_item = newItem.cantidad * newItem.precio_unitario;
    } else {
      newItem[name] = value;
    }
    
    setItemEditando(newItem);
  };
  
  // Agregar item al presupuesto
  const handleAgregarItem = () => {
    if (!itemEditando.producto_id || !itemEditando.descripcion || itemEditando.cantidad <= 0 || itemEditando.precio_unitario <= 0) {
      toast.error('Por favor completa todos los campos del producto');
      return;
    }
    
    // Verificar si el producto ya está en el presupuesto
    const existeIndex = itemsPresupuesto.findIndex(item => item.producto_id === itemEditando.producto_id);
    
    if (existeIndex >= 0) {
      // Actualizar cantidad si ya existe
      const nuevosItems = [...itemsPresupuesto];
      nuevosItems[existeIndex].cantidad += itemEditando.cantidad;
      nuevosItems[existeIndex].subtotal_item = nuevosItems[existeIndex].cantidad * nuevosItems[existeIndex].precio_unitario;
      setItemsPresupuesto(nuevosItems);
    } else {
      // Agregar nuevo item
      setItemsPresupuesto([...itemsPresupuesto, { ...itemEditando, id: Date.now() }]);
    }
    
    // Limpiar formulario
    setItemEditando({
      producto_id: '',
      descripcion: '',
      cantidad: 1,
      precio_unitario: 0,
      subtotal_item: 0
    });
    setBusquedaProducto('');
  };
  
  // Eliminar item del presupuesto
  const handleEliminarItem = (id) => {
    setItemsPresupuesto(itemsPresupuesto.filter(item => item.id !== id));
  };
  
  // Guardar presupuesto
  const handleGuardarPresupuesto = async () => {
    if (!clienteSeleccionado) {
      toast.error('Por favor selecciona un cliente');
      return;
    }
    
    if (itemsPresupuesto.length === 0) {
      toast.error('Agrega al menos un producto al presupuesto');
      return;
    }
    
    setGuardando(true);
    
    try {
      // Crear presupuesto
      const { data: presupuesto, error: presupuestoError } = await supabase
        .from('presupuestos')
        .insert({
          cliente_id: clienteSeleccionado.id,
          subtotal,
          tipo_descuento: tipoDescuento,
          valor_descuento: descuento,
          gastos_envio: parseFloat(gastosEnvio) || 0,
          total,
          forma_pago: formaPago,
          validez_dias: parseInt(validezDias) || 15,
          estado: 'Pendiente'
        })
        .select()
        .single();
      
      if (presupuestoError) throw presupuestoError;
      
      // Crear items del presupuesto
      const itemsParaInsertar = itemsPresupuesto.map(item => ({
        presupuesto_id: presupuesto.id,
        producto_id: item.producto_id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal_item: item.subtotal_item
      }));
      
      const { error: itemsError } = await supabase
        .from('presupuesto_items')
        .insert(itemsParaInsertar);
      
      if (itemsError) throw itemsError;
      
      // Preparar datos para la vista previa
      const presupuestoCompleto = {
        ...presupuesto,
        clientes: clienteSeleccionado,
        presupuesto_items: itemsParaInsertar.map((item, index) => {
          const productoInfo = productos.find(p => p.id === item.producto_id);
          return {
            ...item,
            id: index + 1, // ID temporal para la vista previa
            productos: { nombre: item.descripcion }
          };
        })
      };
      
      setPresupuestoData(presupuestoCompleto);
      setPresupuestoGuardadoId(presupuesto.id);
      setShowPresupuestoPreview(true);
      toast.success('Presupuesto guardado correctamente');
      
    } catch (error) {
      console.error('Error al guardar presupuesto:', error);
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  };
  
  // Convertir a venta
  const handleConvertirAVenta = () => {
    if (!presupuestoGuardadoId) {
      toast.error('No hay un presupuesto guardado para convertir');
      return;
    }
    
    navigate('/checkout', { 
      state: { 
        budgetData: presupuestoData
      } 
    });
  };
  
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
        <h1 className="text-3xl font-bold text-gray-100 text-center">Crear Presupuesto</h1>
        <div className="w-full md:w-[150px]" />
      </div>
      
      {/* Contenedor principal */}
      <div className="bg-dark-800 rounded-lg shadow-card-dark border border-dark-700/50 p-6">
        {/* Selector de cliente */}
        <div className="mb-6">
          <ClientSelector
            clientes={clientes}
            clienteSeleccionado={clienteSeleccionado}
            onSelect={setClienteSeleccionado}
            onCreateNew={() => setShowNewClient(true)}
          />
          <NewClientModal 
            isOpen={showNewClient} 
            onClose={() => setShowNewClient(false)} 
            onClientAdded={c => { 
              if (c?.id) { 
                setClienteSeleccionado(c); 
                setClientes(prev => [...prev, c]); 
              } 
              setShowNewClient(false); 
            }} 
          />
        </div>
        
        {/* Buscador de productos */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Agregar Productos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busquedaProducto}
                  onChange={e => setBusquedaProducto(e.target.value)}
                  className="w-full pl-10 p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {busquedaProducto && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-dark-900 border border-dark-700 rounded-lg shadow-elegant-dark">
                  {productosFiltrados.length === 0 ? (
                    <p className="p-3 text-gray-400 text-center">No se encontraron productos</p>
                  ) : (
                    <ul>
                      {productosFiltrados.map(producto => (
                        <li 
                          key={producto.id}
                          className="p-3 hover:bg-dark-700 cursor-pointer border-b border-dark-700 last:border-b-0 flex justify-between items-center"
                          onClick={() => handleSeleccionarProducto(producto)}
                        >
                          <div>
                            <p className="text-gray-200 font-medium">{producto.nombre}</p>
                            <p className="text-gray-400 text-xs">Stock: {producto.stock}</p>
                          </div>
                          <p className="text-primary-400 font-semibold">{formatCurrency(producto.promocion || producto.precio_normal || 0)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={itemEditando.descripcion}
                  onChange={handleItemChange}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    name="cantidad"
                    min="1"
                    value={itemEditando.cantidad}
                    onChange={handleItemChange}
                    className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Precio</label>
                  <input
                    type="number"
                    name="precio_unitario"
                    min="0"
                    step="0.01"
                    value={itemEditando.precio_unitario}
                    onChange={handleItemChange}
                    className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <button
                onClick={handleAgregarItem}
                disabled={!itemEditando.descripcion || itemEditando.cantidad <= 0 || itemEditando.precio_unitario <= 0}
                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Plus size={18} className="mr-1" />
                Agregar al Presupuesto
              </button>
            </div>
          </div>
        </div>
        
        {/* Lista de items del presupuesto */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-100">Items del Presupuesto</h2>
          {itemsPresupuesto.length === 0 ? (
            <div className="bg-dark-900/50 p-6 rounded-lg border border-dark-700/50 text-center">
              <p className="text-gray-400">No hay items en el presupuesto</p>
            </div>
          ) : (
            <div className="bg-dark-900/50 rounded-lg border border-dark-700/50 overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-700">
                <thead className="bg-dark-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Subtotal</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-dark-900/50 divide-y divide-dark-700/50">
                  {itemsPresupuesto.map(item => (
                    <tr key={item.id} className="hover:bg-dark-800/50">
                      <td className="px-4 py-3 text-sm text-gray-300">{item.descripcion}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-300">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-300">{formatCurrency(item.precio_unitario)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-200">{formatCurrency(item.subtotal_item)}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleEliminarItem(item.id)}
                          className="text-error-400 hover:text-error-300 transition-colors"
                          title="Eliminar item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Opciones y totales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Opciones */}
          <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50">
            <h3 className="text-md font-semibold mb-4 text-gray-200">Opciones del Presupuesto</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Descuento</label>
                <select
                  value={tipoDescuento}
                  onChange={e => {
                    setTipoDescuento(e.target.value);
                    setValorDescuento(0);
                  }}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Sin descuento">Sin descuento</option>
                  <option value="Por importe">Por importe ($)</option>
                  <option value="Por porcentaje">Por porcentaje (%)</option>
                </select>
              </div>
              
              {tipoDescuento !== 'Sin descuento' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Valor del Descuento ({tipoDescuento === 'Por importe' ? '$' : '%'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={tipoDescuento === 'Por porcentaje' ? "1" : "0.01"}
                    max={tipoDescuento === 'Por porcentaje' ? "100" : undefined}
                    value={valorDescuento}
                    onChange={e => setValorDescuento(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Gastos de Envío</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gastosEnvio}
                  onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Forma de Pago Sugerida</label>
                <select
                  value={formaPago}
                  onChange={e => setFormaPago(e.target.value)}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Sin especificar</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Crédito cliente">Crédito cliente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Validez (días)</label>
                <input
                  type="number"
                  min="1"
                  value={validezDias}
                  onChange={e => setValidezDias(parseInt(e.target.value) || 15)}
                  className="w-full p-2 bg-dark-800 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
          
          {/* Totales */}
          <div className="bg-dark-900/50 p-4 rounded-lg border border-dark-700/50 flex flex-col">
            <h3 className="text-md font-semibold mb-4 text-gray-200">Resumen del Presupuesto</h3>
            
            <div className="flex-grow">
              <div className="space-y-2 text-right mb-4">
                <p className="text-gray-300">Subtotal: <span className="font-medium text-gray-200">{formatCurrency(subtotal)}</span></p>
                {descuento > 0 && (
                  <p className="text-error-400">Descuento: <span className="font-medium">- {formatCurrency(descuento)}</span></p>
                )}
                {gastosEnvio > 0 && (
                  <p className="text-gray-300">Gastos de Envío: <span className="font-medium text-gray-200">{formatCurrency(gastosEnvio)}</span></p>
                )}
                <p className="text-xl font-bold text-gray-100 pt-2 border-t border-dark-700">
                  Total: <span className="text-primary-400">{formatCurrency(total)}</span>
                </p>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-dark-700 flex flex-wrap gap-3 justify-end">
              <button
                onClick={handleGuardarPresupuesto}
                disabled={guardando || itemsPresupuesto.length === 0 || !clienteSeleccionado}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save size={18} className="mr-1.5" />
                {guardando ? 'Guardando...' : 'Guardar Presupuesto'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de vista previa del presupuesto */}
      {showPresupuestoPreview && presupuestoData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-dark-700">
                <h2 className="text-xl font-bold text-gray-100">Vista Previa del Presupuesto</h2>
                <button 
                  onClick={() => setShowPresupuestoPreview(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <HtmlPresupuestoDisplay presupuestoData={presupuestoData} onClose={() => setShowPresupuestoPreview(false)} />
              </div>
              
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  onClick={() => setShowPresupuestoPreview(false)}
                  className="px-4 py-2 bg-dark-700 text-gray-200 rounded-lg hover:bg-dark-600 transition-colors flex items-center"
                >
                  <X size={18} className="mr-1.5" />
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    // Lógica para descargar PDF
                    toast.success('Descargando presupuesto...');
                  }}
                  className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors flex items-center"
                >
                  <Download size={18} className="mr-1.5" />
                  Descargar PDF
                </button>
                <button
                  onClick={() => {
                    // Lógica para compartir
                    toast.success('Compartiendo presupuesto...');
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                >
                  <Share2 size={18} className="mr-1.5" />
                  Compartir
                </button>
                <button
                  onClick={handleConvertirAVenta}
                  className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors flex items-center"
                >
                  <ShoppingCart size={18} className="mr-1.5" />
                  Convertir a Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
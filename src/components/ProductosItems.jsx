// src/components/ProductosItems.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
    } else {
      setProductos(data);
    }
  };

  // Para edición en pantalla
  const handleEditar = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  // Actualiza un solo campo en la BD
  const actualizarCampo = async (id, cambios) => {
    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', id);
    if (error) {
      console.error(`Error actualizando producto ${id}:`, error.message);
    }
  };

  // Abre / cierra modal de edición completa
  const abrirModal = producto => {
    setProductoEditando(producto);
    setModalActivo(true);
  };
  const cerrarModal = () => {
    setProductoEditando(null);
    setModalActivo(false);
    cargarProductos();
  };

  // Filtrado por búsqueda
  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Cálculos de indicadores
  const costoStock = productos.reduce(
    (sum, p) => sum + parseFloat(p.costo_final_mxn ?? 0),
    0
  );
  const totalStock = productos.reduce(
    (sum, p) => sum + parseFloat(p.promocion ?? 0),
    0
  );
  const ganancias = totalStock - costoStock;

  // Graba en lote promoción y precio_normal
  const handleActualizar = async () => {
    setActualizando(true);
    // Para cada producto, enviamos ambos campos
    for (const p of productos) {
      await actualizarCampo(p.id, {
        promocion: Number(p.promocion) || 0,
        precio_normal: Number(p.precio_normal) || 0
      });
    }
    await cargarProductos();
    setActualizando(false);
  };

  return (
    <div>
      {/* Indicadores y botón */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-700">
        <div className="space-y-1">
          <div>
            <span className="font-semibold">Costo de stock:</span>{' '}
            ${costoStock.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold">Total en stock:</span>{' '}
            ${totalStock.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold">Ganancias proyectadas:</span>{' '}
            ${ganancias.toFixed(2)}
          </div>
        </div>
        <button
          onClick={handleActualizar}
          disabled={actualizando}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {actualizando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
      </div>

      {/* Listado */}
      <div className="space-y-2">
        {productosFiltrados.map(producto => (
          <div
            key={producto.id}
            className="grid grid-cols-[60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs"
          >
            {/* Imagen */}
            <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-gray-400 text-[10px]">Sin imagen</span>
              )}
            </div>

            {/* Nombre y categoría */}
            <div className="whitespace-normal break-words max-w-full">
              <div className="font-medium">{producto.nombre}</div>
              <div className="text-gray-500 text-[11px]">
                {producto.categoria || 'Sin categoría'}
              </div>
            </div>

            {/* Promoción */}
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Promoción</label>
              <input
                type="number"
                value={producto.promocion ?? ''}
                onChange={e =>
                  handleEditar(producto.id, 'promocion', e.target.value)
                }
                className="w-20 border px-2 py-1 rounded text-right"
              />
            </div>

            {/* Precio normal */}
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Precio normal</label>
              <input
                type="number"
                value={producto.precio_normal ?? ''}
                onChange={e =>
                  handleEditar(producto.id, 'precio_normal', e.target.value)
                }
                className="w-20 border px-2 py-1 rounded text-right"
              />
            </div>

            {/* Botón Editar */}
            <div>
              <button
                onClick={() => abrirModal(producto)}
                className="text-blue-600 hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de edición completa */}
      {modalActivo && productoEditando && (
        <ModalEditarProducto
          producto={productoEditando}
          onClose={cerrarModal}
          onGuardado={cerrarModal}
        />
      )}
    </div>
  );
}

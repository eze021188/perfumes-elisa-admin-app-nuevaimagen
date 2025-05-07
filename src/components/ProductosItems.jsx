import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

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

  const handleEditar = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const actualizarCampo = async (id, campo, valor) => {
    const { error } = await supabase
      .from('productos')
      .update({ [campo]: Number(valor) })
      .eq('id', id);
    if (error) {
      console.error(`Error actualizando ${campo}:`, error.message);
    }
  };

  const abrirModal = (producto) => {
    setProductoEditando(producto);
    setModalActivo(true);
  };

  const cerrarModal = () => {
    setProductoEditando(null);
    setModalActivo(false);
    cargarProductos();
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
      </div>

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
                onBlur={e =>
                  actualizarCampo(producto.id, 'promocion', e.target.value)
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
                onBlur={e =>
                  actualizarCampo(producto.id, 'precio_normal', e.target.value)
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

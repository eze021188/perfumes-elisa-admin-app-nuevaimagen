// src/components/ModalEditarProducto.jsx
import { useState } from 'react';
import { supabase } from '../supabase';

export default function ModalEditarProducto({ producto, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(producto.nombre || '');
  const [costoFinalUSD, setCostoFinalUSD] = useState(producto.costo_final_usd || '');
  const [costoFinalMXN, setCostoFinalMXN] = useState(producto.costo_final_mxn || '');
  const [precioUnitarioUSD, setPrecioUnitarioUSD] = useState(producto.precio_unitario_usd || '');
  const [stock, setStock] = useState(producto.stock ?? '');
  const [imagenURL, setImagenURL] = useState(producto.imagen_url || '');
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    setGuardando(true);

    const cambios = {
      nombre,
      costo_final_usd: parseFloat(costoFinalUSD),
      costo_final_mxn: parseFloat(costoFinalMXN),
      precio_unitario_usd: parseFloat(precioUnitarioUSD),
      stock: Number(stock),
      imagen_url: imagenURL
    };

    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', producto.id);

    setGuardando(false);

    if (error) {
      console.error('Error al guardar producto:', error.message);
      alert('Ocurrió un error al guardar los cambios.');
    } else {
      onGuardado();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 p-6"
      >
        <h2 className="text-lg font-bold mb-4">Editar producto</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Costo final x unidad (USD)</label>
            <input
              type="number"
              value={costoFinalUSD}
              onChange={(e) => setCostoFinalUSD(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Costo final x unidad (MXN)</label>
            <input
              type="number"
              value={costoFinalMXN}
              onChange={(e) => setCostoFinalMXN(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Precio por unidad (USD)</label>
            <input
              type="number"
              value={precioUnitarioUSD}
              onChange={(e) => setPrecioUnitarioUSD(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Stock disponible</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">URL de la imagen del producto</label>
            <input
              type="url"
              value={imagenURL}
              onChange={(e) => setImagenURL(e.target.value)}
              placeholder="https://..."
              className="w-full border px-3 py-2 rounded"
            />
            {imagenURL && (
              <img
                src={imagenURL}
                alt="Vista previa"
                className="w-24 h-24 object-cover mt-2 rounded border"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

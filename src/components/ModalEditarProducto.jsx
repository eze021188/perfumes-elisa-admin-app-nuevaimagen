// src/components/ModalEditarProducto.jsx
import { useState } from 'react';
import { supabase } from '../supabase';

export default function ModalEditarProducto({ producto, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(producto.nombre || '');
  const [costoFinalUSD, setCostoFinalUSD] = useState(producto.costo_final_usd || '');
  const [costoFinalMXN, setCostoFinalMXN] = useState(producto.costo_final_mxn || '');
  const [precioUnitarioUSD, setPrecioUnitarioUSD] = useState(producto.precio_unitario_usd || '');
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const handleImagen = (e) => {
    const archivo = e.target.files[0];
    if (archivo) setImagenArchivo(archivo);
  };

  const subirImagen = async () => {
    const nombreArchivo = `${producto.id}-${Date.now()}`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(nombreArchivo, imagenArchivo, { upsert: true });

    if (error) {
      console.error('Error al subir imagen:', error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('productos')
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  };

  const handleGuardar = async () => {
    setGuardando(true);

    let imagenURL = producto.imagen_url;
    if (imagenArchivo) {
      const subida = await subirImagen();
      if (subida) imagenURL = subida;
    }

    const { error } = await supabase
      .from('productos')
      .update({
        nombre,
        costo_final_usd: parseFloat(costoFinalUSD),
        costo_final_mxn: parseFloat(costoFinalMXN),
        precio_unitario_usd: parseFloat(precioUnitarioUSD),
        imagen_url: imagenURL
      })
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
            <label className="block text-sm font-medium">Imagen del producto</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImagen}
              className="w-full border px-3 py-2 rounded"
            />
            {producto.imagen_url && (
              <img
                src={producto.imagen_url}
                alt="Producto"
                className="w-20 h-20 object-cover mt-2 rounded border"
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

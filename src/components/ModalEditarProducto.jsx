// src/components/ModalEditarProducto.jsx (o la ruta donde lo tengas)
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase'; // Asegúrate que la ruta a supabase es correcta
// No necesitamos toast aquí si el padre (ProductosItems) maneja las notificaciones al guardar/error
// import toast from 'react-hot-toast'; 

export default function ModalEditarProducto({ producto, onClose, onGuardado }) {
  // Inicializar estados con los valores del producto recibido
  const [nombre, setNombre] = useState(producto.nombre || '');
  const [costoFinalUSD, setCostoFinalUSD] = useState(producto.costo_final_usd ?? '');
  const [costoFinalMXN, setCostoFinalMXN] = useState(producto.costo_final_mxn ?? '');
  const [precioUnitarioUSD, setPrecioUnitarioUSD] = useState(producto.precio_unitario_usd ?? ''); // Asumo que este es el precio_normal o similar
  const [stock, setStock] = useState(producto.stock ?? '');
  const [imagenURL, setImagenURL] = useState(producto.imagen_url || '');
  
  // >>> NUEVO ESTADO PARA CATEGORÍA <<<
  const [categoria, setCategoria] = useState(producto.categoria || ''); // Inicializar con la categoría del producto

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!producto) return;
    setNombre(producto.nombre || '');
    setCostoFinalUSD(producto.costo_final_usd ?? '');
    setCostoFinalMXN(producto.costo_final_mxn ?? '');
    // Asegúrate de que 'precio_unitario_usd' en el modal corresponde
    // a 'precio_normal' si ese es el campo que quieres editar como precio de venta.
    // Si 'precio_unitario_usd' es un campo distinto a 'precio_normal', mantenlo.
    // Si tu intención es editar 'precio_normal' y 'promocion' como en ProductosItems,
    // necesitarías añadir esos campos aquí también.
    // Por ahora, mantendré los campos que tienes en el modal.
    setPrecioUnitarioUSD(producto.precio_unitario_usd ?? ''); // Revisa si este debe ser precio_normal
    
    setStock(producto.stock ?? '');
    setImagenURL(producto.imagen_url || '');
    setCategoria(producto.categoria || ''); // Actualizar categoría si el producto cambia
  }, [producto]);

  const handleGuardar = async () => {
    setGuardando(true);

    const cambios = {
      nombre,
      costo_final_usd: parseFloat(costoFinalUSD) || null, // Usar null si no es un número válido o está vacío
      costo_final_mxn: parseFloat(costoFinalMXN) || null,
      precio_unitario_usd: parseFloat(precioUnitarioUSD) || null, // Similarmente, null si vacío
      stock: Number(stock) || 0,
      imagen_url: imagenURL.trim() || null, // null si está vacío
      // >>> AÑADIR CATEGORÍA A LOS CAMBIOS <<<
      categoria: categoria.trim() || null, // Guardar categoría, null si está vacía
    };

    // Filtrar propiedades nulas si la base de datos no las maneja bien
    // o si prefieres no enviar campos que no cambiaron o están vacíos y son opcionales.
    // Por simplicidad, aquí enviamos todos los campos definidos en `cambios`.
    // Si un campo es 'null' y la columna en Supabase lo permite, se establecerá a NULL.

    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', producto.id);

    setGuardando(false);

    if (error) {
      console.error('Error al guardar producto:', error.message);
      // Considera usar toast aquí también si lo prefieres sobre alert
      alert(`Ocurrió un error al guardar los cambios: ${error.message}`);
    } else {
      // alert('Producto actualizado exitosamente.'); // Puedes usar toast si prefieres
      onGuardado(); // Llama a la función onGuardado (para cerrar modal y/o recargar lista)
    }
  };

  if (!producto) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 p-6 max-h-[90vh] overflow-y-auto" // Ajustado lg:w-1/3 para un modal más compacto
      >
        <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-3">Editar producto</h2> {/* Título más grande y con borde */}
        <div className="space-y-4">

          <div>
            <label htmlFor="edit-nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              id="edit-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* >>> CAMPO PARA EDITAR CATEGORÍA <<< */}
          <div>
            <label htmlFor="edit-categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <input
              type="text"
              id="edit-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej: FRAGANCIA FEMENINA"
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Fin del campo Categoría */}

          <div>
            <label htmlFor="edit-costoFinalUSD" className="block text-sm font-medium text-gray-700 mb-1">Costo final x unidad (USD)</label>
            <input
              type="number"
              id="edit-costoFinalUSD"
              min="0"
              step="0.01"
              value={costoFinalUSD}
              onChange={(e) => setCostoFinalUSD(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-costoFinalMXN" className="block text-sm font-medium text-gray-700 mb-1">Costo final x unidad (MXN)</label>
            <input
              type="number"
              id="edit-costoFinalMXN"
              min="0"
              step="0.01"
              value={costoFinalMXN}
              onChange={(e) => setCostoFinalMXN(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-precioUnitarioUSD" className="block text-sm font-medium text-gray-700 mb-1">Precio por unidad (USD)</label> {/* Considera si este campo es `precio_normal` o algo diferente */}
            <input
              type="number"
              id="edit-precioUnitarioUSD"
              min="0"
              step="0.01"
              value={precioUnitarioUSD}
              onChange={(e) => setPrecioUnitarioUSD(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-stock" className="block text-sm font-medium text-gray-700 mb-1">Stock disponible</label>
            <input
              type="number"
              id="edit-stock"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="edit-imagenURL" className="block text-sm font-medium text-gray-700 mb-1">URL de la imagen del producto</label>
            <input
              type="url"
              id="edit-imagenURL"
              value={imagenURL}
              onChange={(e) => setImagenURL(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {imagenURL && (
              <img
                src={imagenURL}
                alt="Vista previa"
                className="w-24 h-24 object-contain mt-2 rounded border border-gray-300"
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/e5e7eb/4b5563?text=Error" }}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t"> {/* Separador y más margen para botones */}
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
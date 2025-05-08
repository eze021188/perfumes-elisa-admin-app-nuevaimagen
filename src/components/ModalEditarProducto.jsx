import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ModalEditarProducto({ producto, onClose, onGuardado }) {
  // Inicializar estados con los valores del producto recibido
  const [nombre, setNombre] = useState(producto.nombre || '');
  // Usamos ?? '' para manejar casos donde el valor pueda ser null o undefined
  const [costoFinalUSD, setCostoFinalUSD] = useState(producto.costo_final_usd ?? '');
  const [costoFinalMXN, setCostoFinalMXN] = useState(producto.costo_final_mxn ?? '');
  const [precioUnitarioUSD, setPrecioUnitarioUSD] = useState(producto.precio_unitario_usd ?? '');
  const [stock, setStock] = useState(producto.stock ?? '');
  const [imagenURL, setImagenURL] = useState(producto.imagen_url || '');
  const [guardando, setGuardando] = useState(false);

  // Este useEffect ahora solo se asegura de que los estados se actualicen
  // si el prop 'producto' cambia mientras el modal está abierto.
  // La lógica de cálculo ha sido eliminada ya que los costos finales
  // deben venir pre-calculados en el objeto producto desde la BD.
  useEffect(() => {
    if (!producto) return;
    setNombre(producto.nombre || '');
    setCostoFinalUSD(producto.costo_final_usd ?? '');
    setCostoFinalMXN(producto.costo_final_mxn ?? '');
    setPrecioUnitarioUSD(producto.precio_unitario_usd ?? '');
    setStock(producto.stock ?? '');
    setImagenURL(producto.imagen_url || '');
  }, [producto]); // Dependencia: el efecto se ejecuta si el producto cambia

  const handleGuardar = async () => {
    setGuardando(true);

    // Preparamos los cambios a enviar a Supabase
    const cambios = {
      nombre,
      // Convertimos los valores de los inputs a números flotantes
      costo_final_usd: parseFloat(costoFinalUSD) || 0, // Usamos 0 si no es un número válido
      costo_final_mxn: parseFloat(costoFinalMXN) || 0,
      precio_unitario_usd: parseFloat(precioUnitarioUSD) || 0,
      stock: Number(stock) || 0, // Convertimos a número entero
      imagen_url: imagenURL // La URL puede ser una cadena vacía si se borra
    };

    // Realizamos la actualización en la tabla 'productos'
    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', producto.id); // Filtramos por el ID del producto actual

    setGuardando(false);

    if (error) {
      console.error('Error al guardar producto:', error.message);
      alert('Ocurrió un error al guardar los cambios.');
    } else {
      // Si se guarda correctamente, llamamos a la función onGuardado (para cerrar modal y/o recargar lista)
      onGuardado();
    }
  };

  // Si no hay producto, no renderizamos el modal (aunque el padre debería controlar esto)
  if (!producto) return null;

  return (
    // Contenedor principal del modal (fondo oscuro y centrado)
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose} // Cerrar modal si se hace clic fuera del contenido
    >
      {/* Contenido del modal */}
      <div
        onClick={(e) => e.stopPropagation()} // Evitar que el clic dentro cierre el modal
        className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 p-6 max-h-[90vh] overflow-y-auto" // Añadido max-height y overflow para scroll si es necesario
      >
        <h2 className="text-lg font-bold mb-4">Editar producto</h2>
        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Costo final USD (Ahora editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Costo final x unidad (USD)
            </label>
            <input
              type="number" // Usamos type="number" para permitir solo números y el punto decimal
              value={costoFinalUSD}
              onChange={(e) => setCostoFinalUSD(e.target.value)} // Añadido onChange
              // Eliminado readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Costo final MXN (Ahora editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Costo final x unidad (MXN)
            </label>
            <input
              type="number" // Usamos type="number"
              value={costoFinalMXN}
              onChange={(e) => setCostoFinalMXN(e.target.value)} // Añadido onChange
              // Eliminado readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Precio unitario USD */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Precio por unidad (USD)
            </label>
            <input
              type="number"
              value={precioUnitarioUSD}
              onChange={(e) => setPrecioUnitarioUSD(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Stock disponible</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              URL de la imagen del producto
            </label>
            <input
              type="url"
              value={imagenURL}
              onChange={(e) => setImagenURL(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {/* Vista previa de la imagen si hay URL */}
            {imagenURL && (
              <img
                src={imagenURL}
                alt="Vista previa"
                className="w-24 h-24 object-cover mt-2 rounded border border-gray-300"
                // Manejo de error si la imagen no carga
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/e5e7eb/4b5563?text=Error" }} // Placeholder en caso de error
              />
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando} // Deshabilitar mientras se guarda
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

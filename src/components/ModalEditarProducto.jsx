// src/components/ModalEditarProducto.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Save, Image, Tag, Package, DollarSign, Hash, Layers } from 'lucide-react';

export default function ModalEditarProducto({ producto, onClose, onGuardado }) {
  // Inicializar estados con los valores del producto recibido
  const [nombre, setNombre] = useState(producto.nombre || '');
  const [costoFinalUSD, setCostoFinalUSD] = useState(producto.costo_final_usd ?? '');
  const [costoFinalMXN, setCostoFinalMXN] = useState(producto.costo_final_mxn ?? '');
  const [precioDescuentoLote, setPrecioDescuentoLote] = useState(producto.descuento_lote ?? ''); 
  const [precioNormal, setPrecioNormal] = useState(producto.precio_normal ?? ''); 
  const [promocionOriginal, setPromocionOriginal] = useState(producto.promocion ?? ''); // <-- CAMBIO CLAVE: Leer la promocion original

  const [stock, setStock] = useState(producto.stock ?? '');
  const [imagenURL, setImagenURL] = useState(producto.imagen_url || '');
  const [categoria, setCategoria] = useState(producto.categoria || '');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!producto) return;
    setNombre(producto.nombre || '');
    setCostoFinalUSD(producto.costo_final_usd ?? '');
    setCostoFinalMXN(producto.costo_final_mxn ?? '');
    setPrecioNormal(producto.precio_normal ?? ''); 
    setPromocionOriginal(producto.promocion ?? ''); // <-- CAMBIO CLAVE: Cargar la promocion original
    setPrecioDescuentoLote(producto.descuento_lote ?? ''); 
    setStock(producto.stock ?? '');
    setImagenURL(producto.imagen_url || '');
    setCategoria(producto.categoria || '');
  }, [producto]);

  const handleGuardar = async () => {
    setGuardando(true);

    const cambios = {
      nombre,
      costo_final_usd: parseFloat(costoFinalUSD) || null,
      costo_final_mxn: parseFloat(costoFinalMXN) || null,
      precio_normal: parseFloat(precioNormal) || null, 
      promocion: parseFloat(promocionOriginal) || null, // <-- CAMBIO CLAVE: Guardar la promocion original
      descuento_lote: parseFloat(precioDescuentoLote) || null, // Guardar descuento_lote
      stock: Number(stock) || 0,
      imagen_url: imagenURL.trim() || null,
      categoria: categoria.trim() || null,
    };

    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', producto.id);

    setGuardando(false);

    if (error) {
      console.error('Error al guardar producto:', error.message);
      alert(`Ocurrió un error al guardar los cambios: ${error.message}`);
    } else {
      onGuardado(); 
    }
  };

  if (!producto) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-11/12 md:w-1/2 lg:w-1/3 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-bold text-gray-100">Editar producto</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-nombre" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Tag size={16} />
              Nombre
            </label>
            <input
              type="text"
              id="edit-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          <div>
            <label htmlFor="edit-categoria" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Layers size={16} />
              Categoría
            </label>
            <input
              type="text"
              id="edit-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej: FRAGANCIA FEMENINA"
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          <div>
            <label htmlFor="edit-costoFinalUSD" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Costo final x unidad (USD)
            </label>
            <input
              type="number"
              id="edit-costoFinalUSD"
              min="0"
              step="0.01"
              value={costoFinalUSD}
              onChange={(e) => setCostoFinalUSD(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          <div>
            <label htmlFor="edit-costoFinalMXN" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Costo final x unidad (MXN)
            </label>
            <input
              type="number"
              id="edit-costoFinalMXN"
              min="0"
              step="0.01"
              value={costoFinalMXN}
              onChange={(e) => setCostoFinalMXN(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          {/* Campo para editar el precio normal */}
          <div>
            <label htmlFor="edit-precioNormal" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Precio Venta (Normal)
            </label>
            <input
              type="number"
              id="edit-precioNormal"
              min="0"
              step="0.01"
              value={precioNormal}
              onChange={(e) => setPrecioNormal(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          {/* CAMBIO CLAVE: Campo para editar Promoción (original) */}
          <div>
            <label htmlFor="edit-promocionOriginal" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Precio Venta (Promoción)
            </label>
            <input
              type="number" // Ahora editable
              id="edit-promocionOriginal"
              min="0"
              step="0.01"
              value={promocionOriginal} // Edita promocionOriginal
              onChange={(e) => setPromocionOriginal(e.target.value)} // Actualiza promocionOriginal
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>
          
          {/* NUEVA COLUMNA: Dscto. Lote (solo lectura) */}
          <div>
            <label htmlFor="view-precioDescuentoLote" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Precio Venta (Dscto. Lote)
            </label>
            <input
              type="text" // Solo texto para ser de solo lectura
              id="view-precioDescuentoLote"
              value={(precioDescuentoLote ?? '').toString()} // Muestra el valor de descuento_lote
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md text-gray-400 cursor-not-allowed"
              disabled // Deshabilitar para que sea de solo lectura
            />
          </div>


          <div>
            <label htmlFor="edit-stock" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Package size={16} />
              Stock disponible
            </label>
            <input
              type="number"
              id="edit-stock"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
          </div>

          <div>
            <label htmlFor="edit-imagenURL" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Image size={16} />
              URL de la imagen del producto
            </label>
            <input
              type="url"
              id="edit-imagenURL"
              value={imagenURL}
              onChange={(e) => setImagenURL(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
            />
            {imagenURL && (
              <div className="mt-2 p-1 bg-dark-900 border border-dark-700 rounded-md inline-block">
                <img
                  src={imagenURL}
                  alt="Vista previa"
                  className="w-24 h-24 object-contain rounded"
                  onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/1f2937/6b7280?text=Error" }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-dark-700">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-6 py-2 rounded-md border border-dark-700 bg-dark-700 text-gray-200 hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-dark-500 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 py-2 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-800 transition-colors flex items-center gap-1"
          >
            {guardando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar cambios</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
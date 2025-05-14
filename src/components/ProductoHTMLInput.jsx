// src/components/ProductoHTMLInput.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react'; // Añadido useRef
import { useProductos } from '../contexts/ProductosContext';
import toast from 'react-hot-toast';

export default function ProductoHTMLInput() {
  const { productos, actualizarProducto, loading: productosLoading } = useProductos();
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // Para el ítem resaltado con teclado

  // Refs para el scroll
  const listRef = useRef(null);
  const highlightedItemRef = useRef(null);

  useEffect(() => {
    if (productoSeleccionado && typeof productoSeleccionado.descripcion_html === 'string') {
      setHtmlContent(productoSeleccionado.descripcion_html);
    } else if (productoSeleccionado) {
      setHtmlContent('');
    } else {
      setHtmlContent('');
      setSearchTerm(''); // Limpiar búsqueda si no hay producto seleccionado
    }
  }, [productoSeleccionado]);

  const productosFiltrados = useMemo(() => {
    if (!searchTerm) {
      return []; // No mostrar nada si no hay término de búsqueda
    }
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productos, searchTerm]);

  // Efecto para resetear el índice resaltado cuando cambia la lista filtrada
  useEffect(() => {
    setHighlightedIndex(-1); // Resetear cuando el término de búsqueda o los productos cambian
  }, [productosFiltrados]);
  
  // Efecto para scroll hacia el elemento resaltado
  useEffect(() => {
    if (highlightedItemRef.current) {
        highlightedItemRef.current.scrollIntoView({
            behavior: 'smooth', // O 'auto'
            block: 'nearest',   // O 'center', 'start', 'end'
        });
    }
  }, [highlightedIndex]);


  const handleSeleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setSearchTerm(''); // Limpiar término de búsqueda
    setHighlightedIndex(-1); // Resetear índice resaltado
  };

  const handleGuardarHTML = async () => {
    if (!productoSeleccionado) {
      toast.error('Por favor, selecciona un producto primero.');
      return;
    }
    toast.loading('Guardando HTML...');
    const actualizado = await actualizarProducto(productoSeleccionado.id, { descripcion_html: htmlContent });
    toast.dismiss();
    if (actualizado) {
      toast.success('HTML del producto actualizado exitosamente!');
    } else {
      toast.error('Error al actualizar el HTML del producto.');
    }
  };

  const handleKeyDown = (e) => {
    if (productosFiltrados.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault(); // Evita que la página haga scroll
      setHighlightedIndex(prevIndex =>
        prevIndex < productosFiltrados.length - 1 ? prevIndex + 1 : 0 // Vuelve al inicio o se queda al final
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); // Evita que la página haga scroll
      setHighlightedIndex(prevIndex =>
        prevIndex > 0 ? prevIndex - 1 : productosFiltrados.length - 1 // Vuelve al final o se queda al inicio
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < productosFiltrados.length) {
        handleSeleccionarProducto(productosFiltrados[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSearchTerm(''); // Limpiar búsqueda con Escape
      setHighlightedIndex(-1);
    }
  };

  if (productosLoading && !productos.length) return <p>Cargando productos...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Gestionar HTML de Detalle del Producto</h2>
      
      {!productoSeleccionado && (
        <div className="mb-1 relative"> {/* Contenedor relativo para la lista */}
          <label htmlFor="search-prod" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar Producto:
          </label>
          <input
            type="text"
            id="search-prod"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            placeholder="Escribe para buscar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // setHighlightedIndex(-1); // Resetear al escribir, opcional
            }}
            onKeyDown={handleKeyDown} // Manejar eventos de teclado aquí
            aria-autocomplete="list"
            aria-expanded={productosFiltrados.length > 0 && searchTerm.length > 0}
            // aria-activedescendant={highlightedIndex >=0 ? `prod-item-${highlightedIndex}` : undefined} // Para accesibilidad avanzada
          />
          {/* Lista de Productos Filtrados */}
          {searchTerm && productosFiltrados.length > 0 && (
            <div 
              ref={listRef}
              className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              role="listbox" // Para accesibilidad
            >
              <ul className="divide-y divide-gray-200">
                {productosFiltrados.map((p, index) => (
                  <li 
                    key={p.id}
                    id={`prod-item-${index}`} // ID para aria-activedescendant
                    ref={index === highlightedIndex ? highlightedItemRef : null} // Ref para el scroll
                  >
                    <button
                      onClick={() => handleSeleccionarProducto(p)}
                      className={`w-full text-left px-4 py-3 text-sm focus:outline-none
                        ${index === highlightedIndex ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}
                      `}
                      role="option"
                      aria-selected={index === highlightedIndex}
                    >
                      {p.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!productoSeleccionado && searchTerm && productosFiltrados.length === 0 && (
         <p className="text-sm text-gray-500 my-2">No se encontraron productos con ese nombre.</p>
      )}

      {productoSeleccionado ? (
        <div className="mt-8 p-4 border border-gray-300 rounded-lg bg-gray-50 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">
              Editando HTML para: <span className="font-bold text-indigo-600">{productoSeleccionado.nombre}</span>
            </h3>
            <button 
              onClick={() => { setProductoSeleccionado(null); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Seleccionar otro producto
            </button>
          </div>
          <textarea
            rows={20}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Pega aquí el HTML para la descripción detallada del producto..."
          />
          <button
            onClick={handleGuardarHTML}
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200"
          >
            Guardar HTML
          </button>
        </div>
      ) : (
        !searchTerm && <p className="text-sm text-gray-500 mt-2">Escribe en el campo de búsqueda para encontrar y seleccionar un producto para editar su HTML.</p>
      )}
    </div>
  );
}
// src/components/ProductoHTMLInput.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProductos } from '../contexts/ProductosContext'; // Asegúrate que la ruta es correcta
import toast from 'react-hot-toast';

export default function ProductoHTMLInput() {
  const { productos, actualizarProducto, loading: productosLoading, cargarProductos: recargarProductosDesdeContext } = useProductos();
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [htmlFilter, setHtmlFilter] = useState('sin-html');

  const searchInputRef = useRef(null);
  const highlightedItemRef = useRef(null);
  const productListRef = useRef(null); // RENOMBRADO: de listRef a productListRef

  useEffect(() => {
    if (!productosLoading && productos.length === 0 && recargarProductosDesdeContext) {
        // recargarProductosDesdeContext(); 
    }
  }, [productosLoading, productos.length, recargarProductosDesdeContext]);

  useEffect(() => {
    if (productoSeleccionado) {
      setHtmlContent(productoSeleccionado.descripcion_html || '');
    } else {
      setHtmlContent('');
    }
  }, [productoSeleccionado]);

  const productosFiltradosYConEstado = useMemo(() => {
    let productosTrabajo = [...productos].map(p => ({
      ...p,
      tieneHtml: p.descripcion_html && p.descripcion_html.trim() !== '',
    }));

    if (htmlFilter === 'sin-html') {
      productosTrabajo = productosTrabajo.filter(p => !p.tieneHtml);
    } else if (htmlFilter === 'con-html') {
      productosTrabajo = productosTrabajo.filter(p => p.tieneHtml);
    }
    
    if (searchTerm) {
      productosTrabajo = productosTrabajo.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    productosTrabajo.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return productosTrabajo;
  }, [productos, searchTerm, htmlFilter]);

  useEffect(() => {
    setHighlightedIndex(-1); 
  }, [searchTerm, htmlFilter]); 
  
  useEffect(() => {
    if (highlightedItemRef.current && productListRef.current) { // RENOMBRADO: listRef a productListRef
        const item = highlightedItemRef.current;
        const list = productListRef.current; // RENOMBRADO: listRef a productListRef
        const listRect = list.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        if (itemRect.bottom > listRect.bottom) {
            list.scrollTop += itemRect.bottom - listRect.bottom;
        } else if (itemRect.top < listRect.top) {
            list.scrollTop -= listRect.top - itemRect.top;
        }
    }
  }, [highlightedIndex]);

  const handleSeleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setHighlightedIndex(-1); 
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
      if (recargarProductosDesdeContext) recargarProductosDesdeContext(); 
      setProductoSeleccionado(prev => prev ? {...prev, descripcion_html: htmlContent, tieneHtml: htmlContent && htmlContent.trim() !== ''} : null);
    } else {
      toast.error('Error al actualizar el HTML del producto.');
    }
  };

  const handleKeyDownBusqueda = (e) => {
    const itemsCount = productosFiltradosYConEstado.length;
    if (!['Escape', 'Tab'].includes(e.key) && itemsCount === 0 && searchTerm) return; 
    if (!['Escape', 'Tab'].includes(e.key) && itemsCount === 0 && !searchTerm && htmlFilter !== 'todos') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % itemsCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + itemsCount) % itemsCount);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < itemsCount) {
          handleSeleccionarProducto(productosFiltradosYConEstado[highlightedIndex]);
        }
        break;
      case 'Escape':
        setSearchTerm('');
        setProductoSeleccionado(null); 
        setHighlightedIndex(-1);
        if (searchInputRef.current) searchInputRef.current.blur();
        break;
      default:
        break;
    }
  };

  if (productosLoading && !productos.length) return <div className="flex justify-center items-center h-32"><p>Cargando productos...</p></div>;

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gestionar HTML de Descripción Detallada</h2>
      
      {!productoSeleccionado ? (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
            <div className="flex-grow w-full sm:w-auto">
              <label htmlFor="search-prod" className="sr-only">Buscar Producto:</label>
              <input
                ref={searchInputRef}
                type="text"
                id="search-prod"
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDownBusqueda}
              />
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setHtmlFilter('sin-html')}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${htmlFilter === 'sin-html' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Sin HTML ({productos.filter(p => !(p.descripcion_html && p.descripcion_html.trim() !== '')).length})
              </button>
              <button 
                onClick={() => setHtmlFilter('con-html')}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${htmlFilter === 'con-html' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Con HTML ({productos.filter(p => p.descripcion_html && p.descripcion_html.trim() !== '').length})
              </button>
              <button 
                onClick={() => setHtmlFilter('todos')}
                className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${htmlFilter === 'todos' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Todos ({productos.length})
              </button>
            </div>
          </div>

          {productosFiltradosYConEstado.length > 0 && (
            <div 
              className={`mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg ${searchTerm ? 'absolute z-10 max-h-80 overflow-y-auto' : 'relative'}`}
              role="listbox"
              ref={productListRef} // RENOMBRADO: listRef a productListRef
            >
              <ul className="divide-y divide-gray-200">
                {productosFiltradosYConEstado.map((p, index) => (
                  <li 
                    key={p.id}
                    id={`prod-item-${p.id}`}
                    ref={index === highlightedIndex ? highlightedItemRef : null}
                  >
                    <button
                      onClick={() => handleSeleccionarProducto(p)}
                      className={`w-full text-left px-4 py-3 text-sm focus:outline-none flex items-center justify-between
                        ${index === highlightedIndex ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}
                      `}
                      role="option"
                      aria-selected={index === highlightedIndex}
                    >
                      <span>{p.nombre}</span>
                      <span 
                        className={`w-3 h-3 rounded-full ml-3 flex-shrink-0 ${p.tieneHtml ? 'bg-green-500' : 'bg-red-500'}`}
                        title={p.tieneHtml ? 'Tiene HTML' : 'No tiene HTML'}
                      ></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {productosFiltradosYConEstado.length === 0 && !productosLoading && (
             <p className="text-sm text-gray-500 my-4 text-center">
                {searchTerm ? `No se encontraron productos para "${searchTerm}" con el filtro actual.` : 
                 htmlFilter === 'sin-html' ? 'Todos los productos ya tienen descripción HTML o no hay productos.' :
                 htmlFilter === 'con-html' ? 'Ningún producto tiene descripción HTML aún o no hay productos.' :
                 'No hay productos para mostrar.'}
             </p>
          )}
        </div>
      ) : (
        <div className="mt-4 p-6 border border-indigo-200 rounded-lg bg-indigo-50 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-indigo-700">
              Editando HTML para: <span className="font-bold">{productoSeleccionado.nombre}</span>
            </h3>
            <button 
              onClick={() => { 
                  setProductoSeleccionado(null); 
                  if (searchInputRef.current) searchInputRef.current.focus();
              }}
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              Volver a la lista
            </button>
          </div>
          <textarea
            rows={25}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Pega o escribe aquí el código HTML para la descripción detallada del producto..."
          />
          <button
            onClick={handleGuardarHTML}
            className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Guardar HTML
          </button>
        </div>
      )}
    </div>
  );
}

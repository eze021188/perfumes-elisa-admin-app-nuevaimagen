import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';


export default function SearchModal({ isOpen, onClose, onSearch, searchResults, isLoadingSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const modalRef = useRef(null);

  // Efecto para el debounce de la búsqueda
  useEffect(() => {
    // Solo si el modal está abierto y el término de búsqueda no está vacío
    if (isOpen && searchTerm.trim()) {
      const handler = setTimeout(() => {
        onSearch(searchTerm.trim());
      }, 300); // 300ms de debounce

      return () => {
        clearTimeout(handler);
      };
    } else if (isOpen && !searchTerm.trim()) {
      // Si el término está vacío y el modal está abierto, limpiamos los resultados
      onSearch(''); // Pasa un término vacío para que la función de búsqueda limpie los resultados
    }
  }, [searchTerm, onSearch, isOpen]); // Se ejecuta cuando searchTerm o isOpen cambian

  // Efecto para cerrar el modal al presionar 'Escape' o hacer clic fuera
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-dark-800 p-6 rounded-lg shadow-xl w-11/12 max-w-lg relative border border-dark-700">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-100 transition-colors"
          aria-label="Cerrar búsqueda"
        >
          <X size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-100 mb-4">Buscar en Perfumes Elisa</h2>
        <form onSubmit={(e) => e.preventDefault()}> {/* Cambiado a prevenir comportamiento por defecto */}
          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos, clientes, ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              autoFocus
            />
          </div>
          {/* El botón de buscar se eliminará después de confirmar que la búsqueda instantánea funciona */}
          {/* <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              disabled={isLoadingSearch}
            >
              {isLoadingSearch ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Buscar'
              )}
            </button>
          </div> */}
        </form>

        {/* Sección para mostrar resultados */}
        <div className="mt-6 pt-4 border-t border-dark-700 max-h-60 overflow-y-auto">
          {isLoadingSearch && searchTerm.trim() ? ( // Muestra el spinner solo si hay término y está cargando
            <div className="flex justify-center items-center py-4 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Cargando resultados...
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div>
              <h3 className="text-md font-semibold text-gray-100 mb-3">Resultados:</h3>
              <ul className="space-y-2">
                {searchResults.map((result) => (
                  <li key={result.id} className="bg-dark-700 p-3 rounded-md flex justify-between items-center">
                    <div>
                      <p className="text-gray-100 font-medium">{result.name}</p>
                      <p className="text-gray-400 text-sm">{result.type}: <span className="text-gray-300">{result.description}</span></p>
                    </div>
                    {/* Aquí puedes añadir un botón o enlace para ver el detalle */}
                    {result.link && (
                        <Link to={result.link} onClick={onClose} className="text-primary-400 hover:underline text-sm ml-4">Ver</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : searchTerm.trim() && !isLoadingSearch ? (
            <p className="text-center text-gray-500 py-4">No se encontraron resultados para "{searchTerm}".</p>
          ) : (
            <p className="text-center text-gray-500 py-4">Ingresa un término para buscar.</p>
          )}
        </div>
      </div>
    </div>
  );
}

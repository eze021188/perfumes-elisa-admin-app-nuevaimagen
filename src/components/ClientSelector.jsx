// src/components/ClientSelector.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, User, X } from 'lucide-react'; // X ha sido añadido aquí

export default function ClientSelector({
  clientes,
  clienteSeleccionado,
  onSelect,
  onCreateNew
}) {
  const [query, setQuery] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [activo, setActivo] = useState(-1);
  const wrapperRef = useRef();

  useEffect(() => {
    if (!query) {
      setSugerencias([]);
      return;
    }
    const filtrado = clientes.filter(c =>
      c.nombre.toLowerCase().includes(query.toLowerCase())
    );
    setSugerencias(filtrado);
    setActivo(-1);
  }, [query, clientes]);

  // Cerrar dropdown al clicar fuera
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSugerencias([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="mb-4 relative">
      <label className="font-semibold block mb-2 text-gray-200">Cliente</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-500" />
        </div>
        <input
          type="text"
          className="border w-full pl-10 p-3 rounded-lg bg-dark-900 border-dark-700 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={query}
          placeholder="Buscar cliente..."
          onChange={e => {
            setQuery(e.target.value);
            onSelect(null); // Deseleccionar cliente al escribir
          }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              setActivo(i => Math.min(i + 1, sugerencias.length - 1));
            }
            if (e.key === 'ArrowUp') {
              setActivo(i => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && activo >= 0 && sugerencias[activo]) { // Añadida comprobación para sugerencias[activo]
              onSelect(sugerencias[activo]);
              setQuery(sugerencias[activo].nombre);
              setSugerencias([]);
            }
          }}
        />
      </div>
      
      {query && sugerencias.length === 0 && !clienteSeleccionado && ( // Solo mostrar si no hay cliente seleccionado
        <button
          type="button" // Es buena práctica añadir type="button"
          className="flex items-center mt-2 text-primary-400 hover:text-primary-300 transition-colors"
          onClick={onCreateNew}
        >
          <UserPlus size={16} className="mr-1" />
          <span>Agregar nuevo cliente</span>
        </button>
      )}
      
      {sugerencias.length > 0 && (
        <ul className="absolute z-10 w-full bg-dark-800 border border-dark-700 rounded-lg shadow-dropdown-dark max-h-40 overflow-auto mt-1">
          {sugerencias.map((c, i) => (
            <li
              key={c.id}
              className={`p-3 cursor-pointer flex items-center ${
                activo === i ? 'bg-dark-700' : 'hover:bg-dark-700'
              } transition-colors`}
              onMouseEnter={() => setActivo(i)}
              onClick={() => {
                onSelect(c);
                setQuery(c.nombre);
                setSugerencias([]);
              }}
            >
              <User size={16} className="mr-2 text-gray-400" />
              <span className="text-gray-200">{c.nombre}</span>
            </li>
          ))}
        </ul>
      )}
      
      {clienteSeleccionado && (
        <div className="mt-2 p-3 bg-dark-800/50 border border-dark-700/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-gray-200 font-medium">{clienteSeleccionado.nombre}</p>
            {clienteSeleccionado.telefono && (
              <p className="text-gray-400 text-sm">Tel: {clienteSeleccionado.telefono}</p>
            )}
          </div>
          <button
            type="button" // Es buena práctica añadir type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
            }}
            className="text-gray-400 hover:text-error-400 transition-colors"
            aria-label="Deseleccionar cliente" // Añadir aria-label por accesibilidad
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
// src/components/ClientSelector.jsx
import React, { useState, useRef, useEffect } from 'react';

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
      <label className="font-semibold block mb-1">Cliente</label>
      <input
        type="text"
        className="border w-full p-2 rounded"
        value={query}
        placeholder="Buscar cliente..."
        onChange={e => {
          setQuery(e.target.value);
          onSelect(null);
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            setActivo(i => Math.min(i + 1, sugerencias.length - 1));
          }
          if (e.key === 'ArrowUp') {
            setActivo(i => Math.max(i - 1, 0));
          }
          if (e.key === 'Enter' && activo >= 0) {
            onSelect(sugerencias[activo]);
            setQuery(sugerencias[activo].nombre);
            setSugerencias([]);
          }
        }}
      />
      {query && sugerencias.length === 0 && (
        <p
          className="text-blue-600 cursor-pointer mt-1"
          onClick={onCreateNew}
        >
          + Agregar nuevo cliente
        </p>
      )}
      {sugerencias.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border max-h-40 overflow-auto">
          {sugerencias.map((c, i) => (
            <li
              key={c.id}
              className={`p-2 cursor-pointer ${
                activo === i ? 'bg-blue-100' : ''
              }`}
              onMouseEnter={() => setActivo(i)}
              onClick={() => {
                onSelect(c);
                setQuery(c.nombre);
                setSugerencias([]);
              }}
            >
              {c.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
);
}

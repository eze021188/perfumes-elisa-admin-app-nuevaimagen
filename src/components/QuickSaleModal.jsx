// src/components/QuickSaleModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function QuickSaleModal({ isOpen, onClose, onAdd }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [errors, setErrors] = useState({ nombre: '', precio: '', cantidad: '' });
  const inputRef = useRef(null);

  // Enfocar el primer input al abrir el modal
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Validaciones de campos
  function validate() {
    const errs = { nombre: '', precio: '', cantidad: '' };
    if (!nombre.trim()) errs.nombre = 'Requerido';
    if (!precio || Number(precio) <= 0) errs.precio = 'Mayor que 0';
    if (!cantidad || cantidad <= 0) errs.cantidad = 'Mayor que 0';
    setErrors(errs);
    return !errs.nombre && !errs.precio && !errs.cantidad;
  }

  function handleAdd() {
    if (!validate()) return;
    onAdd({
      nombre,
      promocion: Number(precio),
      cantidad,
      total: Number(precio) * cantidad
    });
    onClose();
    setNombre('');
    setPrecio('');
    setCantidad(1);
    setErrors({ nombre: '', precio: '', cantidad: '' });
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg p-6 w-80 relative border border-dark-700 shadow-dropdown-dark">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Venta rápida</h2>

        {/* Nombre */}
        <label className="block mb-1 text-sm text-gray-300" htmlFor="qs-nombre">Nombre</label>
        <input
          id="qs-nombre"
          ref={inputRef}
          className={`w-full p-2 rounded-lg mb-1 bg-dark-900 border ${errors.nombre ? 'border-error-500' : 'border-dark-700'} text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          aria-invalid={!!errors.nombre}
        />
        {errors.nombre && <p className="text-error-400 text-xs mb-2">{errors.nombre}</p>}

        {/* Precio */}
        <label className="block mb-1 text-sm text-gray-300" htmlFor="qs-precio">Precio</label>
        <input
          id="qs-precio"
          type="number"
          className={`w-full p-2 rounded-lg mb-1 bg-dark-900 border ${errors.precio ? 'border-error-500' : 'border-dark-700'} text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
          value={precio}
          onChange={e => setPrecio(e.target.value)}
          aria-invalid={!!errors.precio}
        />
        {errors.precio && <p className="text-error-400 text-xs mb-2">{errors.precio}</p>}

        {/* Cantidad */}
        <label className="block mb-1 text-sm text-gray-300" htmlFor="qs-cantidad">Cantidad</label>
        <input
          id="qs-cantidad"
          type="number"
          className={`w-full p-2 rounded-lg mb-4 bg-dark-900 border ${errors.cantidad ? 'border-error-500' : 'border-dark-700'} text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500`}
          value={cantidad}
          onChange={e => setCantidad(+e.target.value)}
          aria-invalid={!!errors.cantidad}
        />
        {errors.cantidad && <p className="text-error-400 text-xs mb-4">{errors.cantidad}</p>}

        <button
          onClick={handleAdd}
          disabled={!nombre.trim() || !precio || Number(precio) <= 0 || !cantidad || cantidad <= 0}
          className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Añadir al carrito
        </button>
      </div>
    </div>
  );
}
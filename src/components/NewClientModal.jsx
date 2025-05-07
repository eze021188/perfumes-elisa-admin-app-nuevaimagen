// src/components/NewClientModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

export default function NewClientModal({ isOpen, onClose, onClientAdded }) {
  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    direccion: ''
  });
  const [errors, setErrors] = useState({ nombre: '', telefono: '', correo: '' });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Enfocar el primer input al abrir el modal
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validaciones de campos
  function validate() {
    const errs = { nombre: '', telefono: '', correo: '' };
    if (!cliente.nombre.trim()) errs.nombre = 'Requerido';
    if (!cliente.telefono.trim()) errs.telefono = 'Requerido';
    if (!cliente.correo.trim() || !cliente.correo.includes('@')) errs.correo = 'Email inválido';
    setErrors(errs);
    return !errs.nombre && !errs.telefono && !errs.correo;
  }

  // Guardar cliente en Supabase
  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clientes').insert([cliente]).single();
      if (error) throw error;
      onClientAdded(data);
      onClose();
      setCliente({ nombre: '', telefono: '', correo: '', direccion: '' });
      setErrors({ nombre: '', telefono: '', correo: '' });
    } catch (err) {
      console.error(err);
      setErrors(prev => ({ ...prev, nombre: 'Error al guardar' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Cerrar modal"
        >
          <X />
        </button>
        <h2 className="text-lg font-semibold mb-4">Nuevo Cliente</h2>

        {/* Nombre */}
        <label htmlFor="nc-nombre" className="block text-sm mb-1">Nombre*</label>
        <input
          id="nc-nombre"
          ref={inputRef}
          className={`w-full p-2 border rounded mb-1 ${errors.nombre ? 'border-red-500' : ''}`}
          value={cliente.nombre}
          onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
          aria-invalid={!!errors.nombre}
          disabled={loading}
        />
        {errors.nombre && <p className="text-red-500 text-xs mb-2">{errors.nombre}</p>}

        {/* Teléfono */}
        <label htmlFor="nc-telefono" className="block text-sm mb-1">Teléfono*</label>
        <input
          id="nc-telefono"
          type="tel"
          className={`w-full p-2 border rounded mb-1 ${errors.telefono ? 'border-red-500' : ''}`}
          value={cliente.telefono}
          onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
          aria-invalid={!!errors.telefono}
          disabled={loading}
        />
        {errors.telefono && <p className="text-red-500 text-xs mb-2">{errors.telefono}</p>}

        {/* Correo */}
        <label htmlFor="nc-correo" className="block text-sm mb-1">Correo*</label>
        <input
          id="nc-correo"
          type="email"
          className={`w-full p-2 border rounded mb-1 ${errors.correo ? 'border-red-500' : ''}`}
          value={cliente.correo}
          onChange={e => setCliente({ ...cliente, correo: e.target.value })}
          aria-invalid={!!errors.correo}
          disabled={loading}
        />
        {errors.correo && <p className="text-red-500 text-xs mb-2">{errors.correo}</p>}

        {/* Dirección */}
        <label htmlFor="nc-direccion" className="block text-sm mb-1">Dirección</label>
        <input
          id="nc-direccion"
          className="w-full p-2 border rounded mb-4"
          value={cliente.direccion}
          onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
          disabled={loading}
        />

        <button
          onClick={handleSave}
          disabled={loading || !!errors.nombre || !!errors.telefono || !!errors.correo}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando…' : 'Guardar Cliente'}
        </button>
      </div>
    </div>
  );
}

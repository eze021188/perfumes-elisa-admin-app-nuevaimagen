// src/components/NewClientModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

export default function NewClientModal({ isOpen, onClose, onClientAdded }) {
  const [cliente, setCliente] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    direccion: ''
  });

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          <X />
        </button>
        <h2 className="text-lg font-semibold mb-4">Nuevo Cliente</h2>
        {['nombre','telefono','correo','direccion'].map((field) => (
          <div key={field} className="mb-3">
            <label className="block text-sm mb-1 capitalize">{field}</label>
            <input
              type={field === 'telefono' ? 'tel' : field === 'correo' ? 'email' : 'text'}
              className="w-full p-2 border rounded"
              value={cliente[field]}
              onChange={e =>
                setCliente({ ...cliente, [field]: e.target.value })
              }
            />
          </div>
        ))}
        <button
          onClick={async () => {
            const { data, error } = await supabase
              .from('clientes')
              .insert([cliente])
              .single();
            if (!error) {
              onClientAdded(data);
              onClose();
              setCliente({ nombre:'',telefono:'',correo:'',direccion:'' });
            } else {
              console.error(error);
            }
          }}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Guardar Cliente
        </button>
      </div>
    </div>
  );
}

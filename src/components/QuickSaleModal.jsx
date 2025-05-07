// src/components/QuickSaleModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function QuickSaleModal({ isOpen, onClose, onAdd }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState(1);

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
        <h2 className="text-lg font-semibold mb-4">Venta rápida</h2>
        <label className="block mb-2 text-sm">Nombre</label>
        <input
          className="w-full p-2 border rounded mb-3"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
        />
        <label className="block mb-2 text-sm">Precio</label>
        <input
          type="number"
          className="w-full p-2 border rounded mb-3"
          value={precio}
          onChange={e => setPrecio(e.target.value)}
        />
        <label className="block mb-2 text-sm">Cantidad</label>
        <input
          type="number"
          className="w-full p-2 border rounded mb-4"
          value={cantidad}
          onChange={e => setCantidad(+e.target.value)}
        />
        <button
          onClick={() => {
            if (nombre && precio && cantidad > 0) {
              onAdd({ nombre, promocion: Number(precio), cantidad, total: Number(precio) * cantidad });
              onClose();
              setNombre(''); setPrecio(''); setCantidad(1);
            }
          }}
          className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600"
        >
          Añadir al carrito
        </button>
      </div>
    </div>
  );
}

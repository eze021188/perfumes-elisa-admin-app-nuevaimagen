// src/components/ModalAbono.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Estructura básica de un modal simple con overlay y contenido centrado
export default function ModalAbono({ isOpen, onClose, cliente, onRecordAbono }) {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Limpiar el formulario cuando el modal se abre o el cliente cambia
  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setDescripcion('');
      setIsProcessing(false); // Resetear estado de procesamiento
    }
  }, [isOpen, cliente]); // Depende de isOpen y cliente

  if (!isOpen || !cliente) return null; // No renderizar si no está abierto o no hay cliente

  const handleSubmit = async (e) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast.error('Por favor, ingresa un monto positivo válido.');
      return;
    }

    setIsProcessing(true);
    // Llama a la función handleRecordAbono pasada desde la página principal
    const result = await onRecordAbono(cliente.id, montoNumerico, descripcion.trim());

    setIsProcessing(false);

    if (result.success) {
      onClose(); // Cerrar modal solo si el registro fue exitoso
    }
    // El toast de éxito/error ya se maneja en onRecordAbono
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Registrar Abono</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <p className="mb-4">Cliente: <span className="font-medium">{cliente.nombre}</span></p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="montoAbono" className="block text-sm font-medium text-gray-700 mb-1">Monto del Abono</label>
            <input
              id="montoAbono"
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              min="0.01"
            />
          </div>
           <div className="mb-4">
            <label htmlFor="descripcionAbono" className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
            <input
              id="descripcionAbono"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              maxLength="100" // Limitar longitud
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              {isProcessing ? 'Registrando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
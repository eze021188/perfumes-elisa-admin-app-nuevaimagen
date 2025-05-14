// src/components/ModalAbono.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function ModalAbono({ isOpen, onClose, cliente, onRecordAbono }) {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState(''); // Iniciar vacío, permitir al usuario o lógica decidir
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      // Si quieres un valor por defecto en descripción cuando se abre el modal:
      setDescripcion(cliente && cliente.client_name ? `Abono cliente ${cliente.client_name}` : 'Abono cliente');
      setIsProcessing(false);
    }
  }, [isOpen, cliente]);

  if (!isOpen || !cliente) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast.error('Por favor, ingresa un monto positivo válido.');
      return;
    }

    setIsProcessing(true);
    // CORRECCIÓN: Pasar el objeto 'cliente' completo a onRecordAbono
    const result = await onRecordAbono(cliente, montoNumerico, descripcion.trim() || `Abono cliente ${cliente.client_name}`); // Asegurar una descripción si está vacía

    setIsProcessing(false);

    if (result && result.success) { // Verificar si result y result.success existen
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"> {/* Añadido p-4 para evitar que el modal toque los bordes en pantallas pequeñas */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Registrar Abono</h2> {/* Texto más oscuro */}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button> {/* Leading-none para mejor alineación de la X */}
        </div>

        {/* CORRECCIÓN: Usar cliente.client_name para mostrar el nombre */}
        <p className="mb-6 text-sm"> {/* Aumentado mb y ajustado texto */}
            Cliente: <span className="font-semibold text-gray-700">{cliente.client_name || 'No especificado'}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4"> {/* Añadido space-y-4 para espaciado entre campos */}
          <div>
            <label htmlFor="montoAbono" className="block text-sm font-medium text-gray-700 mb-1">Monto del Abono <span className="text-red-500">*</span></label>
            <input
              id="montoAbono"
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" // Estilo de focus mejorado
              required
              min="0.01"
              placeholder="0.00"
            />
          </div>
           <div>
            <label htmlFor="descripcionAbono" className="block text-sm font-medium text-gray-700 mb-1">Descripción (Opcional)</label>
            <input
              id="descripcionAbono"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength="100"
              placeholder="Ej: Pago factura #123"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2"> {/* Añadido pt-2 */}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition duration-150 ease-in-out disabled:opacity-50" // Estilo mejorado
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing || !monto} // Deshabilitar si no hay monto
            >
              {isProcessing ? 'Registrando...' : 'Registrar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
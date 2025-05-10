// src/components/ModalSaldoFavor.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Define helpers de formato localmente para asegurar disponibilidad
const formatNumberWithCommas = (amount) => {
    return Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
const formatSaldoDisplay = (saldo) => {
    const formattedAmount = formatNumberWithCommas(saldo);
    if (saldo > 0) return `-${formattedAmount}`;
    if (saldo < 0) return `$${formattedAmount}`;
    return '$0.00';
};


export default function ModalSaldoFavor({ isOpen, onClose, cliente, onAddCredit }) {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setDescripcion('');
      setIsProcessing(false);
    }
  }, [isOpen, cliente]);

  // Renderiza solo si está abierto y cliente existe Y tiene client_id
  if (!isOpen || !cliente || !cliente.client_id) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const montoNumerico = parseFloat(monto);

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast.error('Por favor, ingresa un monto positivo válido.');
      return;
    }

    setIsProcessing(true);
    // Pasa el objeto cliente completo a onAddCredit, que en SaldosClientes usa cliente.client_id
    const result = await onAddCredit(cliente, montoNumerico, descripcion.trim() || 'Crédito a favor');

    setIsProcessing(false);

    if (result.success) {
       onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Añadir Saldo a Favor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        {/* Usar client_name para mostrar el nombre */}
        <p className="mb-4">Cliente: <span className="font-medium">{cliente.client_name}</span></p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="montoCredito" className="block text-sm font-medium text-gray-700 mb-1">Monto del Crédito</label>
            <input
              id="montoCredito"
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
            <label htmlFor="descripcionCredito" className="block text-sm font-medium text-gray-700 mb-1">Razón (Opcional)</label>
            <input
              id="descripcionCredito"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              maxLength="100"
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
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isProcessing}
            >
              {isProcessing ? 'Añadiendo...' : 'Añadir Saldo a Favor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
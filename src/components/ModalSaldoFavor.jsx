// src/components/ModalSaldoFavor.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, PlusCircle, FileText } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-dark-800 p-6 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-gray-100">Añadir Saldo a Favor</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-300">
            Cliente: <span className="font-semibold text-gray-100">{cliente.client_name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="montoCredito" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <PlusCircle size={16} />
              Monto del Crédito <span className="text-error-400">*</span>
            </label>
            <input
              id="montoCredito"
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
              required
              min="0.01"
              placeholder="0.00"
            />
          </div>
           <div>
            <label htmlFor="descripcionCredito" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <FileText size={16} />
              Razón (Opcional)
            </label>
            <input
              id="descripcionCredito"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
              maxLength="100"
              placeholder="Ej: Devolución de producto"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors disabled:opacity-50"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-success-600 text-white rounded-md hover:bg-success-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              disabled={isProcessing || !monto}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Añadiendo...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Añadir Saldo a Favor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
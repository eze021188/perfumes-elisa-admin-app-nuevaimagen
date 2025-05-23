// src/components/ModalAbono.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, DollarSign, FileText } from 'lucide-react';

export default function ModalAbono({ isOpen, onClose, cliente, onRecordAbono }) {
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMonto('');
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
    const result = await onRecordAbono(cliente, montoNumerico, descripcion.trim() || `Abono cliente ${cliente.client_name}`);

    setIsProcessing(false);

    if (result && result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-dark-800 p-6 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-gray-100">Registrar Abono</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-300">
            Cliente: <span className="font-semibold text-gray-100">{cliente.client_name || 'No especificado'}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="montoAbono" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <DollarSign size={16} />
              Monto del Abono <span className="text-error-400">*</span>
            </label>
            <input
              id="montoAbono"
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
            <label htmlFor="descripcionAbono" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <FileText size={16} />
              Descripción (Opcional)
            </label>
            <input
              id="descripcionAbono"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
              maxLength="100"
              placeholder="Ej: Pago factura #123"
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
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              disabled={isProcessing || !monto}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  <span>Registrar Abono</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
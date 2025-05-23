// src/pages/Productos.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductosItems from '../components/ProductosItems'; 
import ProductosStock from '../components/ProductosStock.jsx'; 
import ProductoHTMLInput from '../components/ProductoHTMLInput.jsx';
import { ArrowLeft, Package, Activity, Code } from 'lucide-react';

export default function Productos() {
  const [pestaniaActiva, setPestaniaActiva] = useState('ITEMS');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold text-gray-100 text-center w-full md:w-auto">
          Gestión de Productos
        </h1>
        <div className="w-auto md:w-[150px]"></div>
      </div>

      {/* Pestañas con diseño moderno */}
      <div className="flex border-b border-dark-700 mb-8">
        <button
          className={`
            px-6 py-3 -mb-px border-b-2 text-lg font-semibold transition-colors focus:outline-none flex items-center gap-2
            ${
              pestaniaActiva === 'ITEMS'
                ? 'border-primary-500 text-primary-400' 
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-dark-600' 
            }
          `}
          onClick={() => setPestaniaActiva('ITEMS')}
        >
          <Package size={18} />
          ITEMS
        </button>
        <button
          className={`
             px-6 py-3 -mb-px border-b-2 text-lg font-semibold transition-colors focus:outline-none flex items-center gap-2
            ${
              pestaniaActiva === 'STOCK'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-dark-600'
            }
          `}
          onClick={() => setPestaniaActiva('STOCK')}
        >
          <Activity size={18} />
          STOCK
        </button>
        <button
          className={`
             px-6 py-3 -mb-px border-b-2 text-lg font-semibold transition-colors focus:outline-none flex items-center gap-2
            ${
              pestaniaActiva === 'HTML_DETALLE'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-dark-600'
            }
          `}
          onClick={() => setPestaniaActiva('HTML_DETALLE')}
        >
          <Code size={18} />
          DETALLE HTML
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      <div className="bg-dark-800 p-6 rounded-lg shadow-card-dark border border-dark-700/50">
        {pestaniaActiva === 'ITEMS' && <ProductosItems />}
        {pestaniaActiva === 'STOCK' && <ProductosStock />}
        {pestaniaActiva === 'HTML_DETALLE' && <ProductoHTMLInput />}
      </div>
    </div>
  );
}
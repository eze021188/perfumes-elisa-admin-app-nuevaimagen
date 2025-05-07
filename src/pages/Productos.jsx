// src/pages/Productos.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductosItems from '../components/ProductosItems';
import ProductosStock from '../components/ProductosStock.jsx';


export default function Productos() {
  const [pestaniaActiva, setPestaniaActiva] = useState('ITEMS');
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          Volver al inicio
        </button>

        <h1 className="text-xl font-semibold text-center w-full md:w-auto">
          Gestión de Productos
        </h1>
      </div>

      {/* Pestañas */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            pestaniaActiva === 'ITEMS'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setPestaniaActiva('ITEMS')}
        >
          ITEMS
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            pestaniaActiva === 'STOCK'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setPestaniaActiva('STOCK')}
        >
          STOCK
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      <div className="bg-white p-4 rounded shadow">
      {pestaniaActiva === 'ITEMS' ? (
  <ProductosItems />
) : (
  <ProductosStock />
)}

      </div>
    </div>
  );
}

// src/pages/Productos.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductosItems from '../components/ProductosItems'; // Tu componente existente
import ProductosStock from '../components/ProductosStock.jsx'; // Tu componente existente
// Asegúrate de que este archivo exista en la ruta correcta: src/components/ProductoHTMLInput.jsx
import ProductoHTMLInput from '../components/ProductoHTMLInput.jsx'; // Componente para gestionar el HTML del producto

export default function Productos() {
  const [pestaniaActiva, setPestaniaActiva] = useState('ITEMS'); // 'ITEMS' como pestaña inicial
  const navigate = useNavigate();

  return (
    // Contenedor principal con padding, fondo ligero, bordes redondeados y sombra
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12 rounded-lg shadow-xl">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8"> {/* Aumentado gap y mb */}
        {/* Botón Volver al inicio con diseño moderno */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        {/* Título principal con estilo mejorado */}
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto"> {/* Tamaño y peso de fuente aumentados, color más oscuro */}
          Gestión de Productos
        </h1>
         {/* Div vacío para mantener el espacio si es necesario en flexbox */}
         <div className="w-auto md:w-[150px]"></div> {/* Ajusta el ancho según el botón */}
      </div>

      {/* Pestañas con diseño moderno */}
      <div className="flex border-b-2 border-gray-300 mb-8"> {/* Borde inferior más pronunciado */}
        {/* Botón Pestaña ITEMS */}
        <button
          className={`
            px-6 py-3 -mb-[2px] border-b-2 text-lg font-semibold transition duration-200 ease-in-out focus:outline-none
            ${
              pestaniaActiva === 'ITEMS'
                ? 'border-blue-600 text-blue-600' // Estilo para pestaña activa
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300' // Estilo para pestaña inactiva
            }
          `}
          onClick={() => setPestaniaActiva('ITEMS')}
        >
          ITEMS
        </button>
        {/* Botón Pestaña STOCK */}
        <button
          className={`
             px-6 py-3 -mb-[2px] border-b-2 text-lg font-semibold transition duration-200 ease-in-out focus:outline-none
            ${
              pestaniaActiva === 'STOCK'
                ? 'border-blue-600 text-blue-600' // Estilo para pestaña activa
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300' // Estilo para pestaña inactiva
            }
          `}
          onClick={() => setPestaniaActiva('STOCK')}
        >
          STOCK
        </button>
        {/* --- NUEVO BOTÓN DE PESTAÑA: DETALLE HTML --- */}
        <button
          className={`
             px-6 py-3 -mb-[2px] border-b-2 text-lg font-semibold transition duration-200 ease-in-out focus:outline-none
            ${
              pestaniaActiva === 'HTML_DETALLE' // Nuevo identificador para esta pestaña
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300'
            }
          `}
          onClick={() => setPestaniaActiva('HTML_DETALLE')}
        >
          DETALLE HTML
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {/* Contenedor del contenido con padding y fondo blanco */}
      <div className="bg-white p-6 rounded-lg shadow-md"> {/* Aumentado padding, bordes redondeados y sombra */}
      {pestaniaActiva === 'ITEMS' && <ProductosItems />}
      {pestaniaActiva === 'STOCK' && <ProductosStock />}
      {/* --- NUEVA CONDICIÓN PARA RENDERIZAR EL COMPONENTE DE GESTIÓN DE HTML --- */}
      {pestaniaActiva === 'HTML_DETALLE' && <ProductoHTMLInput />}
      </div>
    </div>
  );
}
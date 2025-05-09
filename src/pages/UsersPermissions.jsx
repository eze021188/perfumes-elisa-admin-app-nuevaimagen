// src/pages/UsersPermissions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UsersPermissions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado: botón, título y espacio */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        {/* Botón Volver al inicio */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        {/* Título principal */}
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Usuarios y permisos
        </h1>

        {/* Div vacío para equilibrar el espacio en md+ */}
        <div className="w-full md:w-[150px]" />
      </div>

      {/* Contenido principal */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <p className="text-gray-700">
          Gestiona aquí los usuarios y sus permisos de acceso.
        </p>
      </div>
    </div>
  );
}

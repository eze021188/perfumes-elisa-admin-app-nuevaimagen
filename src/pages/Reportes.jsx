// src/pages/Reportes.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Reportes() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Botón Volver al inicio */}
      <button
        onClick={() => navigate('/')}
        className="inline-block mb-6 px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
      >
        Volver al inicio
      </button>

      {/* Contenido principal */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-4">Reportes</h1>
        <p>Aquí podrás ver los reportes de tu aplicación.</p>
      </div>
    </div>
  );
}

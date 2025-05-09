// src/pages/UsersPermissions.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function UsersPermissions() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12"> {/* Contenedor principal con fondo y padding */}
      {/* Botón Regresar */}
      <NavLink
        to="/"
        className="inline-block mb-6 px-6 py-2 bg-gray-700 text-white rounded-lg shadow-md hover:bg-gray-800 transition duration-200" // Estilo de botón moderno
      >
        Regresar al inicio
      </NavLink>

      {/* Contenido principal dentro de un contenedor estilizado */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8"> {/* Contenedor blanco con sombra y padding */}
        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Usuarios y permisos</h1> {/* Estilo de título moderno */}

        {/* Párrafo */}
        <p className="text-gray-700">Gestiona aquí los usuarios y sus permisos de acceso.</p> {/* Estilo de párrafo básico */}
      </div>
    </div>
  );
}
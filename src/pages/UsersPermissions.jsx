// src/pages/UsersPermissions.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'

export default function UsersPermissions() {
  return (
    <div className="p-6">
      <NavLink
        to="/"
        className="inline-block mb-4 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
      >
        Regresar al inicio
      </NavLink>
      <h1 className="text-2xl font-semibold mb-4">Usuarios y permisos</h1>
      <p>Gestiona aquí los usuarios y sus permisos de acceso.</p>
    </div>
  )
}

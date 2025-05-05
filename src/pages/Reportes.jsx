// src/pages/Reportes.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Reportes() {
  return (
    <div className="p-6">
      <NavLink
        to="/"
        className="inline-block mb-4 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
      >
        Regresar al inicio
      </NavLink>
      <h1 className="text-2xl font-semibold mb-4">Reportes</h1>
      <p>Aquí podrás ver los reportes de tu aplicación.</p>
    </div>
  )
}

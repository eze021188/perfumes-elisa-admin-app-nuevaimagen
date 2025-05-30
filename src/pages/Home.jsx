// src/pages/Home.jsx
import React from 'react';
// Asegúrate de que la importación de Dashboard apunte al archivo .jsx
import Dashboard from '../components/dashboard/Dashboard.jsx'; // <--- ¡CORREGIDO AQUÍ!

export default function Home() {
  return (
    // Se eliminan las clases "container" y "mx-auto" para que el div ocupe todo el ancho disponible.
    // Se añade "w-full" para asegurar que ocupe el 100% del ancho del padre.
    // Si el componente 'Dashboard' tiene su propio padding interno, lo mantendrá.
    <div className="w-full"> 
      <Dashboard />
    </div>
  );
}
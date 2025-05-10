// src/pages/Home.jsx
import React from 'react';
// Importa el componente HomeCards
import HomeCards from '../components/HomeCards';

export default function Home() {
  return (
    <div className="p-6"> {/* Este padding (p-6) ya crea un espacio desde los bordes de la pantalla */}
      <h1 className="text-3xl font-bold mb-4">Bienvenido a Perfumes Elisa Admin</h1>
      <p className="text-lg text-gray-700 mb-8">
        Navega por el menú para administrar clientes, productos, compras, ventas e inventarios.
      </p>

      {/* Renderiza el componente HomeCards */}
      {/* Cambia justify-center a justify-start para alinear a la izquierda dentro del contenedor flex */}
      {/* La card quedará al inicio (izquierda) del espacio disponible después del padding p-6 */}
      <div className="flex justify-start"> {/* <-- Cambiado de justify-center */}
         <HomeCards />
      </div>

      {/* Puedes añadir más contenido de la página Home aquí si es necesario */}
    </div>
  );
}
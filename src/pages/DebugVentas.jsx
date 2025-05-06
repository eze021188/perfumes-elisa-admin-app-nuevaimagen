// src/pages/DebugVentas.jsx
import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function DebugVentas() {
  const [estado, setEstado] = useState('');

  const actualizarVentasConNombreCliente = async () => {
    setEstado('Procesando...');

    const { data: ventas, error: errorVentas } = await supabase
      .from('ventas')
      .select('id, cliente_id')
      .is('cliente_nombre', null);

    if (errorVentas) {
      setEstado(`❌ Error al obtener ventas: ${errorVentas.message}`);
      return;
    }

    let actualizadas = 0;
    for (const venta of ventas) {
      const { data: cliente, error: errorCliente } = await supabase
        .from('clientes')
        .select('nombre')
        .eq('id', venta.cliente_id)
        .single();

      if (errorCliente || !cliente) {
        console.warn(`⚠️ Cliente no encontrado para ID: ${venta.cliente_id}`);
        continue;
      }

      const { error: errorUpdate } = await supabase
        .from('ventas')
        .update({ cliente_nombre: cliente.nombre })
        .eq('id', venta.id);

      if (!errorUpdate) actualizadas++;
    }

    setEstado(`✅ Proceso completo. ${actualizadas} ventas actualizadas.`);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🛠 Debug Ventas</h1>
      <p className="mb-4">Este botón actualizará el campo <code>cliente_nombre</code> en las ventas antiguas usando el <code>cliente_id</code>.</p>
      <button
        onClick={actualizarVentasConNombreCliente}
        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
      >
        Ejecutar corrección
      </button>

      {estado && <p className="mt-4 text-sm text-gray-800">{estado}</p>}
    </div>
  );
}

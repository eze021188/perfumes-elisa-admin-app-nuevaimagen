// src/pages/Inventarios.jsx
import React, { useState } from 'react'
import { useProductos } from '../contexts/ProductosContext'
import { useInventarios } from '../contexts/InventariosContext'

export default function Inventarios() {
  const { productos, loading: loadingProductos } = useProductos()
  const { movimientos, loading: loadingMovimientos, obtenerMovimientos } = useInventarios()
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  const handleSelectProducto = async (producto) => {
    setProductoSeleccionado(producto)
    await obtenerMovimientos(producto.id)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Inventarios</h1>

      {/* Tabla de stock disponible */}
      {loadingProductos ? (
        <p>Cargando productos...</p>
      ) : (
        <table className="min-w-full bg-white mb-6">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-left">Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSelectProducto(p)}
              >
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Historial de movimientos */}
      {productoSeleccionado && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Historial de movimientos: {productoSeleccionado.nombre}
          </h2>
          {loadingMovimientos ? (
            <p>Cargando historial...</p>
          ) : movimientos.length === 0 ? (
            <p>No hay movimientos registrados.</p>
          ) : (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-left">Referencia</th>
                </tr>
              </thead>
              <tbody>
  {movimientos.map((m) => {
    const esDevolucion = m.motivo === 'devolucion_ventas';
    const tipoTexto = esDevolucion ? 'Entrada devolución' : 'VENTA';
    const cantidadTexto = m.tipo === 'SALIDA' ? `-${m.cantidad}` : `+${m.cantidad}`;
    const colorTexto = esDevolucion ? 'text-green-600' : 'text-red-600';

    return (
      <tr key={m.id} className="border-b">
        <td className="px-4 py-2">{new Date(m.fecha).toLocaleString()}</td>
        <td className={`px-4 py-2 font-semibold ${colorTexto}`}>{tipoTexto}</td>
        <td className={`px-4 py-2 text-right font-bold ${colorTexto}`}>{cantidadTexto}</td>
        <td className="px-4 py-2">{m.referencia}</td>
      </tr>
    );
  })}
</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

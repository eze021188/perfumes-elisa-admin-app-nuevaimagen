// src/pages/Productos.jsx
import React, { useState, useEffect } from 'react'
import { useProductos } from '../contexts/ProductosContext'

export default function Productos() {
  const {
    productos,
    loading,
    obtenerProductos,
    actualizarPromocion,
  } = useProductos()

  const [searchText, setSearchText] = useState('')
  const [filtered, setFiltered] = useState([])
  const [promociones, setPromociones] = useState({})

  // Carga inicial de productos
  useEffect(() => {
    obtenerProductos()
  }, [])

  // Sincroniza promociones locales cuando cambian los productos
  useEffect(() => {
    const prom = {}
    productos.forEach(p => { prom[p.id] = p.promocion })
    setPromociones(prom)
    // Actualiza la lista filtrada
    setFiltered(
      searchText
        ? productos.filter(p => p.nombre.toLowerCase().includes(searchText.toLowerCase()))
        : productos
    )
  }, [productos])

  // Filtrado al cambiar texto de búsqueda
  useEffect(() => {
    setFiltered(
      searchText
        ? productos.filter(p => p.nombre.toLowerCase().includes(searchText.toLowerCase()))
        : productos
    )
  }, [searchText, productos])

  const handlePromChange = (id, value) => {
    setPromociones(prev => ({ ...prev, [id]: value }))
  }

  const handleActualizarTodo = async () => {
    for (const id of Object.keys(promociones)) {
      const nuevaProm = promociones[id]
      await actualizarPromocion(id, nuevaProm)
    }
    await obtenerProductos()
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <button
          onClick={handleActualizarTodo}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Actualizar todo
        </button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Stock</th>
                <th className="px-3 py-2 text-left">Promoción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.id}</td>
                  <td className="px-3 py-2">{p.nombre}</td>
                  <td className="px-3 py-2">{p.stock}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={promociones[p.id] || ''}
                      onChange={e => handlePromChange(p.id, e.target.value)}
                      className="w-24 border rounded p-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
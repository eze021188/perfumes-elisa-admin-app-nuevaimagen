// src/pages/Compras.jsx
import React, { useState, useEffect } from 'react'
import { useCompras } from '../contexts/ComprasContext'
import { useProductos } from '../contexts/ProductosContext'
import AutocompleteInput from '../components/AutocompleteInput'

export default function Compras() {
  const { compras, loading, obtenerCompras, agregarCompra } = useCompras()
  const { productos, loading: productosLoading } = useProductos()

  const [showForm, setShowForm] = useState(false)
  const [detalleProductos, setDetalleProductos] = useState([])
  const [productInput, setProductInput] = useState('')
  const [gastosImportacion, setGastosImportacion] = useState(0)
  const [gastosEnvio, setGastosEnvio] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [tipoCambio, setTipoCambio] = useState(1)

  useEffect(() => {
    obtenerCompras()
  }, [])

  const handleAddProduct = (item) => {
    setDetalleProductos(prev => [
      ...prev,
      {
        productoId: item.value,
        nombre: item.label,
        cantidad: 1,
        costoUnitario: item.precioUnitario || 0,
      }
    ])
    setProductInput('')
  }

  const handleCantidadChange = (index, cantidad) => {
    setDetalleProductos(prev => prev.map((p, i) =>
      i === index ? { ...p, cantidad: Number(cantidad) } : p
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await agregarCompra({
      detalleProductos,
      gastosImportacion,
      gastosEnvio,
      otrosGastos,
      tipoCambio
    })
    setShowForm(false)
    // Reset form
    setDetalleProductos([])
    setGastosImportacion(0)
    setGastosEnvio(0)
    setOtrosGastos(0)
    setTipoCambio(1)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          {showForm ? 'Cancelar' : 'Nueva Compra'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white shadow rounded p-4">
          <div className="mb-4">
            <label className="block mb-1 font-medium">Agregar producto</label>
            <AutocompleteInput
              suggestions={productos.map(p => ({ label: p.nombre, value: p.id, precioUnitario: p.precioPromocion }))}
              value={productInput}
              onChange={setProductInput}
              onSelect={handleAddProduct}
              placeholder="Producto..."
            />
          </div>

          {detalleProductos.length > 0 && (
            <table className="w-full mb-4 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">Producto</th>
                  <th className="px-2 py-1">Cantidad</th>
                  <th className="px-2 py-1">Costo Unitario</th>
                </tr>
              </thead>
              <tbody>
                {detalleProductos.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1">{p.nombre}</td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        className="w-20 border rounded p-1"
                        value={p.cantidad}
                        onChange={e => handleCantidadChange(i, e.target.value)}
                        min="1"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">${p.costoUnitario.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1">Gastos Importación</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={gastosImportacion}
                onChange={e => setGastosImportacion(Number(e.target.value))}
                step="0.01"
              />
            </div>
            <div>
              <label className="block mb-1">Gastos Envío</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={gastosEnvio}
                onChange={e => setGastosEnvio(Number(e.target.value))}
                step="0.01"
              />
            </div>
            <div>
              <label className="block mb-1">Otros Gastos</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={otrosGastos}
                onChange={e => setOtrosGastos(Number(e.target.value))}
                step="0.01"
              />
            </div>
            <div>
              <label className="block mb-1">Tipo de Cambio</label>
              <input
                type="number"
                className="w-full border rounded p-2"
                value={tipoCambio}
                onChange={e => setTipoCambio(Number(e.target.value))}
                step="0.01"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Guardar Compra
          </button>
        </form>
      )}

      {loading || productosLoading ? (
        <p>Cargando datos...</p>
      ) : (
        <div className="overflow-auto bg-white shadow rounded">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2">ID Compra</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Productos</th>
                <th className="px-3 py-2 text-right">Total USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map(c => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{c.id}</td>
                  <td className="px-3 py-2">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    {c.detalleProductos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${c.detalleProductos.reduce((sum, p) => sum + (p.costoFinalUSD || (p.costoUnitario * p.cantidad)), 0).toFixed(2)}
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

// Compras.jsx (Diseño Moderno Actualizado con Subtotales y Descuento Global)
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Compras() {
  const [formulario, setFormulario] = useState({
    numeroPedido: '',
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: ''
  });
  const [descuentoPedido, setDescuentoPedido] = useState('');
  const [productosAgregados, setProductosAgregados] = useState([]);

  const manejarCambioFormulario = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const manejarCambioDescuento = (e) => {
    setDescuentoPedido(e.target.value);
  };

  const agregarProducto = () => {
    setProductosAgregados([...productosAgregados, formulario]);
    setFormulario({ ...formulario, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' });
  };

  const eliminarProducto = (index) => {
    setProductosAgregados(productosAgregados.filter((_, idx) => idx !== index));
  };

  const calcularSubtotalTotal = () => {
    return productosAgregados.reduce(
      (acc, prod) => acc + prod.cantidad * prod.precioUnitarioUSD,
      0
    );
  };

  const calcularTotalConDescuento = () => {
    const subtotal = calcularSubtotalTotal();
    const descuento = parseFloat(descuentoPedido) || 0;
    return subtotal - descuento;
  };

  return (
    <div className="max-w-5xl mx-auto my-8 bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Registro de Compras</h2>

      {/* Formulario de entrada de producto */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          name="numeroPedido"
          placeholder="Número de pedido"
          className="border rounded-md p-2"
          value={formulario.numeroPedido}
          onChange={manejarCambioFormulario}
        />
        <input
          type="text"
          name="nombreProducto"
          placeholder="Nombre del producto"
          className="border rounded-md p-2"
          value={formulario.nombreProducto}
          onChange={manejarCambioFormulario}
        />
        <input
          type="number"
          name="cantidad"
          placeholder="Cantidad"
          className="border rounded-md p-2"
          value={formulario.cantidad}
          onChange={manejarCambioFormulario}
        />
        <input
          type="number"
          name="precioUnitarioUSD"
          placeholder="Precio unitario"
          className="border rounded-md p-2"
          value={formulario.precioUnitarioUSD}
          onChange={manejarCambioFormulario}
        />
      </div>

      {/* Descuento global del pedido */}
      <div className="mb-4">
        <input
          type="number"
          name="descuentoPedido"
          placeholder="Descuento total del pedido (USD)"
          className="w-full border rounded-md p-2"
          value={descuentoPedido}
          onChange={manejarCambioDescuento}
        />
      </div>

      <button
        className="mb-6 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition"
        onClick={agregarProducto}
      >
        Agregar producto
      </button>

      {/* Tabla de productos agregados */}
      {productosAgregados.length > 0 && (
        <div className="mt-4">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-3">Producto</th>
                <th className="border p-3">Cantidad</th>
                <th className="border p-3">Precio Unitario</th>
                <th className="border p-3">Subtotal</th>
                <th className="border p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosAgregados.map((producto, index) => (
                <tr key={index}>
                  <td className="border p-3">{producto.nombreProducto}</td>
                  <td className="border p-3">{producto.cantidad}</td>
                  <td className="border p-3">
                    ${parseFloat(producto.precioUnitarioUSD).toFixed(2)}
                  </td>
                  <td className="border p-3">
                    ${(producto.cantidad * producto.precioUnitarioUSD).toFixed(2)}
                  </td>
                  <td className="border p-3 text-center">
                    <button
                      className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 transition"
                      onClick={() => eliminarProducto(index)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen final */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md shadow-inner flex justify-between items-center">
            <div>
              <p className="text-lg">Subtotal: ${calcularSubtotalTotal().toFixed(2)}</p>
              <p className="text-lg">Descuento: ${
                (parseFloat(descuentoPedido) || 0).toFixed(2)
              }</p>
            </div>
            <p className="text-2xl font-semibold">
              Total: ${calcularTotalConDescuento().toFixed(2)}
            </p>
          </div>

          {/* Botones de acción */}
          <div className="mt-6 flex gap-4">
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
              Afectar Inventario
            </button>
            <button className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition">
              Limpiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

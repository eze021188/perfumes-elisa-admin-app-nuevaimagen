// src/pages/Checkout.jsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', correo: '', direccion: '' });

  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [productosVenta, setProductosVenta] = useState([]);
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [tipoDescuento, setTipoDescuento] = useState('ninguno');
  const [valorDescuento, setValorDescuento] = useState(0);

  const [mensajeStock, setMensajeStock] = useState('');
  const [ventaExitosa, setVentaExitosa] = useState(false);
  const [codigoVenta, setCodigoVenta] = useState('');
  const [mostrarPDF, setMostrarPDF] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    cargarClientes();
    cargarProductos();
  }, []);

  const cargarClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('*');
    if (!error) setClientes(data);
  };

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (!error) setProductos(data);
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setClienteBusqueda(cliente.nombre);
  };

  const seleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setProductoBusqueda(producto.nombre);
    setMensajeStock(`Stock disponible: ${producto.stock}`);
  };
  const agregarProductoAVenta = () => {
    if (!productoSeleccionado || cantidad <= 0) return;

    if (cantidad > productoSeleccionado.stock) {
      setMensajeStock('❌ No hay existencia suficiente');
      setTimeout(() => setMensajeStock(''), 3000);
      return;
    }

    const productoConCantidad = {
      ...productoSeleccionado,
      cantidad,
      total: productoSeleccionado.promocion * cantidad
    };

    setProductosVenta([...productosVenta, productoConCantidad]);
    setProductoSeleccionado(null);
    setProductoBusqueda('');
    setCantidad(1);
    setMensajeStock('');
  };

  const subtotal = productosVenta.reduce((sum, p) => sum + p.total, 0);

  const descuentoCalculado =
    tipoDescuento === 'monto'
      ? Number(valorDescuento)
      : tipoDescuento === 'porcentaje'
      ? subtotal * (Number(valorDescuento) / 100)
      : 0;

  const total = subtotal - descuentoCalculado;

  const generarCodigoVenta = async () => {
    const { data, error } = await supabase.from('ventas').select('codigo_venta');
    const numero = (data?.length || 0) + 1;
    return `VT${numero.toString().padStart(5, '0')}`;
  };

  const finalizarVenta = async () => {
    if (!clienteSeleccionado || productosVenta.length === 0) return;

    const codigo = await generarCodigoVenta();
    setCodigoVenta(codigo);

    const { data: ventaInsertada, error } = await supabase
      .from('ventas')
      .insert([
        {
          codigo_venta: codigo,
          cliente_id: clienteSeleccionado.id,
          forma_pago: formaPago,
          tipo_descuento: tipoDescuento,
          valor_descuento: valorDescuento,
          subtotal,
          total
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar venta:', error.message);
      return;
    }

    const venta_id = ventaInsertada.id;

    for (const p of productosVenta) {
      await supabase.from('detalle_venta').insert([
        {
          venta_id,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio_unitario: p.promocion,
          total_parcial: p.total
        }
      ]);

      await supabase
        .from('productos')
        .update({ stock: p.stock - p.cantidad })
        .eq('id', p.id);
    }

    setVentaExitosa(true);
    setMostrarPDF(true);
  };
  const generarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Ticket de venta - ${codigoVenta}`, 10, 10);

    doc.setFontSize(12);
    doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 20);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30);
    doc.text(`Forma de pago: ${formaPago}`, 10, 40);

    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'P. Unitario', 'Total']],
      body: productosVenta.map(p => [
        p.nombre,
        p.cantidad,
        `$${p.promocion.toFixed(2)}`,
        `$${p.total.toFixed(2)}`
      ])
    });

    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, doc.lastAutoTable.finalY + 10);
    doc.text(`Descuento: -$${descuentoCalculado.toFixed(2)}`, 10, doc.lastAutoTable.finalY + 20);
    doc.text(`Total: $${total.toFixed(2)}`, 10, doc.lastAutoTable.finalY + 30);

    return doc;
  };

  const compartirPDFComoImagen = () => {
    const doc = generarPDF();
  
    // Forzar descarga del PDF con nombre
    doc.save(`${codigoVenta}.pdf`);
  };        

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300"
      >
        Volver al inicio
      </button>

      <h2 className="text-2xl font-bold mb-4">Checkout</h2>

      {/* CLIENTE */}
      <div className="mb-4">
        <label className="block font-semibold">Cliente</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          value={clienteBusqueda}
          onChange={e => {
            setClienteBusqueda(e.target.value);
            setClienteSeleccionado(null);
          }}
        />
        {clienteBusqueda && !clienteSeleccionado && (
          <div className="border p-2 bg-white shadow max-h-40 overflow-y-auto">
            {clientes
              .filter(c => c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase()))
              .map(c => (
                <div
                  key={c.id}
                  onClick={() => seleccionarCliente(c)}
                  className="cursor-pointer hover:bg-gray-100 p-1"
                >
                  {c.nombre}
                </div>
              ))}
            {clientes.filter(c => c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())).length === 0 && (
              <div
                className="text-blue-500 cursor-pointer"
                onClick={() => setMostrarNuevoCliente(true)}
              >
                + Agregar nuevo cliente
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agregar nuevo cliente (opcional) */}
      {mostrarNuevoCliente && (
        <div className="border p-4 mb-4 rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Nuevo cliente</h3>
          <input
            type="text"
            placeholder="Nombre"
            className="border p-2 w-full mb-2 rounded"
            value={nuevoCliente.nombre}
            onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
          />
          <input
            type="text"
            placeholder="Teléfono"
            className="border p-2 w-full mb-2 rounded"
            value={nuevoCliente.telefono}
            onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
          />
          <input
            type="email"
            placeholder="Correo"
            className="border p-2 w-full mb-2 rounded"
            value={nuevoCliente.correo}
            onChange={e => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
          />
          <input
            type="text"
            placeholder="Dirección"
            className="border p-2 w-full mb-2 rounded"
            value={nuevoCliente.direccion}
            onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })}
          />
        </div>
      )}
      {/* PRODUCTO */}
      <div className="mb-4">
        <label className="block font-semibold">Producto</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          value={productoBusqueda}
          onChange={e => {
            setProductoBusqueda(e.target.value);
            setProductoSeleccionado(null);
          }}
        />
        {productoBusqueda && !productoSeleccionado && (
          <div className="border p-2 bg-white shadow max-h-40 overflow-y-auto">
            {productos
              .filter(p => p.nombre.toLowerCase().includes(productoBusqueda.toLowerCase()))
              .map(p => (
                <div
                  key={p.id}
                  onClick={() => seleccionarProducto(p)}
                  className="cursor-pointer hover:bg-gray-100 p-1"
                >
                  {p.nombre}
                </div>
              ))}
          </div>
        )}
        {mensajeStock && (
          <p className="text-sm mt-1 text-red-600 font-semibold">{mensajeStock}</p>
        )}
        {productoSeleccionado && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              className="border p-2 w-24 rounded"
              placeholder="Cantidad"
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))}
            />
            <button
              onClick={agregarProductoAVenta}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Añadir
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE PRODUCTOS AGREGADOS */}
      <div className="mb-4">
        <h3 className="font-semibold">Productos añadidos</h3>
        {productosVenta.map((p, index) => (
          <div key={index} className="border p-2 my-1 rounded bg-gray-50 flex justify-between">
            <span>{p.nombre} (x{p.cantidad})</span>
            <span>${p.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* FORMA DE PAGO Y DESCUENTO */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold">Forma de pago</label>
          <select
            className="border w-full p-2 rounded"
            value={formaPago}
            onChange={e => setFormaPago(e.target.value)}
          >
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
            <option>Crédito</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold">Descuento</label>
          <select
            className="border w-full p-2 rounded"
            value={tipoDescuento}
            onChange={e => setTipoDescuento(e.target.value)}
          >
            <option value="ninguno">Sin descuento</option>
            <option value="monto">Monto fijo</option>
            <option value="porcentaje">Porcentaje</option>
          </select>
          {(tipoDescuento === 'monto' || tipoDescuento === 'porcentaje') && (
            <input
              type="number"
              className="border w-full mt-2 p-2 rounded"
              placeholder="Valor"
              value={valorDescuento}
              onChange={e => setValorDescuento(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* TOTALES */}
      <div className="mb-4">
        <p>Subtotal: <strong>${subtotal.toFixed(2)}</strong></p>
        <p>Descuento: <strong>-${descuentoCalculado.toFixed(2)}</strong></p>
        <p>Total: <strong>${total.toFixed(2)}</strong></p>
      </div>

      {/* FINALIZAR VENTA */}
      <button
        onClick={finalizarVenta}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Finalizar venta
      </button>

      {/* MENSAJE DE ÉXITO */}
      {ventaExitosa && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded">
          <p className="text-green-700 font-semibold">✅ Venta exitosa</p>
          <button
            onClick={compartirPDFComoImagen}
            className="mt-2 bg-white border border-green-700 px-4 py-1 rounded hover:bg-green-200"
          >
            Ver recibo
          </button>
        </div>
      )}
    </div>
  );
}

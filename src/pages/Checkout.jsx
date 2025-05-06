// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();

  // ——— Clientes ——————————————————————————————————————————————————————
  const [clientes, setClientes] = useState([]);
  const [clienteBusqueda, setClienteBusqueda] = useState('');
  const [clienteSugerencias, setClienteSugerencias] = useState([]);
  const [clienteIndexActivo, setClienteIndexActivo] = useState(-1);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    telefono: '',
    correo: '',
    direccion: '',
  });

  // ——— Productos y venta ——————————————————————————————————————————
  const [productos, setProductos] = useState([]);
  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [productoSugerencias, setProductoSugerencias] = useState([]);
  const [productoIndexActivo, setProductoIndexActivo] = useState(-1);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [mensajeStock, setMensajeStock] = useState('');
  const [productosVenta, setProductosVenta] = useState([]);

  // ——— Pago y descuento ——————————————————————————————————————————
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [tipoDescuento, setTipoDescuento] = useState('ninguno');
  const [valorDescuento, setValorDescuento] = useState(0);

  // ——— Finalización —————————————————————————————————————————————
  const [ventaExitosa, setVentaExitosa] = useState(false);
  const [codigoVenta, setCodigoVenta] = useState('');

  // ——— Carga inicial —————————————————————————————————————————————
  useEffect(() => {
    cargarClientes();
    cargarProductos();
  }, []);

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });
    if (!error) setClientes(data);
  };

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*');
    if (!error) setProductos(data);
  };

  // ——— Autocompletado Cliente —————————————————————————————————————
  const handleClienteInput = (e) => {
    const texto = e.target.value;
    setClienteBusqueda(texto);
    setClienteSeleccionado(null);
    setMostrarNuevoCliente(false);
    setNuevoCliente({ telefono: '', correo: '', direccion: '' });

    const sugerencias = clientes.filter(c =>
      c.nombre.toLowerCase().includes(texto.toLowerCase())
    );
    setClienteSugerencias(sugerencias);
    if (texto && sugerencias.length === 0) {
      setMostrarNuevoCliente(true);
    }
    setClienteIndexActivo(-1);
  };

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c);
    setClienteBusqueda(c.nombre);
    setClienteSugerencias([]);
    setMostrarNuevoCliente(false);
    setClienteIndexActivo(-1);
  };

  const agregarClienteNuevo = async () => {
    if (!clienteBusqueda || !nuevoCliente.telefono || !nuevoCliente.correo) {
      alert('Completa Nombre, Teléfono y Correo.');
      return;
    }
    const clienteObj = {
      nombre: clienteBusqueda,
      telefono: nuevoCliente.telefono,
      correo: nuevoCliente.correo,
      direccion: nuevoCliente.direccion,
    };
    const { data, error } = await supabase
      .from('clientes')
      .insert([clienteObj])
      .select()
      .single();
    if (error) {
      console.error('Error al agregar cliente:', error.message);
      alert('No se pudo agregar el cliente.');
    } else {
      setClientes(prev => [...prev, data]);
      seleccionarCliente(data);
      setNuevoCliente({ telefono: '', correo: '', direccion: '' });
    }
  };

  // ——— Autocompletado Producto —————————————————————————————————————
  const handleProductoInput = (e) => {
    const texto = e.target.value;
    setProductoBusqueda(texto);
    setProductoSeleccionado(null);
    setMensajeStock('');

    const sugerencias = productos.filter(p =>
      p.nombre.toLowerCase().includes(texto.toLowerCase())
    );
    setProductoSugerencias(sugerencias);
    setProductoIndexActivo(-1);
  };

  const seleccionarProducto = (p) => {
    setProductoSeleccionado(p);
    setProductoBusqueda(p.nombre);
    setProductoSugerencias([]);
    setMensajeStock(`Stock disponible: ${p.stock}`);
    setCantidad(1);
    setProductoIndexActivo(-1);
  };

  const agregarProductoAVenta = () => {
    if (!productoSeleccionado || cantidad <= 0) return;
    if (cantidad > productoSeleccionado.stock) {
      setMensajeStock('❌ No hay suficiente stock');
      setTimeout(() => setMensajeStock(''), 3000);
      return;
    }
    const total = productoSeleccionado.promocion * cantidad;
    setProductosVenta(prev => [...prev, { ...productoSeleccionado, cantidad, total }]);
    setProductoSeleccionado(null);
    setProductoBusqueda('');
    setCantidad(1);
    setMensajeStock('');
  };

  // ——— Cálculos —————————————————————————————————————————————————————
  const subtotal = productosVenta.reduce((s, p) => s + p.total, 0);
  const descuentoCalculado = tipoDescuento === 'monto'
    ? Number(valorDescuento)
    : tipoDescuento === 'porcentaje'
      ? subtotal * (Number(valorDescuento) / 100)
      : 0;
  const total = subtotal - descuentoCalculado;

  // ——— Finalizar Venta + Movimientos ———————————————————————————————————
  const generarCodigoVenta = async () => {
    const { data } = await supabase.from('ventas').select('codigo_venta');
    const nro = (data?.length || 0) + 1;
    return `VT${nro.toString().padStart(5, '0')}`;
  };

  const finalizarVenta = async () => {
    if (!clienteSeleccionado || productosVenta.length === 0) return;
    const codigo = await generarCodigoVenta();
    setCodigoVenta(codigo);

    // 1) Inserta cabecera de venta
    const { data: ventaInsertada, error: errVenta } = await supabase
      .from('ventas')
      .insert([{
        codigo_venta: codigo,
        cliente_id: clienteSeleccionado.id,
        forma_pago: formaPago,
        tipo_descuento: tipoDescuento,
        valor_descuento: valorDescuento,
        subtotal,
        total,
      }])
      .select()
      .single();
    if (errVenta) {
      console.error('Error al guardar venta:', errVenta.message);
      return;
    }

    // 2) Para cada producto: detalle, actualizar stock y movimiento SALIDA
    for (const p of productosVenta) {
      // detalle_venta
      await supabase.from('detalle_venta').insert([{
        venta_id: ventaInsertada.id,
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.promocion,
        total_parcial: p.total,
      }]);

      // actualizar stock en tabla productos
      const nuevoStock = p.stock - p.cantidad;
      await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', p.id);

      // registrar movimiento SALIDA
      await supabase.from('movimientos').insert([{
        producto_id: p.id,
        tipo: 'SALIDA',
        cantidad: p.cantidad,
        referencia: codigo,
      }]);
    }

    setVentaExitosa(true);
  };

  // ——— Generar PDF ———————————————————————————————————————————————————
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
      head: [['Producto', 'Cantidad', 'P.Unitario', 'Total']],
      body: productosVenta.map(p => [
        p.nombre,
        p.cantidad,
        `$${p.promocion.toFixed(2)}`,
        `$${p.total.toFixed(2)}`,
      ]),
    });

    const finalY = doc.lastAutoTable?.finalY || 60;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, finalY + 10);
    doc.text(`Descuento: -$${descuentoCalculado.toFixed(2)}`, 10, finalY + 20);
    doc.text(`Total: $${total.toFixed(2)}`, 180, finalY + 30, { align: 'right' });
    doc.line(10, finalY + 5, 200, finalY + 5);

    doc.output('dataurlnewwindow');
    return doc;
  };

  const compartirPDFComoImagen = () => {
    generarPDF().save(`${codigoVenta}.pdf`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
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
          placeholder="Escribe el nombre del cliente"
          value={clienteBusqueda}
          onChange={handleClienteInput}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setClienteIndexActivo(i =>
                i < clienteSugerencias.length - 1 ? i + 1 : i
              );
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setClienteIndexActivo(i => (i > 0 ? i - 1 : 0));
            }
            if (e.key === 'Enter' && clienteIndexActivo >= 0) {
              seleccionarCliente(clienteSugerencias[clienteIndexActivo]);
            }
          }}
        />
        {clienteSugerencias.length > 0 && !clienteSeleccionado && (
          <ul className="border bg-white mt-1 max-h-40 overflow-auto shadow">
            {clienteSugerencias.map((c, idx) => (
              <li
                key={c.id}
                onClick={() => seleccionarCliente(c)}
                className={`p-2 cursor-pointer ${
                  clienteIndexActivo === idx ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
        {mostrarNuevoCliente && (
          <div className="border bg-gray-50 p-4 mt-2 rounded">
            <h3 className="font-semibold mb-2">Agregar nuevo cliente</h3>
            {/* El nombre ya viene del campo superior */}
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono*"
              className="border p-2 w-full mb-2 rounded"
              value={nuevoCliente.telefono}
              onChange={e =>
                setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
              }
            />
            <input
              type="email"
              name="correo"
              placeholder="Correo*"
              className="border p-2 w-full mb-2 rounded"
              value={nuevoCliente.correo}
              onChange={e =>
                setNuevoCliente({ ...nuevoCliente, correo: e.target.value })
              }
            />
            <input
              type="text"
              name="direccion"
              placeholder="Dirección"
              className="border p-2 w-full mb-2 rounded"
              value={nuevoCliente.direccion}
              onChange={e =>
                setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })
              }
            />
            <button
              onClick={agregarClienteNuevo}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Agregar cliente nuevo
            </button>
          </div>
        )}
      </div>

      {/* PRODUCTO */}
      <div className="mb-4">
        <label className="block font-semibold">Producto</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          placeholder="Escribe el nombre del producto"
          value={productoBusqueda}
          onChange={handleProductoInput}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setProductoIndexActivo(i =>
                i < productoSugerencias.length - 1 ? i + 1 : i
              );
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setProductoIndexActivo(i => (i > 0 ? i - 1 : 0));
            }
            if (e.key === 'Enter' && productoIndexActivo >= 0) {
              seleccionarProducto(productoSugerencias[productoIndexActivo]);
            }
          }}
        />
        {productoSugerencias.length > 0 && !productoSeleccionado && (
          <ul className="border bg-white mt-1 max-h-40 overflow-auto shadow">
            {productoSugerencias.map((p, idx) => (
              <li
                key={p.id}
                onClick={() => seleccionarProducto(p)}
                className={`p-2 cursor-pointer ${
                  productoIndexActivo === idx ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                {p.nombre}
              </li>
            ))}
          </ul>
        )}
        {mensajeStock && (
          <p className="text-red-600 text-sm mt-1">{mensajeStock}</p>
        )}
        {productoSeleccionado && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              className="border p-2 w-24 rounded"
              value={cantidad}
              min={1}
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
        {productosVenta.map((p, idx) => (
          <div
            key={idx}
            className="border p-2 my-1 rounded bg-gray-50 flex justify-between"
          >
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
              min={0}
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

      {/* MENSAJE DE ÉXITO Y RECIBO */}
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

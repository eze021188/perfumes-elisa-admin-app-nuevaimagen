// src/pages/Checkout.jsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useNavigate } from 'react-router-dom'

export default function Checkout() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [clienteSugerencias, setClienteSugerencias] = useState([])
  const [clienteIndexActivo, setClienteIndexActivo] = useState(-1)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    direccion: ''
  })

  const [productos, setProductos] = useState([])
  const [productoBusqueda, setProductoBusqueda] = useState('')
  const [productoSugerencias, setProductoSugerencias] = useState([])
  const [productoIndexActivo, setProductoIndexActivo] = useState(-1)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [mensajeStock, setMensajeStock] = useState('')

  const [productosVenta, setProductosVenta] = useState([])
  const [formaPago, setFormaPago] = useState('Efectivo')
  const [tipoDescuento, setTipoDescuento] = useState('ninguno')
  const [valorDescuento, setValorDescuento] = useState(0)

  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [codigoVenta, setCodigoVenta] = useState('')
  const pdfRef = useRef(null)

  useEffect(() => {
    cargarClientes()
    cargarProductos()
  }, [])

  async function cargarClientes() {
    const { data, error } = await supabase.from('clientes').select('*')
    if (!error) setClientes(data)
  }

  async function cargarProductos() {
    const { data, error } = await supabase.from('productos').select('*')
    if (!error) setProductos(data)
  }

  function onChangeClienteInput(e) {
    const t = e.target.value
    setClienteBusqueda(t)
    setClienteSeleccionado(null)
    const suger = clientes.filter(c =>
      c.nombre.toLowerCase().includes(t.toLowerCase())
    )
    setClienteSugerencias(suger)
    setClienteIndexActivo(-1)
  }

  function seleccionarCliente(c) {
    setClienteSeleccionado(c)
    setClienteBusqueda(c.nombre)
    setClienteSugerencias([])
  }

  function agregarCliente() {
    // valida campos
    supabase
      .from('clientes')
      .insert([nuevoCliente])
      .then(({ data, error }) => {
        if (!error) {
          setClientes([...clientes, data[0]])
          seleccionarCliente(data[0])
          setMostrarNuevoCliente(false)
        }
      })
  }

  function onChangeProductoInput(e) {
    const t = e.target.value
    setProductoBusqueda(t)
    setProductoSeleccionado(null)
    const suger = productos.filter(p =>
      p.nombre.toLowerCase().includes(t.toLowerCase())
    )
    setProductoSugerencias(suger)
    setProductoIndexActivo(-1)
  }

  function seleccionarProducto(p) {
    setProductoSeleccionado(p)
    setProductoBusqueda(p.nombre)
    setMensajeStock(`Stock disponible: ${p.stock}`)
    setProductoSugerencias([])
  }

  function agregarProductoAVenta() {
    // …validaciones…
    setProductosVenta([
      ...productosVenta,
      {
        ...productoSeleccionado,
        cantidad,
        total: productoSeleccionado.promocion * cantidad,
        stock: productoSeleccionado.stock    // <— aquí agregas stock
      }
    ])
    // …
  }  

  const subtotal = productosVenta.reduce((s, p) => s + p.total, 0)
  const descuentoCalculado =
    tipoDescuento === 'monto'
      ? Number(valorDescuento)
      : tipoDescuento === 'porcentaje'
      ? (subtotal * Number(valorDescuento)) / 100
      : 0
  const total = subtotal - descuentoCalculado

  async function generarCodigoVenta() {
    const { data } = await supabase.from('ventas').select('codigo_venta')
    const num = (data?.length || 0) + 1
    return `VT${String(num).padStart(5, '0')}`
  }

  async function finalizarVenta() {
    if (!clienteSeleccionado || productosVenta.length === 0) return

    const codigo = await generarCodigoVenta()
    setCodigoVenta(codigo)

    // 1) cabecera
    const { data: v, error: e1 } = await supabase
      .from('ventas')
      .insert([
        {
          codigo_venta: codigo,
          cliente_id: clienteSeleccionado.id,
          cliente_nombre: clienteSeleccionado.nombre,
          forma_pago: formaPago,
          tipo_descuento: tipoDescuento,
          valor_descuento: valorDescuento,
          subtotal,
          total
        }
      ])
      .select()
      .single()
    if (e1) {
      console.error(e1)
      return
    }
    const venta_id = v.id

    // 2) detalle, stock, salida
    for (const p of productosVenta) {
      await supabase.from('detalle_venta').insert([
        {
          venta_id,
          producto_id: p.id,
          cantidad: p.cantidad,
          precio_unitario: p.promocion,
          total_parcial: p.total
        }
      ])
      await supabase
        .from('productos')
        .update({ stock: p.stock - p.cantidad })
        .eq('id', p.id)
      await supabase.from('movimientos_inventario').insert([
        {
          producto_id: p.id,
          tipo: 'SALIDA',
          cantidad: p.cantidad,
          referencia: codigo
        }
      ])
    }

    setVentaExitosa(true)
  }

  function generarPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Ticket de venta - ${codigoVenta}`, 10, 10)
    doc.setFontSize(12)
    doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 20)
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30)
    doc.text(`Pago: ${formaPago}`, 10, 40)
    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cant.', 'P.U.', 'Total']],
      body: productosVenta.map(p => [
        p.nombre,
        p.cantidad,
        `$${p.promocion.toFixed(2)}`,
        `$${p.total.toFixed(2)}`
      ])
    })
    const finalY = doc.lastAutoTable.finalY + 10
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, finalY)
    doc.text(`Descuento: -$${descuentoCalculado.toFixed(2)}`, 10, finalY + 10)
    doc.text(`Total: $${total.toFixed(2)}`, 180, finalY + 20, { align: 'right' })
    doc.output('dataurlnewwindow')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 rounded"
      >
        Volver al inicio
      </button>
      <h2 className="text-2xl font-bold mb-4">Checkout</h2>

      {/* Cliente */}
      <div className="mb-4">
        <label className="font-semibold block">Cliente</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          value={clienteBusqueda}
          onChange={onChangeClienteInput}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              setClienteIndexActivo(i =>
                Math.min(i + 1, clienteSugerencias.length - 1)
              )
            }
            if (e.key === 'ArrowUp') {
              setClienteIndexActivo(i => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && clienteIndexActivo >= 0) {
              seleccionarCliente(clienteSugerencias[clienteIndexActivo])
            }
          }}
        />
        {clienteBusqueda && !clienteSeleccionado && clienteSugerencias.length > 0 && (
          <ul className="border bg-white max-h-40 overflow-auto">
            {clienteSugerencias.map((c, i) => (
              <li
                key={c.id}
                className={`p-1 cursor-pointer ${
                  clienteIndexActivo === i ? 'bg-blue-100' : ''
                }`}
                onClick={() => seleccionarCliente(c)}
              >
                {c.nombre}
              </li>
            ))}
          </ul>
        )}
        {clienteBusqueda && !clienteSeleccionado && clienteSugerencias.length === 0 && (
          <p
            className="text-blue-600 cursor-pointer"
            onClick={() => setMostrarNuevoCliente(true)}
          >
            + Agregar nuevo cliente
          </p>
        )}
      </div>

      {/* Nuevo cliente */}
      {mostrarNuevoCliente && (
        <div className="border p-4 mb-4 rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Nuevo Cliente</h3>
          <input
            className="border w-full p-2 mb-2 rounded"
            placeholder="Nombre*"
            value={nuevoCliente.nombre}
            onChange={e => setNuevoCliente({
              ...nuevoCliente,
              nombre: e.target.value
            })}
          />
          <input
            className="border w-full p-2 mb-2 rounded"
            placeholder="Teléfono*"
            value={nuevoCliente.telefono}
            onChange={e => setNuevoCliente({
              ...nuevoCliente,
              telefono: e.target.value
            })}
          />
          <input
            className="border w-full p-2 mb-2 rounded"
            placeholder="Correo*"
            value={nuevoCliente.correo}
            onChange={e => setNuevoCliente({
              ...nuevoCliente,
              correo: e.target.value
            })}
          />
          <input
            className="border w-full p-2 mb-2 rounded"
            placeholder="Dirección"
            value={nuevoCliente.direccion}
            onChange={e => setNuevoCliente({
              ...nuevoCliente,
              direccion: e.target.value
            })}
          />
          <button
            onClick={agregarCliente}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Agregar cliente nuevo
          </button>
        </div>
      )}

      {/* Producto */}
      <div className="mb-4">
        <label className="font-semibold block">Producto</label>
        <input
          type="text"
          className="border w-full p-2 rounded"
          value={productoBusqueda}
          onChange={onChangeProductoInput}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') {
              setProductoIndexActivo(i =>
                Math.min(i + 1, productoSugerencias.length - 1)
              )
            }
            if (e.key === 'ArrowUp') {
              setProductoIndexActivo(i => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && productoIndexActivo >= 0) {
              seleccionarProducto(productoSugerencias[productoIndexActivo])
            }
          }}
        />
        {productoBusqueda && !productoSeleccionado && productoSugerencias.length > 0 && (
          <ul className="border bg-white max-h-40 overflow-auto">
            {productoSugerencias.map((p, i) => (
              <li
                key={p.id}
                className={`p-1 cursor-pointer ${
                  productoIndexActivo === i ? 'bg-blue-100' : ''
                }`}
                onClick={() => seleccionarProducto(p)}
              >
                {p.nombre}
              </li>
            ))}
          </ul>
        )}
        {mensajeStock && (
          <p className="text-sm text-red-600 mt-1">{mensajeStock}</p>
        )}
        {productoSeleccionado && (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              className="border p-2 w-24 rounded"
              value={cantidad}
              onChange={e => setCantidad(+e.target.value)}
            />
            <button
              onClick={agregarProductoAVenta}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Añadir
            </button>
          </div>
        )}
      </div>

      {/* Lista de productos añadidos */}
      <div className="mb-4">
        <h3 className="font-semibold">Productos añadidos</h3>
        {productosVenta.map((p, i) => (
          <div
            key={i}
            className="flex justify-between p-2 bg-gray-50 mb-1 rounded"
          >
            <span>{p.nombre} x{p.cantidad}</span>
            <span>${p.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Pago y descuento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-semibold block">Forma de pago</label>
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
          <label className="font-semibold block">Descuento</label>
          <select
            className="border w-full p-2 rounded"
            value={tipoDescuento}
            onChange={e => setTipoDescuento(e.target.value)}
          >
            <option value="ninguno">Sin descuento</option>
            <option value="monto">Monto fijo</option>
            <option value="porcentaje">Porcentaje</option>
          </select>
          {(tipoDescuento !== 'ninguno') && (
            <input
              type="number"
              className="border w-full p-2 mt-2 rounded"
              placeholder="Valor"
              value={valorDescuento}
              onChange={e => setValorDescuento(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Totales */}
      <div className="mb-6">
        <p>Subtotal: <strong>${subtotal.toFixed(2)}</strong></p>
        <p>Descuento: <strong>-${descuentoCalculado.toFixed(2)}</strong></p>
        <p>Total: <strong>${total.toFixed(2)}</strong></p>
      </div>

      <button
        onClick={finalizarVenta}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Finalizar venta
      </button>

      {ventaExitosa && (
        <div className="mt-6 p-4 bg-green-100 rounded border border-green-400">
          <p className="text-green-700 font-semibold">
            ✅ Venta registrada: {codigoVenta}
          </p>
          <button
            onClick={generarPDF}
            className="mt-2 px-4 py-1 border rounded">
            Ver recibo
          </button>
        </div>
      )}
    </div>
  )
}

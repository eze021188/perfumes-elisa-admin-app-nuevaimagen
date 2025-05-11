// src/components/HtmlTicketDisplay.jsx
import React from 'react';

// Helper simple para formatear moneda (si no está global)
// Asegúrate de que esta función esté disponible o la copies aquí si no está en un archivo compartido
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Componente que renderiza el diseño HTML del ticket
// Recibe los datos de la venta como props
export default function HtmlTicketDisplay({ saleData, onClose }) {
    // Asegúrate de que saleData contenga toda la información necesaria:
    // saleData = {
    //   codigo_venta: 'VT00001',
    //   cliente: { nombre: 'Roberto Ezequiel Coria', telefono: '55 1234 5678' },
    //   vendedor: { nombre: 'Ezequiel (Vendedor)' }, // O email si el nombre no está disponible
    //   fecha: '11/05/25 15:07', // Fecha formateada
    //   productosVenta: [
    //     { id: 1, nombre: 'Producto Ejemplo 1 con Nombre Largo para Prueba', cantidad: 1, precio_unitario: 850.00, total_parcial: 850.00 },
    //     // ... más productos
    //   ],
    //   originalSubtotal: 1300.00,
    //   discountAmount: 50.00,
    //   forma_pago: 'Crédito cliente',
    //   enganche: 100.00,
    //   total: 1250.00, // Total de la venta
    //   balance_cuenta: 1150.00, // Balance después de la venta y enganche
    // }

    // Determinar la clase para el color del balance
    const balanceClass = saleData?.balance_cuenta > 0 ? 'negative' : 'positive';
    // Determinar el texto de la nota aclaratoria del balance
    const balanceNote = saleData?.balance_cuenta > 0
        ? '(Saldo positivo indica deuda del cliente)'
        : '(Saldo negativo indica crédito a favor del cliente)';


    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}> {/* Evita que el clic en el ticket cierre el modal */}
                 {/* Aquí va la estructura HTML del ticket */}
                 <div class="ticket" style={{ maxWidth: '400px', width: '100%', backgroundColor: '#ffffff', padding: '18px', borderRadius: '8px', boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', border: 'none' }}>
                    {/* Los estilos CSS se colocan dentro de una etiqueta <style> */}
                    <style>
                        {`
                        body {
                            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                            background-color: #f8f8f8;
                            display: flex;
                            justify-content: center;
                            align-items: flex-start;
                            min-height: 100vh;
                            padding: 12px;
                        }
                        .ticket {
                             /* Estilos definidos inline arriba, pero se pueden complementar o sobrescribir aquí */
                        }
                        .divider {
                            border-top: 1px solid #e0e0e0;
                            margin: 12px 0;
                        }
                        .product-item {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.8rem;
                            color: #4a4a4a;
                            margin-bottom: 8px;
                        }
                        .product-item span:first-child {
                             flex-grow: 1;
                             margin-right: 6px;
                             word-break: break-word;
                        }
                         .totals-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.8rem;
                            color: #4a4a4a;
                            margin-bottom: 0;
                         }
                         .totals-row.total {
                            font-size: 1.1rem;
                            font-weight: bold;
                            color: #28a745;
                            margin-top: 8px;
                            border-top: 1px solid #e0e0e0;
                            padding-top: 10px;
                         }
                         .balance-section {
                             margin-top: 12px;
                             padding-top: 10px;
                             border-top: 1px solid #e0e0e0;
                             text-align: center;
                             font-size: 0.8rem;
                             color: #4a4a4a;
                         }
                         .balance-section strong {
                             font-size: 0.9rem;
                             color: #1f2937;
                         }
                         .balance-value {
                             font-size: 1rem;
                             font-weight: bold;
                             margin-top: 4px;
                         }
                         .balance-value.positive {
                             color: #28a745;
                         }
                          .balance-value.negative {
                             color: #dc3545;
                         }

                         .info-columns {
                             display: grid;
                             grid-template-columns: repeat(2, 1fr);
                             gap: 8px;
                             font-size: 0.8rem;
                             color: #374151;
                         }
                         .info-columns p {
                             word-break: break-word;
                             line-height: 1.3;
                         }
                         .info-columns p strong {
                             display: block;
                             font-size: 0.75rem;
                             color: #5a5a5a;
                             margin-bottom: 1px;
                         }

                         .ticket-header {
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             margin-bottom: 15px;
                         }
                         .ticket-header img {
                             margin-right: 12px;
                         }
                         .ticket-title-block {
                             text-align: left;
                         }
                         .ticket-title-block h2 {
                             font-size: 1.8rem;
                             margin-bottom: 0;
                         }
                         .ticket-title-block p {
                             font-size: 0.75rem;
                             margin-top: 0;
                         }
                         .thank-you-message {
                             font-size: 0.75rem;
                             color: #5a5a5a;
                             margin-top: 15px;
                         }
                        `}
                    </style>

                    {/* Encabezado con Logo a la Izquierda */}
                    <div class="ticket-header">
                        {/* >>> CORREGIDO: Etiqueta img autocerrada correctamente <<< */}
                        <img src="/images/PERFUMESELISAwhite.jpg" alt="Logo Perfumes Elisa" class="h-auto w-14" />
                        <div class="ticket-title-block">
                            <h2>Ticket</h2>
                            <p>#{saleData?.codigo_venta || 'N/A'}</p> {/* Usar código de venta dinámico */}
                        </div>
                    </div>
                    {/* Fin Encabezado con Logo a la Izquierda */}


                    <div class="divider"></div>

                    {/* Información de la Venta (Cliente, Teléfono, Vendedor, Fecha) en 2 columnas */}
                    <div class="info-columns">
                        <p><strong>Cliente:</strong> {saleData?.cliente?.nombre || 'N/A'}</p> {/* Usar nombre cliente dinámico */}
                        <p><strong>Teléfono:</strong> {saleData?.cliente?.telefono || 'N/A'}</p> {/* Usar teléfono cliente dinámico */}
                        <p><strong>Vendedor:</strong> {saleData?.vendedor?.nombre || saleData?.vendedor?.email || 'N/A'}</p> {/* Usar nombre/email vendedor dinámico */}
                        <p><strong>Fecha:</strong> {saleData?.fecha || 'N/A'}</p> {/* Usar fecha formateada dinámico */}
                    </div>

                    <div class="divider"></div>

                    {/* Lista de Productos */}
                    <div class="mb-3">
                        <h3 class="text-sm font-semibold text-gray-800 mb-2">Detalle de Venta:</h3>
                        {saleData?.productosVenta && saleData.productosVenta.length > 0 ? (
                            saleData.productosVenta.map(p => (
                                <div class="product-item" key={p.id}> {/* Usar ID del producto como key */}
                                    {/* Lógica para salto de línea en nombre largo si es necesario (más compleja con datos dinámicos) */}
                                    {/* Por ahora, solo mostramos el nombre */}
                                    <span>{p.nombre}</span> {/* Usar nombre producto dinámico */}
                                    {/* Formato: Cantidad x Total Parcial */}
                                    <span>{p.cantidad} x {formatCurrency(p.total_parcial)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-center">No hay productos en la venta.</p>
                        )}
                    </div>

                    <div class="divider"></div>

                    {/* Totales */}
                    <div class="text-right text-sm text-gray-700">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(saleData?.originalSubtotal || 0)}</span> {/* Usar subtotal original dinámico */}
                        </div>
                        <div class="totals-row text-red-600">
                             <span>Descuento:</span>
                             <span>- {formatCurrency(saleData?.discountAmount || 0)}</span> {/* Usar descuento dinámico */}
                        </div>
                         <div class="totals-row">
                             <span>Forma de Pago:</span>
                             <span>{saleData?.forma_pago || 'N/A'}</span> {/* Usar forma de pago dinámico */}
                        </div>
                         {/* Solo mostrar Enganche si la forma de pago es Crédito cliente Y hubo enganche > 0 */}
                         {saleData?.forma_pago === 'Crédito cliente' && (saleData?.enganche || 0) > 0 && (
                             <div class="totals-row">
                                 <span>Enganche:</span>
                                 <span>{formatCurrency(saleData?.enganche || 0)}</span> {/* Usar enganche dinámico */}
                             </div>
                         )}
                        <div class="totals-row total">
                             <span>Total Venta:</span>
                             <span>{formatCurrency(saleData?.total || 0)}</span> {/* Usar total venta dinámico */}
                        </div>
                    </div>

                    <div class="divider"></div>

                    {/* Balance de Cuenta del Cliente */}
                     {/* Solo mostrar si la forma de pago es Crédito cliente */}
                    {saleData?.forma_pago === 'Crédito cliente' && (
                         <div class="balance-section">
                            <p><strong>Balance de Cuenta:</strong></p>
                            {/* Aplicar clase condicional para el color */}
                            <p class={`balance-value ${balanceClass}`}>
                                {formatCurrency(Math.abs(saleData.balance_cuenta))} {/* Mostrar valor absoluto y el signo en la nota */}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">{balanceNote}</p> {/* Nota aclaratoria dinámica */}
                        </div>
                    )}
                     {/* Si no es crédito cliente, no mostrar la sección de balance */}


                    {/* Mensaje de agradecimiento / Pie de página */}
                    <div class="text-center thank-you-message">
                        <p>¡Gracias por tu compra!</p>
                        <p>Visítanos de nuevo pronto.</p>
                    </div>
                </div>
                 {/* Botón para cerrar el modal */}
                <div className="p-4 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

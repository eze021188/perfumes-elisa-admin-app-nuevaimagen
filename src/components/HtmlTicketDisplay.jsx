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
    // Si no hay datos de venta, no renderizar nada o mostrar un mensaje
    if (!saleData) {
        return null; // O un mensaje como <p>Cargando ticket...</p>
    }

    // Desestructurar los datos de venta para facilitar el acceso
    const {
        codigo_venta,
        cliente,
        vendedor,
        fecha,
        productosVenta,
        originalSubtotal,
        discountAmount,
        forma_pago,
        enganche,
        total, // Total final de la venta
        balance_cuenta // Balance de cuenta del cliente después de la venta
    } = saleData;

    // Determinar la clase para el color del balance
    const balanceClass = balance_cuenta > 0 ? 'negative' : 'positive';
    // Determinar el texto de la nota aclaratoria del balance
    const balanceNote = balance_cuenta > 0
        ? '(Saldo positivo indica deuda del cliente)'
        : '(Saldo negativo indica crédito a favor del cliente)';


    return (
        // Overlay del modal
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            {/* Contenedor principal del ticket - Simula el diseño HTML ajustado */}
            {/* Usamos estilos inline y clases de Tailwind para el contenedor principal */}
            <div
                className="bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh] w-full"
                style={{ maxWidth: '400px', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)' }}
                onClick={(e) => e.stopPropagation()} // Evita que el clic en el ticket cierre el modal
            >
                 {/* Los estilos CSS se colocan dentro de una etiqueta <style> */}
                 {/* En una aplicación real, estos estilos irían en un archivo CSS importado */}
                    <style>
                        {`
                        /* Estilos para ajustar el ticket a la pantalla del móvil */
                        .ticket-content {
                            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                            color: #4a4a4a; /* Color de texto general */
                        }
                        .divider {
                            border-top: 1px solid #e0e0e0; /* Línea divisoria sutil */
                            margin: 12px 0; /* Margen vertical reducido */
                        }
                        .ticket-header {
                             display: flex;
                             flex-direction: column; /* Apila los elementos verticalmente */
                             align-items: center; /* Centra horizontalmente los elementos hijos */
                             margin-bottom: 15px; /* Espacio debajo del encabezado reducido */
                             text-align: center; /* Centra el texto dentro del header */
                         }
                         .ticket-header .header-top {
                             display: flex; /* Permite que logo y título estén en línea */
                             align-items: center; /* Centra verticalmente logo y título */
                             justify-content: center; /* Centra el bloque de logo+título */
                             margin-bottom: 5px; /* Espacio entre la línea superior y la info de contacto */
                         }
                         .ticket-header img {
                             margin-right: 10px; /* Espacio a la derecha del logo reducido */
                             height: auto; /* Altura automática */
                             width: 50px; /* Ancho del logo ajustado */
                         }
                         .ticket-title-block {
                             text-align: left; /* Alinea el texto del título a la izquierda */
                             /* flex-grow: 1; Eliminamos flex-grow aquí ya que el header es column */
                         }
                         .ticket-title-block h2 {
                             font-size: 1.1rem; /* Tamaño del título ligeramente reducido */
                             font-weight: 600; /* Semibold */
                             margin-bottom: 0;
                             line-height: 1.2; /* Espaciado entre líneas */
                         }
                         .ticket-title-block p {
                             font-size: 0.75rem; /* Tamaño del código reducido */
                             color: #6b7280; /* Gris más oscuro */
                             margin-top: 2px; /* Margen superior reducido */
                             line-height: 1.2;
                         }

                         /* Estilo para el texto del teléfono y ciudad - Ajustado para estar centrado bajo el header-top */
                        .contact-info {
                            font-size: 0.75rem; /* Tamaño de fuente pequeño */
                            color: #6b7280; /* Color gris sutil */
                            margin-top: 0; /* Eliminar margen superior ya que el padre controla el espacio */
                            text-align: center; /* Centrado bajo el logo/título */
                        }


                         /* Estilos para la información del cliente/vendedor en 2 columnas */
                         .info-columns {
                             display: grid;
                             grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Columnas flexibles, mínimo 120px */
                             gap: 8px 10px; /* Espacio entre filas y columnas */
                             font-size: 0.8rem; /* Tamaño de fuente reducido para esta sección */
                             color: #374151; /* Gris oscuro */
                         }
                         .info-columns p {
                             word-break: break-word; /* Rompe palabras largas si es necesario */
                             line-height: 1.3; /* Espaciado entre líneas */
                         }
                         .info-columns p strong {
                             display: block; /* Etiqueta en bloque */
                             font-size: 0.75rem; /* Tamaño de fuente aún más pequeño para las etiquetas */
                             color: #5a5a5a; /* Gris más claro para las etiquetas */
                             margin-bottom: 1px; /* Margen inferior reducido */
                             font-weight: normal; /* Peso de fuente normal */
                         }

                        .product-item {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.8rem; /* Tamaño de fuente reducido */
                            color: #4a4a4a;
                            margin-bottom: 8px; /* Espacio entre items reducido */
                        }
                        .product-item span:first-child {
                             flex-grow: 1;
                             margin-right: 8px;
                             word-break: break-word; /* Asegurar que el nombre largo se rompa */
                        }
                         .totals-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 0.85rem; /* Tamaño de fuente ligeramente más pequeño */
                            color: #4a4a4a;
                            margin-bottom: 5px; /* Espacio entre totales reducido */
                         }
                         .totals-row.total {
                            font-size: 1.1rem; /* Tamaño de fuente del total reducido */
                            font-weight: bold;
                            color: #28a745; /* Verde */
                            margin-top: 10px; /* Margen superior reducido */
                            border-top: 1px solid #e0e0e0; /* Separador */
                            padding-top: 10px; /* Padding superior reducido */
                         }
                         .balance-section {
                             margin-top: 15px; /* Margen superior */
                             padding-top: 12px; /* Padding superior */
                             border-top: 1px solid #e0e0e0; /* Separador */
                             text-align: center;
                             font-size: 0.85rem; /* Tamaño de fuente */
                             color: #4a4a4a;
                         }
                         .balance-section strong {
                             font-size: 1rem; /* Tamaño de fuente */
                             color: #1f2937; /* Gris oscuro */
                         }
                         .balance-value {
                             font-size: 1.1rem; /* Tamaño de fuente del monto */
                             font-weight: bold;
                             margin-top: 5px; /* Espacio reducido */
                         }
                         .balance-value.positive {
                             color: #28a745; /* Verde para saldo a favor */
                         }
                          .balance-value.negative {
                             color: #dc3545; /* Rojo para deuda */
                         }

                        .thank-you {
                            text-align: center;
                            font-size: 0.75rem; /* Tamaño de fuente reducido */
                            color: #6b7280; /* Gris más oscuro */
                            margin-top: 15px; /* Margen superior */
                            padding-top: 12px; /* Padding superior */
                            border-top: 1px solid #e0e0e0; /* Separador */
                        }
                        .thank-you p {
                            margin: 2px 0; /* Espacio reducido entre líneas */
                        }

                        `}
                    </style>

                {/* Contenido del ticket con clases para el diseño ajustado */}
                <div className="ticket-content">
                    {/* Encabezado con Logo a la Izquierda y Contacto Abajo */}
                    <div className="ticket-header">
                        {/* Contenedor para Logo y Título/Código */}
                        <div className="header-top">
                            {/* Asegúrate de que la ruta del logo sea accesible desde el frontend */}
                            {/* >>> Ruta del logo corregida <<< */}
                            <img src="/images/PERFUMESELISAwhite.jpg" alt="Logo Perfumes Elisa" className="h-auto w-14" />
                            <div className="ticket-title-block">
                                <h2>Ticket</h2>
                                <p>#{saleData?.codigo_venta || 'N/A'}</p> {/* Usar código de venta dinámico */}
                            </div>
                        </div>
                        {/* >>> Texto del teléfono y ciudad (fuera del ticket-title-block) <<< */}
                        <p className="contact-info">81 3080 4010 - Ciudad Apodaca</p>
                        {/* ----------------------------------------------------------------- */}
                    </div>
                    {/* Fin Encabezado */}


                    <div className="divider"></div>

                    {/* Información de la Venta (Cliente, Teléfono, Vendedor, Fecha) en 2 columnas */}
                    <div className="info-columns">
                        <p><strong>Cliente:</strong> {saleData?.cliente?.nombre || 'N/A'}</p> {/* Usar nombre cliente dinámico */}
                        <p><strong>Teléfono:</strong> {saleData?.cliente?.telefono || 'N/A'}</p> {/* Usar teléfono cliente dinámico */}
                        <p><strong>Vendedor:</strong> {saleData?.vendedor?.nombre || saleData?.vendedor?.email || 'N/A'}</p> {/* Usar nombre/email vendedor dinámico */}
                        <p><strong>Fecha:</strong> {saleData?.fecha || 'N/A'}</p> {/* Usar fecha formateada dinámico */}
                    </div>

                    <div className="divider"></div>

                    {/* Lista de Productos */}
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Detalle de Venta:</h3>
                        {saleData?.productosVenta && saleData.productosVenta.length > 0 ? (
                            saleData.productosVenta.map(p => (
                                <div className="product-item" key={p.id}> {/* Usar ID del producto como key */}
                                    <span>{p.nombre}</span> {/* Usar nombre producto dinámico */}
                                    <span>{p.cantidad} x {formatCurrency(p.precio_unitario)} = {formatCurrency(p.total_parcial)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-center">No hay productos en la venta.</p>
                        )}
                    </div>

                    <div className="divider"></div>

                    {/* Totales */}
                    <div className="text-right">
                        <div className="totals-row">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(saleData?.originalSubtotal || 0)}</span> {/* Usar subtotal original dinámico */}
                        </div>
                        <div className="totals-row text-red-600">
                             <span>Descuento:</span>
                             <span>- {formatCurrency(saleData?.discountAmount || 0)}</span> {/* Usar descuento dinámico */}
                        </div>
                         <div className="totals-row">
                             <span>Forma de Pago:</span>
                             <span>{saleData?.forma_pago || 'N/A'}</span> {/* Usar forma de pago dinámico */}
                        </div>
                         {/* Solo mostrar Enganche si la forma de pago es Crédito cliente Y hubo enganche > 0 */}
                         {saleData?.forma_pago === 'Crédito cliente' && (saleData?.enganche || 0) > 0 && (
                             <div className="totals-row">
                                 <span>Enganche:</span>
                                 <span>{formatCurrency(saleData?.enganche || 0)}</span> {/* Usar enganche dinámico */}
                             </div>
                         )}
                        <div className="totals-row total">
                             <span>Total Venta:</span>
                             <span>{formatCurrency(saleData?.total || 0)}</span> {/* Usar total venta dinámico */}
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Balance de Cuenta del Cliente */}
                     {/* Solo mostrar si la forma de pago es Crédito cliente */}
                    {saleData?.forma_pago === 'Crédito cliente' && (
                         <div className="balance-section">
                            <p className="font-semibold text-gray-800 mb-1">Balance de Cuenta:</p>
                            {/* Aplicar clase condicional para el color */}
                            <p className={`balance-value ${balanceClass}`}>
                                {formatCurrency(Math.abs(saleData.balance_cuenta))} {/* Mostrar valor absoluto y el signo en la nota */}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{balanceNote}</p> {/* Nota aclaratoria dinámica */}
                        </div>
                    )}
                     {/* Si no es crédito cliente, no mostrar la sección de balance */}


                    {/* Mensaje de agradecimiento / Pie de página */}
                    <div className="thank-you text-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-300">
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

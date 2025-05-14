// src/pages/SaldosClientes.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { differenceInDays } from 'date-fns';

// Importa los componentes de modales
import ModalAbono from '../components/ModalAbono';
import ModalSaldoFavor from '../components/ModalSaldoFavor';
import ModalEstadoCuenta from '../components/ModalEstadoCuenta';


export default function SaldosClientes() {
  const navigate = useNavigate();

  const [allClientsData, setAllClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('owing');
  const [searchText, setSearchText] = useState('');
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [showSaldoFavorModal, setShowSaldoFavorModal] = useState(false);
  const [showEstadoCuentaModal, setShowEstadoCuentaModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // RUTA DEL LOGO ACTUALIZADA según tu especificación
  const logoUrl = '/images/PERFUMESELISAwhite.jpg'; 

  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_clients_balance_and_dates');
      if (rpcError) throw rpcError;
      const today = new Date();
      const clientsWithCalculatedDays = data.map(client => {
          const daysSinceLastPayment = client.latest_payment_date
              ? differenceInDays(today, new Date(client.latest_payment_date))
              : null;
          const daysSinceFirstPurchase = client.first_purchase_date
              ? differenceInDays(today, new Date(client.first_purchase_date))
              : null;
          return {
              ...client,
              daysSinceLastPayment,
              daysSinceFirstPurchase,
          };
      }).sort((a, b) => a.client_name.localeCompare(b.client_name));
      setAllClientsData(clientsWithCalculatedDays);
    } catch (err) {
      console.error('Error cargando datos de clientes con fechas:', err.message);
      setError('Error al cargar los datos de clientes.');
      toast.error('Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const formatNumberWithCommas = (amount, includeSign = false) => {
    const num = Math.abs(amount);
    const formatted = num.toLocaleString('es-MX', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    if (includeSign) {
        return (amount < 0 ? '-' : (amount > 0 ? '+' : '')) + formatted;
    }
    return formatted;
  };

   const formatSaldoDisplay = (saldo) => {
       const saldoAbs = Math.abs(saldo);
       const formattedAmount = formatNumberWithCommas(saldoAbs);
       if (saldo > 0) return `-$${formattedAmount}`;
       if (saldo < 0) return `$${formattedAmount}`;
       return '$0.00';
   };

  const totalPorCobrar = useMemo(() => {
    return allClientsData
      .filter(c => c.balance > 0)
      .reduce((sum, c) => sum + c.balance, 0);
  }, [allClientsData]);

  const totalSaldoFavor = useMemo(() => {
    return allClientsData
      .filter(c => c.balance < 0)
      .reduce((sum, c) => sum + Math.abs(c.balance), 0);
  }, [allClientsData]);

  const filteredAndSearchedClients = useMemo(() => {
    let result = allClientsData;
    const lowerSearchText = searchText.toLowerCase();
    if (searchText) {
        result = result.filter(c =>
            c.client_name.toLowerCase().includes(lowerSearchText)
        );
    }
    if (activeFilter === 'owing') {
      result = result.filter(c => c.balance > 0);
    } else if (activeFilter === 'credit') {
      result = result.filter(c => c.balance < 0);
    }
    return result;
  }, [allClientsData, activeFilter, searchText]);

  const openAbonoModal = (cliente) => {
    setClienteSeleccionado(cliente);
    setShowAbonoModal(true);
  };

  const openSaldoFavorModal = (cliente) => {
     setClienteSeleccionado(cliente);
     setShowSaldoFavorModal(true);
  };

  const openEstadoCuentaModal = (cliente) => {
    setClienteSeleccionado(cliente);
    setShowEstadoCuentaModal(true);
  };

  const handleRecordAbono = async (cliente, montoAbono, descripcion = 'Pago cliente') => {
      if (!cliente || !cliente.client_id) {
        toast.error("Error: No se ha especificado un cliente para el abono.");
        return { success: false, error: "Cliente no especificado." };
      }
      if (montoAbono <= 0) {
          toast.error("El monto del abono debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoAbono;
      try {
          const { error: insertError } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: cliente.client_id,
                  tipo_movimiento: 'ABONO_PAGO',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);
          if (insertError) {
              console.error('Error al registrar abono:', insertError.message);
              toast.error(`Error al registrar el abono: ${insertError.message}`);
              return { success: false, error: insertError.message };
          } else {
              toast.success('Abono registrado con éxito.');
              fetchClientsData();
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al registrar abono:', err.message);
          toast.error('Ocurrió un error inesperado al registrar el abono.');
          return { success: false, error: err.message };
      }
  };

  const handleAddCredit = async (cliente, montoCredito, descripcion = 'Crédito a favor') => {
       if (!cliente || !cliente.client_id) {
        toast.error("Error: No se ha especificado un cliente para el crédito.");
        return { success: false, error: "Cliente no especificado." };
      }
       if (montoCredito <= 0) {
          toast.error("El monto del crédito debe ser positivo.");
          return { success: false };
      }
      const montoMovimiento = -montoCredito;
      try {
          const { error: insertError } = await supabase
              .from('movimientos_cuenta_clientes')
              .insert([{
                  cliente_id: cliente.client_id,
                  tipo_movimiento: 'CREDITO_FAVOR',
                  monto: montoMovimiento,
                  referencia_venta_id: null,
                  descripcion: descripcion,
              }]);
          if (insertError) {
              console.error('Error al añadir crédito:', insertError.message);
              toast.error(`Error al añadir saldo a favor: ${insertError.message}`);
               return { success: false, error: insertError.message };
          } else {
              toast.success('Saldo a favor añadido con éxito.');
              fetchClientsData();
              return { success: true };
          }
      } catch (err) {
          console.error('Error general al añadir crédito:', err.message);
          toast.error('Ocurrió un error inesperado al añadir saldo a favor.');
          return { success: false, error: err.message };
      }
  };

  // --- FUNCIÓN MODIFICADA PARA GENERAR PDF CON LOGO DESDE URL ---
  const generarPDFEstadoCuenta = async (cliente, movimientosDetallados) => {
    console.log("PDF GEN: Iniciando generarPDFEstadoCuenta para cliente:", JSON.stringify(cliente));
    if (!cliente || !cliente.client_id || !movimientosDetallados) {
        toast('No hay datos suficientes para generar el PDF.', { icon: 'ℹ️' });
        console.error("PDF GEN: Datos insuficientes: cliente, cliente.client_id o movimientosDetallados faltan.");
        return;
    }

    try {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'letter'
        });
        console.log("PDF GEN: jsPDF instancia creada.");

        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        let yPos = margin; 
        const lineHeight = 5;
        const smallTextSize = 8;
        const normalTextSize = 10;
        const mainTitleSize = 18;
        const subTitleSize = 11;

        // Función para cargar y añadir el logo
        const addLogoToDoc = () => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "Anonymous"; // Importante para evitar problemas de CORS si la imagen estuviera en otro dominio
                img.src = logoUrl; // Usar la variable logoUrl definida arriba
                console.log("PDF GEN: Intentando cargar logo desde:", logoUrl);

                img.onload = () => {
                    console.log("PDF GEN: Logo cargado exitosamente (img.onload). Dimensiones originales:", img.width, "x", img.height);
                    try {
                        const desiredLogoWidthMm = 30; 
                        const aspectRatio = img.width / img.height;
                        const calculatedLogoHeightMm = desiredLogoWidthMm / aspectRatio;
                        const logoX = margin;
                        
                        let imageFormat = 'JPEG'; // Por defecto
                        if (logoUrl.toLowerCase().endsWith('.png')) {
                            imageFormat = 'PNG';
                        }
                        // Nota: jsPDF puede ser sensible al formato exacto. Si es .jpg, JPEG es correcto.
                        
                        doc.addImage(img, imageFormat, logoX, margin, desiredLogoWidthMm, calculatedLogoHeightMm);
                        console.log(`PDF GEN: Logo añadido al PDF como ${imageFormat}. Ancho: ${desiredLogoWidthMm}, Alto: ${calculatedLogoHeightMm}`);
                        resolve({ success: true, height: calculatedLogoHeightMm, width: desiredLogoWidthMm }); 
                    } catch (e) {
                        console.error("PDF GEN: Error al usar doc.addImage con el logo cargado:", e);
                        resolve({ success: false, height: 0, width: 0 });
                    }
                };
                img.onerror = (err) => {
                    console.warn("PDF GEN: Error al cargar el logo (img.onerror) desde:", logoUrl, err);
                    resolve({ success: false, height: 0, width: 0 }); // Continuar sin logo
                };
            });
        };

        const logoResult = await addLogoToDoc();
        
        let textStartY = margin + 3; 
        let textStartX = margin;
        let yPosAfterHeaderBlock;

        if (logoResult.success && logoResult.height > 0) {
            textStartX = margin + logoResult.width + 8; 
            yPosAfterHeaderBlock = Math.max(margin + logoResult.height, textStartY + (mainTitleSize * 0.5) + (smallTextSize * 0.8 * 2) ) + 7;
        } else {
            // Si el logo no se cargó, el texto de la empresa ocupa todo el ancho superior y se centra
            textStartY = margin;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(mainTitleSize);
            doc.text("PERFUMES ELISA", pageWidth / 2, textStartY, { align: 'center' });
            textStartY += mainTitleSize * 0.5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(smallTextSize);
            doc.text("Ciudad Apodaca, N.L., C.P. 66640", pageWidth / 2, textStartY, { align: 'center' });
            textStartY += lineHeight * 0.8;
            doc.text("Teléfono: 81 3080 4010", pageWidth / 2, textStartY, { align: 'center' });
            yPosAfterHeaderBlock = textStartY + 7;
        }
        
        if (logoResult.success && logoResult.height > 0) { // Solo dibujar si el logo se cargó
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(mainTitleSize);
            doc.text("PERFUMES ELISA", textStartX, textStartY);
            textStartY += mainTitleSize * 0.5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(smallTextSize);
            doc.text("Ciudad Apodaca, N.L., C.P. 66640", textStartX, textStartY);
            textStartY += lineHeight * 0.8;
            doc.text("Teléfono: 81 3080 4010", textStartX, textStartY);
        }
        
        console.log("PDF GEN: Encabezado de empresa dibujado. yPos para línea:", yPosAfterHeaderBlock);

        // Título del Documento y Fecha de Generación - A la derecha
        const reportTitleX = pageWidth - margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(subTitleSize);
        doc.text("ESTADO DE CUENTA", reportTitleX, margin + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(smallTextSize);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, reportTitleX, margin + 5 + subTitleSize * 0.5, { align: 'right' });
        console.log("PDF GEN: Título y fecha del reporte dibujados.");
        
        yPos = yPosAfterHeaderBlock; // Establecer yPos para la línea divisoria

        // Línea divisoria
        doc.setDrawColor(150, 150, 150);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += lineHeight * 1.5;
        console.log("PDF GEN: Línea divisoria dibujada. yPos:", yPos);

        // Información del Cliente
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(normalTextSize);
        doc.text("CLIENTE:", margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente.client_name || "N/A", margin + 25, yPos);
        yPos += lineHeight * 2; 
        console.log("PDF GEN: Información del cliente dibujada. yPos:", yPos);

        // Tabla de Movimientos
        const head = [['Fecha', 'Tipo', 'Referencia / Descripción', 'Monto', 'Saldo Acumulado']];
        console.log("PDF GEN: Datos para la tabla (movimientosDetallados):", JSON.stringify(movimientosDetallados));
        const body = movimientosDetallados.map(mov => [
            new Date(mov.created_at).toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'}),
            mov.tipo_movimiento ? mov.tipo_movimiento.replace(/_/g, ' ') : '-',
            mov.referencia_venta_id ? `Venta: ${mov.referencia_venta_id}` : (mov.descripcion || '-'),
            `$${formatNumberWithCommas(mov.monto, true)}`,
            formatSaldoDisplay(mov.saldo_acumulado)
        ]);
        console.log("PDF GEN: Cuerpo de la tabla procesado:", JSON.stringify(body));

        if (movimientosDetallados.length > 0) {
            doc.autoTable({
                head: head,
                body: body,
                startY: yPos,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 1.5, lineColor: [200, 200, 200], lineWidth: 0.1 },
                headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40], fontStyle: 'bold', halign: 'center', fontSize: 8.5, cellPadding: 2 },
                columnStyles: { 0: { halign: 'left', cellWidth: 22 }, 1: { halign: 'left', cellWidth: 30 }, 2: { halign: 'left', cellWidth: 'auto' }, 3: { halign: 'right', cellWidth: 25 }, 4: { halign: 'right', cellWidth: 28 }},
                margin: { left: margin, right: margin },
                didDrawPage: (data) => {
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(smallTextSize -1); doc.setTextColor(120, 120, 120);
                    doc.text('Página ' + doc.internal.getCurrentPageInfo().pageNumber + ' de ' + pageCount, pageWidth - margin, pageHeight - 7, { align: 'right' });
                }
            });
            yPos = doc.lastAutoTable.finalY + 10;
            console.log("PDF GEN: Tabla de movimientos dibujada. yPos:", yPos);
        } else {
            doc.setFontSize(normalTextSize);
            doc.setTextColor(100);
            doc.text("No hay movimientos registrados para este cliente.", pageWidth / 2, yPos + 10, { align: 'center' });
            yPos += 20;
            console.log("PDF GEN: Mensaje de no hay movimientos dibujado.");
        }

        // Saldo Actual
        const saldoFinalCalculado = movimientosDetallados.length > 0 
            ? movimientosDetallados[movimientosDetallados.length - 1].saldo_acumulado 
            : (cliente.balance || 0);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        const saldoText = "SALDO ACTUAL:"; const saldoValueText = formatSaldoDisplay(saldoFinalCalculado);
        const saldoTextWidth = doc.getTextWidth(saldoText); const saldoValueWidth = doc.getTextWidth(saldoValueText);
        doc.text(saldoText, pageWidth - margin - saldoValueWidth - saldoTextWidth - 3 , yPos);
        doc.text(saldoValueText, pageWidth - margin, yPos, { align: 'right' });
        yPos += lineHeight;
        doc.setFont('helvetica', 'italic'); doc.setFontSize(smallTextSize); doc.setTextColor(100);
        doc.text("(En la columna ''Monto'' el saldo positivo indica la deuda del cliente y el saldo negativo indica los pagos realizados que se están restando de la deuda)", margin, yPos);
        yPos += lineHeight * 2.5;
        console.log("PDF GEN: Saldo actual dibujado. yPos:", yPos);

        // Mensaje de Agradecimiento
        const thankYouMessage = "¡Gracias por tu confianza! Visítanos de nuevo pronto.";
        const finalMessageY = pageHeight - 12; 
        if (yPos > finalMessageY - 10 && doc.internal.getNumberOfPages() <= 1) { 
             doc.addPage();
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(normalTextSize); doc.setTextColor(80,80,80);
        doc.text(thankYouMessage, pageWidth / 2, finalMessageY, { align: 'center' });
        console.log("PDF GEN: Mensaje de agradecimiento dibujado.");

        doc.output('dataurlnewwindow');
        console.log("PDF GEN: PDF generado y enviado a output.");

    } catch (pdfError) {
        console.error("PDF GEN: Error catastrófico durante la generación del PDF:", pdfError);
        toast.error("Error crítico al generar el PDF. Revise la consola.");
    }
  };


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Estados de cuenta
        </h1>
         <div className="w-full md:w-[150px]" /> {/* Spacer */}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:text-left">
                  <p className="text-lg font-medium text-gray-600">Total Por Cobrar</p>
                  <p className="text-2xl font-bold text-red-600">
                      {totalPorCobrar === 0 ? '$0.00' : `-${formatNumberWithCommas(totalPorCobrar)}`}
                  </p>
              </div>
              <div className="text-center md:text-left">
                   <p className="text-lg font-medium text-gray-600">Total Saldo a Favor</p>
                  <p className="text-2xl font-bold text-green-600">
                       ${formatNumberWithCommas(totalSaldoFavor)}
                  </p>
              </div>
              <div className="flex flex-col gap-3 justify-center md:justify-end">
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                          onClick={() => setActiveFilter('owing')}
                          className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                              ${activeFilter === 'owing'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                  : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'
                              }`}
                      >
                          Clientes por Cobrar ({allClientsData.filter(c => c.balance > 0).length})
                      </button>
                       <button
                          onClick={() => setActiveFilter('credit')}
                           className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                               ${activeFilter === 'credit'
                                   ? 'bg-green-600 text-white border-green-600 shadow-md'
                                   : 'bg-white text-green-600 border-green-600 hover:bg-green-50'
                               }`}
                      >
                          Clientes Saldo a Favor ({allClientsData.filter(c => c.balance < 0).length})
                      </button>
                  </div>
                  <div className="flex space-x-3 justify-center md:justify-end">
                      <button
                           onClick={() => setActiveFilter('all')}
                            className={`px-4 py-2 border rounded-md text-sm font-semibold transition duration-200 ease-in-out
                                ${activeFilter === 'all'
                                    ? 'bg-gray-600 text-white border-gray-600 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-600 hover:bg-gray-100'
                                }`}
                       >
                           Mostrar todos ({allClientsData.length})
                       </button>
                       <input
                           type="text"
                           placeholder="Buscar cliente..."
                           value={searchText}
                           onChange={(e) => setSearchText(e.target.value)}
                           className="p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                       />
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-4 text-center">Cargando...</p>
        ) : error ? (
          <p className="p-4 text-center text-red-500">{error}</p>
        ) : filteredAndSearchedClients.length === 0 ? (
          <p className="p-4 text-center text-gray-500">
              {searchText ? `No se encontraron clientes para "${searchText}" con el filtro actual.` : (
                  activeFilter === 'owing' ? "No hay clientes con saldo pendiente actualmente." :
                  activeFilter === 'credit' ? "No hay clientes con saldo a favor actualmente." :
                  "No hay clientes registrados en el sistema."
              )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Días sin pagar</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Días desde compra</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th></tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSearchedClients.map(cliente => (
                  <tr key={cliente.client_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEstadoCuentaModal(cliente)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cliente.client_name}
                    </td>
                     {cliente.balance <= 0 ? (
                         <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-600 font-medium" colSpan="2">
                             Sin adeudo
                         </td>
                     ) : (
                         <>
                             <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-800">
                                 {cliente.daysSinceLastPayment !== null ? `${cliente.daysSinceLastPayment} días` : '-'}
                             </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-800">
                                 {cliente.daysSinceFirstPurchase !== null ? `${cliente.daysSinceFirstPurchase} días` : '-'}
                             </td>
                         </>
                     )}
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold
                        ${cliente.balance > 0 ? 'text-red-600' : cliente.balance < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      {formatSaldoDisplay(cliente.balance)}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <button
                            onClick={(e) => { e.stopPropagation(); openAbonoModal(cliente); }}
                            className="text-blue-600 hover:text-blue-900 mr-3 text-sm"
                            title="Registrar Abono"
                        >
                            Abonar
                        </button>
                         <button
                            onClick={(e) => { e.stopPropagation(); openSaldoFavorModal(cliente); }}
                            className="text-green-600 hover:text-green-900 text-sm"
                             title="Añadir Saldo a Favor"
                        >
                            Saldo Favor
                        </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalAbono
          isOpen={showAbonoModal}
          onClose={() => {setShowAbonoModal(false); setClienteSeleccionado(null);}}
          cliente={clienteSeleccionado}
          onRecordAbono={handleRecordAbono}
      />
      <ModalSaldoFavor
           isOpen={showSaldoFavorModal}
           onClose={() => {setShowSaldoFavorModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado}
           onAddCredit={handleAddCredit}
       />
      <ModalEstadoCuenta
           isOpen={showEstadoCuentaModal}
           onClose={() => {setShowEstadoCuentaModal(false); setClienteSeleccionado(null);}}
           cliente={clienteSeleccionado}
           onGeneratePDF={generarPDFEstadoCuenta}
      />

    </div>
  );
}

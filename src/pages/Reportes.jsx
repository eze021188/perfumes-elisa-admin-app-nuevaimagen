// src/pages/Reportes.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Package, 
  Users, 
  Wallet, 
  CreditCard,
  X as IconX // Importar el icono X para cerrar modal
} from 'lucide-react';

// Helper para formatear moneda
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Asegúrate de que esto sea correcto, o cambia a 'MXN' si es necesario
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fecha para el nombre del archivo
const formatDateForFilename = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
};

// Función para cargar una imagen local y convertirla a Base64 para jsPDF
const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image for PDF:", error);
        return null;
    }
};


export default function Reportes() {
  const navigate = useNavigate();

  // Estados para la gestión de reportes
  const [selectedReport, setSelectedReport] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Estados para los filtros (ejemplo para Ventas por Período)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estado para almacenar la imagen del logo en Base64 para el PDF
  const [logoBase64, setLogoBase64] = useState(null);

  // Eliminamos los estados del modal de previsualización de PDF
  // const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  // const [pdfDataUrl, setPdfDataUrl] = useState('');


  // Cargar logo al iniciar para el PDF
  useEffect(() => {
      async function loadLogo() {
          const logoUrl = '/images/PERFUMESELISA.png';
          const base64 = await getBase64Image(logoUrl);
          setLogoBase64(base64);
      }
      loadLogo();
  }, []);


  // Función para cargar los datos del reporte seleccionado
  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setReportData(null);
    setReportError(null);

    try {
      let data = null;
      let error = null;

      // Lógica para cargar datos según el reporte seleccionado
      switch (selectedReport) {
        case 'ventas_por_periodo':
          // Validar que las fechas estén seleccionadas para este reporte
          if (!startDate || !endDate) {
            setReportError('Por favor, selecciona un rango de fechas para este reporte.');
            setLoadingReport(false);
            return;
          }
          // Consulta a Supabase para Ventas por Período
          ({ data, error } = await supabase
            .from('ventas')
            .select('fecha, total, codigo_venta, cliente_nombre, forma_pago')
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: true }));
          break;

        case 'stock_actual':
             ({ data, error } = await supabase
                 .from('productos')
                 .select('nombre, stock')
                 .order('nombre', { ascending: true }));
             break;

         case 'saldos_clientes':
             // Consulta a Supabase para Saldos de Clientes
             const { data: movimientosData, error: movimientosError } = await supabase
                 .from('movimientos_cuenta_clientes')
                 .select('cliente_id, monto, clientes(nombre)')
                 .order('cliente_id');

             if (movimientosError) {
                 error = movimientosError;
             } else {
                  // Agrupar movimientos por cliente para calcular el saldo
                  const saldos = {};
                  (movimientosData || []).forEach(mov => {
                      const clienteId = mov.cliente_id;
                      const monto = parseFloat(mov.monto) || 0;
                      const clienteNombre = mov.clientes?.nombre || 'Cliente Desconocido';

                      if (!saldos[clienteId]) {
                          saldos[clienteId] = {
                              id: clienteId,
                              nombre: clienteNombre,
                              saldo: 0
                          };
                      }
                      saldos[clienteId].saldo += monto;
                  });
                  // Convertir el objeto de saldos a un array
                  data = Object.values(saldos).filter(s => s.saldo !== 0);
                  // Ordenar por nombre del cliente o por saldo si lo prefieres
                  data.sort((a, b) => a.nombre.localeCompare(b.nombre));
             }
             break;

         case 'ventas_por_cliente':
             // Consulta a Supabase para obtener clientes con sus ventas históricas y actuales
             const { data: clientesData, error: clientesError } = await supabase
                 .from('clientes')
                 .select('id, nombre, total_ventas_historicas');

             if (clientesError) {
                 error = clientesError;
             } else {
                 // Obtener todas las ventas para sumar los totales actuales
                 const { data: ventasData, error: ventasError } = await supabase
                     .from('ventas')
                     .select('cliente_id, total');

                 if (ventasError) {
                     error = ventasError;
                 } else {
                      // Crear un mapa para sumar las ventas actuales por cliente_id
                      const ventasActualesPorCliente = {};
                      (ventasData || []).forEach(venta => {
                          const clienteId = venta.cliente_id;
                          const totalVenta = parseFloat(venta.total) || 0;
                          if (ventasActualesPorCliente[clienteId]) {
                              ventasActualesPorCliente[clienteId] += totalVenta;
                          } else {
                              ventasActualesPorCliente[clienteId] = totalVenta;
                          }
                      });

                      // Combinar datos históricos y actuales, y formatear para el reporte
                      data = (clientesData || []).map(cliente => {
                          const totalHistoricas = parseFloat(cliente.total_ventas_historicas) || 0;
                          const totalActuales = ventasActualesPorCliente[cliente.id] || 0;
                          const totalGeneralVentas = totalHistoricas + totalActuales;

                          return {
                              id: cliente.id,
                              nombre: cliente.nombre,
                              totalVentas: totalGeneralVentas
                          };
                      }).filter(c => c.totalVentas > 0);

                      // Ordenar por nombre del cliente
                      data.sort((a, b) => a.nombre.localeCompare(b.nombre));
                 }
             }
             break;

        default:
          setReportError('Selecciona un tipo de reporte válido.');
          setLoadingReport(false);
          return;
      }

      // Manejar la respuesta de la consulta
      if (error) {
        console.error(`Error fetching report "${selectedReport}":`, error.message);
        setReportError(`Error al cargar el reporte: ${error.message}`);
        setReportData(null);
        toast.error(`Error al cargar reporte: ${error.message}`);
      } else {
        setReportData(data || []);
        setReportError(null);
         if ((data || []).length === 0) {
             toast('No se encontraron datos para este reporte con los filtros seleccionados.', { icon: 'ℹ️' });
         } else {
             toast.success('Reporte generado con éxito.');
         }
      }

    } catch (err) {
      console.error('Unexpected error generating report:', err);
      setReportError('Ocurrió un error inesperado al generar el reporte.');
      setReportData(null);
      toast.error('Error inesperado al generar el reporte.');
    } finally {
      setLoadingReport(false);
    }
  };

  // Función para exportar a PDF (Abrir en nueva pestaña)
  const handleExportPDF = () => {
    try {
      if (!reportData || reportData.length === 0) {
          toast('No hay datos para exportar a PDF.', { icon: 'ℹ️' });
          return;
      }

      const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter'
      });

      const margin = 15;
      let yOffset = margin;

      // Título del reporte
      let reportCategory = 'Reporte';
      let specificReportTitle = '';
      let head = [];
      let body = [];
      let filename = 'reporte';

      // Configurar contenido del PDF según el reporte seleccionado
      switch (selectedReport) {
          case 'ventas_por_periodo':
              reportCategory = 'Reporte de Ventas';
              specificReportTitle = `por período: (${startDate} a ${endDate})`;
              head = [['Código Venta', 'Fecha', 'Cliente', 'Forma Pago', 'Total Venta']];
              body = reportData.map(venta => [
                  venta.codigo_venta,
                  new Date(venta.fecha).toLocaleDateString(),
                  venta.cliente_nombre || 'Público General',
                  venta.forma_pago,
                  formatCurrency(venta.total)
              ]);
              filename = `ventas_periodo_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.pdf`;
              break;

          case 'stock_actual':
              reportCategory = 'Reporte de Inventario';
              specificReportTitle = 'Niveles de Stock Actual';
              head = [['Producto', 'Stock Actual']];
              body = reportData.map(producto => [
                  producto.nombre,
                  producto.stock ?? 0
              ]);
              filename = `stock_actual_${formatDateForFilename(new Date())}.pdf`;
              break;

          case 'saldos_clientes':
              reportCategory = 'Reporte de Clientes';
              specificReportTitle = 'Saldos de Clientes';
              head = [['Cliente', 'Saldo Actual']];
              body = reportData.map(cliente => [
                  cliente.nombre,
                  formatCurrency(cliente.saldo)
              ]);
              filename = `saldos_clientes_${formatDateForFilename(new Date())}.pdf`;
              break;

          case 'ventas_por_cliente':
               reportCategory = 'Reporte de Ventas';
               specificReportTitle = 'por Cliente (Incluye Histórico)';
               head = [['Cliente', 'Total de Ventas']];
               body = reportData.map(cliente => [
                   cliente.nombre,
                   formatCurrency(cliente.totalVentas)
               ]);
               filename = `ventas_por_cliente_${formatDateForFilename(new Date())}.pdf`;
               break;

          default:
              reportCategory = 'Reporte Desconocido';
              specificReportTitle = '';
              if (reportData.length > 0) {
                  head = [Object.keys(reportData[0]).map(key => key.replace(/_/g, ' ').toUpperCase())];
                  body = reportData.map(row => Object.values(row).map(value => {
                       if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
                            return formatCurrency(value);
                       }
                       return String(value);
                   }));
              } else {
                   toast('No hay datos o el reporte no es válido para exportar a PDF.', { icon: 'ℹ️' });
                   return;
               }
               filename = `reporte_desconocido_${formatDateForFilename(new Date())}.pdf`;
              break;
      }

      // Encabezado del Documento con Logo e Información de la Empresa
      const logoWidth = 30;
      const logoHeight = 30;
      const companyInfoX = margin + logoWidth + 10;
      const pageWidth = doc.internal.pageSize.getWidth();


      if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      } else {
          console.warn("Logo image not loaded for PDF.");
           doc.setFontSize(10);
           doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });
      }

      // Información de la Empresa
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Ciudad Apodaca, N.L., C.P. 66640', companyInfoX, yOffset + 12);
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 17);


      // Formato del Título del Reporte (alineado a la derecha)
      const reportTitleX = pageWidth - margin;
      const reportTitleY = yOffset + 5;

      // Primera línea: Categoría del Reporte (más grande)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(reportCategory, reportTitleX, reportTitleY, { align: 'right' });

      // Segunda línea: Título específico con filtros (más discreto, debajo de la categoría)
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(specificReportTitle, reportTitleX, reportTitleY + 6, { align: 'right' });

      yOffset += Math.max(logoHeight, 30) + 15;

      // Divisor
      doc.line(margin, yOffset, pageWidth - margin, yOffset);
      yOffset += 10;


      // Añadir tabla con jspdf-autotable
      doc.autoTable({
          startY: yOffset,
          head: head,
          body: body,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
              // Número de página en el pie
              doc.setFontSize(8);
              doc.text('Página ' + data.pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - margin, { align: 'right' });
          }
      });

      // --- CAMBIO CLAVE AQUÍ: Usar Blob URL para abrir en nueva pestaña ---
      const pdfBlob = doc.output('blob'); // Obtener el PDF como un Blob
      const blobUrl = URL.createObjectURL(pdfBlob); // Crear una URL de objeto para el Blob

      window.open(blobUrl, '_blank'); // Abrir la URL de Blob en una nueva pestaña
      
      // Liberar la URL de Blob después de un corto tiempo para evitar fugas de memoria
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000); // 10 segundos

      toast.success('Reporte PDF generado en una nueva pestaña.');
    } catch (error) {
      console.error("Error fatal en handleExportPDF:", error);
      toast.error(`Error al generar el PDF: ${error.message || 'Desconocido'}. Revisa la consola.`);
    }
  };

  // Función para exportar a CSV (Descarga directa)
  const handleExportCSV = () => {
      if (!reportData || reportData.length === 0) {
          toast('No hay datos para exportar a CSV.', { icon: 'ℹ️' });
          return;
      }

      let csvContent = '';
      let filename = 'reporte';

      // Configurar contenido del CSV según el reporte seleccionado
      switch (selectedReport) {
          case 'ventas_por_periodo':
              // Encabezados CSV
              csvContent += 'Código Venta,Fecha,Cliente,Forma Pago,Total Venta\n';
              // Datos CSV
              reportData.forEach(venta => {
                  const row = [
                      venta.codigo_venta,
                      new Date(venta.fecha).toLocaleDateString(),
                      `"${venta.cliente_nombre || 'Público General'}"`,
                      venta.forma_pago,
                      venta.total ?? 0
                  ];
                  csvContent += row.join(',') + '\n';
              });
              filename = `ventas_periodo_${formatDateForFilename(startDate)}_to_${formatDateForFilename(endDate)}.csv`;
              break;

          case 'stock_actual':
              // Encabezados CSV
              csvContent += 'Producto,Stock Actual\n';
              // Datos CSV
              reportData.forEach(producto => {
                  const row = [
                      `"${producto.nombre}"`,
                      producto.stock ?? 0
                  ];
                  csvContent += row.join(',') + '\n';
              });
               filename = `stock_actual_${formatDateForFilename(new Date())}.csv`;
              break;

          case 'saldos_clientes':
              // Encabezados CSV
              csvContent += 'Cliente,Saldo Actual\n';
              // Datos CSV
              reportData.forEach(cliente => {
                  const row = [
                      `"${cliente.nombre}"`,
                      cliente.saldo ?? 0
                  ];
                  csvContent += row.join(',') + '\n';
              });
               filename = `saldos_clientes_${formatDateForFilename(new Date())}.csv`;
              break;

          case 'ventas_por_cliente':
               // Encabezados CSV
               csvContent += 'Cliente,Total de Ventas (Incluye Histórico)\n';
               // Datos CSV
               reportData.forEach(cliente => {
                   const row = [
                       `"${cliente.nombre}"`,
                       cliente.totalVentas ?? 0
                   ];
                   csvContent += row.join(',') + '\n';
               });
               filename = `ventas_por_cliente_${formatDateForFilename(new Date())}.csv`;
               break;

          default:
               // Si no se reconoce el reporte, intentar generar un CSV básico
               if (reportData.length > 0) {
                   // Encabezados: usar las claves del primer objeto
                   csvContent += Object.keys(reportData[0]).join(',') + '\n';
                   // Datos: convertir todos los valores a string
                   reportData.forEach(row => {
                       csvContent += Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\n';
                   });
               } else {
                   toast('No hay datos o el reporte no es válido para exportar a CSV.', { icon: 'ℹ️' });
                   return;
               }
               filename = `reporte_desconocido_${formatDateForFilename(new Date())}.csv`;
              break;
      }


      // Crear un Blob y un enlace de descarga
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);

      // Simular clic en el enlace para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Reporte CSV generado.');
  };


  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      {/* Encabezado responsive */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold text-gray-100 text-center">Reportes</h1>

        <div className="w-full md:w-[150px]" />
      </div>

      {/* Contenido principal del reporte */}
      <div className="bg-dark-800 shadow-card-dark rounded-lg p-6 md:p-8 border border-dark-700/50">
        <h2 className="text-2xl font-semibold mb-4 text-gray-100">Generar Reporte</h2>

        {/* Selector de Tipo de Reporte */}
        <div className="mb-6">
            <label htmlFor="report-selector" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <FileText size={16} />
              Selecciona un Reporte:
            </label>
            <select
                id="report-selector"
                value={selectedReport}
                onChange={(e) => {
                    setSelectedReport(e.target.value);
                    setStartDate('');
                    setEndDate('');
                    setReportData(null);
                    setReportError(null);
                }}
                className="mt-1 block w-full md:w-1/2 p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200 disabled:opacity-50"
                disabled={loadingReport}
            >
                <option value="">-- Selecciona --</option>
                <optgroup label="Reportes de Ventas">
                    <option value="ventas_por_periodo">Ventas por Período</option>
                    <option value="ventas_por_cliente">Ventas por Cliente (Incluye Histórico)</option>
                </optgroup>
                <optgroup label="Reportes de Inventario">
                    <option value="stock_actual">Niveles de Stock Actual</option>
                </optgroup>
                <optgroup label="Reportes de Clientes">
                    <option value="saldos_clientes">Saldos de Clientes</option>
                </optgroup>
            </select>
        </div>

        {/* Área de Filtros Dinámicos */}
        <div className="mb-6 p-4 border border-dark-700/50 rounded-md bg-dark-900/50">
            <h3 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-1">
              <Filter size={18} />
              Filtros
            </h3>

            {/* Filtros para Ventas por Período */}
            {selectedReport === 'ventas_por_periodo' && (
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:w-auto">
                        <label htmlFor="startDate" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Calendar size={14} />
                          Fecha Inicio:
                        </label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="p-2 bg-dark-800 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200 w-full"
                            disabled={loadingReport}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label htmlFor="endDate" className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                          <Calendar size={14} />
                          Fecha Fin:
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="p-2 bg-dark-800 border border-dark-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200 w-full"
                            disabled={loadingReport}
                        />
                    </div>
                </div>
            )}

             {/* Filtros para Niveles de Stock Actual */}
             {selectedReport === 'stock_actual' && (
                 <p className="text-gray-300">Este reporte muestra el stock actual de todos los productos.</p>
             )}

             {/* Filtros para Saldos de Clientes */}
             {selectedReport === 'saldos_clientes' && (
                  <p className="text-gray-300">Este reporte muestra los saldos actuales de los clientes con movimientos.</p>
             )}

            {/* Filtros para Ventas por Cliente */}
            {selectedReport === 'ventas_por_cliente' && (
              <div>
                <p className="text-gray-300">
                  Este reporte muestra el total de ventas por cliente, incluyendo datos históricos.
                </p>
              </div>
            )}

            {/* Mensaje si no hay reporte seleccionado */}
            {!selectedReport && (
                <p className="text-center text-gray-400">Selecciona un reporte y haz clic en "Generar Reporte".</p>
            )}
        </div>

        {/* Botón "Generar Reporte" */}
        <div className="mb-8">
            <button
                onClick={handleGenerateReport}
                disabled={!selectedReport || loadingReport || (selectedReport === 'ventas_por_periodo' && (!startDate || !endDate))}
                className="px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg shadow-elegant-dark hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loadingReport ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    <span>Generando…</span>
                  </>
                ) : (
                  <>
                    <BarChart3 size={18} />
                    <span>Generar Reporte</span>
                  </>
                )}
            </button>
        </div>

        {/* Área de Visualización de Reporte */}
        <div className="report-results-area bg-dark-900/50 p-6 rounded-lg border border-dark-700/50">
            {/* Indicador de carga */}
            {loadingReport && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
              </div>
            )}

            {/* Mensaje de error */}
            {reportError && (
              <div className="flex justify-center items-center h-64">
                <p className="text-center text-error-400">{reportError}</p>
              </div>
            )}

            {/* Tabla para Reporte de Ventas por Período */}
            {reportData && selectedReport === 'ventas_por_periodo' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                       <Calendar size={20} className="text-primary-400" />
                       Resultados: Ventas por Período ({startDate} a {endDate})
                     </h3>
                     {reportData.length === 0 ? (
                         <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700/50">
                           <FileText size={48} className="mx-auto text-gray-600 mb-3" />
                           <p className="text-gray-400 italic">No hay datos para este período.</p>
                         </div>
                     ) : (
                         <div className="bg-dark-800/50 rounded-lg border border-dark-700/50 overflow-hidden">
                           <table className="min-w-full divide-y divide-dark-700">
                               <thead className="bg-dark-900">
                                   <tr>
                                       <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Código Venta</th>
                                       <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                       <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                       <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Forma Pago</th>
                                       <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Venta</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
                                   {reportData.map((venta) => (
                                       <tr key={venta.codigo_venta} className="hover:bg-dark-700/50 transition-colors">
                                           <td className="p-3 text-sm text-gray-300">{venta.codigo_venta}</td>
                                           <td className="p-3 text-sm text-gray-300">{new Date(venta.fecha).toLocaleDateString()}</td>
                                           <td className="p-3 text-sm text-gray-300">{venta.cliente_nombre || 'Público General'}</td>
                                           <td className="p-3 text-sm text-gray-300">{venta.forma_pago}</td>
                                           <td className="p-3 text-sm text-gray-200 text-right font-medium">{formatCurrency(venta.total)}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                         </div>
                     )}
                 </div>
            )}

             {/* Tabla para Reporte de Niveles de Stock Actual */}
             {reportData && selectedReport === 'stock_actual' && (
              <div className="overflow-x-auto">
                <h3 className="text-xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                  <Package size={20} className="text-primary-400" />
                  Resultado: Niveles de Stock Actual
                </h3>
                {reportData.length === 0 ? (
                  <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700/50">
                    <Package size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400 italic">No hay productos en el inventario.</p>
                  </div>
                ) : (
                  <div className="bg-dark-800/50 rounded-lg border border-dark-700/50 overflow-hidden">
                    <table className="min-w-full divide-y divide-dark-700">
                      <thead className="bg-dark-900">
                        <tr>
                          <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Producto</th>
                          <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Stock Actual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
                        {reportData.map((producto) => (
                          <tr key={producto.nombre} className="hover:bg-dark-700/50 transition-colors">
                            <td className="p-3 text-sm text-gray-300">{producto.nombre}</td>
                            <td className="p-3 text-sm text-gray-200 text-right font-medium">{producto.stock ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

              {/* Tabla para Reporte de Saldos de Clientes */}
             {reportData && selectedReport === 'saldos_clientes' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                       <Wallet size={20} className="text-primary-400" />
                       Resultados: Saldos de Clientes
                     </h3>
                      {reportData.length === 0 ? (
                         <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700/50">
                           <Users size={48} className="mx-auto text-gray-600 mb-3" />
                           <p className="text-gray-400 italic">No hay clientes con saldo registrado.</p>
                         </div>
                     ) : (
                       <div className="bg-dark-800/50 rounded-lg border border-dark-700/50 overflow-hidden">
                         <table className="min-w-full divide-y divide-dark-700">
                             <thead className="bg-dark-900">
                                 <tr>
                                     <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                     <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Saldo Actual</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
                                 {reportData.map((cliente) => (
                                     <tr key={cliente.id} className="hover:bg-dark-700/50 transition-colors">
                                         <td className="p-3 text-sm text-gray-300">{cliente.nombre}</td>
                                         <td className="p-3 text-sm text-right">
                                             <span className={cliente.saldo > 0 ? 'text-error-400 font-semibold' : 'text-success-400 font-semibold'}>
                                                {formatCurrency(cliente.saldo)}
                                             </span>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                       </div>
                     )}
                 </div>
             )}

             {/* Tabla para Reporte de Ventas por Cliente */}
             {reportData && selectedReport === 'ventas_por_cliente' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                       <Users size={20} className="text-primary-400" />
                       Resultados: Ventas por Cliente (Incluye Histórico)
                     </h3>
                      {reportData.length === 0 ? (
                         <div className="text-center py-12 bg-dark-800/50 rounded-lg border border-dark-700/50">
                           <Users size={48} className="mx-auto text-gray-600 mb-3" />
                           <p className="text-gray-400 italic">No hay ventas registradas para clientes.</p>
                         </div>
                     ) : (
                       <div className="bg-dark-800/50 rounded-lg border border-dark-700/50 overflow-hidden">
                         <table className="min-w-full divide-y divide-dark-700">
                             <thead className="bg-dark-900">
                                 <tr>
                                     <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                     <th className="p-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total de Ventas</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
                                 {reportData.map((cliente) => (
                                     <tr key={cliente.id || `${cliente.nombre}-${Math.random()}`} className="hover:bg-dark-700/50 transition-colors">
                                         <td className="p-3 text-sm text-gray-300">{cliente.nombre}</td>
                                         <td className="p-3 text-sm text-gray-200 text-right font-medium">
                                             {formatCurrency(cliente.totalVentas)}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                       </div>
                     )}
                 </div>
             )}
        </div>

        {/* Opciones de Exportación */}
        {reportData && reportData.length > 0 && (
            <div className="mt-6 flex justify-end gap-4">
                <button
                    onClick={handleExportPDF}
                    className="px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700 transition-colors flex items-center gap-1"
                    disabled={loadingReport}
                >
                    <FileText size={16} />
                    Ver PDF
                </button>
                <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-1"
                    disabled={loadingReport}
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>
        )}
      </div>
    </div>
  );
}

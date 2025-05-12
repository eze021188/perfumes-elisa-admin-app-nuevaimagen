// src/pages/Reportes.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Asegúrate de que la ruta a supabase.js sea correcta y que el archivo exporte 'supabase'
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
// Asegúrate de tener jspdf instalado: npm install jspdf
import jsPDF from 'jspdf';
// Asegúrate de tener jspdf-autotable instalado: npm install jspdf-autotable
import 'jspdf-autotable';

// Helper simple para formatear moneda (si no está global)
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

// >>> Función para cargar una imagen local y convertirla a Base64 para jsPDF <<<
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

  // --- Estados para la gestión de reportes ---
  const [selectedReport, setSelectedReport] = useState(''); // Estado para el reporte seleccionado
  const [reportData, setReportData] = useState(null); // Estado para los datos del reporte
  const [loadingReport, setLoadingReport] = useState(false); // Estado para indicar si el reporte está cargando
  const [reportError, setReportError] = useState(null); // Estado para errores del reporte

  // --- Estados para los filtros (ejemplo para Ventas por Período) ---
  const [startDate, setStartDate] = useState(''); // Fecha de inicio del filtro
  const [endDate, setEndDate] = useState(''); // Fecha de fin del filtro

  // --- Estados para otros filtros (ejemplos, descomentar y usar según necesidad) ---
  // const [selectedClient, setSelectedClient] = useState(''); // Para reportes por cliente
  // const [selectedProduct, setSelectedProduct] = useState(''); // Para reportes por producto
  // const [selectedVendedor, setSelectedVendedor] = useState(''); // Para reportes por vendedor
  // const [filterStatus, setFilterStatus] = useState(''); // Para reportes de stock (ej: bajo stock)

  // >>> Estado para almacenar la imagen del logo en Base64 para el PDF <<<
  const [logoBase64, setLogoBase64] = useState(null);


  // >>> Cargar logo al iniciar para el PDF <<<
  useEffect(() => {
      async function loadLogo() {
          const logoUrl = '/images/PERFUMESELISAwhite.jpg'; // Asegúrate que esta ruta sea correcta
          const base64 = await getBase64Image(logoUrl);
          setLogoBase64(base64);
      }
      loadLogo();
  }, []); // Solo se ejecuta una vez al montar


  // --- Función para cargar los datos del reporte seleccionado ---
  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setReportData(null); // Limpiar datos anteriores
    setReportError(null); // Limpiar errores anteriores

    try {
      let data = null;
      let error = null;

      // --- Lógica para cargar datos según el reporte seleccionado ---
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
            .select('fecha, total, codigo_venta, cliente_nombre, forma_pago') // Selecciona los campos relevantes
            .gte('fecha', startDate) // Filtra por fecha mayor o igual a la fecha inicio
            .lte('fecha', endDate) // Filtra por fecha menor o igual a la fecha fin
            .order('fecha', { ascending: true })); // Ordena por fecha
          break;

        case 'stock_actual':
             console.log("Attempting to fetch stock data..."); // Log de depuración
             // Consulta a Supabase para Niveles de Stock Actual
             // Asegúrate de que tu tabla 'productos' tiene un campo 'stock'
             // >>> CORRECCIÓN: Eliminar 'categoria' de la selección <<<
             ({ data, error } = await supabase
                 .from('productos')
                 .select('nombre, stock') // Selecciona solo nombre y stock
                 .order('nombre', { ascending: true }));

             if (error) {
                 console.error("Error fetching stock data:", error.message); // Log de error
             } else {
                 console.log("Successfully fetched stock data:", data); // Log de datos exitosos
             }
             break;

         case 'saldos_clientes':
             // Consulta a Supabase para Saldos de Clientes
             // Esto requeriría una consulta más compleja, quizás sumando movimientos_cuenta_clientes
             // o si tienes un campo de saldo en la tabla clientes.
             // Ejemplo básico (asumiendo que puedes sumar montos de movimientos):
             // Esta es una consulta simplificada, la lógica real podría ser más compleja
             const { data: movimientosData, error: movimientosError } = await supabase
                 .from('movimientos_cuenta_clientes')
                 .select('cliente_id, monto, clientes(nombre)') // Selecciona cliente_id, monto y nombre del cliente relacionado
                 .order('cliente_id'); // Ordena por cliente para agrupar

             if (movimientosError) {
                 error = movimientosError; // Propagar el error
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
                  data = Object.values(saldos).filter(s => s.saldo !== 0); // Opcional: solo mostrar saldos distintos de cero
                  // Ordenar por nombre del cliente o por saldo si lo prefieres
                  data.sort((a, b) => a.nombre.localeCompare(b.nombre));
             }
             break;

        // --- Agrega casos para otros reportes aquí ---
        // case 'ventas_por_producto': break;
        // case 'ventas_por_cliente': break;
        // case 'ventas_por_forma_pago': break;
        // case 'ventas_por_vendedor': break;
        // case 'movimientos_inventario': break;
        // case 'valoracion_inventario': break;
        // case 'clientes_mas_compras': break;
        // case 'descuentos_aplicados': break;
        // case 'gastos_envio': break;

        default:
          setReportError('Selecciona un tipo de reporte válido.');
          setLoadingReport(false);
          return;
      }

      // --- Manejar la respuesta de la consulta ---
      if (error) {
        console.error(`Error fetching report "${selectedReport}":`, error.message);
        setReportError(`Error al cargar el reporte: ${error.message}`);
        setReportData(null);
        toast.error(`Error al cargar reporte: ${error.message}`); // Mostrar toast de error
      } else {
        setReportData(data || []); // Guardar los datos obtenidos
        console.log("reportData set to:", data || []); // Log de depuración
        setReportError(null); // Limpiar cualquier error previo
         if ((data || []).length === 0) {
             toast('No se encontraron datos para este reporte con los filtros seleccionados.', { icon: 'ℹ️' });
         } else {
             toast.success('Reporte generado con éxito.'); // Mostrar toast de éxito
         }
      }

    } catch (err) {
      // Captura errores inesperados en la lógica
      console.error('Unexpected error generating report:', err);
      setReportError('Ocurrió un error inesperado al generar el reporte.');
      setReportData(null);
      toast.error('Error inesperado al generar el reporte.'); // Mostrar toast de error
    } finally {
      setLoadingReport(false); // Finalizar estado de carga
    }
  };

  // --- Función para exportar a PDF (Abrir en nueva pestaña) ---
  const handleExportPDF = () => {
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
      let reportCategory = 'Reporte'; // Categoría general
      let specificReportTitle = ''; // Título específico con filtros
      let head = [];
      let body = [];
      // No necesitamos filename aquí si solo abrimos en nueva pestaña

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
              break;

          case 'stock_actual':
              reportCategory = 'Reporte de Inventario';
              specificReportTitle = 'Niveles de Stock Actual';
              head = [['Producto', 'Stock Actual']];
              body = reportData.map(producto => [
                  producto.nombre,
                  producto.stock ?? 0
              ]);
              break;

          case 'saldos_clientes':
              reportCategory = 'Reporte de Clientes';
              specificReportTitle = 'Saldos de Clientes';
              head = [['Cliente', 'Saldo Actual']];
              body = reportData.map(cliente => [
                  cliente.nombre,
                  formatCurrency(cliente.saldo)
              ]);
              break;

          // --- Agregar casos para otros reportes ---
          // case 'ventas_por_producto': ...
          // case 'movimientos_inventario': ...
          // etc.

          default:
              // Si no se reconoce el reporte, usar un título genérico
              reportCategory = 'Reporte Desconocido';
              specificReportTitle = '';
              // Intentar generar una tabla básica con los datos si existen
              if (reportData.length > 0) {
                  head = [Object.keys(reportData[0])]; // Usar las claves del primer objeto como encabezados
                  body = reportData.map(row => Object.values(row).map(value => String(value))); // Convertir todos los valores a string
              } else {
                   toast('No hay datos o el reporte no es válido para exportar a PDF.', { icon: 'ℹ️' });
                   return;
              }
              break;
      }

      // --- Encabezado del Documento con Logo e Información de la Empresa ---
      const logoWidth = 30; // Ancho del logo en mm
      const logoHeight = 30; // Alto del logo en mm
      const companyInfoX = margin + logoWidth + 10; // Posición X para la información de la empresa
      const pageWidth = doc.internal.pageSize.getWidth();


      if (logoBase64) {
          doc.addImage(logoBase64, 'JPEG', margin, yOffset, logoWidth, logoHeight);
      } else {
          console.warn("Logo image not loaded for PDF.");
          // Placeholder si el logo no carga
           doc.setFontSize(10);
           doc.text("Logo Aquí", margin + logoWidth / 2, yOffset + logoHeight / 2, { align: 'center' });
      }

      // Información de la Empresa
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PERFUMES ELISA', companyInfoX, yOffset + 5); // Título de la empresa
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      // >>> CORRECCIÓN: Eliminar la línea de dirección específica <<<
      // doc.text('Tu Calle #123, Tu Colonia', companyInfoX, yOffset + 12); // Dirección
      doc.text('Ciudad Apodaca, N.L., C.P. 66640', companyInfoX, yOffset + 12); // Ciudad y CP
      doc.text('Teléfono: 81 3080 4010', companyInfoX, yOffset + 17); // Teléfono


      // >>> Formato del Título del Reporte (alineado a la derecha) <<<
      const reportTitleX = pageWidth - margin; // Posición X para alinear a la derecha
      const reportTitleY = yOffset + 5; // Posición Y inicial para el título

      // Primera línea: Categoría del Reporte (más grande)
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(reportCategory, reportTitleX, reportTitleY, { align: 'right' });

      // Segunda línea: Título específico con filtros (más discreto, debajo de la categoría)
      doc.setFontSize(10); // Tamaño más pequeño
      doc.setFont(undefined, 'normal'); // Fuente normal
      doc.text(specificReportTitle, reportTitleX, reportTitleY + 6, { align: 'right' }); // Ajustar Y para que esté debajo

      yOffset += Math.max(logoHeight, 30) + 15; // Espacio después del encabezado (usar el mayor entre logoHeight y un mínimo)

      // --- Divisor ---
      doc.line(margin, yOffset, pageWidth - margin, yOffset);
      yOffset += 10;


      // Añadir tabla con jspdf-autotable
      doc.autoTable({
          startY: yOffset,
          head: head,
          body: body,
          theme: 'striped', // O 'grid', 'plain'
          styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          didDrawPage: function (data) {
              // Número de página en el pie
              doc.setFontSize(8);
              doc.text('Página ' + data.pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - margin, { align: 'right' });
          }
      });

      // >>> Abrir en una nueva ventana en lugar de descargar <<<
      doc.output('dataurlnewwindow');
      toast.success('Reporte PDF generado en una nueva pestaña.');
  };

  // --- Función para exportar a CSV (Descarga directa) ---
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
                      `"${venta.cliente_nombre || 'Público General'}"`, // Encerrar nombres con comillas por si tienen comas
                      venta.forma_pago,
                      venta.total ?? 0 // Valor numérico sin formato de moneda para análisis
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
                      `"${producto.nombre}"`, // Encerrar nombres con comillas
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
                      `"${cliente.nombre}"`, // Encerrar nombres con comillas
                      cliente.saldo ?? 0 // Valor numérico sin formato de moneda
                  ];
                  csvContent += row.join(',') + '\n';
              });
               filename = `saldos_clientes_${formatDateForFilename(new Date())}.csv`;
              break;

          // --- Agregar casos para otros reportes ---
          // case 'ventas_por_producto': ...
          // case 'movimientos_inventario': ...
          // etc.

          default:
               // Si no se reconoce el reporte, intentar generar un CSV básico
               if (reportData.length > 0) {
                   // Encabezados: usar las claves del primer objeto
                   csvContent += Object.keys(reportData[0]).join(',') + '\n';
                   // Datos: convertir todos los valores a string
                   reportData.forEach(row => {
                       csvContent += Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',') + '\n'; // Escapar comillas dobles
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


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado responsive */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Reportes
        </h1>

        <div className="w-full md:w-[150px]" /> {/* Espaciador para alinear */}
      </div>

      {/* Contenido principal del reporte */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h2 className="text-2xl font-semibold mb-4">Generar Reporte</h2>

        {/* Selector de Tipo de Reporte */}
        <div className="mb-6">
            <label htmlFor="report-selector" className="block text-sm font-medium text-gray-700 mb-1">Selecciona un Reporte:</label>
            <select
                id="report-selector"
                value={selectedReport}
                onChange={(e) => {
                    setSelectedReport(e.target.value);
                    // Opcional: Limpiar filtros y resultados al cambiar de reporte
                    setStartDate('');
                    setEndDate('');
                    setReportData(null);
                    setReportError(null);
                    // Limpiar otros estados de filtro si los añades
                }}
                className="mt-1 block w-full md:w-1/2 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingReport} // Deshabilitar selector mientras carga
            >
                <option value="">-- Selecciona --</option>
                <optgroup label="Reportes de Ventas">
                    <option value="ventas_por_periodo">Ventas por Período</option>
                    {/* Agrega más opciones de reportes de ventas */}
                    {/* <option value="ventas_por_producto">Ventas por Producto</option> */}
                    {/* <option value="ventas_por_cliente">Ventas por Cliente</option> */}
                    {/* <option value="ventas_por_forma_pago">Ventas por Forma de Pago</option> */}
                    {/* <option value="ventas_por_vendedor">Ventas por Vendedor</option> */}
                </optgroup>
                 <optgroup label="Reportes de Inventario">
                    <option value="stock_actual">Niveles de Stock Actual</option>
                    {/* Agrega más opciones de reportes de inventario */}
                    {/* <option value="movimientos_inventario">Movimientos de Inventario</option> */}
                    {/* <option value="valoracion_inventario">Valoración de Inventario</option> */}
                </optgroup>
                 <optgroup label="Reportes de Clientes">
                    <option value="saldos_clientes">Saldos de Clientes</option>
                    {/* Agrega más opciones de reportes de clientes */}
                    {/* <option value="clientes_mas_compras">Clientes con Más Compras</option> */}
                </optgroup>
                 <optgroup label="Otros Reportes">
                     {/* Agrega más opciones de otros reportes */}
                     {/* <option value="descuentos_aplicados">Reporte de Descuentos Aplicados</option> */}
                     {/* <option value="gastos_envio">Reporte de Gastos de Envío</option> */}
                </optgroup>
            </select>
        </div>

        {/* Área de Filtros Dinámicos */}
        <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Filtros</h3>
            {/* Lógica de renderizado condicional para filtros */}

            {/* Filtros para Ventas por Período */}
            {selectedReport === 'ventas_por_periodo' && (
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Fecha Inicio:</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="p-2 border rounded-md shadow-sm"
                        disabled={loadingReport}
                    />
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Fecha Fin:</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="p-2 border rounded-md shadow-sm"
                        disabled={loadingReport}
                    />
                </div>
            )}

             {/* Filtros para Niveles de Stock Actual (Este reporte no necesita filtros de fecha) */}
             {selectedReport === 'stock_actual' && (
                 <p className="text-gray-700">Este reporte muestra el stock actual de todos los productos.</p>
                 // Puedes añadir filtros por categoría aquí si lo deseas
             )}

             {/* Filtros para Saldos de Clientes (Este reporte no necesita filtros de fecha) */}
             {selectedReport === 'saldos_clientes' && (
                  <p className="text-gray-700">Este reporte muestra los saldos actuales de los clientes con movimientos.</p>
                  // Puedes añadir un checkbox para "Solo mostrar clientes con saldo > 0"
             )}


            {/* Mensaje si no hay reporte seleccionado o no tiene filtros */}
             {!selectedReport ? (
                 <p className="text-gray-500">Selecciona un reporte para ver los filtros disponibles.</p>
             ) : (
                 // Puedes añadir un else if para mensajes de reportes sin filtros específicos
                 null
             )}

            {/* Agrega bloques similares para los filtros de otros reportes */}

        </div>

        {/* Botón "Generar Reporte" */}
        <div className="mb-8">
            <button
                onClick={handleGenerateReport}
                disabled={!selectedReport || loadingReport || (selectedReport === 'ventas_por_periodo' && (!startDate || !endDate))} // Deshabilita si no hay reporte, está cargando, o faltan fechas para ventas por período
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loadingReport ? 'Generando…' : 'Generar Reporte'}
            </button>
        </div>

        {/* Área de Visualización de Reporte */}
        <div className="report-results-area bg-gray-50 p-6 rounded-md">
            {/* Indicador de carga */}
            {loadingReport && <p className="text-center text-blue-600 font-semibold">Cargando reporte...</p>}

            {/* Mensaje de error */}
            {reportError && <p className="text-center text-red-600">{reportError}</p>}

            {/* Mensaje inicial */}
            {!selectedReport && !loadingReport && !reportData && !reportError && (
                 <p className="text-center text-gray-500">Selecciona un reporte y haz clic en "Generar Reporte".</p>
            )}

            {/* Contenido del reporte (renderizado condicional por selectedReport) */}

            {/* Tabla para Reporte de Ventas por Período */}
            {reportData && selectedReport === 'ventas_por_periodo' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4">Resultados: Ventas por Período ({startDate} a {endDate})</h3>
                     {reportData.length === 0 ? (
                         <p className="text-center text-gray-500 italic mt-4">No hay datos para este período.</p>
                     ) : (
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead>
                                 <tr className="bg-gray-200">
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Código Venta</th>
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Forma Pago</th>
                                     <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Venta</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {reportData.map((venta) => (
                                     <tr key={venta.codigo_venta} className="border-b">
                                         <td className="p-3 text-sm text-gray-800">{venta.codigo_venta}</td>
                                         <td className="p-3 text-sm text-gray-800">{new Date(venta.fecha).toLocaleDateString()}</td>
                                         <td className="p-3 text-sm text-gray-800">{venta.cliente_nombre || 'Público General'}</td>
                                         <td className="p-3 text-sm text-gray-800">{venta.forma_pago}</td>
                                         <td className="p-3 text-sm text-gray-800 text-right">{formatCurrency(venta.total)}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )}
                 </div>
            )}

             {/* Tabla para Reporte de Niveles de Stock Actual */}
             {reportData && selectedReport === 'stock_actual' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4">Resultado: Niveles de Stock Actual</h3>
                      {reportData.length === 0 ? (
                         <p className="text-center text-gray-500 italic mt-4">No hay productos en el inventario.</p>
                     ) : (
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead>
                                 <tr className="bg-gray-200">
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                                     {/* >>> CORRECCIÓN: Eliminar columna Categoría <<< */}
                                     {/* <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Categoría</th> */}
                                     <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase">Stock Actual</th>
                                 </tr>
                             </thead>
                             {/* >>> CORRECCIÓN: Eliminar espacios en blanco en el tbody y tr <<< */}
                             <tbody>{reportData.map((producto) => (
                                     <tr key={producto.nombre} className="border-b"> {/* Usar nombre como key si no hay ID */}
                                         <td className="p-3 text-sm text-gray-800">{producto.nombre}</td>
                                         {/* >>> CORRECCIÓN: Eliminar celda de Categoría <<< */}
                                         {/* <td className="p-3 text-sm text-gray-800">{producto.categoria || 'Sin categoría'}</td> */}
                                         <td className="p-3 text-sm text-gray-800 text-right">{producto.stock ?? 0}</td>
                                     </tr>
                                 ))}</tbody>
                             {/* >>> FIN CORRECCIÓN <<< */}
                         </table>
                     )}
                 </div>
             )}

              {/* Tabla para Reporte de Saldos de Clientes */}
             {reportData && selectedReport === 'saldos_clientes' && (
                 <div className="overflow-x-auto">
                     <h3 className="text-xl font-semibold mb-4">Resultados: Saldos de Clientes</h3>
                      {reportData.length === 0 ? (
                         <p className="text-center text-gray-500 italic mt-4">No hay clientes con saldo registrado.</p>
                     ) : (
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead>
                                 <tr className="bg-gray-200">
                                     <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                                     <th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase">Saldo Actual</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {reportData.map((cliente) => (
                                     <tr key={cliente.id} className="border-b">
                                         <td className="p-3 text-sm text-gray-800">{cliente.nombre}</td>
                                         <td className="p-3 text-sm text-gray-800 text-right">
                                             <span className={cliente.saldo > 0 ? 'text-red-600 font-semibold' : 'text-green-700 font-semibold'}>
                                                {formatCurrency(cliente.saldo)}
                                             </span>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )}
                 </div>
             )}


            {/* Agrega bloques de renderizado condicional para las tablas/gráficos de otros reportes */}

        </div>

        {/* Opciones de Exportación */}
        {reportData && reportData.length > 0 && (
            <div className="mt-6 flex justify-end gap-4">
                {/* Botón para Exportar a PDF */}
                <button
                    onClick={handleExportPDF} // Implementar función de exportación a PDF
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    disabled={loadingReport}
                >
                    Ver PDF
                </button>
                 {/* Botón para Exportar a CSV */}
                <button
                    onClick={handleExportCSV} // Implementar función de exportación a CSV
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                     disabled={loadingReport}
                >
                    Exportar CSV
                </button>
            </div>
        )}

      </div>
    </div>
  );
}

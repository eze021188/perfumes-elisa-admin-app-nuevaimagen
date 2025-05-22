// src/pages/SaldosClientes.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { differenceInDays } from 'date-fns';
import html2canvas from 'html2canvas'; // Importar html2canvas

// Importa los componentes de modales
import ModalAbono from '../components/ModalAbono';
import ModalSaldoFavor from '../components/ModalSaldoFavor';
import ModalEstadoCuenta from '../components/ModalEstadoCuenta'; 

// Helpers (asumiendo que ya existen y son correctos)
const formatCurrency = (amount, includeDecimals = true) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '$0.00';
    return numericAmount.toLocaleString('en-US', { 
        style: 'currency', 
        currency: 'USD', 
        minimumFractionDigits: includeDecimals ? 2 : 0,
        maximumFractionDigits: includeDecimals ? 2 : 0,
    });
};

const formatNumberWithCommas = (amount, includeSign = false, includeDecimals = true) => {
    const num = Math.abs(amount);
    const formatted = num.toLocaleString('es-MX', { 
        minimumFractionDigits: includeDecimals ? 2 : 0,
        maximumFractionDigits: includeDecimals ? 2 : 0,
    });
    if (includeSign) {
        return (amount < 0 ? '-' : (amount > 0 ? '+' : '')) + formatted;
    }
    return formatted;
};
const formatSaldoDisplay = (saldo, includeDecimals = true) => {
   const saldoAbs = Math.abs(saldo);
   const formattedAmount = formatNumberWithCommas(saldoAbs, false, includeDecimals);
   if (saldo > 0) return `-${formattedAmount}`; // Deuda del cliente
   if (saldo < 0) return `$${formattedAmount}`;  // Saldo a favor del cliente
   return '$0.00';
};

const formatTicketDateTime = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
        return new Date(dateString).toLocaleString();
    }
};

const getBase64Image = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error loading image for PDF/Ticket:", error);
        return null;
    }
};


// --- Componente para el Ticket de Estado de Cuenta en Imagen ---
const EstadoCuentaParaImagen = React.forwardRef(({ cliente, movimientos, logoSrc, dateTimeFormatter, currencyFormatter, saldoFormatter }, ref) => {
    if (!cliente || !movimientos) {
        return null;
    }

    const ticketStyles = {
        width: '320px', padding: '15px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        fontSize: '11px', backgroundColor: '#fff', color: '#212529', boxSizing: 'border-box',
    };
    const headerSectionStyles = { display: 'flex', alignItems: 'center', marginBottom: '10px',};
    const logoContainerStyles = { marginRight: '10px',};
    const logoStyles = { maxWidth: '40px', maxHeight: '40px', display: 'block',};
    const titleAndClientStyles = { flexGrow: 1,};
    const ticketTitleStyles = { fontSize: '14px', fontWeight: '600', margin: '0', color: '#000',};
    const clientNameStyles = { fontSize: '12px', color: '#495057', margin: '2px 0 0 0',};
    const companyContactStyles = { textAlign: 'center', fontSize: '9px', color: '#6c757d', margin: '5px 0 10px 0',};
    
    const movementSectionTitleStyles = { fontSize: '12px', fontWeight: '600', marginTop: '10px', marginBottom: '5px', color: '#000', borderBottom: '1px solid #eee', paddingBottom: '3px'};
    
    // MODIFICADO: Aumentado padding vertical en movementItemStyles
    const movementItemStyles = { 
        display: 'grid', 
        gridTemplateColumns: 'auto 1fr auto auto', // Fecha, Descripción Larga, Monto, Saldo
        gap: '3px 8px', 
        padding: '6px 0', // Aumentado de 3px a 6px
        borderBottom: '1px dashed #f0f0f0', 
        alignItems: 'flex-start', // Cambiado a flex-start para mejor alineación con texto multilínea
        fontSize: '10px'
    };
    const lastMovementItemStyles = {...movementItemStyles, borderBottom: 'none'};
    
    // MODIFICADO: Estilo para la descripción del movimiento para permitir envoltura
    const movementDescriptionStyles = {
        wordBreak: 'break-word', // Permite que palabras largas se rompan y envuelvan
        overflowWrap: 'break-word', // Similar a word-break, para mejor compatibilidad
        whiteSpace: 'normal', // Asegura que el texto pueda envolverse
        textAlign: 'left', // Alineación izquierda para la descripción
    };

    const saldoActualSectionStyles = { marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #dee2e6', textAlign: 'right'};
    const saldoActualLabelStyles = { fontSize: '12px', fontWeight: '600', color: '#000',};
    const saldoActualValueStyles = (saldo) => ({ fontSize: '12px', fontWeight: '600', color: saldo > 0 ? '#dc3545' : (saldo < 0 ? '#28a745' : '#212529'),});
    const footerStyles = { textAlign: 'center', marginTop: '15px', fontSize: '9px', color: '#6c757d',};
    const hrMinimalistStyle = { border: 'none', borderTop: '1px solid #dee2e6', margin: '10px 0',};

    const saldoFinal = movimientos.length > 0 ? movimientos[movimientos.length - 1].saldo_acumulado : (cliente.balance || 0);

    return (
        <div ref={ref} style={ticketStyles}>
            <div style={headerSectionStyles}>
                {logoSrc && <div style={logoContainerStyles}><img src={logoSrc} alt="Logo" style={logoStyles} /></div>}
                <div style={titleAndClientStyles}>
                    <h2 style={ticketTitleStyles}>Estado de Cuenta</h2>
                    <p style={clientNameStyles}>{cliente.client_name}</p>
                </div>
            </div>
            <p style={companyContactStyles}>PERFUMES ELISA | 81 3080 4010 - Ciudad Apodaca</p>
            <hr style={hrMinimalistStyle} />

            <h3 style={movementSectionTitleStyles}>Movimientos</h3>
            {movimientos.length > 0 ? movimientos.map((mov, index) => (
                <div key={mov.id || index} style={index === movimientos.length - 1 ? lastMovementItemStyles : movementItemStyles}>
                    <span style={{color: '#6c757d', whiteSpace: 'nowrap'}}>{new Date(mov.created_at).toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'2-digit'})}</span>
                    {/* MODIFICADO: Aplicar estilos para envoltura de texto */}
                    <span style={movementDescriptionStyles}> 
                        {mov.tipo_movimiento.replace(/_/g, ' ')}: {mov.referencia_venta_id ? `Venta ${mov.referencia_venta_id}` : (mov.descripcion || '-')}
                    </span>
                    <span style={{textAlign: 'right', color: mov.monto >= 0 ? '#28a745' : '#dc3545', whiteSpace: 'nowrap'}}>{currencyFormatter(mov.monto, false)}</span> {/* Monto positivo verde, negativo rojo */}
                    <span style={{textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap'}}>{saldoFormatter(mov.saldo_acumulado, false)}</span>
                </div>
            )) : <p style={{fontSize: '10px', color: '#6c757d', textAlign: 'center'}}>No hay movimientos.</p>}
            
            <div style={saldoActualSectionStyles}>
                <span style={saldoActualLabelStyles}>Saldo Actual: </span>
                <span style={saldoActualValueStyles(saldoFinal)}>{saldoFormatter(saldoFinal)}</span>
            </div>

            <div style={footerStyles}>
                <p style={{margin: '2px 0'}}>¡Gracias por tu confianza!</p>
            </div>
        </div>
    );
});

// --- Componente ImageActionModal (reutilizado) ---
const ImageActionModal = ({ isOpen, onClose, imageDataUrl, imageFile, titlePrefix = "Ticket", ventaCodigo, currencyFormatter, clienteNombre, ventaTotal }) => {
    if (!isOpen || !imageDataUrl) return null;
    const handleShare = async () => {
        if (!imageFile) { toast.error("Archivo no disponible."); return; }
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            try {
                await navigator.share({
                    title: `${titlePrefix} ${ventaCodigo || ''}`,
                    text: `Imagen ${titlePrefix} ${ventaCodigo || ''}. ${clienteNombre ? `Cliente: ${clienteNombre}.` : ''} ${ventaTotal !== undefined ? `Total: ${currencyFormatter(ventaTotal ?? 0)}.` : ''}`,
                    files: [imageFile],
                });
                toast.success(`${titlePrefix} compartido.`);
                onClose(); 
            } catch (error) {
                if (error.name !== 'AbortError') { toast.error(`Error: ${error.message}`);} 
                else {toast('Compartir cancelado.');}
            }
        } else { toast.info('Compartir archivos no disponible. Intenta descargar.');}
    };
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = `${titlePrefix.replace(/\s/g, '_')}_${ventaCodigo || 'documento'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Imagen descargada.');
    };
    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-auto max-w-xs sm:max-w-sm md:max-w-md relative flex flex-col items-center p-3 sm:p-4" onClick={e => e.stopPropagation()}>
                <div className="w-full mb-4 flex justify-center">
                    <img src={imageDataUrl} alt={titlePrefix} className="max-w-full h-auto max-h-[70vh] object-contain shadow-md" />
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full">
                    <button onClick={handleShare} className="px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700">Compartir Imagen</button>
                    <button onClick={handleDownload} className="px-3 py-2 sm:px-4 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700">Descargar Imagen</button>
                    <button onClick={onClose} className="px-3 py-2 sm:px-4 bg-gray-500 text-white rounded-md shadow-sm hover:bg-gray-600">Cerrar</button>
                </div>
            </div>
        </div>
    );
};


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
  const [movimientosClienteSeleccionado, setMovimientosClienteSeleccionado] = useState([]); 

  const [logoBase64, setLogoBase64] = useState(null); 

  const [isEstadoCuentaImageActionModalOpen, setIsEstadoCuentaImageActionModalOpen] = useState(false);
  const [generatedEstadoCuentaImageDataUrl, setGeneratedEstadoCuentaImageDataUrl] = useState(null);
  const [generatedEstadoCuentaImageFile, setGeneratedEstadoCuentaImageFile] = useState(null); 
  const [isProcessingEstadoCuentaImage, setIsProcessingEstadoCuentaImage] = useState(false); 
  const estadoCuentaImageRef = useRef(null);


  useEffect(() => {
    fetchClientsData();
    async function loadLogo() {
        const base64 = await getBase64Image('/images/PERFUMESELISAwhite.jpg'); 
        setLogoBase64(base64);
    }
    loadLogo();
  }, []);

  const fetchClientsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_clients_balance_and_dates');
      if (rpcError) throw rpcError;
      const today = new Date();
      const clientsWithCalculatedDays = data.map(client => {
          const daysSinceLastPayment = client.latest_payment_date ? differenceInDays(today, new Date(client.latest_payment_date)) : null;
          const daysSinceFirstPurchase = client.first_purchase_date ? differenceInDays(today, new Date(client.first_purchase_date)) : null;
          return { ...client, daysSinceLastPayment, daysSinceFirstPurchase,};
      }).sort((a, b) => a.client_name.localeCompare(b.client_name));
      setAllClientsData(clientsWithCalculatedDays);
    } catch (err) {
      console.error('Error cargando datos de clientes:', err.message);
      setError('Error al cargar los datos de clientes.');
      toast.error('Error al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  const totalPorCobrar = useMemo(() => allClientsData.filter(c => c.balance > 0).reduce((sum, c) => sum + c.balance, 0), [allClientsData]);
  const totalSaldoFavor = useMemo(() => allClientsData.filter(c => c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0), [allClientsData]);

  const filteredAndSearchedClients = useMemo(() => {
    let result = allClientsData;
    const lowerSearchText = searchText.toLowerCase();
    if (searchText) { result = result.filter(c => c.client_name.toLowerCase().includes(lowerSearchText));}
    if (activeFilter === 'owing') { result = result.filter(c => c.balance > 0);} 
    else if (activeFilter === 'credit') { result = result.filter(c => c.balance < 0);}
    return result;
  }, [allClientsData, activeFilter, searchText]);

  const openAbonoModal = (cliente) => { setClienteSeleccionado(cliente); setShowAbonoModal(true);};
  const openSaldoFavorModal = (cliente) => { setClienteSeleccionado(cliente); setShowSaldoFavorModal(true);};
  
  const openEstadoCuentaModal = async (cliente) => {
    setClienteSeleccionado(cliente);
    if (cliente && cliente.client_id) {
        try {
            setLoading(true); 
            const { data, error } = await supabase
                .from('movimientos_cuenta_clientes')
                .select('*')
                .eq('cliente_id', cliente.client_id)
                .order('created_at', { ascending: true });
            if (error) throw error;
            let saldoAcumulado = 0;
            const movimientosConSaldo = data.map(mov => {
                saldoAcumulado += mov.monto;
                return { ...mov, saldo_acumulado: saldoAcumulado };
            });
            setMovimientosClienteSeleccionado(movimientosConSaldo);
            setShowEstadoCuentaModal(true);
        } catch (err) {
            toast.error("Error al cargar movimientos para el estado de cuenta.");
            console.error("Error cargando movimientos en openEstadoCuentaModal:", err);
        } finally {
            setLoading(false);
        }
    } else {
        setMovimientosClienteSeleccionado([]); // Limpiar por si acaso
        setShowEstadoCuentaModal(true); 
    }
  };

  const handleRecordAbono = async (cliente, montoAbono, descripcion = 'Pago cliente') => { 
      if (!cliente || !cliente.client_id) { toast.error("Cliente no especificado."); return { success: false }; }
      if (montoAbono <= 0) { toast.error("Monto debe ser positivo."); return { success: false }; }
      try {
          const { error: insertError } = await supabase.from('movimientos_cuenta_clientes').insert([{ cliente_id: cliente.client_id, tipo_movimiento: 'ABONO_PAGO', monto: -montoAbono, descripcion: descripcion }]);
          if (insertError) { toast.error(`Error: ${insertError.message}`); return { success: false }; }
          toast.success('Abono registrado.'); fetchClientsData(); return { success: true };
      } catch (err) { toast.error('Error inesperado.'); return { success: false }; }
  };
  const handleAddCredit = async (cliente, montoCredito, descripcion = 'Crédito a favor') => { 
      if (!cliente || !cliente.client_id) { toast.error("Cliente no especificado."); return { success: false }; }
      if (montoCredito <= 0) { toast.error("Monto debe ser positivo."); return { success: false }; }
      try {
          const { error: insertError } = await supabase.from('movimientos_cuenta_clientes').insert([{ cliente_id: cliente.client_id, tipo_movimiento: 'CREDITO_FAVOR', monto: -montoCredito, descripcion: descripcion }]);
          if (insertError) { toast.error(`Error: ${insertError.message}`); return { success: false };}
          toast.success('Saldo a favor añadido.'); fetchClientsData(); return { success: true };
      } catch (err) { toast.error('Error inesperado.'); return { success: false }; }
  };
  
  const generarPDFEstadoCuenta = async (cliente, movimientosDetallados) => { 
    if (!cliente || !cliente.client_id || !movimientosDetallados) { toast('Datos insuficientes para PDF.', { icon: 'ℹ️' }); return; }
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
        const pageHeight = doc.internal.pageSize.height; const pageWidth = doc.internal.pageSize.width;
        const margin = 15; let yPos = margin; const lineHeight = 5;
        const smallTextSize = 8; const normalTextSize = 10; const mainTitleSize = 18; const subTitleSize = 11;
        
        let logoResultHeight = 0;
        if (logoBase64) {
            try {
                const img = new Image(); img.crossOrigin = "Anonymous"; img.src = logoBase64;
                await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; }); // Esperar carga
                if (img.complete && img.naturalHeight !== 0) {
                    const desiredLogoWidthMm = 30; const aspectRatio = img.width / img.height;
                    const calculatedLogoHeightMm = desiredLogoWidthMm / aspectRatio;
                    doc.addImage(img, logoBase64.includes('png') ? 'PNG' : 'JPEG', margin, margin, desiredLogoWidthMm, calculatedLogoHeightMm);
                    logoResultHeight = calculatedLogoHeightMm;
                }
            } catch (e) { console.warn("Error al procesar logo para PDF:", e); }
        }
        
        let textStartX = logoBase64 && logoResultHeight > 0 ? margin + 30 + 8 : margin;
        let textStartY = margin + 3;
        let yPosAfterHeaderBlock = Math.max(margin + logoResultHeight, textStartY + (mainTitleSize*0.5) + (smallTextSize*0.8*2) ) + 7;

        if (!(logoBase64 && logoResultHeight > 0)) { // Si no hay logo o falló
            textStartX = pageWidth / 2; textStartY = margin;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(mainTitleSize); doc.text("PERFUMES ELISA", textStartX, textStartY, { align: 'center' }); textStartY += mainTitleSize * 0.5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(smallTextSize); doc.text("Ciudad Apodaca, N.L.", textStartX, textStartY, { align: 'center' }); textStartY += lineHeight * 0.8;
            doc.text("Teléfono: 81 3080 4010", textStartX, textStartY, { align: 'center' }); yPosAfterHeaderBlock = textStartY + 7;
        } else {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(mainTitleSize); doc.text("PERFUMES ELISA", textStartX, textStartY); textStartY += mainTitleSize * 0.5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(smallTextSize); doc.text("Ciudad Apodaca, N.L.", textStartX, textStartY); textStartY += lineHeight * 0.8;
            doc.text("Teléfono: 81 3080 4010", textStartX, textStartY);
        }

        const reportTitleX = pageWidth - margin;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(subTitleSize); doc.text("ESTADO DE CUENTA", reportTitleX, margin + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(smallTextSize); doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, reportTitleX, margin + 5 + subTitleSize * 0.5, { align: 'right' });
        
        yPos = yPosAfterHeaderBlock;
        doc.setDrawColor(150, 150, 150); doc.line(margin, yPos, pageWidth - margin, yPos); yPos += lineHeight * 1.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(normalTextSize); doc.text("CLIENTE:", margin, yPos);
        doc.setFont('helvetica', 'normal'); doc.text(cliente.client_name || "N/A", margin + 25, yPos); yPos += lineHeight * 2; 

        const head = [['Fecha', 'Tipo', 'Referencia / Descripción', 'Monto', 'Saldo Acumulado']];
        const body = movimientosDetallados.map(mov => [
            new Date(mov.created_at).toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'}),
            mov.tipo_movimiento ? mov.tipo_movimiento.replace(/_/g, ' ') : '-',
            mov.referencia_venta_id ? `Venta: ${mov.referencia_venta_id}` : (mov.descripcion || '-'),
            `$${formatNumberWithCommas(mov.monto, true)}`,
            formatSaldoDisplay(mov.saldo_acumulado)
        ]);

        if (movimientosDetallados.length > 0) {
            doc.autoTable({ head: head, body: body, startY: yPos, theme: 'striped', styles: { fontSize: 8, cellPadding: 1.5, lineColor: [200,200,200], lineWidth: 0.1 }, headStyles: { fillColor: [230,230,230], textColor: [40,40,40], fontStyle: 'bold', halign: 'center', fontSize: 8.5, cellPadding: 2 }, columnStyles: { 0: { halign: 'left', cellWidth: 22 }, 1: { halign: 'left', cellWidth: 30 }, 2: { halign: 'left', cellWidth: 'auto' }, 3: { halign: 'right', cellWidth: 25 }, 4: { halign: 'right', cellWidth: 28 }}, margin: { left: margin, right: margin }, didDrawPage: (data) => { const pageCount = doc.internal.getNumberOfPages(); doc.setFontSize(smallTextSize -1); doc.setTextColor(120,120,120); doc.text('Página ' + doc.internal.getCurrentPageInfo().pageNumber + ' de ' + pageCount, pageWidth - margin, pageHeight - 7, { align: 'right' }); }});
            yPos = doc.lastAutoTable.finalY + 10;
        } else { doc.setFontSize(normalTextSize); doc.setTextColor(100); doc.text("No hay movimientos registrados.", pageWidth / 2, yPos + 10, { align: 'center' }); yPos += 20; }

        const saldoFinalCalculado = movimientosDetallados.length > 0 ? movimientosDetallados[movimientosDetallados.length - 1].saldo_acumulado : (cliente.balance || 0);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        const saldoText = "SALDO ACTUAL:"; const saldoValueText = formatSaldoDisplay(saldoFinalCalculado);
        doc.text(saldoText, pageWidth - margin - doc.getTextWidth(saldoValueText) - doc.getTextWidth(saldoText) - 3 , yPos);
        doc.text(saldoValueText, pageWidth - margin, yPos, { align: 'right' }); yPos += lineHeight;
        doc.setFont('helvetica', 'italic'); doc.setFontSize(smallTextSize); doc.setTextColor(100); doc.text("(Monto positivo: cargo al cliente. Monto negativo: abono/crédito)", margin, yPos); yPos += lineHeight * 2.5;
        
        const thankYouMessage = "¡Gracias por tu confianza! Visítanos de nuevo pronto.";
        const finalMessageY = pageHeight - 12; 
        if (yPos > finalMessageY - 10 && doc.internal.getNumberOfPages() <= 1) { doc.addPage(); yPos = margin; } // Asegurar que yPos se reinicie si hay nueva página
        doc.setFont('helvetica', 'normal'); doc.setFontSize(normalTextSize); doc.setTextColor(80,80,80);
        doc.text(thankYouMessage, pageWidth / 2, yPos > finalMessageY ? margin : finalMessageY , { align: 'center' }); // Ajustar Y si hay nueva página

        doc.output('dataurlnewwindow');
    } catch (pdfError) { console.error("Error catastrófico PDF:", pdfError); toast.error("Error crítico al generar PDF."); }
  };


  const handleViewEstadoCuentaAsImage = async () => {
    if (!clienteSeleccionado || !movimientosClienteSeleccionado || !estadoCuentaImageRef.current) {
        toast.error("Datos no disponibles para imagen."); return;
    }
    if (isProcessingEstadoCuentaImage) return;
    setIsProcessingEstadoCuentaImage(true);
    toast.loading('Generando imagen...', { id: 'processingECImage' });
    try {
        const canvas = await html2canvas(estadoCuentaImageRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff'});
        const dataUrl = canvas.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const imageFile = new File([blob], `EstadoCuenta_${clienteSeleccionado.client_name.replace(/\s/g, '_')}.png`, { type: 'image/png' });
        setGeneratedEstadoCuentaImageDataUrl(dataUrl);
        setGeneratedEstadoCuentaImageFile(imageFile);
        setIsEstadoCuentaImageActionModalOpen(true); 
        toast.dismiss('processingECImage');
    } catch (error) {
        toast.error(`Error al generar imagen: ${error.message}`, { id: 'processingECImage' });
    } finally {
        setIsProcessingEstadoCuentaImage(false);
    }
  };

  return (
    <>
      {clienteSeleccionado && movimientosClienteSeleccionado && ( // Asegurar que movimientos exista
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
              <EstadoCuentaParaImagen 
                  ref={estadoCuentaImageRef}
                  cliente={clienteSeleccionado}
                  movimientos={movimientosClienteSeleccionado}
                  logoSrc={logoBase64}
                  dateTimeFormatter={formatTicketDateTime} 
                  currencyFormatter={formatCurrency}
                  saldoFormatter={formatSaldoDisplay}
              />
          </div>
      )}

      <ImageActionModal
          isOpen={isEstadoCuentaImageActionModalOpen}
          onClose={() => setIsEstadoCuentaImageActionModalOpen(false)}
          imageDataUrl={generatedEstadoCuentaImageDataUrl}
          imageFile={generatedEstadoCuentaImageFile} 
          titlePrefix="Estado de Cuenta"
          ventaCodigo={clienteSeleccionado?.client_name.replace(/\s/g, '_')}
          currencyFormatter={formatCurrency}
          clienteNombre={clienteSeleccionado?.client_name}
      />

      <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800">Volver al inicio</button>
            <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">Estados de cuenta</h1>
            <div className="w-full md:w-[150px]" />
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="text-center md:text-left">
                    <p className="text-lg font-medium text-gray-600">Total Por Cobrar</p>
                    <p className="text-2xl font-bold text-red-600">{totalPorCobrar === 0 ? '$0.00' : `-${formatNumberWithCommas(totalPorCobrar)}`}</p>
                </div>
                <div className="text-center md:text-left">
                    <p className="text-lg font-medium text-gray-600">Total Saldo a Favor</p>
                    <p className="text-2xl font-bold text-green-600">${formatNumberWithCommas(totalSaldoFavor)}</p>
                </div>
                <div className="flex flex-col gap-3 justify-center md:justify-end">
                    <div className="flex space-x-3 justify-center md:justify-end">
                        <button onClick={() => setActiveFilter('owing')} className={`px-4 py-2 border rounded-md text-sm font-semibold ${activeFilter === 'owing' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}>Clientes por Cobrar ({allClientsData.filter(c => c.balance > 0).length})</button>
                        <button onClick={() => setActiveFilter('credit')} className={`px-4 py-2 border rounded-md text-sm font-semibold ${activeFilter === 'credit' ? 'bg-green-600 text-white' : 'bg-white text-green-600 hover:bg-green-50'}`}>Clientes Saldo a Favor ({allClientsData.filter(c => c.balance < 0).length})</button>
                    </div>
                    <div className="flex space-x-3 justify-center md:justify-end">
                        <button onClick={() => setActiveFilter('all')} className={`px-4 py-2 border rounded-md text-sm font-semibold ${activeFilter === 'all' ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>Mostrar todos ({allClientsData.length})</button>
                        <input type="text" placeholder="Buscar cliente..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="p-2 border rounded-md text-sm"/>
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading && !allClientsData.length ? <p className="p-4 text-center">Cargando...</p> : error ? <p className="p-4 text-center text-red-500">{error}</p> : filteredAndSearchedClients.length === 0 ? (
                <p className="p-4 text-center text-gray-500">{searchText ? `No clientes para "${searchText}"` : (activeFilter === 'owing' ? "No clientes con saldo pendiente." : activeFilter === 'credit' ? "No clientes con saldo a favor." : "No hay clientes.")}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Cliente</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Días sin pagar</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Días desde compra</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Saldo</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Acciones</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSearchedClients.map(cliente => (
                                <tr key={cliente.client_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEstadoCuentaModal(cliente)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cliente.client_name}</td>
                                    {cliente.balance <= 0 ? (<td className="px-3 py-4 text-sm text-center text-gray-600" colSpan="2">Sin adeudo</td>) : (<>
                                        <td className="px-3 py-4 text-sm text-center text-gray-800">{cliente.daysSinceLastPayment !== null ? `${cliente.daysSinceLastPayment} días` : '-'}</td>
                                        <td className="px-3 py-4 text-sm text-center text-gray-800">{cliente.daysSinceFirstPurchase !== null ? `${cliente.daysSinceFirstPurchase} días` : '-'}</td>
                                    </>)}
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${cliente.balance > 0 ? 'text-red-600' : cliente.balance < 0 ? 'text-green-600' : 'text-gray-700'}`}>{formatSaldoDisplay(cliente.balance)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        <button onClick={(e) => { e.stopPropagation(); openAbonoModal(cliente); }} className="text-blue-600 hover:text-blue-900 mr-3">Abonar</button>
                                        <button onClick={(e) => { e.stopPropagation(); openSaldoFavorModal(cliente); }} className="text-green-600 hover:text-green-900">Saldo Favor</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        <ModalAbono isOpen={showAbonoModal} onClose={() => {setShowAbonoModal(false); setClienteSeleccionado(null);}} cliente={clienteSeleccionado} onRecordAbono={handleRecordAbono}/>
        <ModalSaldoFavor isOpen={showSaldoFavorModal} onClose={() => {setShowSaldoFavorModal(false); setClienteSeleccionado(null);}} cliente={clienteSeleccionado} onAddCredit={handleAddCredit}/>
        <ModalEstadoCuenta
             isOpen={showEstadoCuentaModal}
             onClose={() => {setShowEstadoCuentaModal(false); setClienteSeleccionado(null); setMovimientosClienteSeleccionado([]); setIsEstadoCuentaImageActionModalOpen(false);}}
             cliente={clienteSeleccionado}
             movimientos={movimientosClienteSeleccionado} 
             onGeneratePDF={generarPDFEstadoCuenta}
             onViewAsImage={handleViewEstadoCuentaAsImage} 
        />
      </div>
    </>
  );
}

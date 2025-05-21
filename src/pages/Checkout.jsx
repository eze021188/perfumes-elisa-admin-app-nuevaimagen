// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
// import jsPDF from 'jspdf'; // No se usa directamente para el ticket HTML aquí
// import 'jspdf-autotable'; // No se usa directamente para el ticket HTML aquí
import toast from 'react-hot-toast';
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import ModalCheckout from '../components/ModalCheckout';
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';

// --- NUEVO: Importar los componentes divididos ---
import CheckoutCartDisplay from '../components/checkout/CheckoutCartDisplay';
import CheckoutPaymentForm from '../components/checkout/CheckoutPaymentForm';

// Helper simple para formatear moneda
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('es-MX', { // Cambiado a es-MX y MXN
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fecha y hora para el código de venta
const formatDateTimeForCode = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// --- NUEVO/MODIFICADO: Helper para formatear fecha para el ticket en zona horaria específica ---
const formatTicketDateTime = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        return new Date(dateString).toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City', // O 'America/Monterrey'
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit', // Opcional
            // hour12: true // Opcional
        });
    } catch (e) {
        console.error("Error formateando fecha para ticket:", e);
        return new Date(dateString).toLocaleString(); // Fallback a local del navegador
    }
};


export default function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [productosVenta, setProductosVenta] = useState([]);

    const [filtro, setFiltro] = useState('All');
    const [busqueda, setBusqueda] = useState('');
    const [showOutOfStock, setShowOutOfStock] = useState(false);

    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [vendedorInfo, setVendedorInfo] = useState(null);

    const [infoClienteConSaldo, setInfoClienteConSaldo] = useState(null);
    const [loadingSaldoCliente, setLoadingSaldoCliente] = useState(false);
    const [usarSaldoFavor, setUsarSaldoFavor] = useState(false);
    const [montoAplicadoDelSaldoFavor, setMontoAplicadoDelSaldoFavor] = useState(0);

    const [enganche, setEnganche] = useState(0);
    const [gastosEnvio, setGastosEnvio] = useState(0);

    const [showQuickSale, setShowQuickSale] = useState(false);
    const [showNewClient, setShowNewClient] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [paymentType, setPaymentType] = useState('');
    const [discountType, setDiscountType] = useState('Sin descuento');
    const [discountValue, setDiscountValue] = useState(0);

    const [budgetSourceId, setBudgetSourceId] = useState(null);
    const [showHtmlTicket, setShowHtmlTicket] = useState(false);
    const [htmlTicketData, setHtmlTicketData] = useState(null);

    useEffect(() => {
        async function loadData() {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) console.error("Error getting auth user:", authError);
            if (user) {
                setCurrentUser(user);
                const { data: vendedorData, error: vendedorError } = await supabase.from('usuarios').select('nombre').eq('id', user.id).single();
                if (vendedorError) {
                    console.error("Error loading vendedor info:", vendedorError);
                    setVendedorInfo({ nombre: user.email });
                } else {
                    setVendedorInfo(vendedorData);
                }
            } else {
                setCurrentUser(null); setVendedorInfo(null);
            }
            const { data: cli, error: cliErr } = await supabase.from('clientes').select('id, nombre, telefono');
            if (cliErr) toast.error("Error al cargar clientes."); else setClientes(cli || []);
            
            const { data: prod, error: prodErr } = await supabase.from('productos').select('*');
            if (prodErr) toast.error("Error al cargar productos.");
            else {
                const prodMapped = (prod || []).map(p => {
                    let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
                    if (imagenUrl && !imagenUrl.startsWith('http') && supabase.storage) {
                        const { data: urlData } = supabase.storage.from('productos').getPublicUrl(p.imagen);
                        imagenUrl = urlData.publicUrl;
                    } else if (imagenUrl && !imagenUrl.startsWith('http')) imagenUrl = '';
                    return { ...p, imagenUrl, stock: parseFloat(p.stock) || 0 };
                });
                setProductos(prodMapped);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        if (clienteSeleccionado && clienteSeleccionado.id) {
            const fetchClienteConSaldo = async () => {
                setLoadingSaldoCliente(true);
                setInfoClienteConSaldo(null); setUsarSaldoFavor(false); setMontoAplicadoDelSaldoFavor(0);
                try {
                    const { data, error } = await supabase.rpc('get_cliente_con_saldo', { p_cliente_id: clienteSeleccionado.id });
                    if (error) throw error;
                    if (data && data.length > 0) setInfoClienteConSaldo(data[0]);
                    else setInfoClienteConSaldo({ client_id: clienteSeleccionado.id, client_name: clienteSeleccionado.nombre, telefono: clienteSeleccionado.telefono, balance: 0 });
                } catch (err) {
                    toast.error('Error al obtener saldo del cliente.');
                    setInfoClienteConSaldo({ client_id: clienteSeleccionado.id, client_name: clienteSeleccionado.nombre, telefono: clienteSeleccionado.telefono, balance: 0, errorAlObtenerSaldo: true });
                } finally { setLoadingSaldoCliente(false); }
            };
            fetchClienteConSaldo();
        } else {
            setInfoClienteConSaldo(null); setUsarSaldoFavor(false); setMontoAplicadoDelSaldoFavor(0);
        }
    }, [clienteSeleccionado]);

    useEffect(() => {
        if (location.state && location.state.budgetData) {
            const budget = location.state.budgetData;
            if (budget.clientes) setClienteSeleccionado(budget.clientes);
            else { toast.warn("Presupuesto sin cliente."); return; }

            if (budget.presupuesto_items && budget.presupuesto_items.length > 0) {
                const itemsFromBudget = budget.presupuesto_items.map(item => {
                    const fullProductInfo = productos.find(p => p.id === item.producto_id);
                    return {
                        id: item.producto_id,
                        nombre: item.productos?.nombre || item.descripcion || 'Producto Desconocido',
                        cantidad: parseFloat(item.cantidad) || 0,
                        promocion: parseFloat(item.precio_unitario) || 0,
                        total: parseFloat(item.subtotal_item) || 0,
                        stock: fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0,
                        imagenUrl: fullProductInfo?.imagenUrl || ''
                    };
                });
                const validItems = itemsFromBudget.filter(item => item.cantidad > 0);
                if (validItems.length !== itemsFromBudget.length) toast.warn("Productos del presupuesto con cantidad cero omitidos.");
                setProductosVenta(validItems);
            } else {
                setProductosVenta([]); toast.warn("El presupuesto no contiene productos.");
            }
            setDiscountType(budget.tipo_descuento || 'Sin descuento');
            setDiscountValue(parseFloat(budget.valor_descuento) || 0);
            setGastosEnvio(parseFloat(budget.gastos_envio) || 0);
            setPaymentType(budget.forma_pago || '');
            setBudgetSourceId(budget.id);
            setTimeout(() => {
                if (budget.clientes && budget.presupuesto_items?.length > 0) openSaleModal();
                else toast.error("No se pudo abrir modal de venta desde presupuesto.");
            }, 100);
        } else { setBudgetSourceId(null); }
    }, [location.state, productos]); // productos es dependencia clave aquí

    const productosFiltrados = useMemo(() => {
        return productos.filter(p =>
            (filtro === 'All' || p.categoria === filtro) &&
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
            (showOutOfStock ? true : (parseFloat(p.stock) || 0) > 0)
        );
    }, [productos, filtro, busqueda, showOutOfStock]);

    const saldoAFavorDisponible = useMemo(() => (infoClienteConSaldo && infoClienteConSaldo.balance < 0) ? Math.abs(infoClienteConSaldo.balance) : 0, [infoClienteConSaldo]);

    const { totalItems, originalSubtotal, subtotalConDescuento, discountAmount, totalAntesDeCredito } = useMemo(() => {
        try {
            const calculatedOriginalSubtotal = productosVenta.reduce((sum, p) => sum + (p.cantidad * p.promocion), 0);
            const calculatedTotalItems = productosVenta.reduce((sum, p) => sum + p.cantidad, 0);
            let calculatedSubtotalConDescuento = calculatedOriginalSubtotal;
            let calculatedDiscountAmount = 0;
            if (discountType === 'Por importe') {
                calculatedDiscountAmount = Math.min(discountValue, calculatedOriginalSubtotal);
                calculatedSubtotalConDescuento = Math.max(0, calculatedOriginalSubtotal - calculatedDiscountAmount);
            } else if (discountType === 'Por porcentaje') {
                const percentage = Math.min(Math.max(0, discountValue), 100);
                calculatedDiscountAmount = calculatedOriginalSubtotal * (percentage / 100);
                calculatedSubtotalConDescuento = calculatedOriginalSubtotal - calculatedDiscountAmount;
            }
            const calculatedTotalAntesDeCredito = calculatedSubtotalConDescuento + gastosEnvio;
            return { totalItems: calculatedTotalItems, originalSubtotal: calculatedOriginalSubtotal, subtotalConDescuento: calculatedSubtotalConDescuento, discountAmount: calculatedDiscountAmount, totalAntesDeCredito: calculatedTotalAntesDeCredito };
        } catch (e) {
            console.error("Error en useMemo para totales:", e);
            return { totalItems: 0, originalSubtotal: 0, subtotalConDescuento: 0, discountAmount: 0, totalAntesDeCredito: 0 };
        }
    }, [productosVenta, discountType, discountValue, gastosEnvio]);

    useEffect(() => {
        if (usarSaldoFavor && saldoAFavorDisponible > 0) {
            setMontoAplicadoDelSaldoFavor(Math.min(totalAntesDeCredito, saldoAFavorDisponible));
        } else {
            setMontoAplicadoDelSaldoFavor(0);
        }
    }, [usarSaldoFavor, saldoAFavorDisponible, totalAntesDeCredito]);

    const totalFinalAPagar = useMemo(() => totalAntesDeCredito - montoAplicadoDelSaldoFavor, [totalAntesDeCredito, montoAplicadoDelSaldoFavor]);

    const onAddToCart = producto => {
        if ((parseFloat(producto.stock) || 0) <= 0) { toast.error('Producto sin stock.'); return; }
        setProductosVenta(prev => {
            const existe = prev.find(p => p.id === producto.id);
            if (existe) {
                const stockTotalProducto = productos.find(p => p.id === producto.id)?.stock || 0;
                if (existe.cantidad + 1 > stockTotalProducto) { toast.error('Stock insuficiente.'); return prev; }
                return prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion } : p);
            }
            return [...prev, { ...producto, cantidad: 1, total: producto.promocion, stock: producto.stock }];
        });
    };

    const onRemoveFromCart = (productoId) => setProductosVenta(prev => prev.filter(p => p.id !== productoId));

    const onUpdateQuantity = (productoId, newQuantityStr) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        setProductosVenta(prev => prev.map(p => {
            if (p.id === productoId) {
                const stockTotalProducto = productos.find(prod => prod.id === p.id)?.stock || 0;
                if (isNaN(newQuantity) || newQuantity < 1) return { ...p, cantidad: 1, total: p.promocion }; // O eliminar si es 0
                if (newQuantity > stockTotalProducto) {
                    toast.error(`Stock máximo: ${stockTotalProducto}`);
                    return { ...p, cantidad: stockTotalProducto, total: stockTotalProducto * p.promocion };
                }
                return { ...p, cantidad: newQuantity, total: newQuantity * p.promocion };
            }
            return p;
        }).filter(p => p.cantidad > 0)); // Eliminar si la cantidad llega a 0
    };

    const openSaleModal = () => {
        if (!currentUser) { toast.error("Inicia sesión para vender."); return; }
        if (!infoClienteConSaldo?.client_id) { toast.error('Selecciona un cliente.'); return; }
        if (productosVenta.length === 0) { toast.error('Agrega productos.'); return; }
        setShowSaleModal(true);
    };

    const handleFinalize = async () => {
        setProcessing(true);
        // Validaciones
        if (!currentUser?.id || !infoClienteConSaldo?.client_id || productosVenta.length === 0 || (totalFinalAPagar > 0 && !paymentType)) {
            toast.error('Faltan datos para finalizar la venta.'); setProcessing(false); return;
        }
        // ... (otras validaciones de enganche, gastosEnvio que ya tenías)

        try {
            const now = new Date(); // Usar esta 'now' para consistencia
            const codigo = `VT${formatDateTimeForCode(now)}`;
            let ventaId;

            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                const { error: errorMovSaldo } = await supabase.from('movimientos_cuenta_clientes').insert([{
                    cliente_id: infoClienteConSaldo.client_id,
                    tipo_movimiento: 'USO_SALDO_VENTA',
                    monto: montoAplicadoDelSaldoFavor, // Positivo
                    descripcion: `Aplicación saldo en Venta ${codigo}`,
                    // referencia_venta_id se actualizará después
                }]);
                if (errorMovSaldo) throw errorMovSaldo;
            }

            const ventaData = {
                codigo_venta: codigo,
                cliente_id: infoClienteConSaldo.client_id,
                vendedor_id: currentUser.id,
                fecha: now.toISOString(), // --- NUEVO/MODIFICADO: Enviar fecha UTC ---
                subtotal: originalSubtotal,
                forma_pago: totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0 ? 'SALDO_A_FAVOR' : paymentType,
                tipo_descuento: discountType,
                valor_descuento: discountAmount,
                total: totalFinalAPagar,
                monto_credito_aplicado: montoAplicadoDelSaldoFavor,
                enganche: parseFloat(enganche) || 0,
                gastos_envio: parseFloat(gastosEnvio) || 0,
                presupuesto_id: budgetSourceId,
            };

            const { data: ventaInsertada, error: errorVenta } = await supabase.from('ventas').insert([ventaData]).select('id').single();
            if (errorVenta) {
                if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) console.warn("Venta falló. Revisar movimiento de saldo.");
                throw errorVenta;
            }
            ventaId = ventaInsertada.id;

            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                 await supabase.from('movimientos_cuenta_clientes').update({ referencia_venta_id: ventaId })
                    .match({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'USO_SALDO_VENTA', monto: montoAplicadoDelSaldoFavor, descripcion: `Aplicación saldo en Venta ${codigo}` });
            }

            if (paymentType === 'Crédito cliente') {
                const montoACredito = totalFinalAPagar - (parseFloat(enganche) || 0);
                const movimientosCuenta = [];
                if (montoACredito > 0) movimientosCuenta.push({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'CARGO_VENTA', monto: montoACredito, referencia_venta_id: ventaId, descripcion: `Venta ${codigo}` });
                if ((parseFloat(enganche) || 0) > 0) movimientosCuenta.push({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'ABONO_ENGANCHE', monto: -(parseFloat(enganche) || 0), referencia_venta_id: ventaId, descripcion: `Enganche Venta ${codigo}` });
                if (movimientosCuenta.length > 0) {
                    const { error: errMovs } = await supabase.from('movimientos_cuenta_clientes').insert(movimientosCuenta);
                    if (errMovs) { await supabase.from('ventas').delete().eq('id', ventaId); throw errMovs; }
                }
            }

            for (const p of productosVenta) {
                const { data: prodCheck } = await supabase.from('productos').select('stock').eq('id', p.id).single();
                const currentStock = prodCheck?.stock || 0;
                const cantidadVendida = p.cantidad;
                if (currentStock < cantidadVendida) { await supabase.from('ventas').delete().eq('id', ventaId); throw new Error(`Stock insuficiente para ${p.nombre}.`); }
                
                await supabase.from('detalle_venta').insert([{ venta_id: ventaId, producto_id: p.id, cantidad: cantidadVendida, precio_unitario: p.promocion, total_parcial: p.total }]);
                await supabase.from('productos').update({ stock: currentStock - cantidadVendida }).eq('id', p.id);
                await supabase.from('movimientos_inventario').insert([{ producto_id: p.id, tipo: 'SALIDA', cantidad: cantidadVendida, referencia: codigo, motivo: 'venta', fecha: now.toISOString() }]);
            }

            if (budgetSourceId) {
                await supabase.from('presupuestos').update({ estado: 'Convertido a Venta' }).eq('id', budgetSourceId);
            }
            
            // --- NUEVO/MODIFICADO: Usar formatTicketDateTime para la fecha del ticket ---
            const ticketFormattedDate = formatTicketDateTime(now.toISOString()); // Formatear para la zona horaria correcta

            let balanceFinalClienteParaTicket = infoClienteConSaldo?.balance !== undefined ? infoClienteConSaldo.balance : 0;
            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) balanceFinalClienteParaTicket += montoAplicadoDelSaldoFavor;
            if (paymentType === 'Crédito cliente') {
                const montoACredito = totalFinalAPagar - (parseFloat(enganche) || 0);
                if (montoACredito > 0) balanceFinalClienteParaTicket += montoACredito;
                if ((parseFloat(enganche) || 0) > 0) balanceFinalClienteParaTicket -= (parseFloat(enganche) || 0);
            }

            const ticketData = {
                codigo_venta: codigo,
                cliente: { id: infoClienteConSaldo.client_id, nombre: infoClienteConSaldo.client_name, telefono: infoClienteConSaldo.telefono || 'N/A' },
                vendedor: { nombre: vendedorInfo?.nombre || currentUser?.email || 'N/A' },
                fecha: ticketFormattedDate, // --- NUEVO/MODIFICADO ---
                productosVenta: productosVenta.map(p => ({ ...p })),
                originalSubtotal, discountAmount,
                forma_pago: totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0 ? 'SALDO_A_FAVOR' : paymentType,
                enganche: parseFloat(enganche) || 0, gastos_envio: parseFloat(gastosEnvio) || 0, total_final: totalFinalAPagar,
                monto_credito_aplicado: montoAplicadoDelSaldoFavor,
                balance_cuenta: balanceFinalClienteParaTicket,
            };
            setHtmlTicketData(ticketData);
            setShowHtmlTicket(true);
            setShowSaleModal(false);
            
            // Limpiar estados
            setProductosVenta([]); setClienteSeleccionado(null); setPaymentType('');
            setDiscountType('Sin descuento'); setDiscountValue(0); setEnganche(0);
            setGastosEnvio(0); setBudgetSourceId(null);
            // setUsarSaldoFavor y setMontoAplicadoDelSaldoFavor se resetean con clienteSeleccionado

            toast.success(`Venta ${codigo} registrada!`);
        } catch (err) {
            toast.error(`Error: ${err.message || 'Desconocido'}.`);
        } finally {
            setProcessing(false);
        }
    };

    const closeHtmlTicket = () => { setShowHtmlTicket(false); setHtmlTicketData(null); };
    
    const clientesParaSelector = useMemo(() => {
        if (!clienteSeleccionado) return clientes;
        return clientes.filter(c => c.id !== clienteSeleccionado.id);
    }, [clientes, clienteSeleccionado]);

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800">
                    Volver al inicio
                </button>
                <h1 className="text-3xl font-bold text-gray-800 text-center">Gestión de Ventas</h1>
                <div className="w-full md:w-[150px]" />
            </div>

            {/* Selector de Cliente */}
            <div className="mb-6">
                <ClientSelector
                    clientes={clientesParaSelector}
                    clienteSeleccionado={clienteSeleccionado}
                    onSelect={setClienteSeleccionado}
                    onCreateNew={() => setShowNewClient(true)}
                />
                {loadingSaldoCliente && clienteSeleccionado && <p className="mt-2 text-sm text-gray-600">Cargando saldo...</p>}
                {infoClienteConSaldo && !loadingSaldoCliente && (
                    <p className="mt-2 text-sm text-gray-700">
                        Balance Actual:
                        <span className={`font-semibold ${infoClienteConSaldo.balance === 0 ? 'text-gray-700' : infoClienteConSaldo.balance < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {' '}{formatCurrency(infoClienteConSaldo.balance)}
                            {infoClienteConSaldo.balance < 0 ? ' (a favor)' : infoClienteConSaldo.balance > 0 ? ' (por cobrar)' : ''}
                        </span>
                    </p>
                )}
                <NewClientModal isOpen={showNewClient} onClose={() => setShowNewClient(false)} onClientAdded={c => { if (c?.id) { setClienteSeleccionado(c); setClientes(prev => [...prev, c]); } setShowNewClient(false); }} />
            </div>

            {/* Barra de búsqueda, filtro de productos y switch de stock */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-grow">
                    <QuickEntryBar busqueda={busqueda} onChangeBusqueda={setBusqueda} onQuickSaleClick={() => setShowQuickSale(true)} />
                </div>
                <div className="flex items-center space-x-2 whitespace-nowrap">
                    {showOutOfStock ? <EyeOff size={20} className="text-gray-600"/> : <Eye size={20} className="text-gray-600"/>}
                    <span className="text-sm text-gray-700 select-none">
                        {showOutOfStock ? 'Ocultar sin stock' : 'Mostrar sin stock'}
                    </span>
                    <label htmlFor="stockToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="stockToggle" className="sr-only" checked={showOutOfStock} onChange={() => setShowOutOfStock(!showOutOfStock)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${showOutOfStock ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOutOfStock ? 'translate-x-full' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>
            <QuickSaleModal isOpen={showQuickSale} onClose={() => setShowQuickSale(false)} onAdd={onAddToCart} productos={productos} />
            
            <div className="mb-6"><FilterTabs filtro={filtro} setFiltro={setFiltro} /></div>
            <div className="mb-20"><ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} showStock /></div>

            {/* Footer Fijo */}
            <div
                className={`fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg flex justify-between items-center transition-colors ${productosVenta.length === 0 || !infoClienteConSaldo?.client_id || processing ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'}`}
                onClick={openSaleModal}
                aria-disabled={productosVenta.length === 0 || !infoClienteConSaldo?.client_id || processing}
            >
                <div className="flex-1 text-left">
                    <span className="font-semibold text-lg">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                    {infoClienteConSaldo?.client_name && <span className="ml-4 text-sm text-gray-200">Cliente: {infoClienteConSaldo.client_name}</span>}
                </div>
                <div className="flex-1 text-right"><span className="font-bold text-xl">{formatCurrency(totalFinalAPagar)}</span></div>
                {processing && <div className="ml-4 text-sm font-semibold">Procesando…</div>}
                <div className="ml-4"><ChevronRight className="w-6 h-6" /></div>
            </div>

            {/* Modal de Checkout */}
            {showSaleModal && infoClienteConSaldo && (
                <ModalCheckout
                    isOpen={showSaleModal}
                    onClose={() => setShowSaleModal(false)}
                    title={`Detalle de venta para: ${infoClienteConSaldo.client_name}`}
                    footer={
                        <>
                            <button onClick={() => setShowSaleModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400" disabled={processing}>Cancelar</button>
                            <button onClick={handleFinalize}
                                disabled={processing || (totalFinalAPagar > 0 && !paymentType) || (paymentType === 'Crédito cliente' && (totalFinalAPagar - (parseFloat(enganche) || 0)) < 0 && totalFinalAPagar !==0)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {processing ? 'Confirmando…' : 'Confirmar Venta'}
                            </button>
                        </>
                    }
                >
                    {/* --- NUEVO: Usar los componentes divididos dentro del ModalCheckout --- */}
                    <CheckoutCartDisplay
                        productosVenta={productosVenta}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemoveFromCart={onRemoveFromCart}
                        processing={processing}
                    />
                    <CheckoutPaymentForm
                        originalSubtotal={originalSubtotal}
                        discountAmount={discountAmount}
                        subtotalConDescuento={subtotalConDescuento}
                        gastosEnvio={gastosEnvio}
                        setGastosEnvio={setGastosEnvio}
                        totalAntesDeCredito={totalAntesDeCredito}
                        loadingSaldoCliente={loadingSaldoCliente}
                        saldoAFavorDisponible={saldoAFavorDisponible}
                        usarSaldoFavor={usarSaldoFavor}
                        setUsarSaldoFavor={setUsarSaldoFavor}
                        montoAplicadoDelSaldoFavor={montoAplicadoDelSaldoFavor}
                        totalFinalAPagar={totalFinalAPagar}
                        paymentType={paymentType}
                        setPaymentType={setPaymentType}
                        discountType={discountType}
                        setDiscountType={setDiscountType}
                        discountValue={discountValue}
                        setDiscountValue={setDiscountValue}
                        enganche={enganche}
                        setEnganche={setEnganche}
                        processing={processing}
                    />
                </ModalCheckout>
            )}
            {showHtmlTicket && htmlTicketData && (<HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />)}
        </div>
    );
}

// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import 'jspdf-autotable';
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import ModalCheckout from '../components/ModalCheckout';
import HtmlTicketDisplay from '../components/HtmlTicketDisplay';
import { ChevronRight, Eye, EyeOff } from 'lucide-react'; // --- NUEVO/MODIFICADO: Añadimos iconos ---


// Helper simple para formatear moneda
const formatCurrency = (amount) => {
     const numericAmount = parseFloat(amount);
     if (isNaN(numericAmount)) {
         return '$0.00';
     }
     return numericAmount.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fecha y hora para el código
const formatDateTimeForCode = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

// Función para cargar una imagen local y convertirla a Base64
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

export default function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [productosVenta, setProductosVenta] = useState([]);

    const [filtro, setFiltro] = useState('All');
    const [busqueda, setBusqueda] = useState('');

    // --- NUEVO/MODIFICADO: Estado para mostrar/ocultar productos sin stock ---
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
            if (authError) {
                console.error("Error getting auth user:", authError);
            }
            if (user) {
                setCurrentUser(user);
                const { data: vendedorData, error: vendedorError } = await supabase
                    .from('usuarios')
                    .select('nombre')
                    .eq('id', user.id)
                    .single();
                if (vendedorError) {
                    console.error("Error loading vendedor info from 'usuarios' table:", vendedorError);
                    setVendedorInfo({ nombre: user.email });
                } else {
                    setVendedorInfo(vendedorData);
                }
            } else {
                console.warn('No hay usuario logueado en Checkout.');
                setCurrentUser(null);
                setVendedorInfo(null);
            }

            const { data: cli, error: errorClientes } = await supabase.from('clientes').select('id, nombre, telefono');
            if (errorClientes) {
                console.error("Error loading clients:", errorClientes);
                toast.error("Error al cargar clientes.");
            } else {
                setClientes(cli || []);
            }

            const { data: prod, error: errorProductos } = await supabase.from('productos').select('*');
            if (errorProductos) {
                console.error("Error loading products:", errorProductos);
                toast.error("Error al cargar productos.");
            } else {
                const prodMapped = (prod || []).map(p => {
                    let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
                    if (imagenUrl && !imagenUrl.startsWith('http') && supabase.storage) {
                        const { data } = supabase.storage.from('productos').getPublicUrl(p.imagen);
                        imagenUrl = data.publicUrl;
                    } else if (imagenUrl && !imagenUrl.startsWith('http')) {
                        console.warn('Supabase Storage no accesible o bucket "productos" no encontrado para obtener URL pública.');
                        imagenUrl = '';
                    }
                    const stockNumerico = parseFloat(p.stock) || 0;
                    return { ...p, imagenUrl, stock: stockNumerico };
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
                setInfoClienteConSaldo(null);
                setUsarSaldoFavor(false);
                setMontoAplicadoDelSaldoFavor(0);
                try {
                    const { data, error } = await supabase.rpc('get_cliente_con_saldo', {
                        p_cliente_id: clienteSeleccionado.id
                    });
                    if (error) throw error;
                    if (data && data.length > 0) {
                        setInfoClienteConSaldo(data[0]);
                    } else {
                        setInfoClienteConSaldo({
                            client_id: clienteSeleccionado.id,
                            client_name: clienteSeleccionado.nombre,
                            telefono: clienteSeleccionado.telefono,
                            balance: 0,
                            latest_payment_date: null,
                            first_purchase_date: null,
                        });
                    }
                } catch (err) {
                    console.error('Error obteniendo información y saldo del cliente:', err.message);
                    toast.error('Error al obtener el saldo del cliente.');
                    setInfoClienteConSaldo({
                        client_id: clienteSeleccionado.id,
                        client_name: clienteSeleccionado.nombre,
                        telefono: clienteSeleccionado.telefono,
                        balance: 0,
                        errorAlObtenerSaldo: true
                    });
                } finally {
                    setLoadingSaldoCliente(false);
                }
            };
            fetchClienteConSaldo();
        } else {
            setInfoClienteConSaldo(null);
            setUsarSaldoFavor(false);
            setMontoAplicadoDelSaldoFavor(0);
        }
    }, [clienteSeleccionado]);

    useEffect(() => {
        if (location.state && location.state.budgetData) {
            const budget = location.state.budgetData;
            if (budget.clientes) {
                setClienteSeleccionado(budget.clientes);
            } else {
                toast.warn("Presupuesto sin información de cliente.");
                return;
            }
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
                const validItemsFromBudget = itemsFromBudget.filter(item => item.cantidad > 0);
                if (validItemsFromBudget.length !== itemsFromBudget.length) {
                    toast.warn("Algunos productos del presupuesto tenían cantidad cero y fueron omitidos.");
                }
                setProductosVenta(validItemsFromBudget);
            } else {
                setProductosVenta([]);
                toast.warn("El presupuesto no contiene productos.");
            }
            setDiscountType(budget.tipo_descuento || 'Sin descuento');
            setDiscountValue(parseFloat(budget.valor_descuento) || 0);
            setGastosEnvio(parseFloat(budget.gastos_envio) || 0);
            setPaymentType(budget.forma_pago || '');
            setBudgetSourceId(budget.id);
            setTimeout(() => {
                if (budget.clientes && budget.presupuesto_items && budget.presupuesto_items.length > 0) {
                    openSaleModal();
                } else {
                    toast.error("No se pudo abrir el modal de venta. Asegúrate de que el presupuesto tenga cliente y productos.");
                }
            }, 100);
        } else {
            setBudgetSourceId(null);
        }
    }, [location.state, productos]);

    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            const categoriaMatch = filtro === 'All' || p.categoria === filtro;
            const busquedaMatch = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
            const stockMatch = showOutOfStock ? true : (parseFloat(p.stock) || 0) > 0;
            return categoriaMatch && busquedaMatch && stockMatch;
        });
    }, [productos, filtro, busqueda, showOutOfStock]);

    const saldoAFavorDisponible = useMemo(() => {
        return (infoClienteConSaldo && infoClienteConSaldo.balance < 0)
            ? Math.abs(infoClienteConSaldo.balance)
            : 0;
    }, [infoClienteConSaldo]);

    const { totalItems, originalSubtotal, subtotalConDescuento, discountAmount, totalAntesDeCredito } = useMemo(() => {
        try {
            const calculatedOriginalSubtotal = productosVenta.reduce((sum, p) => (sum + (parseFloat(p.cantidad) || 0) * (parseFloat(p.promocion) || 0)), 0);
            const calculatedTotalItems = productosVenta.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0), 0);
            let calculatedSubtotalConDescuento = calculatedOriginalSubtotal;
            let calculatedDiscountAmount = 0;

            if (discountType === 'Por importe') {
                calculatedDiscountAmount = Math.min(parseFloat(discountValue) || 0, calculatedOriginalSubtotal);
                calculatedSubtotalConDescuento = Math.max(0, calculatedOriginalSubtotal - calculatedDiscountAmount);
            } else if (discountType === 'Por porcentaje') {
                const discountPercentage = Math.min(Math.max(0, parseFloat(discountValue) || 0), 100);
                calculatedDiscountAmount = calculatedOriginalSubtotal * (discountPercentage / 100);
                calculatedSubtotalConDescuento = calculatedOriginalSubtotal - calculatedDiscountAmount;
            }

            const calculatedGastosEnvio = parseFloat(gastosEnvio) || 0;
            const calculatedTotalAntesDeCredito = calculatedSubtotalConDescuento + calculatedGastosEnvio;
            
            return {
                totalItems: calculatedTotalItems,
                originalSubtotal: calculatedOriginalSubtotal,
                subtotalConDescuento: calculatedSubtotalConDescuento,
                discountAmount: calculatedDiscountAmount,
                totalAntesDeCredito: calculatedTotalAntesDeCredito
            };
        } catch (e) {
            console.error("Error dentro del useMemo para calcular totales:", e);
            return {
                totalItems: 0,
                originalSubtotal: 0,
                subtotalConDescuento: 0,
                discountAmount: 0,
                totalAntesDeCredito: 0
            };
        }
    }, [productosVenta, discountType, discountValue, gastosEnvio]);

    useEffect(() => {
        if (usarSaldoFavor && saldoAFavorDisponible > 0) {
            const creditoAUsar = Math.min(totalAntesDeCredito, saldoAFavorDisponible);
            setMontoAplicadoDelSaldoFavor(creditoAUsar);
        } else {
            setMontoAplicadoDelSaldoFavor(0);
        }
    }, [usarSaldoFavor, saldoAFavorDisponible, totalAntesDeCredito]);

    const totalFinalAPagar = useMemo(() => {
        return totalAntesDeCredito - montoAplicadoDelSaldoFavor;
    }, [totalAntesDeCredito, montoAplicadoDelSaldoFavor]);

    const onAddToCart = producto => {
        const currentStock = parseFloat(producto.stock) || 0;
        if (currentStock <= 0) {
            toast.error('Producto sin stock disponible');
            return;
        }
        setProductosVenta(prev => {
            const existe = prev.find(p => p.id === producto.id);
            if (existe) {
                const fullProductInfo = productos.find(p => p.id === producto.id);
                const productStock = fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0;
                if (existe.cantidad + 1 > productStock) {
                    toast.error(`Stock insuficiente. Máximo disponible: ${productStock}`);
                    return prev;
                }
                return prev.map(p =>
                    p.id === producto.id
                        ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * (parseFloat(p.promocion) || 0) }
                        : p
                );
            }
            const fullProductInfo = productos.find(p => p.id === producto.id);
            return [...prev, { ...producto, cantidad: 1, total: (parseFloat(producto.promocion) || 0), stock: fullProductInfo ? (parseFloat(fullProductInfo.stock) || 0) : 0 }];
        });
    };

    const onRemoveFromCart = (productoId) => {
        setProductosVenta(prev => prev.filter(p => p.id !== productoId));
    };

    const onUpdateQuantity = (productoId, newQuantity) => {
        const quantity = parseInt(newQuantity, 10);
        setProductosVenta(prev => {
            const productoIndex = prev.findIndex(p => p.id === productoId);
            if (productoIndex === -1) return prev;
            const producto = prev[productoIndex];
            const currentStock = parseFloat(producto.stock) || 0;
            if (isNaN(quantity) || quantity <= 0) {
                if (window.confirm(`¿Eliminar ${producto.nombre} de la venta?`)) {
                    return prev.filter(p => p.id !== productoId);
                }
                return prev;
            }
            if (quantity > currentStock) {
                toast.error(`Stock insuficiente para ${producto.nombre}. Máximo disponible: ${currentStock}`);
                return prev;
            }
            const updatedProductos = [...prev];
            updatedProductos[productoIndex] = {
                ...producto,
                cantidad: quantity,
                total: quantity * (parseFloat(producto.promocion) || 0)
            };
            return updatedProductos;
        });
    };

    const openSaleModal = () => {
        if (!currentUser || !currentUser.id) return;
        if (!infoClienteConSaldo || !infoClienteConSaldo.client_id || productosVenta.length === 0) {
            if (!infoClienteConSaldo || !infoClienteConSaldo.client_id) {
                toast.error('Selecciona un cliente y espera a que cargue su información.');
            } else if (productosVenta.length === 0) {
                toast.error('Agrega productos a la venta.');
            }
            return;
        }
        setShowSaleModal(true);
    };

    const handleFinalize = async () => {
        setProcessing(true);
        if (!currentUser || !currentUser.id) { toast.error('Error de vendedor: Debes iniciar sesión.'); setProcessing(false); return; }
        if (!infoClienteConSaldo || !infoClienteConSaldo.client_id) { toast.error('Error de cliente: La información del cliente no está completa.'); setProcessing(false); return; }
        if (productosVenta.length === 0) { toast.error('Error de productos: Agrega productos a la venta.'); setProcessing(false); return; }
        if (totalFinalAPagar > 0 && !paymentType) { toast.error('Error de pago: Selecciona una forma de pago.'); setProcessing(false); return; }
        const numericEnganche = parseFloat(enganche) || 0;
        if (paymentType === 'Crédito cliente' && numericEnganche < 0) { toast.error('El enganche no puede ser negativo.'); setProcessing(false); return; }
        const numericGastosEnvio = parseFloat(gastosEnvio) || 0;
        if (numericGastosEnvio < 0) { toast.error('Los gastos de envío no pueden ser negativos.'); setProcessing(false); return; }
        if (paymentType !== 'Crédito cliente' && totalFinalAPagar < 0) { toast.error('El total final a pagar no puede ser negativo para esta forma de pago.'); setProcessing(false); return; }

        try {
            const now = new Date();
            const codigo = `VT${formatDateTimeForCode(now)}`;
            let ventaId;

            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                const { data: movSaldoData, error: errorMovSaldo } = await supabase
                    .from('movimientos_cuenta_clientes')
                    .insert([{
                        cliente_id: infoClienteConSaldo.client_id,
                        tipo_movimiento: 'USO_SALDO_VENTA',
                        monto: montoAplicadoDelSaldoFavor,
                        descripcion: `Aplicación saldo a favor en Venta ${codigo}`,
                    }])
                    .select('id')
                    .single();
                if (errorMovSaldo || !movSaldoData) {
                    console.error("Error al registrar uso de saldo a favor:", errorMovSaldo);
                    toast.error("Error al aplicar el saldo a favor del cliente.");
                    throw errorMovSaldo || new Error("No se pudo registrar el uso del saldo a favor.");
                }
            }

            const { data: ventaInsertada, error: errorVenta } = await supabase
                .from('ventas')
                .insert([{
                    codigo_venta: codigo,
                    cliente_id: infoClienteConSaldo.client_id,
                    vendedor_id: currentUser.id,
                    subtotal: originalSubtotal,
                    forma_pago: totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0 ? 'SALDO_A_FAVOR' : paymentType,
                    tipo_descuento: discountType,
                    valor_descuento: discountAmount,
                    total: totalFinalAPagar,
                    monto_credito_aplicado: montoAplicadoDelSaldoFavor, // Asegúrate que esta columna exista en tu tabla 'ventas'
                    enganche: numericEnganche,
                    gastos_envio: numericGastosEnvio,
                    presupuesto_id: budgetSourceId,
                }])
                .select('id')
                .single();

            if (errorVenta) {
                if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                    console.warn("La venta falló después de registrar el uso de saldo. Se requiere intervención manual para el movimiento de saldo.");
                }
                throw errorVenta;
            }
            ventaId = ventaInsertada.id;

            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                 await supabase
                    .from('movimientos_cuenta_clientes')
                    .update({ referencia_venta_id: ventaId })
                    .match({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'USO_SALDO_VENTA', monto: montoAplicadoDelSaldoFavor, descripcion: `Aplicación saldo a favor en Venta ${codigo}` });
            }

            if (paymentType === 'Crédito cliente') {
                const montoACredito = totalFinalAPagar - numericEnganche;
                const movimientosCuenta = [];
                if (montoACredito > 0) {
                    movimientosCuenta.push({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'CARGO_VENTA', monto: montoACredito, referencia_venta_id: ventaId, descripcion: `Venta a crédito ${codigo}` });
                }
                if (numericEnganche > 0) {
                    movimientosCuenta.push({ cliente_id: infoClienteConSaldo.client_id, tipo_movimiento: 'ABONO_ENGANCHE', monto: -numericEnganche, referencia_venta_id: ventaId, descripcion: `Enganche Venta ${codigo}` });
                }
                if (movimientosCuenta.length > 0) {
                    const { error: errorMovimientos } = await supabase.from('movimientos_cuenta_clientes').insert(movimientosCuenta);
                    if (errorMovimientos) {
                        await supabase.from('ventas').delete().eq('id', ventaId);
                        toast.error('Error al registrar movimientos en cuenta. Venta revertida.');
                        throw errorMovimientos;
                    }
                }
            }

            for (const p of productosVenta) {
                const { data: prodCheck, error: errorProdCheck } = await supabase.from('productos').select('stock').eq('id', p.id).single();
                const currentStock = prodCheck?.stock || 0;
                const cantidadVendida = parseFloat(p.cantidad) || 0;
                if (errorProdCheck || currentStock < cantidadVendida) {
                    await supabase.from('ventas').delete().eq('id', ventaId);
                    toast.error(`Stock insuficiente para ${p.nombre}. Venta cancelada.`);
                    throw new Error(`Stock insuficiente para ${p.nombre}.`);
                }
                const { error: errorDetalle } = await supabase.from('detalle_venta').insert([{ venta_id: ventaId, producto_id: p.id, cantidad: cantidadVendida, precio_unitario: parseFloat(p.promocion) || 0, total_parcial: parseFloat(p.total) || 0 }]);
                if (errorDetalle) { await supabase.from('ventas').delete().eq('id', ventaId); throw errorDetalle; }
                const nuevoStock = currentStock - cantidadVendida;
                const { error: errorUpdateStock } = await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
                if (errorUpdateStock) { await supabase.from('ventas').delete().eq('id', ventaId); throw errorUpdateStock; }
                const { error: errMov } = await supabase.from('movimientos_inventario').insert([{ producto_id: p.id, tipo: 'SALIDA', cantidad: cantidadVendida, referencia: codigo, motivo: 'venta', fecha: new Date().toISOString() }]);
                if (errMov) { await supabase.from('ventas').delete().eq('id', ventaId); throw errMov; }
            }

            if (budgetSourceId) {
                const { error: updateBudgetError } = await supabase.from('presupuestos').update({ estado: 'Convertido a Venta' }).eq('id', budgetSourceId);
                if (updateBudgetError) {
                    console.error(`Error al actualizar estado del presupuesto ${budgetSourceId}:`, updateBudgetError.message);
                    toast.warn('Advertencia: El presupuesto origen no se marcó como "Convertido a Venta".');
                } else {
                    console.log(`Presupuesto ${budgetSourceId} marcado como 'Convertido a Venta'.`);
                }
            }

            const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            let balancePrevioCliente = infoClienteConSaldo?.balance !== undefined ? infoClienteConSaldo.balance : 0;
            let balanceActualizadoCliente = balancePrevioCliente;
            if (usarSaldoFavor && montoAplicadoDelSaldoFavor > 0) {
                balanceActualizadoCliente += montoAplicadoDelSaldoFavor;
            }
            if (paymentType === 'Crédito cliente') {
                const montoACredito = totalFinalAPagar - numericEnganche;
                if (montoACredito > 0) balanceActualizadoCliente += montoACredito;
                if (numericEnganche > 0) balanceActualizadoCliente -= numericEnganche;
            }

            const ticketData = {
                codigo_venta: codigo,
                cliente: { id: infoClienteConSaldo.client_id, nombre: infoClienteConSaldo.client_name, telefono: infoClienteConSaldo.telefono || clienteSeleccionado?.telefono || 'N/A' },
                vendedor: { nombre: vendedorInfo?.nombre || currentUser?.email || 'N/A' },
                fecha: formattedDate,
                productosVenta: productosVenta.map(p => ({ id: p.id, nombre: p.nombre, cantidad: p.cantidad, precio_unitario: parseFloat(p.promocion) || 0, total_parcial: parseFloat(p.total) || 0 })),
                originalSubtotal, discountAmount,
                forma_pago: totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0 ? 'SALDO_A_FAVOR' : paymentType,
                enganche: numericEnganche, gastos_envio: numericGastosEnvio, total_final: totalFinalAPagar,
                monto_credito_aplicado: montoAplicadoDelSaldoFavor,
                balance_cuenta: balanceActualizadoCliente,
            };
            setHtmlTicketData(ticketData);
            setShowHtmlTicket(true);
            setShowSaleModal(false);
            
            setProductosVenta([]);
            setClienteSeleccionado(null);
            setPaymentType('');
            setDiscountType('Sin descuento');
            setDiscountValue(0);
            setEnganche(0);
            setGastosEnvio(0);
            setBudgetSourceId(null);

            toast.success(`Venta ${codigo} registrada exitosamente!`);
        } catch (err) {
            console.error('Error general al finalizar venta:', err.message);
            toast.error(`Error al procesar la venta: ${err.message || 'Error desconocido'}.`);
        } finally {
            setProcessing(false);
        }
    };

    const closeHtmlTicket = () => {
        setShowHtmlTicket(false);
        setHtmlTicketData(null);
    };
    
    // --- NUEVO/MODIFICADO: Lista de clientes para el selector, excluyendo el ya seleccionado ---
    const clientesParaSelector = useMemo(() => {
        if (!clienteSeleccionado) {
            return clientes; // Si no hay cliente seleccionado, muestra todos
        }
        // Filtra la lista de clientes para excluir el que ya está seleccionado
        return clientes.filter(c => c.id !== clienteSeleccionado.id);
    }, [clientes, clienteSeleccionado]);


    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                    Volver al inicio
                </button>
                <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
                    Gestión de Ventas
                </h1>
                <div className="w-full md:w-[150px]" />
            </div>

            {/* Selector de Cliente */}
            <div className="mb-6">
                <ClientSelector
                    clientes={clientesParaSelector} /* --- NUEVO/MODIFICADO: Usar la lista filtrada --- */
                    clienteSeleccionado={clienteSeleccionado}
                    onSelect={setClienteSeleccionado}
                    onCreateNew={() => setShowNewClient(true)}
                />
                {loadingSaldoCliente && clienteSeleccionado && (
                    <p className="mt-2 text-sm text-gray-600">Cargando saldo del cliente...</p>
                )}
                {infoClienteConSaldo && infoClienteConSaldo.balance !== undefined && !loadingSaldoCliente && (
                     // --- MODIFICADO: Se quita el nombre del cliente de aquí para evitar duplicidad ---
                    <p className="mt-2 text-sm text-gray-700">
                        Balance Actual:
                        <span className={`font-semibold ${
                            infoClienteConSaldo.balance === 0 ? 'text-gray-700' :
                            infoClienteConSaldo.balance < 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {' '}{formatCurrency(infoClienteConSaldo.balance)}
                            {infoClienteConSaldo.balance < 0 ? ' (a favor)' : infoClienteConSaldo.balance > 0 ? ' (por cobrar)' : ''}
                        </span>
                    </p>
                )}
                <NewClientModal
                    isOpen={showNewClient}
                    onClose={() => setShowNewClient(false)}
                    onClientAdded={(newClient) => {
                        if (newClient && newClient.id) {
                            setClienteSeleccionado(newClient);
                            setClientes(prev => [...prev, newClient]);
                        }
                        setShowNewClient(false);
                    }}
                />
            </div>

            {/* Barra de búsqueda, filtro de productos y switch de stock */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-grow">
                    <QuickEntryBar busqueda={busqueda} onChangeBusqueda={e => setBusqueda(e.target.value)} onQuickSaleClick={() => setShowQuickSale(true)} />
                </div>
                {/* --- NUEVO/MODIFICADO: Switch para mostrar/ocultar productos sin stock --- */}
                <div className="flex items-center space-x-2 whitespace-nowrap">
                    {showOutOfStock ? <EyeOff size={20} className="text-gray-600"/> : <Eye size={20} className="text-gray-600"/>}
                    <span className="text-sm text-gray-700 select-none">
                        {showOutOfStock ? 'Ocultar sin stock' : 'Mostrar sin stock'}
                    </span>
                    <label htmlFor="stockToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                id="stockToggle" 
                                className="sr-only" 
                                checked={showOutOfStock}
                                onChange={() => setShowOutOfStock(!showOutOfStock)}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${showOutOfStock ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOutOfStock ? 'translate-x-full' : ''}`}></div>
                        </div>
                    </label>
                </div>
            </div>
            <QuickSaleModal isOpen={showQuickSale} onClose={() => setShowQuickSale(false)} onAdd={onAddToCart} productos={productos} />
            
            <div className="mb-6">
                <FilterTabs filtro={filtro} setFiltro={setFiltro} />
            </div>
            <div className="mb-20">
                <ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} showStock />
            </div>

            {/* Footer Fijo */}
            <div
                className={`
                    fixed bottom-0 left-0 right-0 p-4 text-center rounded-t-xl shadow-lg
                    flex justify-between items-center
                    transition-colors duration-300 ease-in-out
                    ${productosVenta.length === 0 || !infoClienteConSaldo || !infoClienteConSaldo.client_id || processing
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-green-600 text-white cursor-pointer hover:bg-green-700'
                    }
                `}
                onClick={openSaleModal}
                aria-disabled={productosVenta.length === 0 || !infoClienteConSaldo || !infoClienteConSaldo.client_id || processing}
            >
                <div className="flex-1 text-left">
                    <span className="font-semibold text-lg">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                    {infoClienteConSaldo && infoClienteConSaldo.client_name && (
                        <span className="ml-4 text-sm text-gray-200">Cliente: {infoClienteConSaldo.client_name}</span>
                    )}
                </div>
                <div className="flex-1 text-right">
                    <span className="font-bold text-xl">{formatCurrency(totalFinalAPagar)}</span>
                </div>
                {processing && (
                    <div className="ml-4 text-sm font-semibold">Procesando…</div>
                )}
                <div className="ml-4">
                    <ChevronRight className="w-6 h-6" />
                </div>
            </div>

            {/* Modal de Checkout */}
            {showSaleModal && infoClienteConSaldo && (
                <ModalCheckout
                    isOpen={showSaleModal}
                    onClose={() => setShowSaleModal(false)}
                    title="Detalle de venta"
                    footer={
                        <>
                            <button onClick={() => setShowSaleModal(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400" disabled={processing}>
                                Cancelar
                            </button>
                            <button onClick={handleFinalize}
                                disabled={
                                    processing ||
                                    (totalFinalAPagar > 0 && !paymentType) ||
                                    (paymentType === 'Crédito cliente' && (totalFinalAPagar - (parseFloat(enganche) || 0)) < 0 && totalFinalAPagar !==0)
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {processing ? 'Confirmando…' : 'Confirmar Venta'}
                            </button>
                        </>
                    }
                >
                    <div className="mb-4 max-h-80 overflow-y-auto pr-2">
                        <h4 className="text-md font-semibold mb-2">Productos:</h4>
                        {productosVenta.length === 0 ?
                            (<p>No hay productos.</p>)
                            : (<ul className="space-y-2">{productosVenta.map(p => (
                                <li key={p.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-b-0">
                                    <div className="flex-1 mr-4">
                                        <span className="font-medium">{p.nombre}</span>
                                        <div className="text-xs text-gray-500">{formatCurrency(p.promocion ?? 0)} c/u</div>
                                    </div>
                                    <div className="flex items-center">
                                        <input type="number" min="1" value={p.cantidad} onChange={(e) => onUpdateQuantity(p.id, e.target.value)}
                                            className="w-12 text-center border rounded-md mr-2 text-sm py-1" disabled={processing} />
                                        <span className="font-semibold w-20 text-right">{formatCurrency(p.total ?? 0)}</span>
                                        <button onClick={() => onRemoveFromCart(p.id)} className="ml-2 text-red-600 hover:text-red-800 disabled:opacity-50" disabled={processing}>✕</button>
                                    </div></li>))}</ul>)}
                        <hr className="my-4" />
                        <div className="text-right text-sm space-y-1">
                            <p>Subtotal Original: <span className="font-medium">{formatCurrency(originalSubtotal)}</span></p>
                            <p className="text-red-600">Descuento: <span className="font-medium">- {formatCurrency(discountAmount)}</span></p>
                            <p>Subtotal (con desc.): <span className="font-medium">{formatCurrency(subtotalConDescuento)}</span></p>
                            <div className="flex justify-end items-center mt-2">
                                <label htmlFor="modalGastosEnvio" className="text-sm font-medium text-gray-700 mr-2">Gastos de Envío:</label>
                                <input id="modalGastosEnvio" type="number" step="0.01" min="0" value={gastosEnvio} onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)}
                                    className="w-24 text-right border rounded-md text-sm py-1" disabled={processing} />
                            </div>
                            <p className="text-lg font-semibold mt-1">Total (antes de saldo a favor): <span className="font-medium">{formatCurrency(totalAntesDeCredito)}</span></p>

                            {/* --- NUEVO: Opción para usar saldo a favor --- */}
                            {!loadingSaldoCliente && saldoAFavorDisponible > 0 && (
                                <div className="text-left mt-3 pt-3 border-t">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={usarSaldoFavor}
                                            onChange={(e) => setUsarSaldoFavor(e.target.checked)}
                                            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                            disabled={processing}
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                            Usar saldo a favor ({formatCurrency(saldoAFavorDisponible)} disponibles)
                                        </span>
                                    </label>
                                    {usarSaldoFavor && (
                                        <p className="text-sm text-green-600 font-medium mt-1">
                                            Se aplicarán {formatCurrency(montoAplicadoDelSaldoFavor)} de saldo a favor.
                                        </p>
                                    )}
                                </div>
                            )}
                            {loadingSaldoCliente && <p className="text-left text-sm text-gray-500 mt-1">Verificando saldo del cliente...</p>}
                            {/* --- FIN NUEVO --- */}

                            <p className="text-xl font-bold mt-2 pt-2 border-t border-gray-300">Total Final a Pagar: <span className="text-green-700">{formatCurrency(totalFinalAPagar)}</span></p>
                        </div>
                        <hr className="my-4" />
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="modalPaymentType" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago:</label>
                                <select id="modalPaymentType" value={paymentType} onChange={e => setPaymentType(e.target.value)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                    disabled={processing || (totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0)}
                                >
                                    <option value="">Selecciona una forma de pago</option>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Tarjeta">Tarjeta</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Crédito cliente">Crédito cliente</option>
                                </select></div>
                            <div>
                                <label htmlFor="modalDiscountType" className="block text-sm font-medium text-gray-700 mb-1">Descuento:</label>
                                <select id="modalDiscountType" value={discountType} onChange={e => { setDiscountType(e.target.value); setDiscountValue(0); }}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50" disabled={processing}>
                                    <option value="Sin descuento">Sin descuento</option>
                                    <option value="Por importe">Por importe ($)</option>
                                    <option value="Por porcentaje">Por porcentaje (%)</option>
                                </select></div>
                            {discountType !== 'Sin descuento' && (<div>
                                <label htmlFor="modalDiscountValue" className="block text-sm font-medium text-gray-700 mb-1">
                                    Valor del Descuento ({discountType === 'Por importe' ? '$' : '%'}):</label>
                                <input id="modalDiscountValue" type="number" step={discountType === 'Porcentaje' ? "1" : "0.01"} min={discountType === 'Porcentaje' ? "0" : "0"} max={discountType === 'Porcentaje' ? "100" : undefined}
                                    value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50" disabled={processing} />
                            </div>)}
                            {paymentType === 'Crédito cliente' && (<div>
                                <label htmlFor="modalEnganche" className="block text-sm font-medium text-gray-700 mb-1">Enganche:</label>
                                <input id="modalEnganche" type="number" step="0.01" min="0" value={enganche} onChange={e => setEnganche(parseFloat(e.target.value) || 0)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50" disabled={processing} />
                            </div>)}</div>
                    </div></ModalCheckout>)}
            {showHtmlTicket && htmlTicketData && (<HtmlTicketDisplay saleData={htmlTicketData} onClose={closeHtmlTicket} />)}
        </div>
    );
}


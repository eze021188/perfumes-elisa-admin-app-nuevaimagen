// src/components/checkout/CheckoutPaymentForm.jsx
import React, { useMemo } from 'react';

// Asegúrate de que este helper se exporte desde Checkout.jsx
// o de que esté en un archivo de helpers compartido, por ejemplo:
// import { formatCurrency } from '../../utils/formatters';
import { formatCurrency } from '../../pages/Checkout'; 

export default function CheckoutPaymentForm({
    originalSubtotal, // Este viene del carrito, puede ser con precio promo
    discountAmount,     // Este viene del carrito, puede ser con precio promo
    subtotalConDescuento, // Este viene del carrito, puede ser con precio promo
    gastosEnvio,
    setGastosEnvio,
    totalAntesDeCredito, // Este viene del carrito, puede ser con precio promo
    loadingSaldoCliente,
    saldoAFavorDisponible,
    usarSaldoFavor,
    setUsarSaldoFavor,
    montoAplicadoDelSaldoFavor,
    totalFinalAPagar,   // Este viene del carrito, puede ser con precio promo
    paymentType,
    setPaymentType,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    enganche,
    setEnganche,
    processing,
    // NUEVAS PROPS: Para la selección de precio en crédito
    usePromotionalPriceForCredit,
    setUsePromotionalPriceForCredit,
    productosVenta // Necesario para calcular los diferentes subtotales en el formulario
}) {

    // Calcula el subtotal si se usara solo el Precio Normal
    const calculateSubtotalNormalPrice = useMemo(() => {
        return productosVenta.reduce((sum, p) => sum + (p.cantidad * (p.precio_normal ?? 0)), 0);
    }, [productosVenta]);

    // Calcula el subtotal si se usara el Precio Promocional (con jerarquía)
    const calculateSubtotalPromotionalPrice = useMemo(() => {
        return productosVenta.reduce((sum, p) => {
            let effectivePrice = p.precio_normal; // Por defecto el normal
            if (p.descuento_lote > 0) {
                effectivePrice = p.descuento_lote;
            } else if (p.promocion > 0) {
                effectivePrice = p.promocion;
            }
            return sum + (p.cantidad * effectivePrice);
        }, 0);
    }, [productosVenta]);

    // Determina el "Subtotal Original" a mostrar en la sección de Totales del formulario.
    // Si es crédito, se basa en la elección del usuario; de lo contrario, usa el original del carrito.
    const displayedOriginalSubtotal = useMemo(() => {
        if (paymentType === 'Crédito cliente') {
            return usePromotionalPriceForCredit ? calculateSubtotalPromotionalPrice : calculateSubtotalNormalPrice;
        }
        return originalSubtotal; 
    }, [paymentType, usePromotionalPriceForCredit, calculateSubtotalPromotionalPrice, calculateSubtotalNormalPrice, originalSubtotal]);


    // Recalcula el monto del descuento basado en el displayedOriginalSubtotal
    const displayedDiscountAmount = useMemo(() => {
        if (discountType === 'Por importe') {
            return Math.min(discountValue, displayedOriginalSubtotal);
        } else if (discountType === 'Porcentaje') {
            const percentage = Math.min(Math.max(0, discountValue), 100);
            return displayedOriginalSubtotal * (percentage / 100);
        }
        return 0;
    }, [discountType, discountValue, displayedOriginalSubtotal]);

    // Recalcula el subtotal con descuento para la visualización en el formulario
    const displayedSubtotalConDescuento = useMemo(() => {
        return Math.max(0, displayedOriginalSubtotal - displayedDiscountAmount);
    }, [displayedOriginalSubtotal, displayedDiscountAmount]);

    // Recalcula el total antes de saldo a favor, incluyendo gastos de envío, para la visualización en el formulario
    const displayedTotalAntesDeCredito = useMemo(() => {
        return displayedSubtotalConDescuento + gastosEnvio;
    }, [displayedSubtotalConDescuento, gastosEnvio]);


    // Recalcula el monto aplicado del saldo a favor basado en el displayedTotalAntesDeCredito
    const displayedMontoAplicadoDelSaldoFavor = useMemo(() => {
        if (usarSaldoFavor && saldoAFavorDisponible > 0) {
            return Math.min(displayedTotalAntesDeCredito, saldoAFavorDisponible);
        }
        return 0;
    }, [usarSaldoFavor, saldoAFavorDisponible, displayedTotalAntesDeCredito]);

    // Recalcula el total final a pagar para la visualización en el formulario
    const displayedTotalFinalAPagar = useMemo(() => {
        return displayedTotalAntesDeCredito - displayedMontoAplicadoDelSaldoFavor;
    }, [displayedTotalAntesDeCredito, displayedMontoAplicadoDelSaldoFavor]);


    return (
        <>
            <hr className="my-4 border-dark-700" />
            <div className="text-right text-sm space-y-1 text-gray-300">
                {/* Ahora usamos los valores calculados para la visualización dinámica */}
                <p>Subtotal Original: <span className="font-medium">{formatCurrency(displayedOriginalSubtotal)}</span></p>
                <p className="text-error-400">Descuento: <span className="font-medium">- {formatCurrency(displayedDiscountAmount)}</span></p>
                <p>Gastos de Envío: <span className="font-medium">{formatCurrency(gastosEnvio)}</span></p>
                <p className="font-semibold text-base">Total (antes de saldo a favor): <span className="text-gray-200">{formatCurrency(displayedTotalAntesDeCredito)}</span></p>
                {loadingSaldoCliente ? (
                    <p>Cargando saldo...</p>
                ) : (
                    saldoAFavorDisponible > 0 && (
                        <div className="flex justify-between items-center">
                            <label htmlFor="usarSaldo" className="cursor-pointer flex items-center">
                                <input
                                    type="checkbox"
                                    id="usarSaldo"
                                    checked={usarSaldoFavor}
                                    onChange={e => setUsarSaldoFavor(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-primary-600 rounded mr-2"
                                />
                                Usar saldo a favor ({formatCurrency(saldoAFavorDisponible)}):
                            </label>
                            <span className="font-medium text-primary-400">- {formatCurrency(displayedMontoAplicadoDelSaldoFavor)}</span>
                        </div>
                    )
                )}
                <p className="text-xl font-bold text-success-400 mt-2 pt-2 border-t border-dark-700">Total Final a Pagar: {formatCurrency(displayedTotalFinalAPagar)}</p>
            </div>

            <hr className="my-4 border-dark-700" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="paymentType" className="block text-sm font-medium text-gray-300 mb-1">Forma de Pago:</label>
                    <select
                        id="paymentType"
                        value={paymentType}
                        onChange={e => {
                            setPaymentType(e.target.value);
                            // Reset la opción de precio si cambia la forma de pago
                            if (e.target.value !== 'Crédito cliente') {
                                setUsePromotionalPriceForCredit(false);
                            }
                        }}
                        className="mt-1 block w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                        disabled={processing}
                    >
                        <option value="">Selecciona</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Crédito cliente">Crédito cliente</option>
                    </select>
                </div>

                {/* NUEVA SECCIÓN: Opción de precio para Crédito Cliente */}
                {paymentType === 'Crédito cliente' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Precio a Cobrar:</label>
                        <div className="mt-1 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                            <label htmlFor="priceOptionNormal" className="flex items-center cursor-pointer text-sm text-gray-300">
                                <input
                                    type="radio"
                                    id="priceOptionNormal"
                                    name="creditPriceOption" // Usar un nombre consistente para el grupo de radio buttons
                                    value="normal"
                                    checked={!usePromotionalPriceForCredit}
                                    onChange={() => setUsePromotionalPriceForCredit(false)}
                                    className="form-radio h-4 w-4 text-primary-600"
                                    disabled={processing}
                                />
                                <span className="ml-2">
                                    Precio Normal ({formatCurrency(calculateSubtotalNormalPrice)})
                                </span>
                            </label>
                            <label htmlFor="priceOptionPromocion" className="flex items-center cursor-pointer text-sm text-gray-300">
                                <input
                                    type="radio"
                                    id="priceOptionPromocion"
                                    name="creditPriceOption" // Usar el mismo nombre para el grupo
                                    value="promocion"
                                    checked={usePromotionalPriceForCredit}
                                    onChange={() => setUsePromotionalPriceForCredit(true)}
                                    className="form-radio h-4 w-4 text-primary-600"
                                    disabled={processing}
                                />
                                <span className="ml-2">
                                    Precio Promoción ({formatCurrency(calculateSubtotalPromotionalPrice)})
                                </span>
                            </label>
                        </div>
                    </div>
                )}


                <div>
                    <label htmlFor="discountType" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Descuento:</label>
                    <select
                        id="discountType"
                        value={discountType}
                        onChange={e => setDiscountType(e.target.value)}
                        className="mt-1 block w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                        disabled={processing}
                    >
                        <option value="Sin descuento">Sin descuento</option>
                        <option value="Porcentaje">Porcentaje (%)</option> 
                        <option value="Por importe">Por importe ($)</option>
                    </select>
                </div>

                {discountType !== 'Sin descuento' && (
                    <div>
                        <label htmlFor="discountValue" className="block text-sm font-medium text-gray-300 mb-1">Valor de Descuento:</label>
                        <input
                            id="discountValue"
                            type="number"
                            step={discountType === 'Porcentaje' ? "0.01" : "0.01"}
                            min="0"
                            max={discountType === 'Porcentaje' ? "100" : undefined}
                            value={discountValue} 
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                            disabled={processing} 
                        />
                    </div>
                )}
                {paymentType === 'Crédito cliente' && (
                    <div>
                        <label htmlFor="modalEnganche" className="block text-sm font-medium text-gray-300 mb-1">Enganche:</label>
                        <input 
                            id="modalEnganche" 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={enganche} 
                            onChange={e => setEnganche(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full p-2 bg-dark-900 border border-dark-700 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-200" 
                            disabled={processing} 
                        />
                    </div>
                )}
            </div>
        </>
    );
}
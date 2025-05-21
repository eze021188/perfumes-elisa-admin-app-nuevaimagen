// src/components/checkout/CheckoutPaymentForm.jsx
import React from 'react';

// Helper simple para formatear moneda (debe ser consistente con el resto de tu app)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('es-CO', { // Ajusta 'es-CO' y 'COP' si es necesario
       style: 'currency',
       currency: 'COP',
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
   });
};

export default function CheckoutPaymentForm({
    originalSubtotal,
    discountAmount,
    subtotalConDescuento,
    gastosEnvio,
    setGastosEnvio,
    totalAntesDeCredito,
    loadingSaldoCliente,
    saldoAFavorDisponible,
    usarSaldoFavor,
    setUsarSaldoFavor,
    montoAplicadoDelSaldoFavor,
    totalFinalAPagar,
    paymentType,
    setPaymentType,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    enganche,
    setEnganche,
    processing
}) {
    return (
        <>
            <hr className="my-4" />
            <div className="text-right text-sm space-y-1">
                <p>Subtotal Original: <span className="font-medium">{formatCurrency(originalSubtotal)}</span></p>
                <p className="text-red-600">Descuento: <span className="font-medium">- {formatCurrency(discountAmount)}</span></p>
                <p>Subtotal (con desc.): <span className="font-medium">{formatCurrency(subtotalConDescuento)}</span></p>
                <div className="flex justify-end items-center mt-2">
                    <label htmlFor="modalGastosEnvio" className="text-sm font-medium text-gray-700 mr-2">Gastos de Envío:</label>
                    <input 
                        id="modalGastosEnvio" 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={gastosEnvio} 
                        onChange={e => setGastosEnvio(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right border rounded-md text-sm py-1 focus:ring-blue-500 focus:border-blue-500" 
                        disabled={processing} 
                    />
                </div>
                <p className="text-lg font-semibold mt-1">Total (antes de saldo a favor): <span className="font-medium">{formatCurrency(totalAntesDeCredito)}</span></p>

                {/* Opción para usar saldo a favor */}
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
                
                <p className="text-xl font-bold mt-2 pt-2 border-t border-gray-300">Total Final a Pagar: <span className="text-green-700">{formatCurrency(totalFinalAPagar)}</span></p>
            </div>

            <hr className="my-4" />

            <div className="space-y-4">
                <div>
                    <label htmlFor="modalPaymentType" className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago:</label>
                    <select 
                        id="modalPaymentType" 
                        value={paymentType} 
                        onChange={e => setPaymentType(e.target.value)}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                        disabled={processing || (totalFinalAPagar === 0 && montoAplicadoDelSaldoFavor > 0)}
                    >
                        <option value="">Selecciona una forma de pago</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Crédito cliente">Crédito cliente</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="modalDiscountType" className="block text-sm font-medium text-gray-700 mb-1">Descuento:</label>
                    <select 
                        id="modalDiscountType" 
                        value={discountType} 
                        onChange={e => { setDiscountType(e.target.value); setDiscountValue(0); }}
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                        disabled={processing}
                    >
                        <option value="Sin descuento">Sin descuento</option>
                        <option value="Por importe">Por importe ($)</option>
                        <option value="Por porcentaje">Por porcentaje (%)</option>
                    </select>
                </div>
                {discountType !== 'Sin descuento' && (
                    <div>
                        <label htmlFor="modalDiscountValue" className="block text-sm font-medium text-gray-700 mb-1">
                            Valor del Descuento ({discountType === 'Por importe' ? '$' : '%'}):
                        </label>
                        <input 
                            id="modalDiscountValue" 
                            type="number" 
                            step={discountType === 'Porcentaje' ? "1" : "0.01"} 
                            min={discountType === 'Porcentaje' ? "0" : "0"} 
                            max={discountType === 'Porcentaje' ? "100" : undefined}
                            value={discountValue} 
                            onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                            disabled={processing} 
                        />
                    </div>
                )}
                {paymentType === 'Crédito cliente' && (
                    <div>
                        <label htmlFor="modalEnganche" className="block text-sm font-medium text-gray-700 mb-1">Enganche:</label>
                        <input 
                            id="modalEnganche" 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={enganche} 
                            onChange={e => setEnganche(parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm disabled:opacity-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                            disabled={processing} 
                        />
                    </div>
                )}
            </div>
        </>
    );
}

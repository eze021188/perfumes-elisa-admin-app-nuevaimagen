// src/utils/formatters.js
export const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    // Redondear a 2 decimales y convertir a cadena de texto con toFixed.
    const fixedString = numericAmount.toFixed(2);
    // Convertir de nuevo a número para usar toLocaleString
    const finalAmount = parseFloat(fixedString);
    return finalAmount.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN', // Asegúrate de que sea MXN aquí
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
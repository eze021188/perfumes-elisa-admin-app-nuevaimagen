// src/pages/TestPDF.jsx
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function TestPDF() {
  const generarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Ticket de prueba', 10, 10);

    doc.autoTable({
      startY: 20,
      head: [['Producto', 'Cantidad', 'Precio']],
      body: [
        ['Perfume A', '2', '$100'],
        ['Perfume B', '1', '$150'],
      ],
    });

    doc.text('Total: $350', 10, doc.lastAutoTable.finalY + 10);

    doc.output('dataurlnewwindow');
  };

  return (
    <div className="p-6">
      <button
        onClick={generarPDF}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Ver PDF de prueba
      </button>
    </div>
  );
}

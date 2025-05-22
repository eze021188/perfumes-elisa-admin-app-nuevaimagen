// src/components/home/HomeChartContainer.jsx
import React from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2'; // MODIFICADO: Importar Bar

export default function HomeChartContainer({
  title,
  chartData,
  chartOptions,
  isLoading,
  chartType, // 'line', 'pie', 'doughnut', o 'bar'
  loadingError,
  noDataMessage = "No hay datos disponibles para este gráfico."
}) {
  
  const renderChart = () => {
    if (!chartData || !chartData.datasets || chartData.datasets.every(ds => ds.data.length === 0)) {
      return <p className="text-center text-sm text-slate-500 py-10">{noDataMessage}</p>;
    }
    if (chartType === 'line') {
      return <Line data={chartData} options={chartOptions} />;
    }
    if (chartType === 'pie' || chartType === 'doughnut') { 
      return <Pie data={chartData} options={chartOptions} />;
    }
    // MODIFICADO: Añadir caso para 'bar'
    if (chartType === 'bar') {
      return <Bar data={chartData} options={chartOptions} />;
    }
    return <p className="text-center text-sm text-red-500">Tipo de gráfico '{chartType}' no soportado.</p>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm h-full flex flex-col">
      <h2 className="text-lg font-semibold text-slate-700 mb-1">{title}</h2>
      <p className="text-xs text-slate-400 mb-4">Visualización de datos</p> {/* Subtítulo o descripción opcional */}
      
      <div className="flex-grow relative min-h-[250px] sm:min-h-[300px]"> {/* Altura mínima para el gráfico */}
        {isLoading ? (
          <div className="absolute inset-0 flex justify-center items-center bg-white/50 backdrop-blur-sm rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : loadingError ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-sm text-red-500 font-medium p-4">{loadingError}</p>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}

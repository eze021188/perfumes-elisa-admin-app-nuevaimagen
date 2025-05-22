// src/components/home/HomeChartContainer.jsx
import React from 'react';
import { Line, Pie } from 'react-chartjs-2';
// ChartJS y sus componentes ya deben estar registrados en tu Home.jsx o un archivo de configuración global de Chart.js

export default function HomeChartContainer({
  title,
  chartData,
  chartOptions,
  isLoading,
  chartType = 'line', // 'line' o 'pie'
  loadingError, // Mensaje de error si la carga falla
  noDataMessage = "No hay datos disponibles para mostrar." // Mensaje si no hay datos
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse h-80 flex items-center justify-center border border-gray-200">
        <div className="w-3/4 h-3/4 bg-gray-300 rounded"></div> {/* Placeholder más grande para gráfico */}
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-80 flex flex-col items-center justify-center border border-red-300">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">{title}</h3>
        <p className="text-center text-red-600 font-semibold">{loadingError}</p>
      </div>
    );
  }
  
  // Verifica si hay datos válidos para renderizar el gráfico
  // Para gráficos de pastel, necesitamos que datasets[0].data tenga elementos.
  // Para gráficos de línea, necesitamos que labels y datasets[0].data tengan elementos.
  const hasData = chartData && chartData.datasets && chartData.datasets.length > 0 && 
                  chartData.datasets[0].data && chartData.datasets[0].data.length > 0 &&
                  (chartType === 'pie' || (chartData.labels && chartData.labels.length > 0));


  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">{title}</h3>
      {hasData ? (
        <div className="h-64 w-full"> {/* Contenedor con altura fija para el gráfico */}
          {chartType === 'line' && <Line data={chartData} options={chartOptions} />}
          {chartType === 'pie' && <Pie data={chartData} options={chartOptions} />}
        </div>
      ) : (
        <div className="h-64 w-full flex items-center justify-center">
            <p className="text-center text-gray-500 italic">{noDataMessage}</p>
        </div>
      )}
    </div>
  );
}

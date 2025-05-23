import React from 'react';
import { Line, Pie, Bar } from 'react-chartjs-2';

export default function HomeChartContainer({
  title,
  chartData,
  chartOptions,
  isLoading,
  chartType,
  loadingError,
  noDataMessage = "No hay datos disponibles para este gráfico."
}) {
  const renderChart = () => {
    if (!chartData || !chartData.datasets || chartData.datasets.every(ds => ds.data.length === 0)) {
      return <p className="text-center text-gray-500 py-10">{noDataMessage}</p>;
    }

    const darkModeOptions = {
      ...chartOptions,
      scales: {
        ...chartOptions?.scales,
        x: {
          ...chartOptions?.scales?.x,
          grid: {
            ...chartOptions?.scales?.x?.grid,
            color: 'rgba(75, 85, 99, 0.2)',
          },
          ticks: {
            ...chartOptions?.scales?.x?.ticks,
            color: 'rgba(156, 163, 175, 0.8)',
          }
        },
        y: {
          ...chartOptions?.scales?.y,
          grid: {
            ...chartOptions?.scales?.y?.grid,
            color: 'rgba(75, 85, 99, 0.2)',
          },
          ticks: {
            ...chartOptions?.scales?.y?.ticks,
            color: 'rgba(156, 163, 175, 0.8)',
          }
        }
      },
      plugins: {
        ...chartOptions?.plugins,
        legend: {
          ...chartOptions?.plugins?.legend,
          labels: {
            ...chartOptions?.plugins?.legend?.labels,
            color: 'rgba(229, 231, 235, 0.9)',
          }
        },
        tooltip: {
          ...chartOptions?.plugins?.tooltip,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: 'rgba(243, 244, 246, 1)',
          bodyColor: 'rgba(229, 231, 235, 0.9)',
          borderColor: 'rgba(75, 85, 99, 0.3)',
          borderWidth: 1,
        }
      }
    };

    if (chartType === 'line') {
      return <Line data={chartData} options={darkModeOptions} />;
    }
    if (chartType === 'pie' || chartType === 'doughnut') { 
      return <Pie data={chartData} options={darkModeOptions} />;
    }
    if (chartType === 'bar') {
      return <Bar data={chartData} options={darkModeOptions} />;
    }
    
    return <p className="text-center text-error-400 text-sm">Tipo de gráfico '{chartType}' no soportado.</p>;
  };

  return (
    <div className="card-dark h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-100 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">Visualización de datos</p>
      
      <div className="flex-grow relative min-h-[250px] sm:min-h-[300px]">
        {isLoading ? (
          <div className="absolute inset-0 flex justify-center items-center bg-dark-900/50 backdrop-blur-sm rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400"></div>
          </div>
        ) : loadingError ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-center text-error-400 font-medium p-4">{loadingError}</p>
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  );
}
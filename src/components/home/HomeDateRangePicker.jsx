// src/components/home/HomeDateRangePicker.jsx
import React from 'react';

export default function HomeDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  // Estilos para los inputs de fecha para un look minimalista y profesional
  const dateInputClass = "bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm hover:border-slate-400 transition-colors duration-200";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
      <label htmlFor="startDate" className="text-sm font-medium text-slate-600 whitespace-nowrap">
        Rango:
      </label>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className={dateInputClass}
          aria-label="Fecha de inicio"
        />
        <span className="text-slate-500">-</span>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className={dateInputClass}
          aria-label="Fecha de fin"
        />
      </div>
    </div>
  );
}

import React from 'react';

export default function HomeDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center bg-dark-800/50 p-4 rounded-xl border border-dark-700/50 backdrop-blur-sm">
      <label htmlFor="startDate" className="text-sm font-medium text-gray-300 whitespace-nowrap">
        Rango:
      </label>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-inner-glow"
          aria-label="Fecha de inicio"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-inner-glow"
          aria-label="Fecha de fin"
        />
      </div>
    </div>
  );
}
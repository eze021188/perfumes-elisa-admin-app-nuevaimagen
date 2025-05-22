// src/components/home/HomeDateRangePicker.jsx
import React from 'react';

export default function HomeDateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4">
      <label htmlFor="startDate" className="text-gray-600 text-sm font-medium whitespace-nowrap">
        Rango de Fechas:
      </label>
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={e => onStartDateChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <span className="text-gray-600 hidden sm:inline">-</span>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={e => onEndDateChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}

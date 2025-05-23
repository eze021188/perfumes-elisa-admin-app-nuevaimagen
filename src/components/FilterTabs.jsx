// src/components/FilterTabs.jsx
import React from 'react';

const categories = [
  'All',
  'Hombre',
  'Mujer',
  'Unisex'
];

export default function FilterTabs({ filtro, setFiltro }) {
  return (
    <div className="flex space-x-2 overflow-x-auto border-b border-dark-700 bg-dark-800 p-2 rounded-t-lg">
      {categories.map(cat => {
        const isActive = filtro === cat;
        return (
          <button
            key={cat}
            onClick={() => setFiltro(cat)}
            className={`whitespace-nowrap py-2 px-4 text-sm font-medium focus:outline-none rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-900/50 text-primary-400 border border-primary-800/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
// src/components/FilterTabs.jsx
import React from 'react';

const categories = [
  'All',
  'Frag. Masculina',
  'Frag. Femenina',
  'Frag. Unisex'
];

export default function FilterTabs({ filtro, setFiltro }) {
  return (
    <div className="flex space-x-2 overflow-x-auto border-b bg-white p-2">
      {categories.map(cat => {
        const isActive = filtro === cat;
        return (
          <button
            key={cat}
            onClick={() => setFiltro(cat)}
            className={`whitespace-nowrap py-1 px-3 text-sm font-medium focus:outline-none ${
              isActive
                ? 'text-teal-500 border-b-2 border-teal-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

// src/components/Header.jsx
import React from 'react'

export default function Header({ onMenuClick }) {
  return (
    <header className="flex items-center justify-between bg-white px-6 py-4 shadow-md md:hidden">
      <button
        onClick={onMenuClick}
        aria-label="Toggle menu"
        className="text-2xl focus:outline-none"
      >
        ☰
      </button>
      <h2 className="text-xl font-semibold">Perfumes Elisa</h2>
    </header>
  )
}

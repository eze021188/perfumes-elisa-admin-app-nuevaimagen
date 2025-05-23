// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/globals.css'

// Para verificar que la URL de Supabase se carga correctamente
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)

// Aplicar la clase dark al documento para activar el modo oscuro
document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// src/components/AutocompleteInput.jsx
import { useState, useRef, useEffect } from 'react'

/**
 * Input con autocompletado y navegación por teclado
 * @param {Array<{ label: string, value: any }>} suggestions 
 * @param {string} value 
 * @param {(v: string) => void} onChange 
 * @param {(item: { label: string, value: any }) => void} onSelect 
 * @param {string} placeholder 
 */
export default function AutocompleteInput({
  suggestions = [],
  value,
  onChange,
  onSelect,
  placeholder = ''
}) {
  const [filtered, setFiltered] = useState([])
  const [showList, setShowList] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Filtrar sugerencias al escribir
  useEffect(() => {
    if (value) {
      const lower = value.toLowerCase()
      setFiltered(suggestions.filter(item =>
        item.label.toLowerCase().includes(lower)
      ))
      setShowList(true)
    } else {
      setFiltered([])
      setShowList(false)
    }
    setActiveIndex(-1)
  }, [value, suggestions])

  // Navegación por teclado
  const handleKeyDown = e => {
    if (!showList) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) selectItem(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowList(false)
    }
  }

  const selectItem = item => {
    onSelect(item)
    setShowList(false)
  }

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const onClickOutside = e => {
      if (
        listRef.current && !listRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowList(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={listRef}>
      <input
        ref={inputRef}
        type="text"
        className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value && setShowList(true)}
      />

      {showList && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-60 overflow-auto">
          {filtered.map((item, index) => (
            <li
              key={item.value}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                index === activeIndex ? 'bg-indigo-100' : ''
              }`}
              onMouseDown={() => selectItem(item)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

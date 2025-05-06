// src/pages/Clientes.jsx
import React, { useState, useEffect } from 'react';
import { useClientes } from '../contexts/ClientesContext';
import { supabase } from '../supabase';
import AutocompleteInput from '../components/AutocompleteInput';
import ModalCliente from '../components/ModalCliente';

export default function Clientes() {
  const {
    clientes,
    loading,
    obtenerClientes,
    agregarCliente,
    actualizarCliente,
    eliminarCliente,
  } = useClientes();

  const [searchText, setSearchText] = useState('');
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [comprasCliente, setComprasCliente] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  useEffect(() => {
    obtenerClientes();
  }, []);

  useEffect(() => {
    const lower = searchText.toLowerCase();
    const filtered = clientes.filter(c => c.nombre.toLowerCase().includes(lower));
    setFilteredClientes(filtered);
    setCurrentPage(1);
  }, [searchText, clientes]);

  const openNew = () => {
    setEditData(null);
    setModalOpen(true);
  };

  const openEdit = cliente => {
    setEditData(cliente);
    setModalOpen(true);
  };

  const handleSave = async data => {
    if (!data.nombre || !data.telefono || !data.correo) {
      alert('Por favor completa nombre, teléfono y correo electrónico.');
      return;
    }
    if (editData) {
      await actualizarCliente(editData.id, data);
    } else {
      await agregarCliente(data);
    }
    setModalOpen(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`¿Eliminar ${selectedIds.length} cliente(s)?`)) {
      for (const id of selectedIds) {
        await eliminarCliente(id);
      }
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const currentItems = paginatedClientes.map(c => c.id);
    const allSelected = currentItems.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentItems.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentItems])]);
    }
  };

  const totalPages = Math.ceil(filteredClientes.length / perPage);
  const paginatedClientes = filteredClientes.slice((currentPage - 1) * perPage, currentPage * perPage);

  const verComprasCliente = async (cliente) => {
    setClienteSeleccionado(cliente);
  
    const { data, error } = await supabase
      .from('ventas')
      .select('id, codigo_transaccion, fecha, total')
      .eq('cliente_id', cliente.id)
      .order('fecha', { ascending: false });
  
    if (error) {
      console.error('Error al obtener ventas del cliente:', error);
      setComprasCliente([]);
    } else {
      setComprasCliente(data);
    }
  };    

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          onClick={() => setCurrentPage(1)}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          Volver al inicio
        </button>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Agregar cliente
        </button>
        <div className="flex-1 min-w-0">
          <AutocompleteInput
            className="w-full"
            suggestions={(clientes || []).map(c => ({ label: c.nombre, value: c.id }))}
            value={searchText}
            onChange={setSearchText}
            onSelect={item => setSearchText(item.label)}
            placeholder="Buscar cliente..."
          />
        </div>
        <button
          disabled={selectedIds.length === 0}
          onClick={handleDeleteSelected}
          className={`px-4 py-2 rounded text-white ${selectedIds.length === 0 ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
        >
          Eliminar {selectedIds.length} seleccionados
        </button>
      </div>

      <div className="flex items-center justify-between mb-2">
        <select
          value={perPage}
          onChange={e => setPerPage(Number(e.target.value))}
          className="px-2 py-1 border rounded"
        >
          {[25, 50, 100, 200].map(n => (
            <option key={n} value={n}>{n} por página</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Cargando clientes...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">
                  <input type="checkbox" onChange={toggleSelectAll} checked={paginatedClientes.every(c => selectedIds.includes(c.id))} />
                </th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.map(cliente => (
                <tr key={cliente.id} className="border-b">
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={selectedIds.includes(cliente.id)} onChange={() => toggleSelect(cliente.id)} />
                  </td>
                  <td className="px-4 py-2">{cliente.nombre}</td>
                  <td className="px-4 py-2">{cliente.telefono}</td>
                  <td className="px-4 py-2">{cliente.correo}</td>
                  <td className="px-4 py-2">{cliente.direccion || '-'}</td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      onClick={() => openEdit(cliente)}
                      className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => verComprasCliente(cliente)}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Ver compras
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lista de compras del cliente */}
      {clienteSeleccionado && (
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-2">
  Compras de {clienteSeleccionado.nombre}:
</h2>
{comprasCliente.length === 0 ? (
  <p className="text-gray-500">Este cliente no tiene ventas registradas.</p>
) : (
  <ul className="list-disc list-inside space-y-1">
    {comprasCliente.map(venta => (
      <li key={venta.id}>
        Venta: <strong>{venta.codigo_transaccion}</strong> — Fecha: {new Date(venta.fecha).toLocaleDateString()} — Total: ${venta.total}
      </li>
    ))}
  </ul>
)}

        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-600">
          Página {currentPage} de {totalPages}
        </p>
        <div className="space-x-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <ModalCliente
        isOpen={modalOpen}
        initialData={editData || undefined}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

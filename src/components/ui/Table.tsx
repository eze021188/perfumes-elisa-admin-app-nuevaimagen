import React from 'react';

interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  noDataMessage?: string;
  onRowClick?: (item: T) => void;
  hoverEffect?: boolean;
  className?: string;
}

function Table<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  noDataMessage = 'No hay datos disponibles',
  onRowClick,
  hoverEffect = true,
  className = '',
}: TableProps<T>) {
  const renderCell = (item: T, column: TableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    
    return item[column.accessor] as React.ReactNode;
  };

  if (isLoading) {
    return (
      <div className="bg-white overflow-hidden shadow-sm rounded-lg">
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white overflow-hidden shadow-sm rounded-lg ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${
                    hoverEffect ? 'hover:bg-gray-50' : ''
                  }`}
                >
                  {columns.map((column, index) => (
                    <td
                      key={index}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${column.className || ''}`}
                    >
                      {renderCell(item, column)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  {noDataMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
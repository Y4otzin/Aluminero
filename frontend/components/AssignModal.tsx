'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Check, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface AssignModalProps {
  open: boolean;
  title?: string;
  orderNumber?: string;
  onClose: () => void;
  onAssign: (userId: string) => Promise<void>;
}

export default function AssignModal({
  open,
  title = 'Asignar orden de producción',
  orderNumber,
  onClose,
  onAssign,
}: AssignModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setSelectedUserId('');
    setError(null);
    setLoadingUsers(true);

    // Intentar cargar usuarios del endpoint de producción
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    fetch(`${API_URL}/api/v1/users?role=produccion`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
        return res.json();
      })
      .then((data: UserOption[]) => {
        setUsers(data);
      })
      .catch(() => {
        // Fallback: cargar todos los usuarios
        return fetch(`${API_URL}/api/v1/users`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        })
          .then((res) => {
            if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
            return res.json();
          })
          .then((data: UserOption[]) => {
            setUsers(data);
          })
          .catch((err) => {
            setError(err.message || 'Error al cargar usuarios');
            setUsers([]);
          });
      })
      .finally(() => setLoadingUsers(false));
  }, [open]);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setAssigning(true);
    setError(null);
    try {
      await onAssign(selectedUserId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar';
      setError(msg);
    } finally {
      setAssigning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1e40af]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#1e40af]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {orderNumber && (
                <p className="text-sm text-gray-500 font-mono">{orderNumber}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#1e40af]" />
              <p className="text-sm text-gray-500">Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoadingUsers(true);
                  setError(null);
                  // Retry
                  const API_URL =
                    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  fetch(`${API_URL}/api/v1/users`, {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                    },
                  })
                    .then((res) => {
                      if (!res.ok) throw new Error('Error');
                      return res.json();
                    })
                    .then((data: UserOption[]) => {
                      setUsers(data);
                    })
                    .catch((err) => {
                      setError(err.message || 'Error al cargar usuarios');
                    })
                    .finally(() => setLoadingUsers(false));
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No hay usuarios disponibles
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Asegúrate de que existan usuarios de producción registrados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Selecciona un usuario para asignar esta orden:
              </p>

              {/* User list */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left
                      transition-all duration-150 border
                      ${
                        selectedUserId === user.id
                          ? 'border-[#1e40af] bg-[#1e40af]/5 ring-1 ring-[#1e40af]/20'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${
                          selectedUserId === user.id
                            ? 'bg-[#1e40af] text-white'
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    {selectedUserId === user.id && (
                      <Check className="w-5 h-5 text-[#1e40af]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={
              assigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )
            }
            onClick={handleAssign}
            isLoading={assigning}
            disabled={!selectedUserId || assigning}
          >
            {assigning ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

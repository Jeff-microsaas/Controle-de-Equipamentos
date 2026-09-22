import React, { useState } from 'react';
import { MonthSheetData } from '../types';
import { getMonthYear } from '../utils/calculations';
import { Trash2, AlertTriangle, X, Lock } from 'lucide-react';

interface DeleteTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: MonthSheetData | null;
  onConfirmDelete: (monthId: string) => Promise<void> | void;
  totalTabsCount: number;
}

export const DeleteTabModal: React.FC<DeleteTabModalProps> = ({
  isOpen,
  onClose,
  month,
  onConfirmDelete,
  totalTabsCount,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !month) return null;

  const year = getMonthYear(month);
  const installationsCount = month.installations?.length || 0;
  const forecastsCount = month.forecasts?.length || 0;
  const isOnlyTab = totalTabsCount <= 1;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(month.id);
      onClose();
    } catch (err) {
      console.error('Erro ao excluir aba:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-red-600 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <Trash2 className="w-5 h-5 text-red-200" />
            <span>Confirmar Exclusão de Aba</span>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-red-200 hover:text-white transition-colors p-1 rounded hover:bg-red-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-950">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-extrabold text-sm text-red-900">
                Atenção: Ação Irreversível de Administrador
              </p>
              <p className="text-red-800">
                Você está prestes a excluir permanentemente esta aba do sistema e do banco de dados.
              </p>
            </div>
          </div>

          {/* Details of Month */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Nome da Aba:</span>
              <span className="font-black text-slate-900 text-sm uppercase">
                {month.monthName} / {year}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Situação:</span>
              {month.isFinalized ? (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                  <Lock className="w-3 h-3 text-amber-700" /> Arquivado (Consulta)
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px]">
                  Mês Ativo / Em Edição
                </span>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Instalações cadastradas:</span>
              <span className="font-bold text-slate-800">{installationsCount} ordens de serviço</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Previsões registradas:</span>
              <span className="font-bold text-slate-800">{forecastsCount} registros</span>
            </div>
          </div>

          {isOnlyTab ? (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs p-3 rounded-md font-medium">
              Não é possível excluir a única aba existente na planilha. Crie ou ative outra aba antes de remover esta.
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Tem certeza que deseja prosseguir com a exclusão da aba <strong className="text-slate-900">{month.monthName}</strong>?
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || isOnlyTab}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Esta Aba'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

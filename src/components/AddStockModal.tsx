import React, { useState } from 'react';
import { StockItem, StockReformedItem, ControllerItem } from '../types';
import { PackagePlus, X, AlertCircle, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStock: StockItem[];
  reformedStock: StockReformedItem[];
  controllers: ControllerItem[];
  onAddStock: (
    type: 'initial' | 'reformed' | 'controller',
    itemId: string,
    addedQuantity: number,
    reason: string
  ) => void;
  isAdmin: boolean;
  monthName: string;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  initialStock,
  reformedStock,
  controllers,
  onAddStock,
  isAdmin,
  monthName,
}) => {
  const [stockType, setStockType] = useState<'initial' | 'reformed' | 'controller'>('initial');
  const [selectedId, setSelectedId] = useState<string>(initialStock[0]?.id || '');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentList =
    stockType === 'initial'
      ? initialStock
      : stockType === 'reformed'
      ? reformedStock
      : controllers;

  // Selected item
  const selectedItem = currentList.find((i) => i.id === selectedId) || currentList[0];
  const currentQtd = selectedItem
    ? 'qtdInicial' in selectedItem
      ? selectedItem.qtdInicial
      : selectedItem.qtd
    : 0;

  const itemName = selectedItem
    ? 'equipamento' in selectedItem
      ? selectedItem.equipamento
      : selectedItem.nome
    : '';

  const addedNum = parseInt(quantity, 10) || 0;
  const newQtd = currentQtd + addedNum;

  const handleTypeChange = (type: 'initial' | 'reformed' | 'controller') => {
    setStockType(type);
    const list =
      type === 'initial'
        ? initialStock
        : type === 'reformed'
        ? reformedStock
        : controllers;
    if (list.length > 0) {
      setSelectedId(list[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdmin) {
      setError('Acesso negado: Somente administradores podem adicionar quantidades ao estoque.');
      return;
    }

    if (!selectedItem) {
      setError('Selecione um equipamento válido.');
      return;
    }

    if (isNaN(addedNum) || addedNum <= 0) {
      setError('Informe uma quantidade positiva maior que zero para adicionar.');
      return;
    }

    onAddStock(
      stockType,
      selectedItem.id,
      addedNum,
      reason.trim() || 'Entrada / Adição ao estoque'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#107c41] px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PackagePlus className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">Adicionar Quantidade ao Estoque</h3>
              <p className="text-[11px] text-emerald-100">
                Aba: <span className="font-semibold text-white">{monthName}</span> &bull; Exclusivo para Administrador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Acesso Restrito ao Administrador</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Somente usuários com perfil de <strong>Administrador</strong> têm permissão para adicionar ou alterar quantidades no estoque inicial.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Categoria do Equipamento
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleTypeChange('initial')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    stockType === 'initial'
                      ? 'border-[#107c41] bg-emerald-50 text-[#107c41] font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Novos
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('reformed')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    stockType === 'reformed'
                      ? 'border-[#107c41] bg-emerald-50 text-[#107c41] font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Reformados
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('controller')}
                  className={`py-2 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                    stockType === 'controller'
                      ? 'border-[#107c41] bg-emerald-50 text-[#107c41] font-bold shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Controladoras
                </button>
              </div>
            </div>

            {/* Select Item */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Selecione o Item
              </label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#107c41]"
              >
                {currentList.map((item) => {
                  const name = 'equipamento' in item ? item.equipamento : item.nome;
                  const current = 'qtdInicial' in item ? item.qtdInicial : item.qtd;
                  return (
                    <option key={item.id} value={item.id}>
                      {name} (Atual: {current})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quantity to add */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Qtd a Adicionar (+)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-[#107c41] focus:bg-white"
                />
              </div>

              {/* Preview card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-medium">Novo Saldo Inicial</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono line-through">{currentQtd}</span>
                  <ArrowRight className="w-3 h-3 text-[#107c41]" />
                  <span className="text-base font-extrabold text-[#107c41] font-mono">{newQtd}</span>
                </div>
              </div>
            </div>

            {/* Quick addition buttons */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-medium">Atalhos rápidos:</span>
              {[5, 10, 20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuantity(String(num))}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer"
                >
                  +{num}
                </button>
              ))}
            </div>

            {/* Reason / Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Motivo / Justificativa para o Histórico (Opcional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Chegada de remessa de compra NF 1042 / Reposição de estoque"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#107c41] focus:bg-white"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Esta alteração será salva no banco de dados e registrada no <strong>Histórico de Atividades</strong> com seu usuário e data/hora.
              </span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#107c41] hover:bg-[#0e6b37] text-white rounded-lg text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                Confirmar Adição (+{addedNum})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

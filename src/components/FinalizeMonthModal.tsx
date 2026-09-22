import React, { useState } from 'react';
import { MonthSheetData } from '../types';
import {
  calculateCurrentStock,
  getNextMonthDetails,
  getMonthYear,
} from '../utils/calculations';
import { X, CheckCircle2, ArrowRight, ShieldAlert, Calendar, ArrowRightLeft, Lock } from 'lucide-react';

interface FinalizeMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: MonthSheetData;
  onFinalizeAndStartNext: (
    finalizedMonthId: string,
    nextMonthData: {
      name: string;
      year: number;
      carryOverStock: boolean;
    }
  ) => Promise<void>;
}

export const FinalizeMonthModal: React.FC<FinalizeMonthModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  onFinalizeAndStartNext,
}) => {
  const nextDefaults = getNextMonthDetails(currentMonth);
  const curYear = Math.max(2026, getMonthYear(currentMonth));
  const defaultNextYear = Math.max(2026, nextDefaults.year);

  const [nextMonthName, setNextMonthName] = useState(nextDefaults.name);
  const [nextMonthYear, setNextMonthYear] = useState<number>(defaultNextYear);
  const [carryOverStock, setCarryOverStock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Live closing stock calculation
  const closingStock = calculateCurrentStock(
    currentMonth.initialStock,
    currentMonth.reformedStock,
    currentMonth.controllers,
    currentMonth.installations
  );

  const totalInstalled = currentMonth.installations.filter((r) => r.status === 'Enviado/Instalado').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nextMonthName.trim().toUpperCase();
    if (!cleanName) {
      setErrorMsg('Por favor, informe o nome do próximo mês.');
      return;
    }
    if (!nextMonthYear || nextMonthYear < 2026 || nextMonthYear > 2099) {
      setErrorMsg('Por favor, informe um ano válido (a partir de 2026).');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onFinalizeAndStartNext(currentMonth.id, {
        name: cleanName,
        year: Number(nextMonthYear),
        carryOverStock,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao concluir mês e iniciar o próximo.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-700 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-700/80 border border-emerald-500 flex items-center justify-center text-white">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">
                Concluir Mês Vigente e Iniciar Próximo
              </h2>
              <p className="text-xs text-emerald-200">
                O mês atual será arquivado para consulta e o próximo será o novo mês ativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-emerald-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 text-xs rounded-r">
              {errorMsg}
            </div>
          )}

          {/* Current Month Summary Card */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-600" />
                <span className="font-extrabold text-slate-800 text-sm">
                  Fechamento do Mês: <span className="text-emerald-900 font-black">{currentMonth.monthName} / {curYear}</span>
                </span>
              </div>
              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px] border border-amber-300">
                Passará a ser Mês de Consulta
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-slate-700">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Instalações Enviadas</span>
                <span className="text-base font-black text-emerald-700">{totalInstalled} un.</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Previsões Registradas</span>
                <span className="text-base font-black text-blue-700">{currentMonth.forecasts?.length || 0} obras</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Destino do Mês</span>
                <span className="text-xs font-bold text-slate-800">Aba Arquivo {curYear}</span>
              </div>
            </div>
          </div>

          {/* Next Month Settings */}
          <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="font-black text-emerald-950 text-sm">
                Dados do Novo Mês (Novo Mês Vigente)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Nome do Mês:
                </label>
                <input
                  type="text"
                  required
                  value={nextMonthName}
                  onChange={(e) => setNextMonthName(e.target.value.toUpperCase())}
                  placeholder="Ex: OUTUBRO"
                  className="w-full bg-white border border-emerald-400 rounded-md px-3 py-1.5 text-slate-900 font-bold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Ano de Referência:
                </label>
                <input
                  type="number"
                  required
                  min={2020}
                  max={2099}
                  value={nextMonthYear}
                  onChange={(e) => setNextMonthYear(Number(e.target.value))}
                  placeholder="Ex: 2024"
                  className="w-full bg-white border border-emerald-400 rounded-md px-3 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Carry-over Stock Checkbox */}
            <div className="pt-2 border-t border-emerald-200">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={carryOverStock}
                  onChange={(e) => setCarryOverStock(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-emerald-400 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                    Transferir o saldo final do Quadro Estoque Atual como estoque inicial do novo mês
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Recomendado: os saldos remanescentes de equipamentos novos, reformados e controladoras serão o ponto de partida do novo mês.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Balance Transfer Preview Table */}
          {carryOverStock && (
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
              <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-800 text-[11px] border-b border-slate-200 flex items-center justify-between">
                <span>Demonstrativo dos Saldos a Transferir:</span>
                <span className="text-[10px] text-slate-500">Saldo Atual ➔ Novo Inicial</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="px-2.5 py-1 text-left">Equipamento</th>
                      <th className="px-2 py-1 text-center w-28">Tipo</th>
                      <th className="px-2 py-1 text-center w-24">Saldo a Iniciar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {closingStock.initialStock.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1 font-sans text-slate-800">{it.equipamento}</td>
                        <td className="px-2 py-1 text-center text-slate-500 font-sans text-[10px]">Novo</td>
                        <td className="px-2 py-1 text-center font-bold text-emerald-800">{Math.max(0, it.available)} un.</td>
                      </tr>
                    ))}
                    {closingStock.reformedStock.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1 font-sans text-slate-800">{it.equipamento}</td>
                        <td className="px-2 py-1 text-center text-amber-700 font-sans text-[10px]">Reformado</td>
                        <td className="px-2 py-1 text-center font-bold text-amber-800">{Math.max(0, it.available)} un.</td>
                      </tr>
                    ))}
                    {closingStock.controllers.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-2.5 py-1 font-sans text-slate-800">{it.nome}</td>
                        <td className="px-2 py-1 text-center text-blue-700 font-sans text-[10px]">Controladora</td>
                        <td className="px-2 py-1 text-center font-bold text-blue-800">{Math.max(0, it.available)} un.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Important Rules Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed space-y-1">
              <p className="font-bold text-blue-950">Como funcionará após a conclusão:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-900">
                <li>O mês <b>{currentMonth.monthName}</b> ficará arquivado na aba de consulta do ano <b>{curYear}</b>.</li>
                <li>O novo mês <b>{nextMonthName || 'NOVO MÊS'}</b> será criado e destacado nas abas como <b>MÊS VIGENTE</b>.</li>
                <li>O Resumo Anual poderá ser visualizado por qualquer ano desejado com histórico completo.</li>
              </ul>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-black rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Concluindo e Criando...</span>
              ) : (
                <>
                  <span>Concluir {currentMonth.monthName} e Iniciar {nextMonthName || 'Próximo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

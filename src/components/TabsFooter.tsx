import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Edit2,
  Copy,
  Trash2,
  X,
  Lock,
  Calendar,
  FolderArchive,
  ChevronDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MonthSheetData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getMonthYear } from '../utils/calculations';

interface TabsFooterProps {
  tabs: MonthSheetData[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: (name: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onDeleteTab: (tabId: string) => void;
  onRequestDeleteTab?: (tab: MonthSheetData) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  summaryActive: boolean;
  onSelectSummary: () => void;
  isAdmin?: boolean;
  onOpenFinalizeModal?: () => void;
}

export const TabsFooter: React.FC<TabsFooterProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onDuplicateTab,
  onDeleteTab,
  onRequestDeleteTab,
  onRenameTab,
  summaryActive,
  onSelectSummary,
  isAdmin: propIsAdmin,
  onOpenFinalizeModal,
}) => {
  const { isAdmin: authIsAdmin, isRelbio } = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;

  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Dropdown for Year Archive tab
  const [openYearMenu, setOpenYearMenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close year dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenYearMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group finalized months by year
  const { finalizedByYear, activeMonths } = useMemo(() => {
    // Para usuário Relbio: ele só vê a aba do mês vigente!
    if (isRelbio) {
      const vigente = tabs.find((t) => t.isCurrent) || tabs.find((t) => !t.isFinalized) || tabs[0];
      return {
        finalizedByYear: {} as Record<number, MonthSheetData[]>,
        activeMonths: vigente ? [vigente] : [],
      };
    }

    const finalized: Record<number, MonthSheetData[]> = {};
    const unfinalized: MonthSheetData[] = [];

    tabs.forEach((tab) => {
      const year = getMonthYear(tab);
      // Anos anteriores como 2024 e 2025 não precisa mostrar
      if (year < 2026) return;

      if (tab.isFinalized) {
        if (!finalized[year]) finalized[year] = [];
        finalized[year].push(tab);
      } else {
        unfinalized.push(tab);
      }
    });

    // If everything is finalized, keep the last tab of >= 2026 as active
    if (unfinalized.length === 0) {
      const validTabs = tabs.filter((t) => getMonthYear(t) >= 2026);
      if (validTabs.length > 0) {
        unfinalized.push(validTabs[validTabs.length - 1]);
      }
    }

    return { finalizedByYear: finalized, activeMonths: unfinalized };
  }, [tabs, isRelbio]);

  const finalizedYears = useMemo(() => {
    return Object.keys(finalizedByYear)
      .map(Number)
      .filter((y) => y >= 2026)
      .sort((a, b) => a - b);
  }, [finalizedByYear]);

  const handleConfirmAdd = () => {
    if (!isAdmin) {
      alert('Apenas usuários administradores têm permissão para criar novas abas.');
      setIsAddingTab(false);
      return;
    }
    if (newTabName.trim()) {
      onAddTab(newTabName.trim().toUpperCase());
      setNewTabName('');
      setIsAddingTab(false);
    }
  };

  const handleStartRename = (tab: MonthSheetData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.monthName);
  };

  const handleConfirmRename = () => {
    if (editingTabId && editName.trim()) {
      onRenameTab(editingTabId, editName.trim().toUpperCase());
      setEditingTabId(null);
    }
  };

  // Find if currently active tab belongs to a finalized year
  const activeFinalizedYear = useMemo(() => {
    if (summaryActive) return null;
    for (const y of finalizedYears) {
      if (finalizedByYear[y]?.some((m) => m.id === activeTabId)) {
        return y;
      }
    }
    return null;
  }, [finalizedYears, finalizedByYear, activeTabId, summaryActive]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#dedede] border-t-2 border-slate-400 px-2 py-1 flex items-center justify-between z-30 select-none print:hidden shadow-lg">
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 mr-4 py-0.5">
        {/* Navigation arrows */}
        <div className="flex items-center text-slate-600 mr-1">
          <button className="p-1 hover:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-slate-300 rounded text-slate-700 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Items Container */}
        <div className="flex items-center gap-1.5" ref={menuRef}>
          {/* 1. ARCHIVED YEAR TABS (Meses finalizados agrupados por ano apenas para consulta) */}
          {finalizedYears.map((year) => {
            const monthsInYear = finalizedByYear[year] || [];
            const isYearActive = activeFinalizedYear === year;
            const currentSelectedMonthInYear = monthsInYear.find((m) => m.id === activeTabId);
            const isMenuOpen = openYearMenu === year;

            return (
              <div key={`year-${year}`} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    // Toggle dropdown or select first month in year
                    if (isMenuOpen) {
                      setOpenYearMenu(null);
                    } else {
                      setOpenYearMenu(year);
                      if (!isYearActive && monthsInYear.length > 0) {
                        onSelectTab(monthsInYear[0].id);
                      }
                    }
                  }}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer rounded-t border-t-2 transition-all shadow-xs ${
                    isYearActive
                      ? 'bg-slate-800 text-amber-300 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-400'
                  }`}
                  title={`Aba do Ano ${year}: ${monthsInYear.length} mês(es) finalizado(s) apenas para consulta`}
                >
                  <FolderArchive className={`w-3.5 h-3.5 ${isYearActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span>Ano {year}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${isYearActive ? 'bg-slate-900 text-amber-200' : 'bg-slate-300 text-slate-700'}`}>
                    Consulta
                  </span>
                  {currentSelectedMonthInYear && (
                    <span className="text-[10px] font-black text-white bg-amber-600/90 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      {currentSelectedMonthInYear.monthName}
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown with months inside this year */}
                {isMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border-2 border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                    <div className="bg-slate-800 text-amber-300 px-3 py-1.5 text-[11px] font-black flex items-center justify-between border-b border-slate-700">
                      <span className="flex items-center gap-1.5">
                        <FolderArchive className="w-3.5 h-3.5" />
                        ARQUIVO {year} (APENAS CONSULTA)
                      </span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.2 rounded">
                        {monthsInYear.length} {monthsInYear.length === 1 ? 'mês' : 'meses'}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {monthsInYear.map((m) => {
                        const isSelected = activeTabId === m.id && !summaryActive;
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              onSelectTab(m.id);
                              setOpenYearMenu(null);
                            }}
                            className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-100 text-amber-950 font-black border-l-4 border-amber-600'
                                : 'hover:bg-slate-100 text-slate-800 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Lock className="w-3 h-3 text-amber-700" />
                              <span>{m.monthName}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {m.installations.length} inst.
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                              {isAdmin && tabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenYearMenu(null);
                                    if (onRequestDeleteTab) {
                                      onRequestDeleteTab(m);
                                    } else {
                                      onDeleteTab(m.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title={`Excluir aba arquivada ${m.monthName} (Administrador)`}
                                >
                                  <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. ACTIVE MONTHS (Com destaque especial para o MÊS VIGENTE) */}
          {activeMonths.map((tab) => {
            const isActive = !summaryActive && activeTabId === tab.id;
            const isEditing = editingTabId === tab.id;
            const isVigente = Boolean(tab.isCurrent) || (!tab.isFinalized && activeMonths.length === 1);
            const tabYear = getMonthYear(tab);

            return (
              <div
                key={tab.id}
                onClick={() => {
                  if (!isEditing) onSelectTab(tab.id);
                }}
                className={`group relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold cursor-pointer rounded-t transition-all ${
                  isVigente
                    ? isActive
                      ? 'bg-emerald-800 text-white border-t-3 border-emerald-400 shadow-md ring-2 ring-emerald-400/60 font-black'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-t-3 border-emerald-600 font-extrabold ring-1 ring-emerald-400/40'
                    : tab.isFinalized
                    ? isActive
                      ? 'bg-amber-100 text-amber-950 border-t-3 border-amber-500 shadow-sm font-black'
                      : 'bg-amber-50/80 text-amber-900 hover:bg-amber-100 border-t-2 border-transparent'
                    : isActive
                    ? 'bg-white text-slate-900 border-t-2 border-slate-700 shadow-sm'
                    : 'bg-[#f0f0f0] text-slate-700 hover:bg-slate-200 border-t-2 border-transparent'
                }`}
                title={isVigente ? `Mês Vigente em Edição Ativa: ${tab.monthName} / ${tabYear}` : tab.monthName}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename();
                        if (e.key === 'Escape') setEditingTabId(null);
                      }}
                      autoFocus
                      className="w-24 px-1 py-0.5 border border-emerald-600 rounded text-xs uppercase font-bold outline-none bg-white text-slate-900"
                    />
                    <button onClick={handleConfirmRename} className="text-emerald-700 p-0.5 hover:bg-emerald-100 rounded">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingTabId(null)} className="text-red-600 p-0.5 hover:bg-red-100 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Visual Badge for Mês Vigente */}
                    {isVigente && (
                      <span className="flex items-center gap-1 bg-black/20 text-emerald-200 px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                        VIGENTE
                      </span>
                    )}

                    <span>
                      {tab.monthName.includes(String(tabYear)) ? tab.monthName : `${tab.monthName} / ${tabYear}`}
                    </span>

                    {/* Quick action buttons on hover */}
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1 opacity-90 hover:opacity-100">
                      {isAdmin && !tab.isFinalized && (
                        <button
                          onClick={(e) => handleStartRename(tab, e)}
                          className="p-1 hover:text-blue-700 rounded hover:bg-black/10"
                          title="Renomear aba"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateTab(tab.id);
                          }}
                          className="p-1 hover:text-emerald-700 rounded hover:bg-black/10"
                          title="Duplicar aba (Administrador)"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {isAdmin && tabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRequestDeleteTab) {
                              onRequestDeleteTab(tab);
                            } else {
                              onDeleteTab(tab.id);
                            }
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100/90 rounded transition-colors"
                          title="Excluir aba (Administrador)"
                        >
                          <Trash2 className="w-3 h-3 text-red-600 font-bold" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* 3. BUTTON TO CONCLUDE CURRENT MONTH AND START NEXT */}
          {onOpenFinalizeModal && !isRelbio && (
            <button
              type="button"
              onClick={onOpenFinalizeModal}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black bg-indigo-700 hover:bg-indigo-800 text-white rounded-md transition-all shadow-xs cursor-pointer border border-indigo-500 ml-1"
              title="Concluir o mês vigente, arquivá-lo para consulta e abrir o próximo mês"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-200" />
              <span>Concluir Mês / Próximo</span>
            </button>
          )}

          {/* 4. RESUMO ANUAL TAB */}
          {!isRelbio && (
            <div
              onClick={onSelectSummary}
              className={`px-3 py-1.5 text-xs font-bold cursor-pointer rounded-t border-t-2 transition-all ${
                summaryActive
                  ? 'bg-white text-emerald-800 border-emerald-600 shadow-sm font-black'
                  : 'bg-[#f0f0f0] text-slate-700 hover:bg-slate-200 border-transparent'
              }`}
            >
              📊 RESUMO ANUAL
            </div>
          )}

          {/* 5. ADD TAB BUTTON - Restrito a Administrador */}
          {isAdmin ? (
            isAddingTab ? (
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-t border-t-2 border-emerald-600 shadow-sm">
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 select-none">
                  {new Date().getFullYear() >= 2026 ? new Date().getFullYear() : 2026}
                </span>
                <input
                  type="text"
                  placeholder="EX: OUTUBRO"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmAdd();
                    if (e.key === 'Escape') setIsAddingTab(false);
                  }}
                  autoFocus
                  className="w-28 px-1.5 py-0.5 border border-slate-300 rounded text-xs uppercase font-bold outline-none"
                  title="A nova aba será criada automaticamente no ano vigente"
                />
                <button onClick={handleConfirmAdd} className="p-0.5 text-emerald-700 hover:bg-emerald-50 rounded" title="Confirmar criação no ano vigente">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsAddingTab(false)} className="p-0.5 text-slate-500 hover:bg-slate-100 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTab(true)}
                className="p-1 hover:bg-slate-300 text-slate-700 rounded transition-colors cursor-pointer"
                title="Adicionar nova planilha / mês manualmente (Administrador)"
              >
                <Plus className="w-4 h-4" />
              </button>
            )
          ) : (
            <span
              className="p-1 text-slate-400 cursor-not-allowed inline-flex items-center gap-1 text-[11px] font-medium"
              title="Apenas usuários administradores podem criar novas abas"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
        </div>
      </div>

      {/* Right Excel status info */}
      <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-600 font-medium">
        <span>Modo: <b className="text-slate-800">Pronto</b></span>
        <div className="h-3 w-px bg-slate-300" />
        <span>Planilhas: <b>{tabs.length} ({finalizedYears.length > 0 ? `${finalizedYears.length} ano(s) arquivado(s)` : '1 ano'})</b></span>
      </div>
    </footer>
  );
};

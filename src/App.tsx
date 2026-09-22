import React, { useState, useEffect, useRef } from 'react';
import { MonthSheetData, InstallationRow, ForecastRow, StockItem, StockReformedItem, ControllerItem, AvailableStockItem } from './types';
import { INITIAL_MONTHS } from './data/initialData';
import { calculateForecastTotals, calculateCurrentStock, getMonthYear } from './utils/calculations';
import { SpreadsheetHeader } from './components/SpreadsheetHeader';
import { InstallationsTable } from './components/InstallationsTable';
import { ForecastTable } from './components/ForecastTable';
import { TopRightStockTable, MiddleBottomSection } from './components/StockTables';
import { AnnualSummaryTab } from './components/AnnualSummaryTab';
import { TabsFooter } from './components/TabsFooter';
import { HelpModal } from './components/HelpModal';
import { HistoryModal } from './components/HistoryModal';
import { UsersManagementModal } from './components/UsersManagementModal';
import { AddStockModal } from './components/AddStockModal';
import { FinalizeMonthModal } from './components/FinalizeMonthModal';
import { DeleteTabModal } from './components/DeleteTabModal';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { Lock, CheckCircle2, Calendar, ArrowRight, Trash2 } from 'lucide-react';
import {
  loadMonthsFromDb,
  saveMonthToDb,
  deleteMonthFromDb,
} from './services/firestoreService';

const STORAGE_KEY = 'equip_control_sheets_v2';

// Helper to determine the current vigente month ID
function getVigenteMonthId(list: MonthSheetData[]): string {
  if (!list || list.length === 0) return 'setembro';
  const current = list.find((m) => m.isCurrent);
  if (current) return current.id;
  const unfinalized = list.find((m) => !m.isFinalized);
  if (unfinalized) return unfinalized.id;
  return list[0].id;
}

export default function App() {
  const {
    currentUser,
    loading: authLoading,
    logout,
    isAdmin,
    isAnalyst,
    isRelbio,
    canEditStock,
    canEditForecast,
    canManageTabs,
    onlyCurrentMonth,
  } = useAuth();

  // State for all months
  const [months, setMonths] = useState<MonthSheetData[]>(INITIAL_MONTHS);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active month tab - Por padrão manter sempre no mês vigente a tela
  const [activeTabId, setActiveTabId] = useState<string>(() => getVigenteMonthId(INITIAL_MONTHS));
  const [summaryActive, setSummaryActive] = useState<boolean>(false);

  // Selected cell tracking for formula bar
  const [selectedCellRef, setSelectedCellRef] = useState<string | null>(null);
  const [selectedCellValue, setSelectedCellValue] = useState<string>('');

  // Global search term
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<MonthSheetData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Debounce ref for saving month changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from Firestore on initial login / page refresh
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    const fetchDb = async () => {
      setIsSyncing(true);
      try {
        const dbMonths = await loadMonthsFromDb();
        if (isMounted && dbMonths && dbMonths.length > 0) {
          setMonths(dbMonths);
          // Requisito: Ao sair ou atualizar pagina, por padrão manter sempre no mês vigente a tela!
          const vigenteId = getVigenteMonthId(dbMonths);
          setActiveTabId(vigenteId);
          setSummaryActive(false);
          setIsDbLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load from Firestore', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    fetchDb();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Keep relbio strictly on the current month tab
  useEffect(() => {
    if (onlyCurrentMonth && months.length > 0) {
      const vigenteId = getVigenteMonthId(months);
      if (activeTabId !== vigenteId) {
        setActiveTabId(vigenteId);
      }
      if (summaryActive) {
        setSummaryActive(false);
      }
    }
  }, [onlyCurrentMonth, months, activeTabId, summaryActive]);

  // Current active month
  const currentMonthIndex = months.findIndex((m) => m.id === activeTabId);
  const currentMonth = months[currentMonthIndex] || months[0];

  // Helper to update current month data and sync to Firestore
  const updateCurrentMonth = (
    updater: (prev: MonthSheetData) => MonthSheetData,
    actionDesc: string = 'Atualização da Planilha',
    details?: string,
    category: 'estoque' | 'instalacoes' | 'previsoes' | 'usuarios' | 'abas' | 'sistema' = 'sistema'
  ) => {
    setMonths((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((m) => m.id === activeTabId);
      if (idx !== -1) {
        const updatedMonth = updater(copy[idx]);
        copy[idx] = updatedMonth;

        // Auto-sync with debounce to Firestore if authenticated
        if (currentUser) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(async () => {
            try {
              setIsSyncing(true);
              await saveMonthToDb(updatedMonth, currentUser, actionDesc, details, category);
            } catch (err) {
              console.error('Failed to save month to Firestore:', err);
            } finally {
              setIsSyncing(false);
            }
          }, 600);
        }
      }
      return copy;
    });
  };

  // Specific table updaters
  const handleInstallationsChange = (updated: InstallationRow[]) => {
    updateCurrentMonth(
      (prev) => ({ ...prev, installations: updated }),
      'Atualização de Instalações',
      `Alterações em ${updated.length} linhas de instalações/envios`,
      'instalacoes'
    );
  };

  const handleForecastsChange = (updated: ForecastRow[]) => {
    if (!canEditForecast || isRelbio) {
      alert('Acesso negado: Seu usuário não possui permissão para alterar, adicionar ou excluir previsões.');
      return;
    }
    updateCurrentMonth(
      (prev) => ({ ...prev, forecasts: updated }),
      'Atualização de Previsões',
      `Alterações na tabela de previsões (${updated.length} itens)`,
      'previsoes'
    );
  };

  // Movimentar previsão para INSTALAÇÕES/ENVIOS REALIZADOS com status PENDENTE
  const handleStartInstallationFromForecast = (forecastItem: ForecastRow) => {
    if (!canEditForecast || isRelbio) {
      alert('Acesso negado: Seu usuário não possui permissão para movimentar previsões.');
      return;
    }

    const newInstallationRow: InstallationRow = {
      id: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      equipamento: forecastItem.equipamento,
      chamado: forecastItem.chamado,
      cliente: forecastItem.cliente,
      obra: forecastItem.obra,
      status: 'Pendente',
      reaproveitado: false,
    };

    updateCurrentMonth(
      (prev) => {
        const updatedForecasts = prev.forecasts.filter((f) => f.id !== forecastItem.id);
        const updatedInstallations = [...prev.installations, newInstallationRow];

        return {
          ...prev,
          forecasts: updatedForecasts,
          installations: updatedInstallations,
        };
      },
      'Início de Instalação (Previsão ➔ Instalações)',
      `Previsão Chamado ${forecastItem.chamado} (${forecastItem.obra}) transferida para INSTALAÇÕES/ENVIOS REALIZADOS com status Pendente`,
      'instalacoes'
    );
  };

  const handleInitialStockChange = (updated: StockItem[]) => {
    if (!isAdmin || !canEditStock) {
      alert('Acesso negado: Seu usuário não possui permissão para alterar ou adicionar quantidades no estoque.');
      return;
    }
    updateCurrentMonth(
      (prev) => ({ ...prev, initialStock: updated }),
      'Alteração de Estoque Inicial / Adicionar',
      'Administrador atualizou a quantidade de estoque inicial na tabela',
      'estoque'
    );
  };

  const handleReformedStockChange = (updated: StockReformedItem[]) => {
    if (!isAdmin || !canEditStock) {
      alert('Acesso negado: Seu usuário não possui permissão para alterar ou adicionar quantidades no estoque.');
      return;
    }
    updateCurrentMonth(
      (prev) => ({ ...prev, reformedStock: updated }),
      'Alteração de Estoque Inicial Reformados',
      'Administrador atualizou a quantidade inicial de equipamentos reformados',
      'estoque'
    );
  };

  const handleControllersChange = (updated: ControllerItem[]) => {
    if (!isAdmin || !canEditStock) {
      alert('Acesso negado: Seu usuário não possui permissão para alterar ou adicionar quantidades no estoque.');
      return;
    }
    updateCurrentMonth(
      (prev) => ({ ...prev, controllers: updated }),
      'Alteração de Estoque Inicial Controladoras',
      'Administrador atualizou o estoque de controladoras',
      'estoque'
    );
  };

  // Action from AddStockModal by Administrator
  const handleAddStockFromModal = (
    type: 'initial' | 'reformed' | 'controller',
    itemId: string,
    addedQuantity: number,
    reason: string
  ) => {
    if (!isAdmin || !canEditStock) {
      alert('Acesso negado: Somente administradores com permissão podem adicionar quantidades ao estoque.');
      return;
    }

    let itemName = '';
    let oldVal = 0;
    let newVal = 0;

    updateCurrentMonth(
      (prev) => {
        if (type === 'initial') {
          const list = [...prev.initialStock];
          const idx = list.findIndex((i) => i.id === itemId);
          if (idx !== -1) {
            itemName = list[idx].equipamento;
            oldVal = list[idx].qtdInicial;
            newVal = oldVal + addedQuantity;
            list[idx] = { ...list[idx], qtdInicial: newVal };
          }
          return { ...prev, initialStock: list };
        } else if (type === 'reformed') {
          const list = [...prev.reformedStock];
          const idx = list.findIndex((i) => i.id === itemId);
          if (idx !== -1) {
            itemName = list[idx].equipamento;
            oldVal = list[idx].qtd;
            newVal = oldVal + addedQuantity;
            list[idx] = { ...list[idx], qtd: newVal };
          }
          return { ...prev, reformedStock: list };
        } else {
          const list = [...prev.controllers];
          const idx = list.findIndex((i) => i.id === itemId);
          if (idx !== -1) {
            itemName = list[idx].nome;
            oldVal = list[idx].qtd;
            newVal = oldVal + addedQuantity;
            list[idx] = { ...list[idx], qtd: newVal };
          }
          return { ...prev, controllers: list };
        }
      },
      'Adição de Estoque (Administrador)',
      `+${addedQuantity} unidades de "${itemName}" (Anterior: ${oldVal} ➔ Novo: ${newVal}). Motivo: ${reason}`,
      'estoque'
    );
  };

  // Cell selection
  const handleSelectCell = (cellRef: string, value: string) => {
    setSelectedCellRef(cellRef);
    setSelectedCellValue(value);
  };

  const handleCellValueChange = (val: string) => {
    setSelectedCellValue(val);
  };

  // Reset data to defaults (Admin only)
  const handleReset = async () => {
    if (!isAdmin) {
      alert('Apenas o Administrador pode redefinir os dados da planilha.');
      return;
    }
    if (confirm('Deseja redefinir todas as planilhas para os dados padrão? Isso atualizará o banco de dados na nuvem.')) {
      setIsSyncing(true);
      try {
        for (const m of INITIAL_MONTHS) {
          if (currentUser) {
            await saveMonthToDb(m, currentUser, 'Restauração de Dados Padrão', `Aba ${m.monthName} restaurada`);
          }
        }
        setMonths(INITIAL_MONTHS);
        setActiveTabId('setembro');
        setSummaryActive(false);
      } catch (err) {
        console.error('Error resetting database:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Tab management
  const handleAddTab = async (name: string) => {
    if (!isAdmin || !canManageTabs) {
      alert('Apenas usuários administradores têm permissão para criar novas abas.');
      return;
    }

    const currentYear = new Date().getFullYear();
    const effectiveYear = currentYear >= 2026 ? currentYear : 2026;
    const newId = `month-${Date.now()}`;
    const newSheet: MonthSheetData = {
      id: newId,
      monthName: name,
      year: effectiveYear,
      isFinalized: false,
      isCurrent: true,
      installations: [],
      forecasts: [],
      initialStock: currentMonth ? [...currentMonth.initialStock] : [],
      reformedStock: currentMonth ? [...currentMonth.reformedStock] : [],
      controllers: currentMonth ? [...currentMonth.controllers] : [],
      bottomAvailableStock: currentMonth ? [...currentMonth.bottomAvailableStock] : [],
      bottomReformedStock: currentMonth ? [...currentMonth.bottomReformedStock] : [],
    };
    setMonths((prev) => [...prev.map((m) => ({ ...m, isCurrent: false })), newSheet]);
    setActiveTabId(newId);
    setSummaryActive(false);

    if (currentUser) {
      await saveMonthToDb(newSheet, currentUser, 'Criação de Nova Aba', `Nova aba criada para o mês: ${name} (${effectiveYear})`);
    }
  };

  const handleDuplicateTab = async (tabId: string) => {
    if (!isAdmin || !canManageTabs) {
      alert('Apenas usuários administradores têm permissão para duplicar abas.');
      return;
    }

    const target = months.find((m) => m.id === tabId);
    if (!target) return;
    const currentYear = new Date().getFullYear();
    const effectiveYear = currentYear >= 2026 ? currentYear : 2026;
    const newId = `month-${Date.now()}`;
    const newSheet: MonthSheetData = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      monthName: `${target.monthName} (CÓPIA)`,
      year: effectiveYear,
      isFinalized: false,
      isCurrent: true,
    };
    setMonths((prev) => [...prev.map((m) => ({ ...m, isCurrent: false })), newSheet]);
    setActiveTabId(newId);
    setSummaryActive(false);

    if (currentUser) {
      await saveMonthToDb(newSheet, currentUser, 'Duplicação de Aba', `Aba ${target.monthName} duplicada como ${newSheet.monthName}`);
    }
  };

  const handleRequestDeleteTab = (tab: MonthSheetData) => {
    if (!isAdmin || !canManageTabs) {
      alert('Apenas usuários administradores têm permissão para excluir abas.');
      return;
    }
    if (months.length <= 1) {
      alert('Não é possível excluir a única aba existente na planilha.');
      return;
    }
    setTabToDelete(tab);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteTab = async (tabId: string) => {
    if (!isAdmin || !canManageTabs) {
      alert('Apenas usuários administradores têm permissão para excluir abas.');
      return;
    }

    if (months.length <= 1) return;
    const target = months.find((m) => m.id === tabId);
    if (!target) return;

    setIsSyncing(true);
    try {
      // 1. Update local state immediately
      const remaining = months.filter((m) => m.id !== tabId);
      setMonths(remaining);

      // If active tab was deleted, switch to the current active or the first remaining tab
      if (activeTabId === tabId) {
        const nextActive = remaining.find((m) => m.isCurrent) || remaining.find((m) => !m.isFinalized) || remaining[0];
        if (nextActive) {
          setActiveTabId(nextActive.id);
        }
        setSummaryActive(false);
      }

      // 2. Persist deletion in Firestore
      if (currentUser) {
        await deleteMonthFromDb(tabId, target.monthName, currentUser);
      }
    } catch (err) {
      console.error('Erro ao excluir aba do banco de dados:', err);
      alert('Erro ao excluir aba do banco de dados. Verifique a conexão com a nuvem.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTab = async (tabId: string) => {
    const target = months.find((m) => m.id === tabId);
    if (target) {
      handleRequestDeleteTab(target);
    }
  };

  const handleRenameTab = async (tabId: string, newName: string) => {
    if (!isAdmin || !canManageTabs) {
      alert('Apenas usuários administradores têm permissão para renomear abas.');
      return;
    }
    const target = months.find((m) => m.id === tabId);
    const updated = months.map((m) => (m.id === tabId ? { ...m, monthName: newName } : m));
    setMonths(updated);

    const changed = updated.find((m) => m.id === tabId);
    if (changed && currentUser) {
      await saveMonthToDb(changed, currentUser, 'Renomeação de Aba', `Aba renomeada de ${target?.monthName} para ${newName}`);
    }
  };

  // Finalize month and start next month
  const handleFinalizeAndStartNext = async (
    finalizedMonthId: string,
    nextMonthData: {
      name: string;
      year: number;
      carryOverStock: boolean;
    }
  ) => {
    if (!currentUser) return;
    setIsSyncing(true);

    try {
      const currentM = months.find((m) => m.id === finalizedMonthId);
      if (!currentM) return;

      // Compute closing available stock of current month to carry over
      const closingStock = calculateCurrentStock(
        currentM.initialStock,
        currentM.reformedStock,
        currentM.controllers,
        currentM.installations
      );

      const curYear = getMonthYear(currentM);
      const finalizedCurrentMonth: MonthSheetData = {
        ...currentM,
        year: curYear,
        isFinalized: true,
        isCurrent: false,
        finalizedAt: new Date().toISOString(),
        finalizedBy: currentUser.displayName || currentUser.email,
      };

      // Prepare initial stocks for new month
      const newInitialStock = nextMonthData.carryOverStock
        ? closingStock.initialStock.map((it) => ({
            ...it,
            qtdInicial: Math.max(0, it.available),
          }))
        : currentM.initialStock.map((it) => ({ ...it, qtdInicial: 0 }));

      const newReformedStock = nextMonthData.carryOverStock
        ? closingStock.reformedStock.map((it) => ({
            ...it,
            qtd: Math.max(0, it.available),
          }))
        : currentM.reformedStock.map((it) => ({ ...it, qtd: 0 }));

      const newControllers = nextMonthData.carryOverStock
        ? closingStock.controllers.map((it) => ({
            ...it,
            qtd: Math.max(0, it.available),
          }))
        : currentM.controllers.map((it) => ({ ...it, qtd: 0 }));

      const newId = `month-${nextMonthData.name.toLowerCase().replace(/\s+/g, '-')}-${nextMonthData.year}-${Date.now()}`;

      const newNextMonth: MonthSheetData = {
        id: newId,
        monthName: nextMonthData.name,
        year: nextMonthData.year,
        isFinalized: false,
        isCurrent: true,
        installations: [],
        forecasts: [],
        initialStock: newInitialStock,
        reformedStock: newReformedStock,
        controllers: newControllers,
        bottomAvailableStock: currentM.bottomAvailableStock || [],
        bottomReformedStock: currentM.bottomReformedStock || [],
      };

      // Update months array: ensure other months are not marked current
      const updatedMonths = months.map((m) => {
        if (m.id === finalizedMonthId) return finalizedCurrentMonth;
        return { ...m, isCurrent: false };
      });

      updatedMonths.push(newNextMonth);

      setMonths(updatedMonths);
      setActiveTabId(newId);
      setSummaryActive(false);

      // Persist finalized month and new month to Firestore
      await saveMonthToDb(
        finalizedCurrentMonth,
        currentUser,
        'Conclusão de Mês',
        `Mês ${finalizedCurrentMonth.monthName} (${curYear}) concluído e arquivado para consulta.`,
        'abas'
      );

      await saveMonthToDb(
        newNextMonth,
        currentUser,
        'Abertura de Próximo Mês Vigente',
        `Novo mês ${newNextMonth.monthName} (${nextMonthData.year}) iniciado como Mês Vigente.`,
        'abas'
      );
    } catch (err) {
      console.error('Erro ao concluir mês e iniciar próximo:', err);
      alert('Erro ao concluir mês. Detalhes no console.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReopenMonth = async (monthId: string) => {
    if (!isAdmin) {
      alert('Apenas administradores podem reabrir meses para edição.');
      return;
    }
    if (!confirm('Deseja realmente reabrir este mês arquivado para edição ativa?')) {
      return;
    }
    updateCurrentMonth(
      (prev) => ({ ...prev, isFinalized: false }),
      'Reabertura de Mês',
      'Mês reaberto para edição pelo Administrador',
      'abas'
    );
  };

  // If loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#107c41]/30 border-t-[#107c41] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Carregando sistema de controle de equipamentos...</p>
      </div>
    );
  }

  // If not logged in, show Login & Registration screen
  if (!currentUser) {
    return <LoginScreen />;
  }

  const handleLogout = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setIsSyncing(false);
    await logout();
    // Ao sair ou atualizar pagina, por padrão manter sempre no mês vigente a tela
    const vigenteId = getVigenteMonthId(months);
    setActiveTabId(vigenteId);
    setSummaryActive(false);
  };

  const forecastTotals = calculateForecastTotals(currentMonth?.forecasts || []);
  const isCurrentMonthFinalized = Boolean(currentMonth?.isFinalized);
  const currentMonthYear = currentMonth ? getMonthYear(currentMonth) : (new Date().getFullYear() >= 2026 ? new Date().getFullYear() : 2026);

  return (
    <div className="min-h-screen bg-[#f1f3f4] text-slate-900 flex flex-col font-sans select-text pb-14">
      {/* Excel Ribbon & Formula Bar Header */}
      <SpreadsheetHeader
        currentMonth={currentMonth}
        allMonths={months}
        onReset={handleReset}
        selectedCellRef={selectedCellRef}
        selectedCellValue={selectedCellValue}
        onCellValueChange={handleCellValueChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenHelp={() => setIsHelpOpen(true)}
        currentUser={currentUser}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        isAdmin={isAdmin}
        onDeleteCurrentTab={() => handleRequestDeleteTab(currentMonth)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3 md:p-4 max-w-[1920px] w-full mx-auto">
        {summaryActive ? (
          /* RESUMO ANUAL TAB */
          <AnnualSummaryTab
            months={months}
            onSelectMonth={(id) => {
              setActiveTabId(id);
              setSummaryActive(false);
            }}
            initialYear={currentMonthYear}
          />
        ) : (
          /* ACTIVE MONTH TAB CONTENT */
          <div className="space-y-4">
            {/* Consultation Notice Banner when month is finalized */}
            {isCurrentMonthFinalized && (
              <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-3 text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-amber-200 border border-amber-400 flex items-center justify-center text-amber-900 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs uppercase tracking-wide">
                        Aba de Consulta Histórica: {currentMonth.monthName} / {currentMonthYear} (Finalizado)
                      </span>
                      <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300 uppercase">
                        Apenas Leitura
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Este mês foi concluído e arquivado para consulta na aba do ano {currentMonthYear}. As fórmulas, estoque final e histórico estão preservados.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && months.length > 1 && (
                    <button
                      onClick={() => handleRequestDeleteTab(currentMonth)}
                      className="text-xs bg-red-700 hover:bg-red-800 text-white font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Excluir esta aba arquivada (Apenas Administrador)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Aba</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleReopenMonth(currentMonth.id)}
                      className="text-xs bg-amber-800 hover:bg-amber-900 text-white font-bold px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Reabrir Mês para Edição
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const activeM = months.find((m) => m.isCurrent) || months.find((m) => !m.isFinalized) || months[0];
                      setActiveTabId(activeM.id);
                    }}
                    className="text-xs bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>Ir para o Mês Vigente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Balanced Layout: Left Column (Installations) + Right Panel (Forecast, Stock, Purchase Reqs) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
              {/* Left Column: INSTALAÇÕES/ENVIOS REALIZADOS (approx 5 cols on 12-grid) */}
              <div className="xl:col-span-5 w-full flex flex-col h-full">
                <InstallationsTable
                  rows={currentMonth.installations}
                  onChange={handleInstallationsChange}
                  onSelectCell={handleSelectCell}
                  selectedCell={selectedCellRef}
                  isAdmin={isAdmin}
                  isReadOnly={isCurrentMonthFinalized}
                />
              </div>

              {/* Right Panel: Integrated Management (Forecast + Stock + Purchase Requirements) (7 cols) */}
              <div className="xl:col-span-7 w-full space-y-4 flex flex-col">
                {/* PREVISÃO DE NOVAS INSTALAÇÕES NO MÊS */}
                <div className="w-full">
                  <ForecastTable
                    rows={currentMonth.forecasts}
                    onChange={handleForecastsChange}
                    onSelectCell={handleSelectCell}
                    selectedCell={selectedCellRef}
                    isAdmin={isAdmin}
                    isReadOnly={isCurrentMonthFinalized || !canEditForecast || isRelbio}
                    onStartInstallation={handleStartInstallationFromForecast}
                    existingChamados={currentMonth.installations.map((i) => i.chamado)}
                  />
                </div>

                {/* Sub-grid: ESTOQUE ATUAL & QUANTIDADE DE EQUIPAMENTOS NOVOS A COMPRAR */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {/* ESTOQUE ATUAL (Quadro Principal com Destaque Máximo) */}
                  <div className="w-full">
                    <TopRightStockTable
                      initialStock={currentMonth.initialStock}
                      reformedStock={currentMonth.reformedStock}
                      controllers={currentMonth.controllers}
                      installations={currentMonth.installations}
                      onUpdateInitialStock={handleInitialStockChange}
                      onUpdateReformedStock={handleReformedStockChange}
                      onUpdateControllers={handleControllersChange}
                      onSelectCell={handleSelectCell}
                      selectedCell={selectedCellRef}
                      canEditInitialStock={isAdmin && canEditStock && !isCurrentMonthFinalized}
                      onOpenAddStockModal={() => setIsAddStockOpen(true)}
                      isReadOnly={isCurrentMonthFinalized || !canEditStock}
                    />
                  </div>

                  {/* QUANTIDADE DE EQUIPAMENTOS NOVOS A COMPRAR */}
                  <div className="w-full">
                    <MiddleBottomSection
                      forecastTotals={forecastTotals}
                      initialStock={currentMonth.initialStock}
                      reformedStock={currentMonth.reformedStock}
                      controllers={currentMonth.controllers}
                      installations={currentMonth.installations}
                      onSelectCell={handleSelectCell}
                      selectedCell={selectedCellRef}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Excel-style Bottom Tabs Footer com agrupamento de anos e destaque do Mês Vigente */}
      <TabsFooter
        tabs={months}
        activeTabId={activeTabId}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setSummaryActive(false);
        }}
        onAddTab={handleAddTab}
        onDuplicateTab={handleDuplicateTab}
        onDeleteTab={handleDeleteTab}
        onRequestDeleteTab={handleRequestDeleteTab}
        onRenameTab={handleRenameTab}
        summaryActive={summaryActive}
        onSelectSummary={() => setSummaryActive(true)}
        isAdmin={isAdmin && canManageTabs}
        onOpenFinalizeModal={() => setIsFinalizeModalOpen(true)}
      />

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <UsersManagementModal isOpen={isUsersModalOpen} onClose={() => setIsUsersModalOpen(false)} />
      <AddStockModal
        isOpen={isAddStockOpen}
        onClose={() => setIsAddStockOpen(false)}
        initialStock={currentMonth.initialStock}
        reformedStock={currentMonth.reformedStock}
        controllers={currentMonth.controllers}
        onAddStock={handleAddStockFromModal}
        isAdmin={isAdmin && canEditStock}
        monthName={currentMonth.monthName}
      />
      {currentMonth && (
        <FinalizeMonthModal
          isOpen={isFinalizeModalOpen}
          onClose={() => setIsFinalizeModalOpen(false)}
          currentMonth={currentMonth}
          onFinalizeAndStartNext={handleFinalizeAndStartNext}
        />
      )}
      <DeleteTabModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTabToDelete(null);
        }}
        month={tabToDelete}
        onConfirmDelete={handleConfirmDeleteTab}
        totalTabsCount={months.length}
      />
    </div>
  );
}

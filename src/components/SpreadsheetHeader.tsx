import React from 'react';
import {
  Download,
  RotateCcw,
  Search,
  Printer,
  TableProperties,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  History,
  Users,
  LogOut,
  Shield,
  Cloud,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { MonthSheetData, AppUser } from '../types';
import { exportMonthToExcel, exportAllMonthsToExcel } from '../utils/excelExport';

interface SpreadsheetHeaderProps {
  currentMonth: MonthSheetData;
  allMonths: MonthSheetData[];
  onReset: () => void;
  selectedCellRef: string | null;
  selectedCellValue: string;
  onCellValueChange: (val: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenHelp: () => void;
  currentUser: AppUser | null;
  onOpenHistory: () => void;
  onOpenUsersModal: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
  saveStatus?: 'saved' | 'saving' | 'error';
  lastSavedAt?: Date | null;
  onManualSave?: () => void;
  isAdmin?: boolean;
  onDeleteCurrentTab?: () => void;
}

export const SpreadsheetHeader: React.FC<SpreadsheetHeaderProps> = ({
  currentMonth,
  allMonths,
  onReset,
  selectedCellRef,
  selectedCellValue,
  onCellValueChange,
  searchTerm,
  onSearchChange,
  onOpenHelp,
  currentUser,
  onOpenHistory,
  onOpenUsersModal,
  onLogout,
  isSyncing = false,
  saveStatus = 'saved',
  lastSavedAt = null,
  onManualSave,
  isAdmin: propIsAdmin,
  onDeleteCurrentTab,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isAdmin =
    propIsAdmin !== undefined
      ? propIsAdmin
      : currentUser?.role === 'admin' ||
        currentUser?.email.toLowerCase() === 'admin@digidox.net';

  return (
    <header className="bg-white border-b-2 border-slate-300 shadow-sm print:hidden">
      {/* Top Application Title bar */}
      <div className="bg-[#107c41] text-white px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
          <h1 className="text-sm font-semibold tracking-wide">
            Planilha Inteligente &bull; Controle de Equipamentos
          </h1>

          {/* Database status and certainty indicator */}
          {saveStatus === 'saving' || isSyncing ? (
            <div
              className="flex items-center gap-1.5 bg-amber-500/25 text-amber-200 border border-amber-400/40 text-[10px] font-mono px-2 py-0.5 rounded shadow-xs"
              title="Salvando alterações no banco de dados na nuvem..."
            >
              <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
              <span>Salvando no Banco...</span>
            </div>
          ) : saveStatus === 'error' ? (
            <button
              onClick={onManualSave}
              className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white border border-red-400 text-[10px] font-mono px-2 py-0.5 rounded shadow-xs cursor-pointer"
              title="Ocorreu um erro ao salvar no banco. Clique para forçar salvamento agora."
            >
              <AlertTriangle className="w-3 h-3 text-red-200" />
              <span>Erro ao Salvar &bull; Clique para Salvar</span>
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 bg-emerald-900/70 text-emerald-200 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded shadow-xs"
              title={
                lastSavedAt
                  ? `Todas as alterações foram gravadas com sucesso no banco de dados às ${lastSavedAt.toLocaleTimeString('pt-BR')}`
                  : 'Todas as informações estão sincronizadas e salvas no banco de dados.'
              }
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              <span>
                Salvo no Banco
                {lastSavedAt ? ` às ${lastSavedAt.toLocaleTimeString('pt-BR')}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* Explicit Save button so user has 100% certainty */}
          {onManualSave && (
            <button
              id="btn-manual-save"
              onClick={onManualSave}
              disabled={isSyncing || saveStatus === 'saving'}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors shadow-sm cursor-pointer border border-emerald-400/40"
              title="Salvar imediatamente todas as alterações no banco de dados"
            >
              <Save className="w-3.5 h-3.5 text-emerald-100" />
              <span>{isSyncing || saveStatus === 'saving' ? 'Salvando...' : 'Salvar no Banco'}</span>
            </button>
          )}

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors shadow-sm cursor-pointer"
            title="Ver histórico de alterações e auditoria"
          >
            <History className="w-3.5 h-3.5 text-emerald-200" /> Histórico
          </button>

          {/* User Management Button (for all or admin) */}
          <button
            onClick={onOpenUsersModal}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors shadow-sm cursor-pointer"
            title="Gerenciar usuários e permissões de Administrador/Operador"
          >
            <Users className="w-3.5 h-3.5 text-emerald-200" /> Usuários
          </button>

          <button
            onClick={() => exportMonthToExcel(currentMonth)}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-medium transition-colors shadow-sm"
            title="Exportar mês ativo para arquivo XLSX"
          >
            <Download className="w-3.5 h-3.5" /> Mês (.xlsx)
          </button>

          <button
            onClick={() => exportAllMonthsToExcel(allMonths)}
            className="flex items-center gap-1.5 bg-white text-emerald-900 hover:bg-emerald-50 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shadow-sm"
            title="Exportar todas as abas consolidadas em XLSX"
          >
            <Download className="w-3.5 h-3.5" /> Tudo (.xlsx)
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 text-emerald-100 hover:text-white px-2 py-1 rounded hover:bg-emerald-800/60 transition-colors"
            title="Imprimir relatório"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {isAdmin && allMonths.length > 1 && onDeleteCurrentTab && (
            <button
              onClick={onDeleteCurrentTab}
              className="flex items-center gap-1.5 bg-red-700/90 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
              title={`Excluir aba ativa "${currentMonth.monthName}" (Administrador)`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-200" />
              <span>Excluir Aba</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-emerald-100 hover:text-white px-2 py-1 rounded hover:bg-emerald-800/60 transition-colors cursor-pointer"
              title="Restaurar dados originais da imagem (Apenas Admin)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1 text-emerald-100 hover:text-white px-2 py-1 rounded hover:bg-emerald-800/60 transition-colors cursor-pointer"
            title="Ajuda e regras de negócio"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* User badge and logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-emerald-700/60 ml-1">
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-bold leading-tight text-white flex items-center gap-1 justify-end">
                  {isAdmin && <Shield className="w-3 h-3 text-amber-300" />}
                  {currentUser.displayName || currentUser.email.split('@')[0]}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isAdmin ? 'text-amber-200' : 'text-emerald-200'
                  }`}
                >
                  {isAdmin ? 'Administrador' : 'Operador'}
                </span>
              </div>
              <button
                id="btn-logout-header"
                onClick={onLogout}
                className="flex items-center gap-1 py-1 px-2 text-emerald-100 hover:text-white bg-emerald-800/80 hover:bg-red-600/90 rounded text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
                title="Sair do sistema e voltar para a tela de login"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Centered Title from Image */}
      <div className="py-2.5 px-4 text-center border-b border-slate-200 bg-white">
        <h2 className="text-xl md:text-2xl font-black text-black tracking-wider uppercase drop-shadow-xs font-sans">
          CONTROLE DE EQUIPAMENTOS
        </h2>
      </div>

      {/* Formula Bar & Search Toolbar */}
      <div className="px-4 py-1.5 bg-[#f8fafc] border-b border-slate-300 flex flex-wrap items-center gap-3 text-xs">
        {/* Cell Reference Box */}
        <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden shadow-xs">
          <div className="bg-slate-100 px-2.5 py-1 text-slate-700 font-mono font-bold text-[11px] border-r border-slate-300 min-w-[54px] text-center">
            {selectedCellRef || 'A1'}
          </div>
          <div className="px-2 py-1 text-slate-400 font-mono italic text-[11px] select-none border-r border-slate-200">
            fx
          </div>
          <input
            type="text"
            value={selectedCellValue}
            onChange={(e) => onCellValueChange(e.target.value)}
            placeholder="Conteúdo da célula selecionada..."
            className="px-2 py-1 w-64 md:w-80 outline-none text-slate-800 text-[11px] bg-white font-mono"
          />
        </div>

        {/* Global Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por Chamado, Cliente, Obra..."
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Real-time Indicator badges */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600 ml-auto">
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Cálculos automáticos ativos
          </span>
          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
            Mês: <b>{currentMonth.monthName}</b>
          </span>
        </div>
      </div>
    </header>
  );
};

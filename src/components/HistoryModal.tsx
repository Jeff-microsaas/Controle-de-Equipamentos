import React, { useState, useEffect } from 'react';
import { HistoryEntry } from '../types';
import { subscribeToHistory } from '../services/firestoreService';
import {
  History,
  X,
  Clock,
  User,
  Shield,
  Search,
  Download,
  Filter,
  Package,
  Wrench,
  TrendingUp,
  Users as UsersIcon,
  Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestorePoint?: (monthId: string) => void;
}

type CategoryFilter = 'all' | 'estoque' | 'instalacoes' | 'previsoes' | 'usuarios' | 'abas';

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = subscribeToHistory((items) => {
      setHistoryItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = historyItems.filter((item) => {
    // Category match
    if (categoryFilter !== 'all') {
      const cat = item.category?.toLowerCase();
      const action = item.action?.toLowerCase() || '';
      if (categoryFilter === 'estoque' && cat !== 'estoque' && !action.includes('estoque')) return false;
      if (categoryFilter === 'instalacoes' && cat !== 'instalacoes' && !action.includes('instalaç')) return false;
      if (categoryFilter === 'previsoes' && cat !== 'previsoes' && !action.includes('previs')) return false;
      if (categoryFilter === 'usuarios' && cat !== 'usuarios' && !action.includes('usuário')) return false;
      if (categoryFilter === 'abas' && cat !== 'abas' && !action.includes('aba') && !action.includes('mês')) return false;
    }

    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.action?.toLowerCase().includes(q) ||
      item.details?.toLowerCase().includes(q) ||
      item.userName?.toLowerCase().includes(q) ||
      item.userEmail?.toLowerCase().includes(q) ||
      item.monthName?.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map((h) => ({
      'Data e Hora': formatDate(h.timestamp),
      'Usuário': h.userName,
      'E-mail': h.userEmail,
      'Perfil': h.userRole === 'admin' ? 'Administrador' : 'Operador',
      'Aba / Mês': h.monthName || '-',
      'Ação': h.action,
      'Detalhes da Modificação': h.details,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico_Auditoria');
    XLSX.writeFile(wb, `Historico_Equipamentos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getCategoryBadge = (item: HistoryEntry) => {
    const cat = item.category?.toLowerCase() || '';
    const action = item.action?.toLowerCase() || '';

    if (cat === 'estoque' || action.includes('estoque')) {
      return {
        label: 'Estoque',
        color: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: Package,
      };
    }
    if (cat === 'instalacoes' || action.includes('instalaç')) {
      return {
        label: 'Instalações',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        icon: Wrench,
      };
    }
    if (cat === 'previsoes' || action.includes('previs')) {
      return {
        label: 'Previsões',
        color: 'bg-blue-100 text-blue-900 border-blue-300',
        icon: TrendingUp,
      };
    }
    if (cat === 'usuarios' || action.includes('usuário')) {
      return {
        label: 'Usuários',
        color: 'bg-purple-100 text-purple-900 border-purple-300',
        icon: UsersIcon,
      };
    }
    return {
      label: 'Geral',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: Layers,
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#107c41] px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">Histórico de Alterações & Auditoria em Nuvem</h3>
              <p className="text-[11px] text-emerald-100">
                Registro permanente de auditoria no Firestore: quem alterou, quando e o que foi modificado
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

        {/* Filter bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuário, ação, mês ou detalhe..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-[#107c41]"
              />
            </div>

            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-[#107c41] text-slate-700 hover:text-[#107c41] rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Baixar planilha Excel com todo histórico filtrado"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (.xlsx)</span>
            </button>

            <span className="text-slate-500 font-mono text-[11px]">
              {filtered.length} registro(s)
            </span>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtro:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'estoque', label: 'Estoque' },
              { id: 'instalacoes', label: 'Instalações' },
              { id: 'previsoes', label: 'Previsões' },
              { id: 'usuarios', label: 'Usuários' },
              { id: 'abas', label: 'Abas / Mês' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as CategoryFilter)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[#107c41] text-white font-bold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <div className="w-7 h-7 border-2 border-[#107c41]/30 border-t-[#107c41] rounded-full animate-spin mb-2" />
              <p className="text-xs">Carregando histórico do banco de dados Firestore...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Nenhum evento encontrado.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Conforme você e outros operadores salvarem dados, modificarem estoque ou gerenciarem abas, todas as ações serão registradas aqui em tempo real.
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const badge = getCategoryBadge(item);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors flex items-start gap-3"
                >
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {item.userName}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.userRole === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {item.userRole === 'admin' ? 'Administrador' : 'Operador'}
                        </span>
                        <span
                          className={`text-[9.5px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1 ${badge.color}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        {item.monthName && item.monthName !== '-' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                            {item.monthName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      {item.action}
                    </p>
                    <p className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 font-mono leading-relaxed break-words">
                      {item.details}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Armazenamento permanente e auditável no Firestore
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { InstallationRow, InstallationStatus } from '../types';
import { ChevronDown, Plus, Trash2, Filter, X, Lock, AlertTriangle, Check } from 'lucide-react';
import { isStatusReformando } from '../utils/calculations';
import { useAuth } from '../contexts/AuthContext';

interface InstallationsTableProps {
  rows: InstallationRow[];
  onChange: (updatedRows: InstallationRow[]) => void;
  onSelectCell?: (cellRef: string, value: string) => void;
  selectedCell?: string | null;
  isAdmin?: boolean;
  isReadOnly?: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Em Analise': { bg: 'bg-white', text: 'text-slate-900 font-semibold', label: 'Em Analise' },
  'Enviado/Instalado': { bg: 'bg-[#92d050]', text: 'text-black font-semibold', label: 'Enviado/Instalado' },
  'Logística-Reversa': { bg: 'bg-[#b2a1c7]', text: 'text-black font-semibold', label: 'Logística-Reversa' },
  'Reformando/Em Estoque': { bg: 'bg-[#ffff00]', text: 'text-black font-semibold', label: 'Reformando/Em Estoque' },
  'Reformado/Em Estoque': { bg: 'bg-[#ffff00]', text: 'text-black font-semibold', label: 'Reformando/Em Estoque' },
  'Reformada': { bg: 'bg-[#ffff00]', text: 'text-black font-semibold', label: 'Reformando/Em Estoque' },
  'Pendente': { bg: 'bg-[#ff0000]', text: 'text-white font-bold', label: 'Pendente' },
};

const ALL_STATUSES: InstallationStatus[] = [
  'Em Analise',
  'Enviado/Instalado',
  'Logística-Reversa',
  'Reformando/Em Estoque',
  'Pendente',
];

const EQUIPMENT_OPTIONS = [
  'Catraca De Facial Unico (DX-2)',
  'Catraca De Facial Duplo (DX-2 DUO)',
  'Leitor Facial + Caixa (DX-S)',
  'Torniquete (DX-3)',
];

export const InstallationsTable: React.FC<InstallationsTableProps> = ({
  rows,
  onChange,
  onSelectCell,
  selectedCell,
  isAdmin: propIsAdmin,
  isReadOnly = false,
}) => {
  const { isAdmin: authIsAdmin, isRelbio } = useAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;

  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<{ column: string; value: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [chamadoAlert, setChamadoAlert] = useState<string | null>(null);

  // Map frequencies of Chamado for duplicate detection
  const chamadoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const ch = (r.chamado || '').trim().toLowerCase();
      if (ch && ch !== '-') {
        counts[ch] = (counts[ch] || 0) + 1;
      }
    });
    return counts;
  }, [rows]);

  // Modal State for adding new installation row
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEquipamento, setFormEquipamento] = useState(EQUIPMENT_OPTIONS[0]);
  const [formChamado, setFormChamado] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formObra, setFormObra] = useState('');

  // Modal State for confirming 'Enviado/Instalado'
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    rowIndex: number;
    targetStatus: InstallationStatus;
    obraName: string;
    chamado: string;
    cliente: string;
    equipamento: string;
  } | null>(null);

  // Apply actual status change after validation / confirmation
  const applyStatusChange = (index: number, newStatus: InstallationStatus) => {
    const updated = [...rows];
    const currentRow = updated[index];
    if (!currentRow) return;

    const prevStatus = currentRow.status;
    let isReaproveitado = currentRow.reaproveitado || false;

    // Se o status for alterado de Reformando/Em Estoque para Enviado/Instalado -> abate do estoque de reformados e da controladora!
    const wasReformado = isStatusReformando(prevStatus);

    if (wasReformado && newStatus === 'Enviado/Instalado') {
      isReaproveitado = true;
    } else if (newStatus !== 'Enviado/Instalado') {
      isReaproveitado = false;
    }

    updated[index] = {
      ...currentRow,
      status: newStatus,
      reaproveitado: isReaproveitado,
    };

    onChange(updated);
  };

  // Triggered when user picks a status in the dropdown
  const handleSelectStatus = (index: number, newStatus: InstallationStatus) => {
    const currentRow = rows[index];
    if (!currentRow) return;

    const prevStatus = currentRow.status;

    // Regra: Uma vez que a instalação esteja com status 'Enviado/Instalado',
    // usuário analista não pode mais alterá-la (permitido para Administrador e Relbio).
    if (prevStatus === 'Enviado/Instalado' && newStatus !== 'Enviado/Instalado') {
      if (!isAdmin && !isRelbio) {
        alert('Apenas usuários administradores ou Relbio têm permissão para alterar o status de uma instalação que já está como "Enviado/Instalado".');
        return;
      }
    }

    // Regra: Ao optar pelo status 'Enviado/Instalado', deve gerar mensagem informando
    // que não será possível mais voltar o status e se tem certeza que deseja realizar a alteração.
    if (newStatus === 'Enviado/Instalado' && prevStatus !== 'Enviado/Instalado') {
      setStatusConfirmModal({
        rowIndex: index,
        targetStatus: newStatus,
        obraName: currentRow.obra || 'Obra sem nome',
        chamado: currentRow.chamado || 'S/N',
        cliente: currentRow.cliente || '-',
        equipamento: currentRow.equipamento || '-',
      });
      return;
    }

    // Regra: Caso o status seja Reformando/Em Estoque, deve gerar mensagem se realmente deseja alterar para este status.
    // se sim pode seguir com atualização.
    if (
      (newStatus === 'Reformando/Em Estoque' || isStatusReformando(newStatus)) &&
      !isStatusReformando(prevStatus)
    ) {
      setStatusConfirmModal({
        rowIndex: index,
        targetStatus: newStatus,
        obraName: currentRow.obra || 'Obra sem nome',
        chamado: currentRow.chamado || 'S/N',
        cliente: currentRow.cliente || '-',
        equipamento: currentRow.equipamento || '-',
      });
      return;
    }

    // Outros status podem ser aplicados diretamente
    applyStatusChange(index, newStatus);
  };

  // Confirm and commit Enviado/Instalado
  const handleConfirmStatusModal = () => {
    if (statusConfirmModal) {
      applyStatusChange(statusConfirmModal.rowIndex, statusConfirmModal.targetStatus);
      setStatusConfirmModal(null);
    }
  };

  // Cancel and abort status change
  const handleCancelStatusModal = () => {
    setStatusConfirmModal(null);
  };

  // Handle cell edit
  const handleCellEdit = (index: number, field: keyof InstallationRow, value: string) => {
    if (field === 'status') {
      handleSelectStatus(index, value as InstallationStatus);
      return;
    }

    if (field === 'chamado') {
      const valTrim = value.trim();
      if (valTrim && valTrim !== '-') {
        const alreadyExists = rows.some(
          (r, i) => i !== index && (r.chamado || '').trim().toLowerCase() === valTrim.toLowerCase()
        );
        if (alreadyExists) {
          setChamadoAlert(`Atenção: Já existe outro registro com o número de chamado "${valTrim}"!`);
        } else {
          setChamadoAlert(null);
        }
      } else {
        setChamadoAlert(null);
      }
    }

    const updated = [...rows];
    const currentRow = updated[index];

    updated[index] = {
      ...currentRow,
      [field]: value,
    };
    onChange(updated);
  };

  const handleToggleReaproveitado = (index: number) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      reaproveitado: !updated[index].reaproveitado,
    };
    onChange(updated);
  };

  const handleOpenAddModal = () => {
    setFormEquipamento(EQUIPMENT_OPTIONS[0]);
    setFormChamado('');
    setFormCliente('');
    setFormObra('');
    setIsModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirmAddRow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newRow: InstallationRow = {
      id: `inst-${Date.now()}`,
      chamado: formChamado.trim(),
      cliente: formCliente.trim(),
      obra: formObra.trim(),
      equipamento: formEquipamento,
      status: 'Em Analise',
    };
    onChange([...rows, newRow]);
    setIsModalOpen(false);
    setFormChamado('');
    setFormCliente('');
    setFormObra('');
  };

  const handleDeleteRow = (index: number) => {
    if (!isAdmin) {
      alert('Apenas usuários administradores têm permissão para excluir obras e registros.');
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Filter logic
  const filteredRows = useMemo(() => {
    return rows.map((r, originalIndex) => ({ ...r, originalIndex })).filter((r) => {
      if (activeFilter) {
        const val = String((r as any)[activeFilter.column] || '').toLowerCase();
        if (val !== activeFilter.value.toLowerCase()) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.chamado.toLowerCase().includes(term) ||
          r.cliente.toLowerCase().includes(term) ||
          r.obra.toLowerCase().includes(term) ||
          r.equipamento.toLowerCase().includes(term) ||
          r.status.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [rows, activeFilter, searchTerm]);

  // Unique values for filter
  const getUniqueValues = (col: keyof InstallationRow) => {
    const vals = new Set<string>();
    rows.forEach((r) => {
      if (r[col]) vals.add(String(r[col]));
    });
    return Array.from(vals);
  };

  return (
    <div className="flex flex-col h-full bg-white border-2 border-black rounded shadow-sm overflow-hidden text-xs">
      {/* Top Section Header */}
      <div className="bg-[#ffff00] border-b-2 border-black px-3 py-1.5 flex items-center justify-between font-bold text-black uppercase tracking-wide">
        <span className="text-[13px] font-extrabold flex items-center gap-1.5">
          INSTALAÇÕES/ENVIOS REALIZADOS
          <span className="text-[11px] font-normal text-slate-700">({rows.length} registros)</span>
        </span>
        <div className="flex items-center gap-2">
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="flex items-center gap-1 bg-white text-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-400 hover:bg-slate-100"
            >
              Filtro ativo: {activeFilter.value} <X className="w-3 h-3" />
            </button>
          )}
          {isReadOnly ? (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
              <Lock className="w-3 h-3 text-amber-700" /> Apenas Consulta
            </span>
          ) : (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1 bg-black text-white hover:bg-slate-800 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shadow-sm cursor-pointer"
              title="Adicionar linha"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Duplicate Chamado Alert Banner */}
      {chamadoAlert && (
        <div className="bg-amber-100 border-b border-amber-300 px-3 py-1.5 flex items-center justify-between text-xs text-amber-900 font-bold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{chamadoAlert}</span>
          </div>
          <button
            onClick={() => setChamadoAlert(null)}
            className="p-0.5 hover:bg-amber-200 rounded text-amber-800 transition-colors"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table grid container */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[650px] custom-scrollbar">
        <table className="w-full border-collapse border border-slate-300">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
            <tr className="border-b border-black font-semibold text-slate-900 bg-[#f7f7f7]">
              <th className="w-10 border-r border-slate-300 px-1 py-1 text-center text-slate-500 font-mono text-[10px]">#</th>
              
              {/* CHAMADO */}
              <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[70px] relative">
                <div className="flex items-center justify-between">
                  <span>CHAMADO</span>
                  <button
                    onClick={() => setFilterColumn(filterColumn === 'chamado' ? null : 'chamado')}
                    className="p-0.5 hover:bg-slate-200 rounded"
                    title="Filtrar Chamado"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
                {filterColumn === 'chamado' && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-400 rounded shadow-lg z-30 p-1 text-[11px]">
                    <div className="font-bold border-b pb-1 mb-1 text-slate-700">Filtrar Chamado</div>
                    <button
                      onClick={() => { setActiveFilter(null); setFilterColumn(null); }}
                      className="w-full text-left px-1.5 py-0.5 hover:bg-slate-100 rounded"
                    >
                      (Todos)
                    </button>
                    <div className="max-h-32 overflow-y-auto">
                      {getUniqueValues('chamado').map((v) => (
                        <button
                          key={v}
                          onClick={() => { setActiveFilter({ column: 'chamado', value: v }); setFilterColumn(null); }}
                          className="w-full text-left px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 rounded truncate"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </th>

              {/* CLIENTE */}
              <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[90px] relative">
                <div className="flex items-center justify-between">
                  <span>CLIENTE</span>
                  <button
                    onClick={() => setFilterColumn(filterColumn === 'cliente' ? null : 'cliente')}
                    className="p-0.5 hover:bg-slate-200 rounded"
                    title="Filtrar Cliente"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
                {filterColumn === 'cliente' && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-400 rounded shadow-lg z-30 p-1 text-[11px]">
                    <div className="font-bold border-b pb-1 mb-1 text-slate-700">Filtrar Cliente</div>
                    <button
                      onClick={() => { setActiveFilter(null); setFilterColumn(null); }}
                      className="w-full text-left px-1.5 py-0.5 hover:bg-slate-100 rounded"
                    >
                      (Todos)
                    </button>
                    <div className="max-h-32 overflow-y-auto">
                      {getUniqueValues('cliente').map((v) => (
                        <button
                          key={v}
                          onClick={() => { setActiveFilter({ column: 'cliente', value: v }); setFilterColumn(null); }}
                          className="w-full text-left px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 rounded truncate"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </th>

              {/* OBRA */}
              <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[130px]">
                <span>OBRA</span>
              </th>

              {/* EQUIPAMENTO */}
              <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[180px] relative">
                <div className="flex items-center justify-between">
                  <span>EQUIPAMENTO</span>
                  <button
                    onClick={() => setFilterColumn(filterColumn === 'equipamento' ? null : 'equipamento')}
                    className="p-0.5 hover:bg-slate-200 rounded"
                    title="Filtrar Equipamento"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
                {filterColumn === 'equipamento' && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-400 rounded shadow-lg z-30 p-1 text-[11px]">
                    <div className="font-bold border-b pb-1 mb-1 text-slate-700">Filtrar Equipamento</div>
                    <button
                      onClick={() => { setActiveFilter(null); setFilterColumn(null); }}
                      className="w-full text-left px-1.5 py-0.5 hover:bg-slate-100 rounded"
                    >
                      (Todos)
                    </button>
                    <div className="max-h-36 overflow-y-auto">
                      {getUniqueValues('equipamento').map((v) => (
                        <button
                          key={v}
                          onClick={() => { setActiveFilter({ column: 'equipamento', value: v }); setFilterColumn(null); }}
                          className="w-full text-left px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 rounded truncate"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </th>

              {/* STATUS */}
              <th className="px-2 py-1 text-center min-w-[130px] relative">
                <div className="flex items-center justify-between">
                  <span>STATUS</span>
                  <button
                    onClick={() => setFilterColumn(filterColumn === 'status' ? null : 'status')}
                    className="p-0.5 hover:bg-slate-200 rounded"
                    title="Filtrar Status"
                  >
                    <ChevronDown className="w-3 h-3 text-slate-600" />
                  </button>
                </div>
                {filterColumn === 'status' && (
                  <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-400 rounded shadow-lg z-30 p-1 text-[11px]">
                    <div className="font-bold border-b pb-1 mb-1 text-slate-700">Filtrar Status</div>
                    <button
                      onClick={() => { setActiveFilter(null); setFilterColumn(null); }}
                      className="w-full text-left px-1.5 py-0.5 hover:bg-slate-100 rounded"
                    >
                      (Todos)
                    </button>
                    {ALL_STATUSES.map((st) => (
                      <button
                        key={st}
                        onClick={() => { setActiveFilter({ column: 'status', value: st }); setFilterColumn(null); }}
                        className="w-full text-left px-1.5 py-0.5 hover:bg-blue-50 hover:text-blue-700 rounded truncate flex items-center gap-1.5"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[st].bg} border border-black/30`}></span>
                        {st}
                      </button>
                    ))}
                  </div>
                )}
              </th>

              <th className="w-8 px-1 py-1 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const origIndex = row.originalIndex;
              const statusCfg = STATUS_CONFIG[row.status] || STATUS_CONFIG['Enviado/Instalado'];

              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-200 hover:bg-blue-50/40 group transition-colors"
                >
                  {/* Row Number */}
                  <td className="border-r border-slate-300 px-1 py-1 text-center text-slate-400 font-mono text-[10px] select-none bg-slate-50">
                    {origIndex + 1}
                  </td>

                  {/* CHAMADO */}
                  {(() => {
                    const chTrim = (row.chamado || '').trim();
                    const isDuplicateChamado = Boolean(
                      chTrim && chTrim !== '-' && (chamadoCounts[chTrim.toLowerCase()] || 0) > 1
                    );

                    return (
                      <td
                        className={`border-r border-slate-300 p-0 text-center font-mono relative ${
                          isDuplicateChamado ? 'bg-amber-100/90 text-amber-950 font-bold' : ''
                        } ${
                          selectedCell === `A${origIndex + 1}` ? 'outline-2 outline-blue-600 bg-blue-50' : ''
                        }`}
                        onClick={() => onSelectCell?.(`A${origIndex + 1}`, row.chamado)}
                        title={
                          isDuplicateChamado
                            ? `Atenção: Já existe outro chamado com o número "${chTrim}"!`
                            : undefined
                        }
                      >
                        <div className="relative flex items-center justify-center w-full h-full">
                          <input
                            type="text"
                            value={row.chamado}
                            onChange={(e) => handleCellEdit(origIndex, 'chamado', e.target.value)}
                            placeholder="-"
                            className={`w-full h-full px-1.5 py-1 text-center bg-transparent outline-none focus:bg-white text-slate-800 ${
                              isDuplicateChamado ? 'font-black text-amber-950 pr-5' : ''
                            }`}
                          />
                          {isDuplicateChamado && (
                            <span
                              className="absolute right-1 text-amber-700 cursor-help"
                              title={`Atenção: Já existe outro chamado com o número "${chTrim}"!`}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })()}

                  {/* CLIENTE */}
                  <td
                    className={`border-r border-slate-300 p-0 uppercase font-medium ${
                      selectedCell === `B${origIndex + 1}` ? 'outline-2 outline-blue-600 bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectCell?.(`B${origIndex + 1}`, row.cliente)}
                  >
                    <input
                      type="text"
                      value={row.cliente}
                      onChange={(e) => handleCellEdit(origIndex, 'cliente', e.target.value)}
                      placeholder=""
                      className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:bg-white text-slate-800 font-medium"
                    />
                  </td>

                  {/* OBRA */}
                  <td
                    className={`border-r border-slate-300 p-0 uppercase ${
                      selectedCell === `C${origIndex + 1}` ? 'outline-2 outline-blue-600 bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectCell?.(`C${origIndex + 1}`, row.obra)}
                  >
                    <input
                      type="text"
                      value={row.obra}
                      onChange={(e) => handleCellEdit(origIndex, 'obra', e.target.value)}
                      placeholder=""
                      className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:bg-white text-slate-700"
                    />
                  </td>

                  {/* EQUIPAMENTO */}
                  <td
                    className={`border-r border-slate-300 p-0 ${
                      selectedCell === `D${origIndex + 1}` ? 'outline-2 outline-blue-600 bg-blue-50' : ''
                    }`}
                    onClick={() => onSelectCell?.(`D${origIndex + 1}`, row.equipamento)}
                  >
                    <input
                      type="text"
                      value={row.equipamento}
                      onChange={(e) => handleCellEdit(origIndex, 'equipamento', e.target.value)}
                      placeholder=""
                      className="w-full h-full px-1.5 py-1 bg-transparent outline-none focus:bg-white text-slate-900"
                    />
                  </td>

                  {/* STATUS */}
                  <td className="p-0 border-r border-slate-300 text-center">
                    <div className="relative w-full h-full flex items-center">
                      <select
                        value={isStatusReformando(row.status) ? 'Reformando/Em Estoque' : row.status}
                        disabled={!isAdmin && !isRelbio && row.status === 'Enviado/Instalado'}
                        onChange={(e) => handleSelectStatus(origIndex, e.target.value as InstallationStatus)}
                        className={`w-full h-full px-2 py-1 text-center font-medium border-0 outline-none appearance-none ${statusCfg.bg} ${statusCfg.text} transition-colors ${
                          !isAdmin && !isRelbio && row.status === 'Enviado/Instalado'
                            ? 'cursor-not-allowed opacity-95 select-none'
                            : 'cursor-pointer'
                        }`}
                        title={
                          !isAdmin && !isRelbio && row.status === 'Enviado/Instalado'
                            ? "Status 'Enviado/Instalado' bloqueado. Apenas administradores ou Relbio podem alterar."
                            : "Alterar status da obra"
                        }
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-900 font-normal">
                            {st}
                          </option>
                        ))}
                      </select>

                      {/* Lock icon for non-admin/non-relbio when status is Enviado/Instalado */}
                      {!isAdmin && !isRelbio && row.status === 'Enviado/Instalado' && (
                        <span
                          className="absolute left-1.5 text-emerald-950/70 p-0.5 pointer-events-none"
                          title="Status bloqueado para analistas"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      )}

                      {row.status === 'Enviado/Instalado' && row.reaproveitado && (
                        <button
                          type="button"
                          onClick={() => handleToggleReaproveitado(origIndex)}
                          className="absolute right-1 text-[9px] bg-[#2e7d32] text-white px-1 py-0.5 rounded font-bold hover:bg-green-800 transition-all shadow-xs cursor-pointer tracking-tighter"
                          title="Equipamento alterado de Reformando/Em Estoque para Enviado/Instalado (abate 1 unidade do estoque de reformados e 1 da controladora CUDY R300). Clique para alternar para novo."
                        >
                          Reaprov.
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Delete row action - Restrito a Administrador */}
                  <td className="p-0 text-center">
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(origIndex)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-opacity cursor-pointer"
                        title="Excluir obra (Administrador)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span
                        className="opacity-0 group-hover:opacity-50 p-1 inline-flex items-center justify-center text-slate-400 cursor-not-allowed transition-opacity"
                        title="Apenas administradores podem excluir obras"
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Linhas vazias de preenchimento para manter o padrão contínuo de planilha Excel até o final */}
            {Array.from({ length: Math.max(0, 28 - filteredRows.length) }).map((_, i) => {
              const rowNum = filteredRows.length + i + 1;
              return (
                <tr
                  key={`empty-filler-row-${i}`}
                  onClick={handleOpenAddModal}
                  className="border-b border-slate-200/70 hover:bg-slate-50 cursor-pointer h-[28px] transition-colors"
                  title="Clique para adicionar uma nova instalação"
                >
                  <td className="border-r border-slate-300 px-1 py-0.5 text-center text-slate-300 font-mono text-[10px] select-none bg-slate-50/40">
                    {rowNum}
                  </td>
                  <td className="border-r border-slate-300 px-1.5 py-0.5 text-slate-300 text-center text-[10px]">-</td>
                  <td className="border-r border-slate-300 px-2 py-0.5"></td>
                  <td className="border-r border-slate-300 px-2 py-0.5"></td>
                  <td className="border-r border-slate-300 px-2 py-0.5"></td>
                  <td className="border-r border-slate-300 px-2 py-0.5"></td>
                  <td className="px-1 py-0.5 text-center"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="bg-slate-50 border-t border-slate-300 px-3 py-1 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
        <span>Total: <b>{rows.length}</b> linhas</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400"></span> Em Analise: {rows.filter(r => r.status === 'Em Analise').length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#92d050]"></span> Enviado/Instalado: {rows.filter(r => r.status === 'Enviado/Instalado').length}
            {rows.filter(r => r.status === 'Enviado/Instalado' && r.reaproveitado).length > 0 && (
              <span className="text-[10px] text-emerald-800 font-semibold">
                ({rows.filter(r => r.status === 'Enviado/Instalado' && !r.reaproveitado).length} novos, {rows.filter(r => r.status === 'Enviado/Instalado' && r.reaproveitado).length} reaproveitados)
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffff00] border border-slate-300"></span> Reformando/Em Estoque: {rows.filter(r => isStatusReformando(r.status)).length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff0000]"></span> Pendente: {rows.filter(r => r.status === 'Pendente').length}
          </span>
        </div>
      </div>

      {/* POPUP / JANELA MODAL: ADICIONAR REGISTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-black w-full max-w-md overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-[#ffff00] border-b-2 border-black px-4 py-3 flex items-center justify-between font-extrabold text-black uppercase tracking-wider text-[13px]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                <span>Adicionar Instalação / Envio</span>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="p-1 hover:bg-black/10 rounded transition-colors text-black cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmAddRow} className="p-4 space-y-3.5">
              {/* Equipamento (Seleção) */}
              <div>
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
                  Equipamento <span className="text-red-600">*</span>
                </label>
                <select
                  value={formEquipamento}
                  onChange={(e) => setFormEquipamento(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded text-slate-900 bg-white font-medium focus:border-black focus:ring-1 focus:ring-black outline-none cursor-pointer"
                >
                  {EQUIPMENT_OPTIONS.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número do Chamado */}
              <div>
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
                  Número do Chamado
                </label>
                <input
                  type="text"
                  value={formChamado}
                  onChange={(e) => setFormChamado(e.target.value)}
                  placeholder="Ex: 4890"
                  className={`w-full px-2.5 py-2 border rounded text-slate-900 placeholder:text-slate-400 font-mono outline-none ${
                    formChamado.trim() &&
                    formChamado.trim() !== '-' &&
                    (chamadoCounts[formChamado.trim().toLowerCase()] || 0) > 0
                      ? 'border-amber-400 bg-amber-50 focus:ring-amber-500'
                      : 'border-slate-300 focus:border-black focus:ring-1 focus:ring-black'
                  }`}
                  autoFocus
                />
                {formChamado.trim() &&
                  formChamado.trim() !== '-' &&
                  (chamadoCounts[formChamado.trim().toLowerCase()] || 0) > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-100 border border-amber-300 rounded px-2.5 py-1.5 font-bold animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Atenção: Já existe um chamado com este número cadastrado!</span>
                    </div>
                  )}
              </div>

              {/* Cliente */}
              <div>
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={formCliente}
                  onChange={(e) => setFormCliente(e.target.value)}
                  placeholder="Ex: TRISUL"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 uppercase font-medium focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              {/* Obra */}
              <div>
                <label className="block font-bold text-slate-800 text-[11px] uppercase tracking-wide mb-1">
                  Obra
                </label>
                <input
                  type="text"
                  value={formObra}
                  onChange={(e) => setFormObra(e.target.value)}
                  placeholder="Ex: ALTO DA LAPA"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 uppercase font-medium focus:border-black focus:ring-1 focus:ring-black outline-none"
                />
              </div>

              {/* Status Padrão: Em Analise (na cor branca) */}
              <div className="bg-slate-50 border border-slate-300 rounded p-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-[11px] uppercase">Status Inicial:</div>
                  <div className="text-[10px] text-slate-500">Linha será criada com status &quot;Em Analise&quot; em branco</div>
                </div>
                <div className="px-3 py-1 bg-white text-slate-900 border border-slate-300 shadow-sm rounded font-bold text-xs">
                  Em Analise
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded font-bold flex items-center gap-1.5 transition-colors shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Linha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for 'Enviado/Instalado' or 'Reformando/Em Estoque' */}
      {statusConfirmModal && (() => {
        const isReformando = isStatusReformando(statusConfirmModal.targetStatus);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-slate-300">
              {/* Modal Header */}
              <div
                className={`border-b px-4 py-3 flex items-start gap-3 ${
                  isReformando ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div
                  className={`p-2 rounded-full shrink-0 ${
                    isReformando ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {isReformando
                      ? 'Confirmação: Status Reformando/Em Estoque'
                      : 'Confirmação: Status Enviado/Instalado'}
                  </h3>
                  <p
                    className={`text-xs mt-0.5 font-medium ${
                      isReformando ? 'text-amber-900' : 'text-emerald-900'
                    }`}
                  >
                    {isReformando
                      ? 'Confirmação necessária para atualização de status'
                      : 'Ação com restrição permanente de edição'}
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 space-y-3.5 text-xs text-slate-700">
                {/* Card info */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-1.5 font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">CHAMADO:</span>
                    <span className="font-bold text-slate-900 font-mono">{statusConfirmModal.chamado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">CLIENTE:</span>
                    <span className="font-bold text-slate-900">{statusConfirmModal.cliente}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">OBRA:</span>
                    <span className="font-bold text-slate-900">{statusConfirmModal.obraName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">EQUIPAMENTO:</span>
                    <span className="font-bold text-slate-900">{statusConfirmModal.equipamento}</span>
                  </div>
                </div>

                {/* Warning / Notice box */}
                {isReformando ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-950 space-y-2">
                    <p className="font-semibold leading-relaxed">
                      Você selecionou a alteração para o status{' '}
                      <span className="font-bold bg-[#ffff00] text-black px-1.5 py-0.5 rounded border border-amber-300">
                        Reformando/Em Estoque
                      </span>
                      .
                    </p>
                    <p className="text-[11px] text-amber-900 leading-normal">
                      Ao confirmar, este item será registrado com o status de reforma para recondicionamento e controle de estoque de reformados.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-950 space-y-2">
                    <p className="font-semibold leading-relaxed">
                      Atenção: Ao optar pelo status <span className="underline font-bold text-[#2e7d32]">Enviado/Instalado</span>, não será mais possível voltar ou alterar o status desta instalação.
                    </p>
                    <p className="text-[11px] text-red-800 leading-normal">
                      Após confirmar, este registro ficará bloqueado para o usuário analista. Esta alteração só poderá ser revertida ou modificada pelo <b>usuário administrador</b> ou <b>Relbio</b>.
                    </p>
                  </div>
                )}

                <p className="font-bold text-slate-900 text-center pt-1 text-[13px]">
                  {isReformando
                    ? 'Deseja realmente alterar para este status?'
                    : 'Tem certeza que deseja realizar a alteração?'}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelStatusModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusModal}
                  className={`px-4 py-1.5 text-xs font-bold text-black rounded shadow flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isReformando
                      ? 'bg-amber-300 hover:bg-amber-400 border-amber-400'
                      : 'bg-[#92d050] hover:bg-[#82bd44] border-[#71a63b]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isReformando ? 'Sim, alterar status' : 'Sim, confirmar alteração'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

import React from 'react';
import {
  StockItem,
  StockReformedItem,
  ControllerItem,
  InstallationRow,
} from '../types';
import { Lock, PlusCircle, Shield, PackagePlus, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  calculatePurchaseRequirements,
  calculateCurrentStock,
  normalizeEquipmentKey,
} from '../utils/calculations';

interface TopRightStockTableProps {
  initialStock: StockItem[];
  reformedStock: StockReformedItem[];
  controllers: ControllerItem[];
  installations?: InstallationRow[];
  onUpdateInitialStock: (items: StockItem[]) => void;
  onUpdateReformedStock: (items: StockReformedItem[]) => void;
  onUpdateControllers: (items: ControllerItem[]) => void;
  onSelectCell?: (cellRef: string, value: string) => void;
  selectedCell?: string | null;
  canEditInitialStock?: boolean;
  onOpenAddStockModal?: () => void;
  isReadOnly?: boolean;
}

export const TopRightStockTable: React.FC<TopRightStockTableProps> = ({
  initialStock,
  reformedStock,
  controllers,
  installations = [],
  onUpdateInitialStock,
  onUpdateReformedStock,
  onUpdateControllers,
  onSelectCell,
  selectedCell,
  canEditInitialStock = true,
  onOpenAddStockModal,
  isReadOnly = false,
}) => {
  // Calculated stock subtracting installations and reformadas/reaproveitados
  const calculatedStock = calculateCurrentStock(
    initialStock,
    reformedStock,
    controllers,
    installations
  );

  const effectiveCanEdit = canEditInitialStock && !isReadOnly;

  const handleEditInitial = (index: number, val: string) => {
    if (!effectiveCanEdit) return;
    const copy = [...initialStock];
    copy[index] = { ...copy[index], qtdInicial: Number(val) || 0 };
    onUpdateInitialStock(copy);
  };

  const handleEditReformed = (index: number, val: string) => {
    if (!effectiveCanEdit) return;
    const copy = [...reformedStock];
    copy[index] = { ...copy[index], qtd: Number(val) || 0 };
    onUpdateReformedStock(copy);
  };

  const handleEditController = (index: number, val: string) => {
    if (!effectiveCanEdit) return;
    const copy = [...controllers];
    copy[index] = { ...copy[index], qtd: Number(val) || 0 };
    onUpdateControllers(copy);
  };

  // Compute aggregated live totals for the executive summary strip
  const totalNovosAvailable = calculatedStock.initialStock.reduce((acc, curr) => acc + curr.available, 0);
  const totalReformadosAvailable = calculatedStock.reformedStock.reduce((acc, curr) => acc + curr.available, 0);
  const totalControllersAvailable = calculatedStock.controllers.reduce((acc, curr) => acc + curr.available, 0);

  return (
    <div className="bg-white border-2 border-black rounded shadow-md overflow-hidden text-xs ring-2 ring-amber-400/40">
      {/* Header ESTOQUE ATUAL - Highlighted with prominent badge */}
      <div className="bg-[#fabf8f] border-b-2 border-black px-3 py-1.5 font-bold text-black text-[13px] uppercase tracking-wide flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="bg-black text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-xs">
            ★ QUADRO PRINCIPAL
          </span>
          <span className="font-black tracking-wide text-slate-950 text-[13px]">ESTOQUE ATUAL</span>
        </div>
        {isReadOnly ? (
          <span className="text-[10px] bg-slate-800 text-slate-200 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>Modo Consulta (Protegido)</span>
          </span>
        ) : effectiveCanEdit ? (
          <button
            type="button"
            onClick={onOpenAddStockModal}
            className="text-[11px] bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-2.5 py-0.5 rounded flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            title="Adicionar quantidade com motivo ao histórico do banco"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-200" />
            <span>Adicionar Estoque</span>
          </button>
        ) : (
          <span className="text-[10px] bg-amber-900/90 text-amber-100 font-medium px-2 py-0.5 rounded flex items-center gap-1 font-sans tracking-normal normal-case">
            <Lock className="w-3 h-3 text-amber-300" />
            <span>Apenas Administrador pode alterar</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f2f2f2] border-b border-black font-extrabold text-[11px] text-slate-900">
              <th className="border-r border-black px-2.5 py-1.5 text-left">EQUIPAMENTO</th>
              <th className="border-r border-black px-1.5 py-1.5 text-center min-w-[95px] text-[10px] leading-tight" title="Quantidade cadastrada inicial / adicionar (editável)">
                QTD INICIAL / ADCIONAR
              </th>
              <th className="border-r border-black px-1.5 py-1.5 text-center w-20 text-emerald-900 bg-emerald-100/60 font-bold" title="Total com status Enviado/Instalado">
                ENVIADOS
              </th>
              <th className="px-2 py-1.5 text-center w-24 bg-amber-100/90 font-black text-slate-950 text-[11px]" title="Saldo atual disponível (Inicial - Enviados)">
                SALDO ATUAL
              </th>
            </tr>
          </thead>
          <tbody>
            {calculatedStock.initialStock.map((item, i) => {
              const isNegative = item.available < 0;
              const isZero = item.available === 0;
              return (
                <tr key={item.id} className="border-b border-slate-300 hover:bg-amber-50/50 transition-colors">
                  <td className="border-r border-black px-2.5 py-1.5 font-bold text-slate-900 leading-tight">
                    {item.equipamento}
                  </td>
                  {/* INICIAL (EDITÁVEL APENAS ADMIN) */}
                  <td
                    className={`border-r border-black p-0 text-center font-bold text-[12px] ${
                      selectedCell === `ST_IN_${i}` ? 'outline-2 outline-green-600 bg-green-50' : ''
                    } ${!effectiveCanEdit ? 'bg-slate-100/70' : ''}`}
                    onClick={() => onSelectCell?.(`ST_IN_${i}`, String(item.qtdInicial))}
                  >
                    <input
                      type="number"
                      disabled={!effectiveCanEdit}
                      value={item.qtdInicial}
                      onChange={(e) => handleEditInitial(i, e.target.value)}
                      title={
                        effectiveCanEdit
                          ? "Quantidade inicial / adicionar (clique para editar)"
                          : "Bloqueado: Apenas o Administrador pode alterar a quantidade inicial/adicionar"
                      }
                      className={`w-full h-full px-1 py-1.5 text-center outline-none font-bold ${
                        effectiveCanEdit
                          ? 'bg-transparent focus:bg-white text-slate-900 cursor-text'
                          : 'bg-transparent text-slate-600 cursor-not-allowed opacity-80'
                      }`}
                    />
                  </td>
                  {/* ENVIADOS / INSTALADOS (CALCULADO) */}
                  <td className="border-r border-black px-1.5 py-1.5 text-center font-bold text-emerald-800 bg-emerald-50/40">
                    {item.deductions > 0 ? (
                      <span className="font-extrabold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[11px]">
                        -{item.deductions}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">0</span>
                    )}
                  </td>
                  {/* SALDO ATUAL COM DESTAQUE MÁXIMO */}
                  <td
                    className="px-2 py-1.5 text-center"
                    title={`${item.qtdInicial} inicial - ${item.deductions} enviados = ${item.available} saldo atual`}
                  >
                    {isNegative ? (
                      <span className="inline-block px-2 py-0.5 rounded font-black text-[13px] bg-red-100 text-red-700 border-2 border-red-500 shadow-xs min-w-[36px]">
                        {item.available}
                      </span>
                    ) : isZero ? (
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[12px] bg-slate-100 text-slate-700 border border-slate-300 min-w-[36px]">
                        0
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded font-black text-[13px] bg-emerald-100 text-emerald-900 border border-emerald-400/90 shadow-2xs min-w-[36px]">
                        {item.available}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Section: EQUIPAMENTOS REFORMADOS */}
            <tr className="bg-[#d9d9d9] border-y-2 border-black font-extrabold text-slate-950">
              <td className="px-2.5 py-1.5 uppercase tracking-wide text-[11px] border-r border-black">
                EQUIPAMENTOS REFORMADOS
              </td>
              <td className="border-r border-black px-1.5 py-1.5 text-center text-[9.5px] uppercase font-bold leading-tight" title="Estoque inicial de reformados / adicionar (editável)">
                QTD INICIAL / ADCIONAR
              </td>
              <td className="border-r border-black px-1.5 py-1.5 text-center text-[10px] uppercase font-bold text-slate-800 bg-slate-200" title="Quantidade de equipamentos reformados: (+) em estoque/reformando e (-) enviados">
                MOVIMENTO
              </td>
              <td className="px-2 py-1.5 text-center text-[10px] uppercase font-black bg-amber-100/90 text-slate-950" title="Saldo atual de reformados (Inicial + Reformando - Enviados)">
                SALDO ATUAL
              </td>
            </tr>
            {calculatedStock.reformedStock.map((item, i) => {
              const isNegative = item.available < 0;
              const isZero = item.available === 0;
              return (
                <tr key={item.id} className="border-b border-slate-300 hover:bg-amber-50/50 transition-colors">
                  <td className="border-r border-black px-2.5 py-1.5 font-bold text-slate-900 leading-tight">
                    {item.equipamento}
                  </td>
                  {/* INICIAL REFORMADOS (EDITÁVEL APENAS ADMIN) */}
                  <td
                    className={`border-r border-black p-0 text-center font-bold text-[12px] ${
                      selectedCell === `ST_REF_${i}` ? 'outline-2 outline-green-600 bg-green-50' : ''
                    } ${!effectiveCanEdit ? 'bg-slate-100/70' : ''}`}
                    onClick={() => onSelectCell?.(`ST_REF_${i}`, String(item.qtd))}
                  >
                    <input
                      type="number"
                      disabled={!effectiveCanEdit}
                      value={item.qtd}
                      onChange={(e) => handleEditReformed(i, e.target.value)}
                      title={
                        effectiveCanEdit
                          ? "Estoque inicial de reformados / adicionar (clique para editar)"
                          : "Bloqueado: Apenas o Administrador pode alterar a quantidade inicial/adicionar"
                      }
                      className={`w-full h-full px-1 py-1.5 text-center outline-none font-bold ${
                        effectiveCanEdit
                          ? 'bg-transparent focus:bg-white text-slate-900 cursor-text'
                          : 'bg-transparent text-slate-600 cursor-not-allowed opacity-80'
                      }`}
                    />
                  </td>
                  {/* MOVIMENTO REFORMADOS (CALCULADO) */}
                  <td
                    className="border-r border-black px-1.5 py-1.5 text-center font-semibold text-[11px] bg-slate-50 text-slate-800"
                    title={`${item.additions} em estoque/reformando (+), ${item.deductions} enviado(s) (-)`}
                  >
                    {item.additions > 0 && item.deductions > 0 ? (
                      <span className="inline-flex items-center gap-0.5 font-bold">
                        <span className="text-amber-800 font-extrabold bg-amber-100 px-1 rounded">+{item.additions}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1 rounded">-{item.deductions}</span>
                      </span>
                    ) : item.additions > 0 ? (
                      <span className="text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">+{item.additions}</span>
                    ) : item.deductions > 0 ? (
                      <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">-{item.deductions}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0</span>
                    )}
                  </td>
                  {/* SALDO REFORMADOS COM DESTAQUE MÁXIMO */}
                  <td
                    className="px-2 py-1.5 text-center"
                    title={`${item.qtd} inicial + ${item.additions} em estoque/reformando - ${item.deductions} enviados = ${item.available} saldo`}
                  >
                    {isNegative ? (
                      <span className="inline-block px-2 py-0.5 rounded font-black text-[13px] bg-red-100 text-red-700 border-2 border-red-500 shadow-xs min-w-[36px]">
                        {item.available}
                      </span>
                    ) : isZero ? (
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[12px] bg-slate-100 text-slate-700 border border-slate-300 min-w-[36px]">
                        0
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded font-black text-[13px] bg-amber-100 text-amber-900 border border-amber-400/90 shadow-2xs min-w-[36px]">
                        {item.available}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Section: CONTROLADORA */}
            <tr className="bg-[#d9d9d9] border-y-2 border-black font-extrabold text-slate-950">
              <td className="px-2.5 py-1.5 uppercase tracking-wide text-[11px] border-r border-black">
                CONTROLADORA
              </td>
              <td className="border-r border-black px-1.5 py-1.5 text-center text-[9.5px] uppercase font-bold leading-tight" title="Estoque inicial de controladoras / adicionar (editável)">
                QTD INICIAL / ADCIONAR
              </td>
              <td className="border-r border-black px-1.5 py-1.5 text-center text-[10px] uppercase font-bold text-slate-800 bg-slate-200" title="Movimento de controladoras: (+) reformando e (-) enviadas">
                MOVIMENTO
              </td>
              <td className="px-2 py-1.5 text-center text-[10px] uppercase font-black bg-amber-100/90 text-slate-950" title="Saldo atual de controladoras (Inicial + Reformando - Enviadas)">
                SALDO ATUAL
              </td>
            </tr>
            {calculatedStock.controllers.map((item, i) => {
              const isNegative = item.available < 0;
              const isZero = item.available === 0;
              return (
                <tr key={item.id} className="border-b border-black hover:bg-amber-50/50 transition-colors">
                  <td className="border-r border-black px-2.5 py-1.5 font-bold text-slate-900 leading-tight">
                    {item.nome}
                  </td>
                  {/* INICIAL CONTROLADORAS (EDITÁVEL APENAS ADMIN) */}
                  <td
                    className={`border-r border-black p-0 text-center font-bold text-[12px] ${
                      selectedCell === `ST_CTRL_${i}` ? 'outline-2 outline-green-600 bg-green-50' : ''
                    } ${!effectiveCanEdit ? 'bg-slate-100/70' : ''}`}
                    onClick={() => onSelectCell?.(`ST_CTRL_${i}`, String(item.qtd))}
                  >
                    <input
                      type="number"
                      disabled={!effectiveCanEdit}
                      value={item.qtd}
                      onChange={(e) => handleEditController(i, e.target.value)}
                      title={
                        effectiveCanEdit
                          ? "Estoque inicial de controladoras / adicionar (clique para editar)"
                          : "Bloqueado: Apenas o Administrador pode alterar a quantidade inicial/adicionar"
                      }
                      className={`w-full h-full px-1 py-1.5 text-center outline-none font-bold ${
                        effectiveCanEdit
                          ? 'bg-transparent focus:bg-white text-slate-900 cursor-text'
                          : 'bg-transparent text-slate-600 cursor-not-allowed opacity-80'
                      }`}
                    />
                  </td>
                  {/* MOVIMENTO CONTROLADORA (CALCULADO) */}
                  <td
                    className="border-r border-black px-1.5 py-1.5 text-center font-semibold text-[11px] bg-slate-50 text-slate-800"
                    title={`${item.additions} em estoque/reformando (+), ${item.deductions} enviada(s) (-)`}
                  >
                    {item.additions > 0 && item.deductions > 0 ? (
                      <span className="inline-flex items-center gap-0.5 font-bold">
                        <span className="text-amber-800 font-extrabold bg-amber-100 px-1 rounded">+{item.additions}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1 rounded">-{item.deductions}</span>
                      </span>
                    ) : item.additions > 0 ? (
                      <span className="text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">+{item.additions}</span>
                    ) : item.deductions > 0 ? (
                      <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">-{item.deductions}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0</span>
                    )}
                  </td>
                  {/* SALDO CONTROLADORA COM DESTAQUE MÁXIMO */}
                  <td
                    className="px-2 py-1.5 text-center"
                    title={`${item.qtd} inicial + ${item.additions} reformando - ${item.deductions} enviadas = ${item.available} saldo`}
                  >
                    {isNegative ? (
                      <span className="inline-block px-2 py-0.5 rounded font-black text-[13px] bg-red-100 text-red-700 border-2 border-red-500 shadow-xs min-w-[36px]">
                        {item.available}
                      </span>
                    ) : isZero ? (
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-[12px] bg-slate-100 text-slate-700 border border-slate-300 min-w-[36px]">
                        0
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-0.5 rounded font-black text-[13px] bg-blue-100 text-blue-900 border border-blue-400/90 shadow-2xs min-w-[36px]">
                        {item.available}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo Executivo de Saldos no Rodapé do Quadro Estoque Atual */}
      <div className="bg-amber-100/80 border-t-2 border-black px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-900">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">Saldo Novos:</span>
          <span className={`px-1.5 py-0.2 rounded font-black ${totalNovosAvailable < 0 ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-950'}`}>
            {totalNovosAvailable} un.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">Saldo Reformados:</span>
          <span className={`px-1.5 py-0.2 rounded font-black ${totalReformadosAvailable < 0 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-950'}`}>
            {totalReformadosAvailable} un.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">Controladoras:</span>
          <span className={`px-1.5 py-0.2 rounded font-black ${totalControllersAvailable < 0 ? 'bg-red-200 text-red-900' : 'bg-blue-200 text-blue-950'}`}>
            {totalControllersAvailable} un.
          </span>
        </div>
      </div>
    </div>
  );
};

export const MiddleBottomSection: React.FC<{
  forecastTotals: Record<string, number>;
  initialStock: StockItem[];
  reformedStock?: StockReformedItem[];
  controllers: ControllerItem[];
  installations?: InstallationRow[];
  onSelectCell?: (cellRef: string, value: string) => void;
  selectedCell?: string | null;
}> = ({
  forecastTotals,
  initialStock,
  reformedStock = [],
  controllers,
  installations = [],
}) => {
  // Calculate real stock available after subtractive impacts
  const calculatedStock = calculateCurrentStock(
    initialStock,
    reformedStock,
    controllers,
    installations
  );

  const effectiveStockMap: Record<string, number> = {};
  calculatedStock.initialStock.forEach((item) => {
    const key = normalizeEquipmentKey(item.equipamento);
    effectiveStockMap[key] = item.available;
  });

  const cudyCtrl = calculatedStock.controllers.find((c) => normalizeEquipmentKey(c.nome) === 'ctrl_cudy');
  const cudyAvailableStock = cudyCtrl ? cudyCtrl.available : 0;

  const purchaseReqs = calculatePurchaseRequirements(
    forecastTotals,
    initialStock,
    calculatedStock.controllers,
    effectiveStockMap,
    cudyAvailableStock
  );

  const totalEquipmentsToBuy = purchaseReqs.equipments.reduce((sum, item) => sum + (item.toBuy || 0), 0);
  const totalControllersToBuy = purchaseReqs.controllers.reduce((sum, item) => sum + (item.toBuy || 0), 0);
  const totalItemsToBuy = totalEquipmentsToBuy + totalControllersToBuy;
  const itemsNeedingPurchase = [...purchaseReqs.equipments, ...purchaseReqs.controllers].filter((i) => i.toBuy > 0);

  return (
    <div className="w-full">
      {/* QUANTIDADE DE EQUIPAMENTOS NOVOS A COMPRAR */}
      <div className="bg-white border-2 border-black rounded shadow-sm overflow-hidden text-xs">
        <div className="bg-[#f2dcdb] border-b-2 border-black px-3.5 py-2 font-extrabold text-black text-[13px] uppercase tracking-wide flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-rose-800" />
            <span>QUANTIDADE DE EQUIPAMENTOS NOVOS A COMPRAR</span>
          </div>
          <div className="flex items-center gap-2">
            {totalItemsToBuy > 0 ? (
              <span className="bg-rose-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {totalItemsToBuy} itens a comprar
              </span>
            ) : (
              <span className="bg-emerald-700 text-white font-bold text-[11px] px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sem pendências de compra
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-700 normal-case bg-white/80 px-2 py-0.5 rounded border border-black/20">
              Previsão - Saldo
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f7f7f7] border-b border-black font-bold text-[11px] text-slate-800">
                <th className="border-r border-black px-3 py-1.5 text-left">ITEM / EQUIPAMENTO</th>
                <th className="border-r border-black px-2 py-1.5 text-center w-24" title="Previsão total de novas instalações no mês">
                  PREVISÃO
                </th>
                <th className="border-r border-black px-2 py-1.5 text-center w-28 bg-amber-50/40" title="Saldo atual disponível após subtrair instalações realizadas">
                  ESTOQUE ATUAL
                </th>
                <th className="px-3 py-1.5 text-center w-36 bg-rose-700 text-white font-black uppercase tracking-wide border-l border-rose-800" title="Quantidade necessária para comprar">
                  <div className="flex items-center justify-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5 text-rose-200" />
                    <span>A COMPRAR</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Equipamentos Principais */}
              {purchaseReqs.equipments.map((item) => {
                const needsBuy = item.toBuy > 0;
                return (
                  <tr
                    key={item.key}
                    className={`border-b border-slate-300 transition-colors ${
                      needsBuy ? 'bg-rose-50/60 hover:bg-rose-100/60 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="border-r border-black px-3 py-2 font-semibold text-[12px] text-slate-900">
                      <div className="flex items-center justify-between gap-1">
                        <span>{item.label}</span>
                        {needsBuy && (
                          <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                            Comprar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-r border-black px-2 py-2 text-center font-bold text-[13px] text-slate-700">
                      {item.totalToInstall}
                    </td>
                    <td className="border-r border-black px-2 py-2 text-center font-bold text-[13px] text-slate-800 bg-amber-50/20">
                      {item.initialStock}
                    </td>
                    <td className="px-2 py-1.5 text-center bg-rose-100/60 border-l border-rose-300">
                      {needsBuy ? (
                        <span className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs font-black shadow-xs ring-1 ring-rose-700/50 transition-all">
                          <ShoppingCart className="w-3 h-3 text-rose-200" />
                          <span>{item.toBuy} un</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 text-slate-500 bg-white/80 border border-slate-300 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>0 un</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Seção Controladoras */}
              <tr className="bg-[#e9e9e9] border-y-2 border-black font-bold text-slate-900">
                <td colSpan={4} className="border-r border-black px-3 py-1 text-[11px] uppercase tracking-wide">
                  CONTROLADORAS
                </td>
              </tr>
              {purchaseReqs.controllers.map((item) => {
                const needsBuy = item.toBuy > 0;
                return (
                  <tr
                    key={item.key}
                    className={`border-b border-black transition-colors ${
                      needsBuy ? 'bg-rose-50/60 hover:bg-rose-100/60 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="border-r border-black px-3 py-2 font-semibold text-[12px] text-slate-900">
                      <div className="flex items-center justify-between gap-1">
                        <span>{item.label}</span>
                        {needsBuy && (
                          <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded uppercase">
                            Comprar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-r border-black px-2 py-2 text-center font-bold text-[13px] text-slate-700">
                      {item.forecast !== undefined ? item.forecast : '-'}
                    </td>
                    <td className="border-r border-black px-2 py-2 text-center font-bold text-[13px] text-slate-800 bg-amber-50/20">
                      {item.currentStock !== undefined ? item.currentStock : '-'}
                    </td>
                    <td
                      className="px-2 py-1.5 text-center bg-rose-100/60 border-l border-rose-300"
                      title={
                        item.key === 'ctrl_cudy'
                          ? `Total Geral Previsto (${item.forecast}) - Estoque Disponível (${item.currentStock}) = ${item.toBuy}`
                          : undefined
                      }
                    >
                      {needsBuy ? (
                        <span className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs font-black shadow-xs ring-1 ring-rose-700/50 transition-all">
                          <ShoppingCart className="w-3 h-3 text-rose-200" />
                          <span>{item.toBuy} un</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 text-slate-500 bg-white/80 border border-slate-300 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>0 un</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quadro Inferior Executivo: Destaque Consolidado A COMPRAR */}
        <div className="bg-gradient-to-r from-rose-50 via-rose-100/90 to-amber-50 border-t-2 border-rose-400 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0 ${
                totalItemsToBuy > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[12px] font-black uppercase tracking-wide text-rose-950 flex items-center gap-2">
                <span>Destaque de Compras</span>
                {totalItemsToBuy > 0 ? (
                  <span className="bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded shadow-2xs">
                    {itemsNeedingPurchase.length} {itemsNeedingPurchase.length === 1 ? 'item necessário' : 'itens necessários'}
                  </span>
                ) : (
                  <span className="bg-emerald-700 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                    Estoque 100% Suprido
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-700">
                Equipamentos a Comprar: <strong className="text-rose-900 font-bold">{totalEquipmentsToBuy} un</strong> &bull; Controladoras a Comprar: <strong className="text-rose-900 font-bold">{totalControllersToBuy} un</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/95 border-2 border-rose-500 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[11px] font-black text-rose-950 uppercase tracking-wider">
              Total Geral a Comprar:
            </span>
            <span className="text-base font-black text-rose-700">
              {totalItemsToBuy} un.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { MonthSheetData } from '../types';
import {
  calculateForecastTotals,
  calculatePurchaseRequirements,
  MAIN_EQUIPMENT_CATEGORIES,
  isStatusReformando,
  getMonthYear,
} from '../utils/calculations';
import { BarChart3, TrendingUp, CheckCircle2, ShoppingCart, Layers, ArrowUpRight, Calendar } from 'lucide-react';

interface AnnualSummaryTabProps {
  months: MonthSheetData[];
  onSelectMonth: (monthId: string) => void;
  initialYear?: number;
}

export const AnnualSummaryTab: React.FC<AnnualSummaryTabProps> = ({
  months,
  onSelectMonth,
  initialYear,
}) => {
  // Extract all unique years from available months (excluindo anos anteriores a 2026)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    months.forEach((m) => {
      const y = getMonthYear(m);
      if (y >= 2026) {
        yearsSet.add(y);
      }
    });
    // Iniciar pelo ano de 2026 e anos vigentes
    yearsSet.add(2026);
    const currentYear = new Date().getFullYear();
    if (currentYear > 2026) {
      yearsSet.add(currentYear);
    }
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [months]);

  // Determine active selected year
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (initialYear && initialYear >= 2026 && availableYears.includes(initialYear)) return initialYear;
    // Default to the year of the last month >= 2026 or 2026
    const validMonths = months.filter((m) => getMonthYear(m) >= 2026);
    if (validMonths.length > 0) {
      return getMonthYear(validMonths[validMonths.length - 1]);
    }
    return 2026;
  });

  // Filter months strictly by the selected year
  const yearMonths = useMemo(() => {
    return months.filter((m) => getMonthYear(m) === selectedYear);
  }, [months, selectedYear]);

  // Aggregate stats across months of the selected year
  const monthlyMetrics = useMemo(() => {
    return yearMonths.map((m) => {
      const installedCount = m.installations.filter((r) => r.status === 'Enviado/Instalado').length;
      const reformedCount = m.installations.filter((r) => isStatusReformando(r.status)).length;
      const pendingCount = m.installations.filter((r) => r.status === 'Pendente').length;
      const reverseCount = m.installations.filter((r) => r.status === 'Logística-Reversa').length;

      const forecastTotals = calculateForecastTotals(m.forecasts);
      const totalForecastUnits = Object.values(forecastTotals).reduce((a, b) => a + b, 0);

      const purchaseReqs = calculatePurchaseRequirements(forecastTotals, m.initialStock, m.controllers);
      const totalToBuy = purchaseReqs.equipments.reduce((acc, curr) => acc + curr.toBuy, 0);

      return {
        monthId: m.id,
        monthName: m.monthName,
        isFinalized: Boolean(m.isFinalized),
        isCurrent: Boolean(m.isCurrent),
        totalInstRows: m.installations.length,
        installedCount,
        reformedCount,
        pendingCount,
        reverseCount,
        totalForecastUnits,
        forecastTotals,
        totalToBuy,
      };
    });
  }, [yearMonths]);

  const totalAllInstalled = monthlyMetrics.reduce((a, b) => a + b.installedCount, 0);
  const totalAllForecast = monthlyMetrics.reduce((a, b) => a + b.totalForecastUnits, 0);
  const totalAllToBuy = monthlyMetrics.reduce((a, b) => a + b.totalToBuy, 0);
  const totalAllPending = monthlyMetrics.reduce((a, b) => a + b.pendingCount, 0);

  // Equipment totals for the selected year
  const equipmentAnnualTotals: Record<string, { forecast: number; toBuy: number }> = useMemo(() => {
    const totals: Record<string, { forecast: number; toBuy: number }> = {};
    MAIN_EQUIPMENT_CATEGORIES.forEach((cat) => {
      totals[cat.key] = { forecast: 0, toBuy: 0 };
    });

    yearMonths.forEach((m) => {
      const fTotals = calculateForecastTotals(m.forecasts);
      const reqs = calculatePurchaseRequirements(fTotals, m.initialStock, m.controllers);

      MAIN_EQUIPMENT_CATEGORIES.forEach((cat) => {
        totals[cat.key].forecast += fTotals[cat.key] || 0;
        const found = reqs.equipments.find((e) => e.key === cat.key);
        if (found) {
          totals[cat.key].toBuy += found.toBuy;
        }
      });
    });

    return totals;
  }, [yearMonths]);

  return (
    <div className="space-y-6 pb-12">
      {/* Year Selection Bar */}
      <div className="bg-white border-2 border-emerald-800 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-wide uppercase">
              RESUMO ANUAL CONSOLIDADO - EXERCÍCIO {selectedYear}
            </h2>
            <p className="text-xs text-slate-500">
              Selecione o ano para filtrar os indicadores e tabelas consolidadas ({yearMonths.length} {yearMonths.length === 1 ? 'mês cadastrado' : 'meses cadastrados'})
            </p>
          </div>
        </div>

        {/* Year Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1">Ano Escolhido:</span>
          {availableYears.map((year) => {
            const isSelected = year === selectedYear;
            const hasData = months.some((m) => getMonthYear(m) === year);
            return (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {year}
                {hasData && (
                  <span className={`ml-1.5 px-1 py-0.2 text-[10px] rounded ${isSelected ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                    {months.filter((m) => getMonthYear(m) === year).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {yearMonths.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-base text-slate-700">Nenhum mês cadastrado para o ano de {selectedYear}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Ao concluir meses de anos anteriores e avançar nas abas, os dados do exercício {selectedYear} aparecerão consolidados aqui.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-emerald-600 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Instalações Realizadas</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{totalAllInstalled}</div>
              <div className="text-xs text-emerald-700 mt-1 font-medium">Equipamentos enviados/instalados em {selectedYear}</div>
            </div>

            <div className="bg-white border-2 border-blue-600 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Previsão Acumulada</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{totalAllForecast}</div>
              <div className="text-xs text-blue-700 mt-1 font-medium">Unidades planejadas para obras em {selectedYear}</div>
            </div>

            <div className="bg-white border-2 border-rose-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Necessidade de Compra</span>
                <ShoppingCart className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{totalAllToBuy}</div>
              <div className="text-xs text-rose-700 mt-1 font-medium">Equipamentos novos a adquirir em {selectedYear}</div>
            </div>

            <div className="bg-white border-2 border-amber-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Pendências de Envio</span>
                <Layers className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">{totalAllPending}</div>
              <div className="text-xs text-amber-700 mt-1 font-medium">Instalações em status Pendente ({selectedYear})</div>
            </div>
          </div>

          {/* Monthly Comparative Grid */}
          <div className="bg-white border-2 border-black rounded shadow-sm overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase">Consolidado Mensal do Ano {selectedYear}</h3>
              </div>
              <span className="text-xs text-slate-300">Clique em qualquer mês para abrir seus detalhes</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold text-slate-800 text-[11px]">
                    <th className="border-r border-slate-300 px-3 py-2 text-left">MÊS</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center">TOTAL REGISTROS</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center bg-emerald-50 text-emerald-900">ENVIADOS/INSTALADOS</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center bg-yellow-50 text-yellow-900">REFORMANDO/EM ESTOQUE</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center bg-red-50 text-red-900">PENDENTES</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center bg-blue-50 text-blue-900">PREVISÃO (UNIDADES)</th>
                    <th className="border-r border-slate-300 px-3 py-2 text-center bg-rose-50 text-rose-900">NOVOS A COMPRAR</th>
                    <th className="px-3 py-2 text-center">AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyMetrics.map((row) => (
                    <tr key={row.monthId} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="border-r border-slate-300 px-3 py-2 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${row.isCurrent ? 'bg-emerald-600 animate-pulse' : row.isFinalized ? 'bg-slate-400' : 'bg-emerald-500'}`}></span>
                        <span>{row.monthName}</span>
                        {row.isCurrent && (
                          <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-900 font-black px-1 rounded uppercase">Vigente</span>
                        )}
                        {row.isFinalized && (
                          <span className="ml-1 text-[9px] bg-slate-200 text-slate-700 font-semibold px-1 rounded uppercase">Consulta</span>
                        )}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-mono">{row.totalInstRows}</td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-bold text-emerald-700 bg-emerald-50/40">
                        {row.installedCount}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-bold text-amber-700 bg-amber-50/40">
                        {row.reformedCount}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-bold text-red-600 bg-red-50/40">
                        {row.pendingCount}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-bold text-blue-700 bg-blue-50/40">
                        {row.totalForecastUnits}
                      </td>
                      <td className="border-r border-slate-300 px-3 py-2 text-center font-extrabold text-rose-600 bg-rose-50/40">
                        {row.totalToBuy}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onSelectMonth(row.monthId)}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] underline cursor-pointer"
                        >
                          Abrir Planilha <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-black font-extrabold text-slate-900">
                    <td className="border-r border-slate-300 px-3 py-2 uppercase">TOTAL ANUAL ({selectedYear})</td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center font-mono">
                      {monthlyMetrics.reduce((a, b) => a + b.totalInstRows, 0)}
                    </td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-emerald-800">{totalAllInstalled}</td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-amber-800">
                      {monthlyMetrics.reduce((a, b) => a + b.reformedCount, 0)}
                    </td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-red-700">{totalAllPending}</td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-blue-800">{totalAllForecast}</td>
                    <td className="border-r border-slate-300 px-3 py-2 text-center text-rose-700 text-[13px]">{totalAllToBuy}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Equipment Demand Breakdown */}
          <div className="bg-white border-2 border-black rounded shadow-sm overflow-hidden text-xs">
            <div className="bg-[#fabf8f] border-b-2 border-black px-4 py-2 font-bold text-black text-sm uppercase">
              DEMANDA CONSOLIDADA POR MODELO DE EQUIPAMENTO ({selectedYear})
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {MAIN_EQUIPMENT_CATEGORIES.map((cat) => {
                const data = equipmentAnnualTotals[cat.key];
                return (
                  <div key={cat.key} className="border border-slate-300 rounded p-3 bg-slate-50">
                    <div className="font-bold text-slate-900 text-sm">{cat.labelSummary}</div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Total Previsto ({selectedYear})</div>
                        <div className="text-lg font-black text-blue-700">{data.forecast} un.</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Compras Necessárias ({selectedYear})</div>
                        <div className="text-lg font-black text-rose-600">{data.toBuy} un.</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

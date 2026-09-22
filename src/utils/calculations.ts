import { ForecastRow, StockItem, StockReformedItem, ControllerItem, InstallationRow, MonthSheetData } from '../types';

export interface CategorySummary {
  categoryKey: string;
  displayName: string;
  totalForecast: number;
  initialStock: number;
  toBuy: number;
}

export function normalizeEquipmentKey(name: string): string {
  const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (clean.includes('duplo') || clean.includes('dx-2 duo') || clean.includes('dx2-duo') || clean.includes('dx2 duo')) {
    return 'facial_duplo';
  }
  if (clean.includes('unico') || clean.includes('dx-2') || clean.includes('dx2')) {
    return 'facial_unico';
  }
  if (clean.includes('caixa') || clean.includes('dx-s') || clean.includes('dxs') || clean.includes('leitor')) {
    return 'facial_caixa';
  }
  if (clean.includes('torniquete') || clean.includes('dx-3') || clean.includes('dx3')) {
    return 'torniquete';
  }
  if (clean.includes('cudy') || clean.includes('r300') || clean.includes('wr300')) {
    return 'ctrl_cudy';
  }
  if (clean.includes('gli') || clean.includes('net')) {
    return 'ctrl_gli';
  }
  return clean.trim();
}

export const MAIN_EQUIPMENT_CATEGORIES = [
  {
    key: 'facial_unico',
    labelSummary: 'Catraca De Facial Único (DX-2)',
    labelStock: 'Catraca de Facial Único (DX-2)',
    labelBuy: 'Catraca De Facial Único (DX-2)',
  },
  {
    key: 'facial_duplo',
    labelSummary: 'Catraca de Facial Duplo (DX2-DUO)',
    labelStock: 'Catraca de Facial Duplo (DX2-DUO)',
    labelBuy: 'Catraca De Facial Único (DX-2 DUO)',
  },
  {
    key: 'facial_caixa',
    labelSummary: 'Leitor facial + Caixa (DXS)',
    labelStock: 'Leitor facial + Caixa (DXS)',
    labelBuy: 'Leitor + Caixa (DX-S)',
  },
  {
    key: 'torniquete',
    labelSummary: 'Catraca Torniquete',
    labelStock: 'Catraca Torniquete',
    labelBuy: 'Torniquete (DX-3)',
  },
];

export function calculateForecastTotals(forecasts: ForecastRow[]) {
  const totals: Record<string, number> = {
    facial_unico: 0,
    facial_duplo: 0,
    facial_caixa: 0,
    torniquete: 0,
  };

  forecasts.forEach((row) => {
    const key = normalizeEquipmentKey(row.equipamento);
    const qtd = Number(row.qtd) || 0;
    if (totals[key] !== undefined) {
      totals[key] += qtd;
    } else {
      totals[key] = (totals[key] || 0) + qtd;
    }
  });

  return totals;
}

export interface EquipmentStockImpact {
  enviadosNovos: number;
  reformadosEmEstoque: number;
  reaproveitados: number;
}

export function isStatusReformando(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes('reformad') || s.includes('reformand');
}

export function calculateInstallationsStockImpact(installations: InstallationRow[]) {
  const counts: Record<string, EquipmentStockImpact> = {
    facial_unico: { enviadosNovos: 0, reformadosEmEstoque: 0, reaproveitados: 0 },
    facial_duplo: { enviadosNovos: 0, reformadosEmEstoque: 0, reaproveitados: 0 },
    facial_caixa: { enviadosNovos: 0, reformadosEmEstoque: 0, reaproveitados: 0 },
    torniquete: { enviadosNovos: 0, reformadosEmEstoque: 0, reaproveitados: 0 },
  };

  let cudyEnviadosNovos = 0;
  let cudyReaproveitados = 0;
  let cudyReformados = 0;

  installations.forEach((row) => {
    const isEnviado = row.status === 'Enviado/Instalado';
    const isReformado = isStatusReformando(row.status);
    const isReaproveitado = isEnviado && Boolean(row.reaproveitado);

    // Regra da Controladora CUDY R300:
    // 1. Se o status for "Reformando/Em Estoque": adiciona uma quantidade no saldo da Controladora CUDY R300 (+1)
    // 2. Se o status alterar de Reformando/Em Estoque para Enviado/Instalado (reaproveitado):
    //    subtrai exatamente de um a um (-1 no saldo) da Controladora CUDY R300
    // 3. Se o status for Enviado/Instalado novo: abate (-1 no saldo) da Controladora CUDY R300
    if (isReformado) {
      cudyReformados += 1;
    } else if (isEnviado) {
      if (isReaproveitado) {
        cudyReaproveitados += 1;
      } else {
        cudyEnviadosNovos += 1;
      }
    }

    const key = normalizeEquipmentKey(row.equipamento);
    if (!counts[key]) {
      counts[key] = { enviadosNovos: 0, reformadosEmEstoque: 0, reaproveitados: 0 };
    }

    if (isReformado) {
      // Status "Reformando/Em Estoque" -> Adiciona uma quantidade no saldo do estoque de EQUIPAMENTOS REFORMADOS (+1)
      counts[key].reformadosEmEstoque += 1;
    } else if (isEnviado) {
      if (isReaproveitado) {
        // Alterado de Reformando/Em Estoque para Enviado/Instalado -> Subtrai de um a um (-1 no saldo de reformados)
        counts[key].reaproveitados += 1;
      } else {
        // Envio padrão de equipamento novo -> Abate do estoque de novos (-1)
        counts[key].enviadosNovos += 1;
      }
    }
  });

  const cudyEnviados = cudyEnviadosNovos + cudyReaproveitados;

  return {
    counts,
    cudyEnviados,
    cudyReformados,
    cudyEnviadosNovos,
    cudyReaproveitados,
  };
}

export interface CalculatedStockItem extends StockItem {
  initial: number;
  deductions: number;
  available: number;
}

export interface CalculatedReformedItem extends StockReformedItem {
  initial: number;
  additions: number;
  deductions: number;
  available: number;
  reformadosEmEstoque: number;
  reaproveitados: number;
}

export interface CalculatedControllerItem extends ControllerItem {
  initial: number;
  deductions: number;
  additions: number;
  available: number;
}

export function calculateCurrentStock(
  initialStock: StockItem[],
  reformedStock: StockReformedItem[],
  controllers: ControllerItem[],
  installations: InstallationRow[]
) {
  const { counts, cudyEnviados, cudyReformados, cudyEnviadosNovos, cudyReaproveitados } =
    calculateInstallationsStockImpact(installations);

  const calculatedInitialStock: CalculatedStockItem[] = initialStock.map((item) => {
    const key = normalizeEquipmentKey(item.equipamento);
    const deductions = counts[key]?.enviadosNovos || 0;
    const available = item.qtdInicial - deductions;
    return {
      ...item,
      initial: item.qtdInicial,
      deductions,
      available,
    };
  });

  const calculatedReformedStock: CalculatedReformedItem[] = reformedStock.map((item) => {
    const key = normalizeEquipmentKey(item.equipamento);
    const impact = counts[key] || { reformadosEmEstoque: 0, reaproveitados: 0, enviadosNovos: 0 };
    // Saldo reformados:
    // +1 no saldo para cada equipamento com status "Reformando/Em Estoque"
    // Ao alterar de Reformando/Em Estoque para Enviado/Instalado (reaproveitado),
    // subtrai exatamente de um a um (-1 no saldo)
    const additions = impact.reformadosEmEstoque + impact.reaproveitados;
    const deductions = impact.reaproveitados;
    const available = item.qtd + additions - deductions;
    return {
      ...item,
      initial: item.qtd,
      additions,
      deductions,
      available,
      reformadosEmEstoque: impact.reformadosEmEstoque,
      reaproveitados: deductions,
    };
  });

  const calculatedControllers: CalculatedControllerItem[] = controllers.map((item) => {
    const key = normalizeEquipmentKey(item.nome);
    if (key === 'ctrl_cudy') {
      // Saldo da Controladora CUDY R300:
      // +1 no saldo se o status for "Reformando/Em Estoque"
      // Ao alterar de Reformando/Em Estoque para Enviado/Instalado, subtrai de um a um (-1 no saldo)
      // Se for envio de equipamento novo, abate uma unidade (-1 no saldo)
      const additions = cudyReformados + cudyReaproveitados;
      const deductions = cudyEnviadosNovos + cudyReaproveitados;
      const available = item.qtd + additions - deductions;
      return {
        ...item,
        initial: item.qtd,
        deductions,
        additions,
        available,
      };
    } else {
      return {
        ...item,
        initial: item.qtd,
        deductions: 0,
        additions: 0,
        available: item.qtd,
      };
    }
  });

  return {
    initialStock: calculatedInitialStock,
    reformedStock: calculatedReformedStock,
    controllers: calculatedControllers,
    counts,
    cudyEnviados,
    cudyReformados,
    cudyEnviadosNovos,
    cudyReaproveitados,
  };
}

export interface PurchaseControllerItem {
  key: string;
  label: string;
  forecast?: number;
  currentStock?: number;
  toBuy: number;
}

export function calculatePurchaseRequirements(
  forecastTotals: Record<string, number>,
  initialStock: StockItem[],
  controllers: (ControllerItem | CalculatedControllerItem)[],
  effectiveStockMap?: Record<string, number>,
  cudyAvailableStock?: number
) {
  const stockMap: Record<string, number> = {};
  initialStock.forEach((s) => {
    const key = normalizeEquipmentKey(s.equipamento);
    stockMap[key] = Number(s.qtdInicial) || 0;
  });

  // Calculate to buy for the 4 core equipment types:
  const buyRequirements = MAIN_EQUIPMENT_CATEGORIES.map((cat) => {
    const totalToInstall = forecastTotals[cat.key] || 0;
    const stock = effectiveStockMap ? (effectiveStockMap[cat.key] ?? 0) : (stockMap[cat.key] ?? 0);
    const needed = Math.max(0, totalToInstall - stock);
    return {
      key: cat.key,
      label: cat.labelBuy,
      totalToInstall,
      initialStock: stock,
      toBuy: needed,
    };
  });

  // Total Geral Previsto (soma de todas as categorias previstas)
  const totalGeralPrevisto = Object.values(forecastTotals).reduce((sum, val) => sum + (Number(val) || 0), 0);

  // Controllers:
  const cudyCtrl = controllers.find((c) => normalizeEquipmentKey(c.nome) === 'ctrl_cudy');
  const gliCtrl = controllers.find((c) => normalizeEquipmentKey(c.nome) === 'ctrl_gli');

  const cudyStock =
    cudyAvailableStock !== undefined
      ? cudyAvailableStock
      : cudyCtrl
      ? 'available' in cudyCtrl
        ? (cudyCtrl as CalculatedControllerItem).available
        : Number(cudyCtrl.qtd) || 0
      : 0;

  // Regra solicitada:
  // "na controladora Controladora - Cudy - R300 a quantidade a comprar deve ser quantidade total Total Geral Previsto: menos a qauntidade total em estoque no quadro ESTOQUE ATUAL Controladora CUDY R300"
  const cudyToBuy = Math.max(0, totalGeralPrevisto - cudyStock);

  const gliStock = gliCtrl
    ? 'available' in gliCtrl
      ? (gliCtrl as CalculatedControllerItem).available
      : Number(gliCtrl.qtd) || 0
    : 0;
  const gliToBuy = gliStock < 0 ? Math.abs(gliStock) : 0;

  return {
    totalGeralPrevisto,
    equipments: buyRequirements,
    controllers: [
      {
        key: 'ctrl_cudy',
        label: 'Controladora - Cudy - R300',
        forecast: totalGeralPrevisto,
        currentStock: cudyStock,
        toBuy: cudyToBuy,
      },
      {
        key: 'ctrl_gli',
        label: 'Controladora Gli NET',
        forecast: undefined,
        currentStock: gliStock,
        toBuy: gliToBuy,
      },
    ],
  };
}

export const MONTH_NAMES_ORDER = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

export function getMonthYear(month: MonthSheetData): number {
  if (month.year && typeof month.year === 'number') {
    return month.year;
  }
  const match = month.monthName?.match(/\b(20\d{2})\b/);
  if (match) return parseInt(match[1], 10);

  for (const f of month.forecasts || []) {
    if (f.dataPrevista) {
      const ym = f.dataPrevista.match(/\b(20\d{2})\b/);
      if (ym) return parseInt(ym[1], 10);
    }
  }
  const currentYear = new Date().getFullYear();
  return currentYear >= 2026 ? currentYear : 2026;
}

export function getMonthIndex(monthName: string): number {
  const clean = (monthName || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanOrder = MONTH_NAMES_ORDER.map((m) => m.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const idx = cleanOrder.findIndex((m) => clean.includes(m));
  return idx !== -1 ? idx : 0;
}

export function getNextMonthDetails(currentMonth: MonthSheetData): { name: string; year: number } {
  const curYear = getMonthYear(currentMonth);
  const curIndex = getMonthIndex(currentMonth.monthName);

  if (curIndex === 11) {
    return {
      name: MONTH_NAMES_ORDER[0],
      year: curYear + 1,
    };
  } else {
    return {
      name: MONTH_NAMES_ORDER[curIndex + 1],
      year: curYear,
    };
  }
}


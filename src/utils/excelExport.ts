import * as XLSX from 'xlsx';
import { MonthSheetData } from '../types';

export function exportMonthToExcel(sheetData: MonthSheetData) {
  const wb = XLSX.utils.book_new();

  // 1. Installations Sheet
  const instData = sheetData.installations.map((r) => ({
    'CHAMADO': r.chamado,
    'CLIENTE': r.cliente,
    'OBRA': r.obra,
    'EQUIPAMENTO': r.equipamento,
    'STATUS': r.status,
  }));
  const wsInst = XLSX.utils.json_to_sheet(instData);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instalações Realizadas');

  // 2. Forecasts Sheet
  const foreData = sheetData.forecasts.map((r) => ({
    'CHAMADO': r.chamado,
    'CLIENTE': r.cliente,
    'OBRA': r.obra,
    'EQUIPAMENTO': r.equipamento,
    'DATA PREVISTA': r.dataPrevista || '',
    'QUANTIDADE': r.qtd,
  }));
  const wsFore = XLSX.utils.json_to_sheet(foreData);
  XLSX.utils.book_append_sheet(wb, wsFore, 'Previsões do Mês');

  // 3. Stock Sheet
  const stockData = [
    ...sheetData.initialStock.map((s) => ({ 'TIPO': 'Estoque Inicial', 'ITEM': s.equipamento, 'QTD': s.qtdInicial })),
    ...sheetData.reformedStock.map((s) => ({ 'TIPO': 'Reformado/Em Estoque', 'ITEM': s.equipamento, 'QTD': s.qtd })),
    ...sheetData.controllers.map((c) => ({ 'TIPO': 'Controladora', 'ITEM': c.nome, 'QTD': c.qtd })),
  ];
  const wsStock = XLSX.utils.json_to_sheet(stockData);
  XLSX.utils.book_append_sheet(wb, wsStock, 'Estoque');

  // Trigger download
  XLSX.writeFile(wb, `Controle_Equipamentos_${sheetData.monthName}.xlsx`);
}

export function exportAllMonthsToExcel(allMonths: MonthSheetData[]) {
  const wb = XLSX.utils.book_new();

  allMonths.forEach((m) => {
    const combinedRows: (string | number)[][] = [
      [`CONTROLE DE EQUIPAMENTOS - ${m.monthName}`],
      [],
      ['--- INSTALAÇÕES/ENVIOS REALIZADOS ---'],
      ['CHAMADO', 'CLIENTE', 'OBRA', 'EQUIPAMENTO', 'STATUS'],
      ...m.installations.map((r) => [r.chamado, r.cliente, r.obra, r.equipamento, r.status]),
      [],
      ['--- PREVISÃO DE NOVAS INSTALAÇÕES ---'],
      ['CHAMADO', 'CLIENTE', 'OBRA', 'EQUIPAMENTO', 'DATA PREVISTA', 'QTD'],
      ...m.forecasts.map((r) => [r.chamado, r.cliente, r.obra, r.equipamento, r.dataPrevista || '', r.qtd]),
      [],
      ['--- ESTOQUE ATUAL ---'],
      ['EQUIPAMENTO', 'QTD INICIAL / ADCIONAR'],
      ...m.initialStock.map((s) => [s.equipamento, s.qtdInicial]),
      ['EQUIPAMENTOS REFORMADOS/EM ESTOQUE', 'QTD'],
      ...m.reformedStock.map((s) => [s.equipamento, s.qtd]),
      ['CONTROLADORA', 'QTD'],
      ...m.controllers.map((c) => [c.nome, c.qtd]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(combinedRows);
    XLSX.utils.book_append_sheet(wb, ws, m.monthName.substring(0, 31));
  });

  XLSX.writeFile(wb, `Controle_Equipamentos_Completo.xlsx`);
}

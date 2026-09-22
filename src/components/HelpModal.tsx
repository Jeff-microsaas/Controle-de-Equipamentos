import React from 'react';
import { X, CheckCircle2, Calculator, ArrowRight, Download, FileSpreadsheet } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-400">
        <div className="bg-[#107c41] text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 font-bold text-base">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Guia da Planilha Dinâmica &bull; Controle de Equipamentos</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-emerald-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm text-slate-700">
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Visão Geral das Tabelas</h4>
            <p className="text-slate-600 leading-relaxed">
              Esta aplicação recria a estrutura e regras da sua planilha de <b>Controle de Equipamentos</b> com cálculos automáticos em tempo real, suporte a múltiplos meses e exportação compatível com Microsoft Excel.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffff00] border border-black"></span>
                1. Instalações / Envios Realizados & Regras de Estoque
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Ao clicar em <b>+ Adicionar</b>, uma janela permite escolher o equipamento e inserir número do chamado, cliente e obra, adicionando com status inicial <b>Em Analise (branco)</b>.
              </p>
              <ul className="text-xs text-amber-900 list-disc list-inside mt-1.5 space-y-1">
                <li><b>Enviado/Instalado:</b> Abate do estoque de equipamentos novos e <b>abate 1 unidade (-1)</b> do saldo da <b>Controladora CUDY R300</b>.</li>
                <li><b>Reformando/Em Estoque:</b> <b>Adiciona (+1)</b> no saldo do estoque de <b>EQUIPAMENTOS REFORMADOS</b> para o equipamento escolhido e também <b>adiciona (+1)</b> no saldo da <b>Controladora CUDY R300</b>.</li>
                <li><b>Mudança de Reformando para Enviado/Instalado:</b> Se o status alterar de <i>Reformando/Em Estoque</i> para <i>Enviado/Instalado</i>, <b>subtrai uma unidade (-1)</b> no <b>EQUIPAMENTOS REFORMADOS</b> e também <b>subtrai uma unidade (-1)</b> do saldo da <b>Controladora CUDY R300</b>.</li>
              </ul>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                2. Previsão e Soma Automática a Instalar
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Ao adicionar ou alterar quantidades na tabela de previsão, a tabela inferior <b>QUANTIDADE TOTAL A INSTALAR</b> recalcula instantaneamente o somatório para cada modelo em destaque vermelho.
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-rose-600" />
                3. Equipamentos Novos a Comprar
              </div>
              <p className="text-xs text-rose-800 mt-1">
                Para os equipamentos principais: <code>Previsão - Saldo Atual em Estoque</code>. Para a <b>Controladora CUDY R300</b>: calcula o <b>Total Geral Previsto</b> menos a <b>quantidade em estoque</b> no quadro ESTOQUE ATUAL (<code>Total Geral Previsto - Saldo Atual</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded-md">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                4. Formatação Condicional & Estoque
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Quantidades negativas de estoque (ex: <code>-12</code> ou <code>-5</code>) são destacadas em vermelho automaticamente, facilitando a identificação imediata de déficits.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Clique em qualquer célula para editar diretamente ou na barra de fórmulas <code>fx</code>.
            </div>
            <button
              onClick={onClose}
              className="bg-[#107c41] text-white hover:bg-emerald-700 px-4 py-1.5 rounded font-semibold text-xs transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

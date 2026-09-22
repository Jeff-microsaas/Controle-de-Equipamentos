export type InstallationStatus = 'Enviado/Instalado' | 'Logística-Reversa' | 'Reformando/Em Estoque' | 'Reformado/Em Estoque' | 'Pendente' | 'Em Analise';

export interface InstallationRow {
  id: string;
  chamado: string;
  cliente: string;
  obra: string;
  equipamento: string;
  status: InstallationStatus;
  reaproveitado?: boolean;
}

export interface ForecastRow {
  id: string;
  chamado: string;
  cliente: string;
  obra: string;
  equipamento: string;
  dataPrevista?: string;
  qtd: number;
}

export interface StockItem {
  id: string;
  equipamento: string;
  qtdInicial: number;
}

export interface StockReformedItem {
  id: string;
  equipamento: string;
  qtd: number;
}

export interface ControllerItem {
  id: string;
  nome: string;
  qtd: number;
}

export interface AvailableStockItem {
  id: string;
  equipamento: string;
  qtdDisponivel: number;
}

export interface MonthSheetData {
  id: string;
  monthName: string;
  year?: number;
  isFinalized?: boolean;
  isCurrent?: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
  installations: InstallationRow[];
  forecasts: ForecastRow[];
  initialStock: StockItem[];
  reformedStock: StockReformedItem[];
  controllers: ControllerItem[];
  bottomAvailableStock: AvailableStockItem[];
  bottomReformedStock: AvailableStockItem[];
  updatedAt?: string;
  updatedBy?: string;
}

export type UserRole = 'admin' | 'operator' | 'analista' | 'relbio';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  password?: string;
  passwordHash?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  details: string;
  monthName: string;
  monthId: string;
  category?: 'estoque' | 'instalacoes' | 'previsoes' | 'usuarios' | 'abas' | 'sistema';
}

export interface EquipmentMappingKey {
  key: string;
  display: string;
  aliases: string[];
}

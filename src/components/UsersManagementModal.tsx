import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import {
  getAllUsers,
  updateUserRole,
  createNewUserByAdmin,
  deleteUserByAdmin,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ANALYST_EMAIL,
  DEFAULT_RELBIO_EMAIL,
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  X,
  Shield,
  UserPlus,
  Trash2,
  Check,
  AlertCircle,
  Key,
  Mail,
  User as UserIcon,
} from 'lucide-react';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadUsersList();
  }, [isOpen]);

  const loadUsersList = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users', e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (targetUser: AppUser, targetNewRole: UserRole) => {
    if (!isAdmin) {
      alert('Somente administradores podem alterar permissões de outros usuários.');
      return;
    }

    if (targetUser.uid === currentUser?.uid && targetNewRole !== 'admin') {
      if (!confirm('Você está prestes a remover seu próprio perfil de Administrador. Tem certeza?')) {
        return;
      }
    }

    setUpdatingUid(targetUser.uid);
    try {
      if (currentUser) {
        await updateUserRole(targetUser.uid, targetNewRole, currentUser);
      } else {
        await updateUserRole(targetUser.uid, targetNewRole);
      }
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, role: targetNewRole } : u))
      );
      setSuccessMsg(`Perfil de ${targetUser.displayName || targetUser.email} atualizado para ${targetNewRole === 'admin' ? 'Administrador' : 'Operador'}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to update role', err);
      setErrorMsg('Erro ao atualizar função do usuário.');
      setTimeout(() => setErrorMsg(null), 3500);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentUser) {
      setErrorMsg('Apenas o Administrador pode cadastrar novos usuários.');
      return;
    }

    if (!newEmail || !newPassword) {
      setErrorMsg('Preencha ao menos o e-mail e a senha.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await createNewUserByAdmin(
        currentUser,
        newName,
        newEmail,
        newPassword,
        newRole
      );
      setUsers((prev) => [...prev, created]);
      setSuccessMsg(`Usuário ${created.displayName} (${created.email}) cadastrado com sucesso!`);
      setShowAddUser(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('operator');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao cadastrar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (targetUser: AppUser) => {
    if (!isAdmin || !currentUser) return;
    if (targetUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
      alert('O administrador principal (admin@digidox.net) não pode ser excluído.');
      return;
    }
    if (targetUser.uid === currentUser.uid) {
      alert('Você não pode excluir sua própria conta conectada.');
      return;
    }

    if (!confirm(`Deseja realmente remover o usuário ${targetUser.email}?`)) {
      return;
    }

    try {
      await deleteUserByAdmin(currentUser, targetUser.uid, targetUser.email);
      setUsers((prev) => prev.filter((u) => u.uid !== targetUser.uid));
      setSuccessMsg(`Usuário ${targetUser.email} removido do sistema.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao excluir usuário.');
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#107c41] px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">Gestão de Múltiplos Usuários</h3>
              <p className="text-[11px] text-emerald-100">
                Somente o Administrador tem acesso a cadastrar e alterar permissões de estoque
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

        {/* Notifications */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Top actions bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            Usuários Cadastrados ({users.length})
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="px-3 py-1.5 bg-[#107c41] hover:bg-[#0e6b37] text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddUser ? 'Fechar Formulário' : '+ Novo Usuário'}</span>
            </button>
          )}
        </div>

        {/* New user creation form */}
        {showAddUser && (
          <form
            onSubmit={handleCreateUser}
            className="p-4 bg-emerald-50/70 border-b border-emerald-200 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-extrabold text-[#107c41] flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" />
              Cadastrar Novo Usuário no Banco de Dados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nome de Exibição</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-[#107c41]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="carlos@digidox.net"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-[#107c41]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Senha Provisória</label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Senha de acesso"
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs outline-none focus:border-[#107c41]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Perfil de Acesso</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold outline-none focus:border-[#107c41]"
                >
                  <option value="operator">Operador (Instalações, Previsões e Leitura)</option>
                  <option value="admin">Administrador (Total + Alterar Estoque)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1 bg-[#107c41] hover:bg-[#0e6b37] text-white rounded text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Usuário'}
              </button>
            </div>
          </form>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="w-7 h-7 border-2 border-[#107c41]/30 border-t-[#107c41] rounded-full animate-spin mb-2" />
              <p className="text-xs">Carregando usuários cadastrados...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-sm">Nenhum usuário encontrado além de você.</p>
            </div>
          ) : (
            users.map((u) => {
              const isMe = u.uid === currentUser?.uid;
              const isPrimaryAdmin = u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
              const isDefaultAnalyst = u.email.toLowerCase() === DEFAULT_ANALYST_EMAIL.toLowerCase();
              const isDefaultRelbio = u.email.toLowerCase() === DEFAULT_RELBIO_EMAIL.toLowerCase() || u.role === 'relbio';

              return (
                <div
                  key={u.uid}
                  className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                    isPrimaryAdmin
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : isDefaultAnalyst
                      ? 'bg-blue-50/60 border-blue-200'
                      : isDefaultRelbio
                      ? 'bg-amber-50/40 border-amber-300'
                      : isMe
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {u.displayName || 'Sem nome'}
                      </span>
                      {isPrimaryAdmin && (
                        <span className="bg-amber-600 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-xs">
                          <Shield className="w-3 h-3" />
                          Admin Principal
                        </span>
                      )}
                      {isDefaultAnalyst && (
                        <span className="bg-blue-600 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-xs">
                          Analista
                        </span>
                      )}
                      {isDefaultRelbio && (
                        <span className="bg-amber-700 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 shadow-xs">
                          Relbio (Mês Vigente)
                        </span>
                      )}
                      {isMe && !isPrimaryAdmin && (
                        <span className="bg-emerald-600 text-white text-[9.5px] font-bold px-1.5 py-0.2 rounded uppercase">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{u.email}</p>
                  </div>

                  {/* Role Selector and Delete Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={u.role || 'operator'}
                      disabled={!isAdmin || updatingUid === u.uid || isPrimaryAdmin}
                      onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded border outline-none cursor-pointer ${
                        u.role === 'admin'
                          ? 'bg-amber-50 text-amber-900 border-amber-300 focus:ring-1 focus:ring-amber-500 font-bold'
                          : 'bg-white text-slate-700 border-slate-300 focus:ring-1 focus:ring-emerald-500'
                      } disabled:opacity-75 disabled:cursor-not-allowed`}
                    >
                      <option value="admin">Administrador (Total + Estoque)</option>
                      <option value="operator">Operador (Leitura + Instalações)</option>
                    </select>

                    {isAdmin && !isPrimaryAdmin && !isMe && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title={`Remover usuário ${u.email}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Security explanation */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-[#107c41] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>Regra de Acesso ao Estoque:</strong> O usuário administrador principal é <strong>admin@digidox.net</strong>. Usuários com perfil <strong>Operador</strong> podem navegar pelas abas, registrar instalações, cadastrar previsões e consultar estoque. O direito de adicionar quantidades no estoque (coluna <strong>QTD INICIAL / ADCIONAR</strong>) é restrito a administradores.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
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

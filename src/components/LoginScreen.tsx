import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Inputs start completely empty - no auto-prefill
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail) {
      setError('Por favor, informe seu e-mail ou usuário de acesso.');
      return;
    }

    if (!trimmedPass) {
      setError('Por favor, informe sua senha.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome completo.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        await register(name.trim(), trimmedEmail, password);
      } else {
        await login(trimmedEmail, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Ocorreu um erro na autenticação. Verifique os dados informados.';
      if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-[#e8f0eb] to-slate-200 flex flex-col justify-center items-center p-4">
      {/* Brand card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header bar */}
        <div className="bg-[#107c41] px-6 py-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            <ShieldCheck className="w-7 h-7 text-emerald-200" />
          </div>
          <h1 className="text-xl font-bold tracking-wide uppercase">Controle de Equipamentos</h1>
          <p className="text-xs text-emerald-100/90 mt-1 font-medium">
            Planilha Dinâmica &bull; Gestão Centralizada em Nuvem
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 md:p-8">
          {/* Tabs: Entrar vs Criar Conta */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
            <div className="flex gap-4">
              <button
                type="button"
                id="tab-login-btn"
                onClick={() => handleModeSwitch(false)}
                className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                  !isRegister
                    ? 'border-[#107c41] text-[#107c41]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                id="tab-register-btn"
                onClick={() => handleModeSwitch(true)}
                className={`text-sm font-semibold pb-2 border-b-2 transition-all cursor-pointer ${
                  isRegister
                    ? 'border-[#107c41] text-[#107c41]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Criar Conta
              </button>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Autenticação Segura</span>
          </div>

          {error && (
            <div
              id="login-error-alert"
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form with complete autofill prevention */}
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            noValidate
            className="space-y-4"
          >
            {/* Hidden dummy fields to capture aggressive browser autofill */}
            <input
              type="text"
              name="fake_username_remembered"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden pointer-events-none opacity-0 absolute -top-9999px"
            />
            <input
              type="password"
              name="fake_password_remembered"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden pointer-events-none opacity-0 absolute -top-9999px"
            />

            {isRegister && (
              <div>
                <label
                  htmlFor="register-name-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-name-input"
                    name="register_user_fullname"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:bg-white focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="login-email-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {isRegister ? 'E-mail Corporativo' : 'E-mail ou Usuário de Acesso'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email-input"
                  name="user_email_no_autofill"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="usuario@empresa.com ou admin"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:bg-white focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password-input"
                  name="user_password_no_autofill"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Digite sua senha"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:bg-white focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isRegister && (
                <p className="text-[11px] text-slate-500 mt-1">Mínimo de 6 caracteres</p>
              )}
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full mt-3 bg-[#107c41] hover:bg-[#0e6b37] active:bg-[#0b542b] text-white py-2.5 px-4 rounded-lg font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Finalizar Cadastro' : 'Acessar Planilha'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Role and Permissions Legend */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
            <div className="flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-[#107c41] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-700">Controle de Acesso:</strong> Usuários com perfil <span className="text-[#107c41] font-semibold">Administrador</span> gerenciam estoque, compras e usuários. Usuários <span className="text-blue-700 font-semibold">Operador/Analista</span> realizam consultas e lançamentos de previsões e instalações.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

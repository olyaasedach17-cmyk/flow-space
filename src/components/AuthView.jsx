import React from 'react';
import { Globe } from 'lucide-react';
import { Toaster } from 'sonner';

const AuthView = ({
  themeBg,
  cardBg,
  textMain,
  inputBg,
  btnPrimary,
  isDark,
  email,
  setEmail,
  password,
  setPassword,
  isLogin,
  setIsLogin,
  handleAuth,
  signInWithGoogle,
  handleResetPassword
}) => {
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-sans ${themeBg}`}>
      <Toaster position="top-center" richColors />
      <div className={`p-8 rounded-3xl max-w-md w-full border ${cardBg}`}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-lg shadow-md">
            FS
          </div>
          <h1 className={`text-2xl font-black tracking-tight ${textMain}`}>Flow Space</h1>
        </div>
        <form onSubmit={handleAuth} className="space-y-3">
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            required 
            className={`w-full px-4 py-3.5 rounded-2xl outline-none border text-sm ${inputBg}`} 
          />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Пароль" 
            required 
            className={`w-full px-4 py-3.5 rounded-2xl outline-none border text-sm ${inputBg}`} 
          />
          <button type="submit" className={`w-full py-3.5 rounded-2xl font-bold text-sm ${btnPrimary}`}>
            {isLogin ? 'Войти в систему' : 'Зарегистрироваться'}
          </button>
        </form>

        <button 
          type="button" 
          onClick={signInWithGoogle} 
          className={`w-full font-bold py-3.5 mt-3 rounded-2xl border transition-transform active:scale-95 text-xs flex items-center justify-center gap-2 ${
            isDark 
              ? 'bg-transparent border-white/10 text-white hover:bg-white/5' 
              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-4 h-4 text-slate-900 dark:text-white" /> Войти через Google
        </button>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>
          {isLogin && (
            <button 
              type="button" 
              onClick={handleResetPassword} 
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Забыли пароль?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthView;
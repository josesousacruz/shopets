import React, { useState } from 'react';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';


interface OperatorLoginProps {
  onLogin: (username: string, password: string) => boolean;
}

const OperatorLogin: React.FC<OperatorLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      await Swal.fire({
        title: 'Campos obrigatórios',
        text: 'Por favor, preencha usuário e senha.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    setIsLoading(true);
    
    // Simular delay de autenticação
    setTimeout(async () => {
      const success = onLogin(username, password);
      
      if (!success) {
        await Swal.fire({
          title: 'Login inválido',
          text: 'Usuário ou senha incorretos.',
          icon: 'error',
          confirmButtonText: 'Tentar novamente',
          confirmButtonColor: '#ef4444'
        });
        setPassword('');
      }
      
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <img src="/src/img/logo.png" alt="ShopPet" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ShopPet PDV</h1>
          <p className="text-gray-600">Faça login para continuar</p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Usuário */}
          <div className="relative">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Usuário
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite seu usuário"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Digite sua senha"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botão Login */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Entrar</span>
              </>
            )}
          </motion.button>
        </form>

        {/* Usuários de teste com botões */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Usuários de teste:</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
              }}
              className="w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              disabled={isLoading}
            >
              <div className="font-medium text-gray-800">👑 admin / admin123</div>
              <div className="text-gray-600">Administrador</div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setUsername('joao');
                setPassword('123456');
              }}
              className="w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              disabled={isLoading}
            >
              <div className="font-medium text-gray-800">💰 joao / 123456</div>
              <div className="text-gray-600">Operador de Caixa</div>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setUsername('maria');
                setPassword('123456');
              }}
              className="w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              disabled={isLoading}
            >
              <div className="font-medium text-gray-800">👩‍💼 maria / 123456</div>
              <div className="text-gray-600">Gerente</div>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Clique em um usuário para preencher automaticamente</p>
        </div>
      </motion.div>
    </div>
  );
};

export default OperatorLogin;
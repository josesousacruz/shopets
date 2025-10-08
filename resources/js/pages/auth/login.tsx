import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
    canResetPassword: boolean;
    status?: string;
}

export default function Login({ canResetPassword, status }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Login - ShopPet" />
            
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                >
                    {/* Logo e Título */}
                    <div className="text-center mb-8">
                        <img src="/logo.png" alt="ShopPet" className="w-16 h-16 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">ShopPet PDV</h1>
                        <p className="text-gray-600">Faça login para continuar</p>
                    </div>

                    {/* Status Message */}
                    {status && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
                            {status}
                        </div>
                    )}

                    {/* Formulário */}
                    <form onSubmit={submit} className="space-y-6">
                        {/* Campo Email */}
                        <div className="relative">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                        errors.email ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Digite seu email"
                                    disabled={processing}
                                    required
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
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
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                        errors.password ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="Digite sua senha"
                                    disabled={processing}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    disabled={processing}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                            )}
                        </div>

                        {/* Lembrar de mim */}
                        <div className="flex items-center">
                            <input
                                id="remember"
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                                Lembrar de mim
                            </label>
                        </div>

                        {/* Botão Login */}
                        <motion.button
                            type="submit"
                            disabled={processing}
                            whileHover={{ scale: processing ? 1 : 1.02 }}
                            whileTap={{ scale: processing ? 1 : 0.98 }}
                            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                                processing
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            }`}
                        >
                            {processing ? (
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

                    {/* Links */}
                    <div className="mt-6 text-center space-y-2">
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                Esqueceu sua senha?
                            </Link>
                        )}
                        
                        <div className="text-sm text-gray-600">
                            Não tem uma conta?{' '}
                            <Link
                                href={route('register')}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                Cadastre-se
                            </Link>
                        </div>
                    </div>

                    {/* Usuários de teste */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Usuários de teste:</h3>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setData('email', 'admin@shopet.com');
                                    setData('password', 'admin123');
                                }}
                                className="w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                disabled={processing}
                            >
                                <div className="font-medium text-gray-800">👑 admin@shopet.com / admin123</div>
                                <div className="text-gray-600">Administrador</div>
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    setData('email', 'operador@shopet.com');
                                    setData('password', '123456');
                                }}
                                className="w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                disabled={processing}
                            >
                                <div className="font-medium text-gray-800">💰 operador@shopet.com / 123456</div>
                                <div className="text-gray-600">Operador de Caixa</div>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">Clique em um usuário para preencher automaticamente</p>
                    </div>
                </motion.div>
            </div>
        </>
    );
}
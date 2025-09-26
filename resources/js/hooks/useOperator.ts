import { useState, useEffect } from 'react';
import { Operator, OperatorSession } from '../types';

// Mock de operadores para demonstração
const mockOperators: Operator[] = [
  {
    id: '1',
    name: 'Administrador',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date()
  },
  {
    id: '2',
    name: 'João Silva',
    username: 'joao',
    password: '123456',
    role: 'cashier',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    lastLogin: new Date()
  },
  {
    id: '3',
    name: 'Maria Santos',
    username: 'maria',
    password: '123456',
    role: 'manager',
    isActive: true,
    createdAt: new Date('2024-01-10'),
    lastLogin: new Date()
  }
];

const STORAGE_KEY = 'shopet_operator_session';

export const useOperator = () => {
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar sessão do localStorage ao inicializar
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        // Verificar se a sessão ainda é válida (menos de 8 horas)
        const loginTime = new Date(parsedSession.loginTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 8) {
          setSession({
            ...parsedSession,
            loginTime: new Date(parsedSession.loginTime),
            operator: {
              ...parsedSession.operator,
              createdAt: new Date(parsedSession.operator.createdAt),
              lastLogin: parsedSession.operator.lastLogin ? new Date(parsedSession.operator.lastLogin) : undefined
            }
          });
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const operator = mockOperators.find(
      op => op.username === username && op.password === password && op.isActive
    );

    if (operator) {
      const newSession: OperatorSession = {
        operator: {
          ...operator,
          lastLogin: new Date()
        },
        loginTime: new Date(),
        isLoggedIn: true
      };

      setSession(newSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      return true;
    }

    return false;
  };

  const logout = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isLoggedIn = !!session?.isLoggedIn;
  const currentOperator = session?.operator || null;

  return {
    session,
    currentOperator,
    isLoggedIn,
    isLoading,
    login,
    logout
  };
};

export default useOperator;
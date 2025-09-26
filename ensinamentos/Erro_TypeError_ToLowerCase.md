# Erro TypeError: Cannot read properties of undefined (reading 'toLowerCase')

## Descrição do Problema

Ocorreu um erro `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` nos componentes ContasPagar e ContasReceber, causado pela tentativa de usar o método `toLowerCase()` em valores que podem ser `undefined` ou `null`.

## Causa Raiz

O erro aconteceu porque estávamos assumindo que os campos de texto sempre teriam valores válidos, mas na prática:

1. **Campos opcionais podem ser undefined**: `account.descricao` pode não estar definido
2. **Campos nullable do banco**: `account.numero_documento` pode ser `null`
3. **Map.get() retorna undefined**: Quando a chave não existe no Map, retorna `undefined`
4. **Dados incompletos**: Durante carregamento ou em casos de erro, os dados podem estar incompletos

## Código Problemático

```typescript
// ❌ ERRO - Não verifica se os valores existem antes de usar toLowerCase
const filteredAccounts = accounts.filter(account => {
  const matchesSearch = account.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       account.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       supplierMap.get(account.id_fornecedor)?.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesSearch;
});
```

### Problemas Identificados:

1. **`account.descricao.toLowerCase()`**: Se `descricao` for `undefined`, quebra
2. **`account.numero_documento?.toLowerCase()`**: Optional chaining não protege contra `null`
3. **`supplierMap.get()?.toLowerCase()`**: Map pode retornar `undefined`

## Solução Implementada

```typescript
// ✅ CORRETO - Verifica e fornece valores padrão antes de usar toLowerCase
const filteredAccounts = accounts.filter(account => {
  const searchLower = searchTerm.toLowerCase();
  const descricao = account.descricao || '';
  const numeroDoc = account.numero_documento || '';
  const supplierName = supplierMap.get(account.id_fornecedor) || '';
  
  const matchesSearch = descricao.toLowerCase().includes(searchLower) ||
                       numeroDoc.toLowerCase().includes(searchLower) ||
                       supplierName.toLowerCase().includes(searchLower);
  const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
  return matchesSearch && matchesStatus;
});
```

## Melhorias Implementadas

### 1. **Valores Padrão Seguros**
```typescript
// Garante que sempre temos uma string para trabalhar
const descricao = account.descricao || '';
const numeroDoc = account.numero_documento || '';
const supplierName = supplierMap.get(account.id_fornecedor) || '';
```

### 2. **Otimização de Performance**
```typescript
// Calcula toLowerCase apenas uma vez
const searchLower = searchTerm.toLowerCase();
```

### 3. **Código Mais Legível**
```typescript
// Variáveis nomeadas tornam o código mais claro
const matchesSearch = descricao.toLowerCase().includes(searchLower) ||
                     numeroDoc.toLowerCase().includes(searchLower) ||
                     supplierName.toLowerCase().includes(searchLower);
```

## Padrões de Segurança para Strings

### 1. **Verificação Básica**
```typescript
// Padrão simples com valor padrão
const safeString = potentiallyUndefined || '';
safeString.toLowerCase(); // Sempre seguro
```

### 2. **Verificação Completa**
```typescript
// Verificação mais robusta
const safeToLower = (value: any): string => {
  if (typeof value === 'string') return value.toLowerCase();
  if (value != null) return String(value).toLowerCase();
  return '';
};
```

### 3. **Função Utilitária para Busca**
```typescript
// Função reutilizável para busca segura
const safeIncludes = (text: any, search: string): boolean => {
  const safeText = (text || '').toString().toLowerCase();
  const safeSearch = search.toLowerCase();
  return safeText.includes(safeSearch);
};

// Uso
const matchesSearch = safeIncludes(account.descricao, searchTerm) ||
                     safeIncludes(account.numero_documento, searchTerm) ||
                     safeIncludes(supplierMap.get(account.id_fornecedor), searchTerm);
```

## Lições Aprendidas

### 1. **Defensive Programming com Strings**
- Sempre assumir que strings podem ser `undefined` ou `null`
- Usar valores padrão antes de aplicar métodos de string
- Considerar usar funções utilitárias para operações comuns

### 2. **Optional Chaining Limitations**
```typescript
// ❌ Optional chaining não protege contra null
value?.toLowerCase() // Ainda pode quebrar se value for null

// ✅ Valor padrão é mais seguro
(value || '').toLowerCase() // Sempre funciona
```

### 3. **Map.get() Safety**
```typescript
// ❌ Map.get() pode retornar undefined
map.get(key).toLowerCase()

// ✅ Sempre fornecer fallback
(map.get(key) || '').toLowerCase()
```

### 4. **Performance Considerations**
```typescript
// ❌ Ineficiente - toLowerCase múltiplas vezes
searchTerm.toLowerCase() // Repetido várias vezes

// ✅ Eficiente - toLowerCase uma vez
const searchLower = searchTerm.toLowerCase();
```

## Boas Práticas para Evitar Erros Similares

### 1. **Validação de Entrada**
```typescript
// Validar dados na entrada do componente
interface Props {
  accounts: AccountPayable[];
}

const validateAccount = (account: any): account is AccountPayable => {
  return account && 
         typeof account.id === 'number' &&
         (typeof account.descricao === 'string' || account.descricao == null);
};
```

### 2. **TypeScript Strict Mode**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

### 3. **Testes com Dados Diversos**
```typescript
describe('Search functionality', () => {
  it('should handle undefined values gracefully', () => {
    const accounts = [
      { descricao: undefined, numero_documento: null },
      { descricao: 'Valid', numero_documento: 'DOC123' }
    ];
    
    expect(() => filterAccounts(accounts, 'search')).not.toThrow();
  });
});
```

### 4. **ESLint Rules**
```json
// .eslintrc
{
  "rules": {
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "no-unsafe-optional-chaining": "error"
  }
}
```

## Componentes Afetados e Corrigidos

### ✅ ContasPagar.tsx
- Corrigido filtro de busca com verificações de segurança
- Adicionados valores padrão para `descricao`, `numero_documento` e `supplierName`

### ✅ ContasReceber.tsx  
- Corrigido filtro de busca com verificações de segurança
- Adicionados valores padrão para `descricao`, `numero_documento` e `customerName`

## Impacto da Correção

✅ **Antes**: Aplicação quebrava ao tentar buscar com dados incompletos
✅ **Depois**: Busca funciona mesmo com campos undefined/null
✅ **Benefício**: Melhor experiência do usuário e maior robustez
✅ **Performance**: Otimização com toLowerCase calculado uma vez

## Prevenção Futura

### 1. **Code Review Checklist**
- [ ] Verificar se métodos de string são chamados em valores seguros
- [ ] Confirmar que Map.get() tem fallback
- [ ] Validar que optional chaining é usado corretamente
- [ ] Testar com dados incompletos

### 2. **Ferramentas de Análise**
- TypeScript strict mode habilitado
- ESLint com regras de segurança
- Testes unitários com casos edge
- Code coverage para funções de filtro

---

**Data de criação**: ${new Date().toLocaleDateString('pt-BR')}
**Erro resolvido**: TypeError com toLowerCase
**Componentes afetados**: ContasPagar.tsx, ContasReceber.tsx
**Impacto**: Crítico - Quebrava funcionalidade de busca
# Sprint 3 — Follow-ups (não-bloqueantes)

Review final: APPROVED_WITH_FOLLOWUPS. Os 2 itens de maior valor foram aplicados inline; resto rastreado aqui.

## Aplicados nesta sprint
- ✅ **Merge guest→cliente** (era o bug mais sério): rotas `/carrinho` e `/frete` resolvem o cliente via guard `sanctum` explícito. Antes o guard padrão `web` não via o Bearer, então o carrinho convidado não associava ao logar (itens sumiam). Verificado end-to-end.
- ✅ **Regras de hooks** no `ProductCard` (useEffect antes dos returns condicionais).

## Pendentes

### 1. Constraint de carrinho único por cliente
`carrinhos.id_cliente` só tem índice, não unique. `resolver()` usa `latest('id_carrinho')`, então um cliente pode acumular vários carrinhos ao longo do tempo. Adicionar constraint de carrinho ativo único ou job de limpeza de carrinhos antigos.

### 2. Dinheiro em float
Totais usam float PHP (`subtotal = preco * qty` somados) com cast `decimal:2` na persistência. OK pra carrinhos típicos, mas float acumula drift no longo prazo. Considerar inteiro-centavos ou bcmath se o volume crescer. Não é regressão da Sprint 3.

### 3. Erro 422 de estoque estruturado
`IniciarCheckoutAction` coloca `json_encode($indisponiveis)` numa string de mensagem de validação. O front já trata via toast, mas expor `detalhes` como JSON real (não string) seria mais limpo pro consumidor.

### 4. Retirada na loja (modalidade=retirada)
Checkout hoje oferece só entrega; "Retirar na loja" aparece desabilitado ("em breve") porque não há endpoint de lista de PDVs. Quando o painel admin/PDV expuser os pontos de venda, habilitar a modalidade retirada (sem frete, emite NFCe na Sprint 4).

### 5. Melhor Envio real
Frete usa `StubShippingService` (PAC/SEDEX calculados por peso+região). Trocar pelo `MelhorEnvioService` quando o token de API chegar (decisão pendente da spec) — basta `config('services.shipping.driver')='melhorenvio'` + token.

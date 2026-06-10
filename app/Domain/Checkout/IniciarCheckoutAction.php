<?php

namespace App\Domain\Checkout;

use App\Domain\Cart\CarrinhoService;
use App\Domain\Order\EstoqueService;
use App\Models\Carrinho;
use App\Models\Cliente;
use App\Models\Cupom;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\ReservaEstoque;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cria o pedido em aguardando_pagamento de forma atômica, prevenindo overselling.
 *
 * Estratégia anti-overselling:
 *  - Tudo dentro de uma transação.
 *  - Antes de revalidar disponibilidade, faz lockForUpdate() na(s) linha(s) de
 *    produto/variação envolvidas. Isso serializa checkouts concorrentes para os
 *    mesmos itens: o segundo cliente espera o primeiro commitar antes de ler o
 *    estoque/reservas, de modo que dois não conseguem reservar a última unidade.
 *  - Só então recalcula disponivel = estoque_atual − reservas ativas e insere
 *    as reservas (expira_em = now()+15min).
 */
class IniciarCheckoutAction
{
    private const RESERVA_MINUTOS = 15;

    public function __construct(
        private readonly EstoqueService $estoque,
        private readonly CarrinhoService $carrinhoService,
    ) {
    }

    /**
     * @param  array{modalidade:string, id_endereco?:int|null, id_pdv?:int|null, frete_servico?:string|null, frete?:float, prazo_entrega_dias?:int|null}  $dados
     */
    public function executar(Cliente $cliente, Carrinho $carrinho, array $dados): Pedido
    {
        $carrinho->load('itens');

        if ($carrinho->itens->isEmpty()) {
            throw ValidationException::withMessages(['carrinho' => 'Carrinho vazio.']);
        }

        return DB::transaction(function () use ($cliente, $carrinho, $dados) {
            $indisponiveis = [];
            $alvos = []; // id_carrinho_item => Produto|ProdutoVariacao (com lock)

            // 1. Lock + revalidação de disponibilidade de cada item.
            foreach ($carrinho->itens as $item) {
                $alvo = $this->lockEAlvo($item->id_produto, $item->id_variacao);

                if (! $alvo) {
                    $indisponiveis[] = [
                        'id_produto' => $item->id_produto,
                        'id_variacao' => $item->id_variacao,
                        'motivo' => 'produto_indisponivel',
                    ];
                    continue;
                }

                $disponivel = $this->estoque->disponivel($alvo);
                if ($item->quantidade > $disponivel) {
                    $indisponiveis[] = [
                        'id_produto' => $item->id_produto,
                        'id_variacao' => $item->id_variacao,
                        'disponivel' => $disponivel,
                        'solicitado' => $item->quantidade,
                        'motivo' => 'estoque_insuficiente',
                    ];
                    continue;
                }

                $alvos[$item->id_carrinho_item] = $alvo;
            }

            if (! empty($indisponiveis)) {
                throw ValidationException::withMessages([
                    'itens' => 'Itens indisponíveis.',
                    'detalhes' => json_encode($indisponiveis),
                ]);
            }

            // Totais a partir dos snapshots do carrinho.
            $subtotal = $carrinho->subtotal();
            $frete = (float) ($dados['frete'] ?? 0);
            $desconto = 0.0;
            $idCupom = null;

            // Aplica cupom (se houver e ainda for válido para este subtotal).
            if (! empty($carrinho->cupom_codigo)) {
                $cupom = Cupom::where('codigo', $carrinho->cupom_codigo)
                    ->lockForUpdate()
                    ->first();

                if ($cupom) {
                    $res = $cupom->validarPara($subtotal);
                    if ($res['valido']) {
                        $desconto = $res['desconto'];
                        if ($res['frete_gratis']) {
                            $frete = 0.0;
                        }
                        $idCupom = $cupom->id_cupom;
                        $cupom->increment('usos_atuais');
                    }
                }
            }

            $total = $subtotal + $frete - $desconto;

            $modalidade = $dados['modalidade'];

            // 3. Cria o pedido.
            $pedido = Pedido::create([
                'numero' => Pedido::gerarNumero(),
                'id_cliente' => $cliente->id_cliente,
                'status' => 'aguardando_pagamento',
                'modalidade' => $modalidade,
                'id_endereco_entrega' => $modalidade === 'entrega' ? ($dados['id_endereco'] ?? null) : null,
                'id_ponto_venda_retirada' => $modalidade === 'retirada' ? ($dados['id_pdv'] ?? null) : null,
                'subtotal' => $subtotal,
                'frete' => $frete,
                'desconto' => $desconto,
                'total' => $total,
                'id_cupom' => $idCupom,
                'frete_servico' => $dados['frete_servico'] ?? null,
                'prazo_entrega_dias' => $dados['prazo_entrega_dias'] ?? null,
            ]);

            // pedido_itens (snapshot) + reservas vinculadas ao pedido.
            $expiraEm = now()->addMinutes(self::RESERVA_MINUTOS);

            foreach ($carrinho->itens as $item) {
                $alvo = $alvos[$item->id_carrinho_item];

                $pedido->itens()->create([
                    'id_produto' => $item->id_produto,
                    'id_variacao' => $item->id_variacao,
                    'nome' => $this->nomeAlvo($alvo),
                    'sku' => $alvo instanceof ProdutoVariacao ? $alvo->sku : ($alvo->codigo_interno ?? null),
                    'preco_unit' => $item->preco_unit_snapshot,
                    'quantidade' => $item->quantidade,
                    'subtotal' => $item->subtotal(),
                ]);

                // 2 + 4. Cria reserva já vinculada ao pedido.
                ReservaEstoque::create([
                    'id_carrinho' => $carrinho->id_carrinho,
                    'id_pedido' => $pedido->id_pedido,
                    'id_produto' => $item->id_produto,
                    'id_variacao' => $item->id_variacao,
                    'quantidade' => $item->quantidade,
                    'expira_em' => $expiraEm,
                ]);
            }

            // Evento de criação.
            $pedido->eventos()->create([
                'tipo' => 'pedido_criado',
                'descricao' => 'Pedido criado em aguardando_pagamento.',
                'criado_em' => now(),
            ]);

            // 5. Limpa o carrinho.
            $this->carrinhoService->limpar($carrinho);

            return $pedido->load(['itens', 'eventos']);
        });
    }

    /**
     * Faz lockForUpdate na linha do alvo e retorna o modelo (ou null se inativo/inexistente).
     */
    private function lockEAlvo(int $idProduto, ?int $idVariacao): Produto|ProdutoVariacao|null
    {
        if ($idVariacao) {
            $variacao = ProdutoVariacao::where('id_variacao', $idVariacao)
                ->where('id_produto', $idProduto)
                ->lockForUpdate()
                ->first();

            return ($variacao && $variacao->ativo) ? $variacao : null;
        }

        $produto = Produto::where('id_produto', $idProduto)
            ->lockForUpdate()
            ->first();

        return ($produto && $produto->ativo) ? $produto : null;
    }

    private function nomeAlvo(Produto|ProdutoVariacao $alvo): string
    {
        if ($alvo instanceof ProdutoVariacao) {
            $base = $alvo->produto?->nome ?? '';

            return trim($base.' '.$alvo->nome_variacao);
        }

        return $alvo->nome;
    }
}

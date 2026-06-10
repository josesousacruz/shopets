<?php

namespace App\Domain\Cart;

use App\Domain\Order\EstoqueService;
use App\Models\Carrinho;
use App\Models\CarrinhoItem;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Validation\ValidationException;

class CarrinhoService
{
    public function __construct(private readonly EstoqueService $estoque)
    {
    }

    /**
     * Resolve o carrinho a partir de um cliente autenticado ou de um token.
     * Se cliente está logado, faz merge de um eventual carrinho guest (token) no carrinho do cliente.
     * Cria um carrinho novo quando nada é encontrado.
     */
    public function resolver(?Cliente $cliente, ?string $token): Carrinho
    {
        if ($cliente) {
            $doCliente = Carrinho::where('id_cliente', $cliente->id_cliente)
                ->latest('id_carrinho')
                ->first();

            if (! $doCliente) {
                $doCliente = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
            }

            // Merge do carrinho guest, se houver token diferente.
            if ($token) {
                $guest = Carrinho::whereNull('id_cliente')->where('token', $token)->first();
                if ($guest && $guest->id_carrinho !== $doCliente->id_carrinho) {
                    $this->merge($guest, $doCliente);
                }
            }

            return $doCliente->load('itens');
        }

        if ($token) {
            $carrinho = Carrinho::where('token', $token)->first();
            if ($carrinho) {
                return $carrinho->load('itens');
            }
        }

        return Carrinho::create([])->load('itens');
    }

    /**
     * Mescla os itens do carrinho de origem no destino e remove a origem.
     */
    public function merge(Carrinho $origem, Carrinho $destino): Carrinho
    {
        foreach ($origem->itens as $item) {
            $existente = $destino->itens()
                ->where('id_produto', $item->id_produto)
                ->where('id_variacao', $item->id_variacao)
                ->first();

            if ($existente) {
                $existente->update(['quantidade' => $existente->quantidade + $item->quantidade]);
            } else {
                $destino->itens()->create([
                    'id_produto' => $item->id_produto,
                    'id_variacao' => $item->id_variacao,
                    'quantidade' => $item->quantidade,
                    'preco_unit_snapshot' => $item->preco_unit_snapshot,
                ]);
            }
        }

        $origem->itens()->delete();
        $origem->delete();

        return $destino->load('itens');
    }

    public function adicionarItem(Carrinho $carrinho, int $idProduto, ?int $idVariacao, int $quantidade): CarrinhoItem
    {
        if ($quantidade < 1) {
            throw ValidationException::withMessages(['quantidade' => 'Quantidade deve ser ao menos 1.']);
        }

        [$alvo, $preco] = $this->resolverAlvoEPreco($idProduto, $idVariacao);

        $existente = $carrinho->itens()
            ->where('id_produto', $idProduto)
            ->where('id_variacao', $idVariacao)
            ->first();

        $novaQtd = ($existente?->quantidade ?? 0) + $quantidade;

        $this->validarDisponibilidade($alvo, $novaQtd);

        if ($existente) {
            $existente->update(['quantidade' => $novaQtd, 'preco_unit_snapshot' => $preco]);

            return $existente->fresh();
        }

        return $carrinho->itens()->create([
            'id_produto' => $idProduto,
            'id_variacao' => $idVariacao,
            'quantidade' => $quantidade,
            'preco_unit_snapshot' => $preco,
        ]);
    }

    public function atualizarQuantidade(Carrinho $carrinho, int $idCarrinhoItem, int $quantidade): CarrinhoItem
    {
        $item = $carrinho->itens()->where('id_carrinho_item', $idCarrinhoItem)->firstOrFail();

        if ($quantidade < 1) {
            throw ValidationException::withMessages(['quantidade' => 'Quantidade deve ser ao menos 1.']);
        }

        [$alvo] = $this->resolverAlvoEPreco($item->id_produto, $item->id_variacao);
        $this->validarDisponibilidade($alvo, $quantidade);

        $item->update(['quantidade' => $quantidade]);

        return $item->fresh();
    }

    public function removerItem(Carrinho $carrinho, int $idCarrinhoItem): void
    {
        $carrinho->itens()->where('id_carrinho_item', $idCarrinhoItem)->delete();
    }

    public function limpar(Carrinho $carrinho): void
    {
        $carrinho->itens()->delete();
    }

    /**
     * @return array{0: Produto|ProdutoVariacao, 1: float}
     */
    private function resolverAlvoEPreco(int $idProduto, ?int $idVariacao): array
    {
        if ($idVariacao) {
            $variacao = ProdutoVariacao::where('id_produto', $idProduto)
                ->where('id_variacao', $idVariacao)
                ->where('ativo', true)
                ->first();

            if (! $variacao) {
                throw ValidationException::withMessages(['id_variacao' => 'Variação indisponível.']);
            }

            return [$variacao, $variacao->precoEfetivo()];
        }

        $produto = Produto::where('id_produto', $idProduto)->first();
        if (! $produto || ! $produto->ativo) {
            throw ValidationException::withMessages(['id_produto' => 'Produto indisponível.']);
        }

        $preco = (float) ($produto->preco_promocional ?? $produto->preco_venda);

        return [$produto, $preco];
    }

    private function validarDisponibilidade(Produto|ProdutoVariacao $alvo, int $quantidade): void
    {
        $disponivel = $this->estoque->disponivel($alvo);

        if ($quantidade > $disponivel) {
            throw ValidationException::withMessages([
                'quantidade' => "Estoque insuficiente. Disponível: {$disponivel}.",
            ]);
        }
    }
}

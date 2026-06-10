<?php

namespace Tests\Feature\Sprint4;

use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\ReservaEstoque;
use Database\Seeders\EcommerceInfraSeeder;
use Database\Seeders\FormasPagamentoSeeder;

trait Sprint4Helpers
{
    protected function seedInfra(): void
    {
        $this->seed(FormasPagamentoSeeder::class);
        $this->seed(EcommerceInfraSeeder::class);
    }

    /**
     * Cria um pedido (aguardando_pagamento) com 1 item e reserva ativa.
     *
     * @return array{0: Cliente, 1: Pedido, 2: Produto}
     */
    protected function pedidoComItem(int $estoque = 10, int $qtd = 2, float $preco = 20, string $modalidade = 'retirada'): array
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => $estoque, 'preco_venda' => $preco]);

        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'aguardando_pagamento',
            'modalidade' => $modalidade,
            'subtotal' => $preco * $qtd,
            'frete' => 0,
            'desconto' => 0,
            'total' => $preco * $qtd,
        ]);

        $pedido->itens()->create([
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'nome' => $produto->nome,
            'sku' => $produto->codigo_interno,
            'preco_unit' => $preco,
            'quantidade' => $qtd,
            'subtotal' => $preco * $qtd,
        ]);

        ReservaEstoque::create([
            'id_pedido' => $pedido->id_pedido,
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'quantidade' => $qtd,
            'expira_em' => now()->addMinutes(15),
        ]);

        return [$cliente, $pedido->fresh(), $produto];
    }
}

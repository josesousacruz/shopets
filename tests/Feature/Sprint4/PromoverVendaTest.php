<?php

namespace Tests\Feature\Sprint4;

use App\Domain\Order\PromoverPedidoEmVendaAction;
use App\Models\ItemVenda;
use App\Models\PagamentoPedido;
use App\Models\Produto;
use App\Models\Venda;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromoverVendaTest extends TestCase
{
    use RefreshDatabase, Sprint4Helpers;

    private function pagamentoAprovado(int $idPedido, float $valor): void
    {
        PagamentoPedido::create([
            'id_pedido' => $idPedido,
            'gateway' => 'fake',
            'gateway_id_externo' => 'fake_'.$idPedido,
            'metodo' => 'pix',
            'status' => 'aprovado',
            'valor' => $valor,
            'processado_em' => now(),
        ]);
    }

    public function test_pedido_pago_vira_venda_com_itens_pagamento_estoque_e_reserva(): void
    {
        $this->seedInfra();
        [, $pedido, $produto] = $this->pedidoComItem(estoque: 10, qtd: 2, preco: 20);
        $this->pagamentoAprovado($pedido->id_pedido, 40);

        $venda = app(PromoverPedidoEmVendaAction::class)->executar($pedido);

        // Venda criada finalizada, com user-sistema + PDV ecommerce.
        $this->assertInstanceOf(Venda::class, $venda);
        $this->assertEquals('finalizada', $venda->status);
        $this->assertEquals(config('ecommerce.system_user_id')(), $venda->id_usuario);
        $this->assertEquals(config('ecommerce.pdv_id')(), $venda->id_pdv);

        // Itens replicados.
        $this->assertEquals(1, ItemVenda::where('id_venda', $venda->id_venda)->count());
        $this->assertDatabaseHas('itens_venda', [
            'id_venda' => $venda->id_venda,
            'id_produto' => $produto->id_produto,
            'quantidade' => 2,
        ]);

        // pagamentos_venda criado.
        $this->assertDatabaseHas('pagamentos_venda', [
            'id_venda' => $venda->id_venda,
            'status_pagamento' => 'aprovado',
        ]);

        // Estoque decrementado EXATAMENTE uma vez: 10 - 2 = 8.
        $this->assertEquals(8, (float) $produto->fresh()->estoque_atual);
        $this->assertEquals(1, \App\Models\MovimentacaoEstoque::where('tipo_movimentacao', 'venda')->count());

        // Reserva consumida.
        $this->assertEquals(0, $pedido->reservas()->whereNull('consumida_em')->count());

        // Pedido ligado à venda.
        $this->assertEquals($venda->id_venda, $pedido->fresh()->id_venda);
    }

    public function test_promover_e_idempotente_nao_duplica_estoque_nem_venda(): void
    {
        $this->seedInfra();
        [, $pedido, $produto] = $this->pedidoComItem(estoque: 10, qtd: 2, preco: 20);
        $this->pagamentoAprovado($pedido->id_pedido, 40);

        $action = app(PromoverPedidoEmVendaAction::class);
        $venda1 = $action->executar($pedido);
        $venda2 = $action->executar($pedido->fresh());

        $this->assertEquals($venda1->id_venda, $venda2->id_venda);
        $this->assertEquals(1, Venda::count());
        // Estoque NÃO decrementa de novo.
        $this->assertEquals(8, (float) $produto->fresh()->estoque_atual);
    }
}

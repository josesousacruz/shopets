<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\ContaReceber;
use App\Models\Pedido;
use App\Models\PontoVenda;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoGeraContaReceberTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        User::factory()->create(['nivel_acesso' => 'admin']); // user do sistema p/ AR
        PontoVenda::create(['nome_pdv' => 'Loja', 'ativo' => true]);
    }

    private function pedido(string $status = 'aguardando_pagamento'): Pedido
    {
        $cliente = Cliente::factory()->create();

        return Pedido::create([
            'numero' => 'PED-'.uniqid(),
            'id_cliente' => $cliente->id_cliente,
            'status' => $status,
            'modalidade' => 'entrega',
            'total' => 250.00,
        ]);
    }

    public function test_pedido_pago_gera_conta_a_receber(): void
    {
        $pedido = $this->pedido();
        $pedido->update(['status' => 'pago', 'pago_em' => now()]);

        $this->assertDatabaseHas('contas_receber', [
            'observacoes' => 'Pedido #'.$pedido->id_pedido,
            'status' => 'recebido',
            'valor_recebido' => 250.00,
        ]);
    }

    public function test_idempotente_nao_duplica_ar(): void
    {
        $pedido = $this->pedido();
        $pedido->update(['status' => 'pago', 'pago_em' => now()]);
        $pedido->update(['status' => 'em_separacao']);
        $pedido->update(['status' => 'pago']);

        $this->assertSame(1, ContaReceber::where('observacoes', 'Pedido #'.$pedido->id_pedido)->count());
    }

    public function test_pedido_nao_pago_nao_gera_ar(): void
    {
        $pedido = $this->pedido();
        $pedido->update(['status' => 'em_separacao']);

        $this->assertSame(0, ContaReceber::count());
    }
}

<?php

namespace Tests\Feature\Sprint4;

use App\Domain\Order\MarcarPedidoPagoAction;
use App\Jobs\EmitirNotaFiscalJob;
use App\Models\PagamentoPedido;
use App\Services\NfceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NotaFiscalTest extends TestCase
{
    use RefreshDatabase, Sprint4Helpers;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

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

    public function test_retirada_emite_nfce_e_grava_chave(): void
    {
        $this->seedInfra();
        $this->mock(NfceService::class, function ($mock) {
            $mock->shouldReceive('emitir')->once()->andReturn([
                'chave' => '29260612345678000199650010000000011000000017',
                'numero' => '42',
            ]);
        });

        [, $pedido] = $this->pedidoComItem(modalidade: 'retirada');
        $this->pagamentoAprovado($pedido->id_pedido, 40);

        app(MarcarPedidoPagoAction::class)->executar($pedido);

        $pedido->refresh();
        $this->assertEquals('29260612345678000199650010000000011000000017', $pedido->nfe_chave);
        $this->assertEquals('42', $pedido->nfe_numero);
        $this->assertEquals('pago', $pedido->status);
        $this->assertNotNull($pedido->id_venda);
        $this->assertDatabaseHas('pedido_eventos', ['tipo' => 'nota_fiscal_emitida']);
    }

    public function test_entrega_vai_para_revisao_fiscal_sem_quebrar_venda(): void
    {
        $this->seedInfra();
        // NfeService skeleton lança -> deve cair em revisão fiscal.
        [, $pedido] = $this->pedidoComItem(modalidade: 'entrega');
        $this->pagamentoAprovado($pedido->id_pedido, 40);

        app(MarcarPedidoPagoAction::class)->executar($pedido);

        $pedido->refresh();
        $this->assertEquals('aguardando_revisao_fiscal', $pedido->status);
        // Venda permanece criada (não bloqueia).
        $this->assertNotNull($pedido->id_venda);
        $this->assertNull($pedido->nfe_chave);
        $this->assertDatabaseHas('pedido_eventos', ['tipo' => 'revisao_fiscal']);
    }

    public function test_falha_na_nfce_retirada_vai_para_revisao(): void
    {
        $this->seedInfra();
        $this->mock(NfceService::class, function ($mock) {
            $mock->shouldReceive('emitir')->andThrow(new \RuntimeException('SEFAZ indisponível'));
        });

        [, $pedido] = $this->pedidoComItem(modalidade: 'retirada');
        $this->pagamentoAprovado($pedido->id_pedido, 40);

        app(MarcarPedidoPagoAction::class)->executar($pedido);

        $pedido->refresh();
        $this->assertEquals('aguardando_revisao_fiscal', $pedido->status);
        $this->assertNotNull($pedido->id_venda);
    }
}

<?php

namespace Tests\Feature\Sprint3;

use App\Domain\Cart\CarrinhoService;
use App\Domain\Checkout\IniciarCheckoutAction;
use App\Models\Carrinho;
use App\Models\Cliente;
use App\Models\EnderecoCliente;
use App\Models\Produto;
use App\Models\ReservaEstoque;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function clienteComEndereco(): array
    {
        $cliente = Cliente::factory()->create();
        $endereco = EnderecoCliente::create([
            'id_cliente' => $cliente->id_cliente,
            'cep' => '01001000',
            'logradouro' => 'Rua A',
            'numero' => '10',
            'bairro' => 'Centro',
            'cidade' => 'São Paulo',
            'uf' => 'SP',
            'principal' => true,
        ]);

        return [$cliente, $endereco];
    }

    public function test_checkout_cria_pedido_itens_reservas_evento_e_limpa_carrinho(): void
    {
        [$cliente, $endereco] = $this->clienteComEndereco();
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 20]);

        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, 2);

        Sanctum::actingAs($cliente);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'entrega',
                'id_endereco' => $endereco->id_endereco,
                'frete_servico' => 'PAC',
                'cep' => '01001000',
            ]);

        $resp->assertCreated()
            ->assertJsonPath('data.status', 'aguardando_pagamento')
            ->assertJsonPath('data.modalidade', 'entrega');

        $numero = $resp->json('data.numero');
        $this->assertStringStartsWith('PED-'.now()->year.'-', $numero);

        $this->assertDatabaseHas('pedido_itens', ['quantidade' => 2, 'preco_unit' => 20]);
        $this->assertDatabaseHas('pedido_eventos', ['tipo' => 'pedido_criado']);
        $this->assertEquals(1, ReservaEstoque::whereNotNull('id_pedido')->count());
        $this->assertEquals(0, $carrinho->fresh()->itens()->count());

        // Frete > 0 calculado.
        $this->assertGreaterThan(0, $resp->json('data.frete'));
    }

    public function test_estoque_indisponivel_aborta_422(): void
    {
        [$cliente, $endereco] = $this->clienteComEndereco();
        $produto = Produto::factory()->create(['estoque_atual' => 1]);

        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        // Força quantidade acima do disponível inserindo direto (driblando validação do carrinho).
        $carrinho->itens()->create([
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'quantidade' => 5,
            'preco_unit_snapshot' => 20,
        ]);

        Sanctum::actingAs($cliente);

        $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'entrega',
                'id_endereco' => $endereco->id_endereco,
                'frete_servico' => 'PAC',
                'cep' => '01001000',
            ])
            ->assertStatus(422);

        $this->assertEquals(0, ReservaEstoque::count());
        $this->assertEquals(0, \App\Models\Pedido::withoutGlobalScopes()->count());
    }

    public function test_over_reserve_action_lanca(): void
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => 2]);
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        $carrinho->itens()->create([
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'quantidade' => 3,
            'preco_unit_snapshot' => 10,
        ]);

        $this->expectException(ValidationException::class);
        app(IniciarCheckoutAction::class)->executar($cliente, $carrinho, ['modalidade' => 'retirada']);
    }

    public function test_numero_sequencial(): void
    {
        [$cliente, $endereco] = $this->clienteComEndereco();
        $produto = Produto::factory()->create(['estoque_atual' => 50]);

        Sanctum::actingAs($cliente);

        $numeros = [];
        for ($i = 0; $i < 2; $i++) {
            $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
            app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, 1);

            $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
                ->postJson('/api/v1/checkout/iniciar', [
                    'modalidade' => 'retirada',
                ]);
            $resp->assertCreated();
            $numeros[] = $resp->json('data.numero');
        }

        $ano = now()->year;
        $this->assertEquals("PED-{$ano}-000001", $numeros[0]);
        $this->assertEquals("PED-{$ano}-000002", $numeros[1]);
    }

    public function test_reserva_concorrente_nao_permite_overselling(): void
    {
        // Prova a matemática do lock-path: após primeiro checkout reservar a última
        // unidade, o segundo cliente não consegue reservar (disponivel = 0 -> 422).
        [$clienteA] = $this->clienteComEndereco();
        $clienteB = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => 1]);

        $carA = Carrinho::create(['id_cliente' => $clienteA->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carA, $produto->id_produto, null, 1);

        $carB = Carrinho::create(['id_cliente' => $clienteB->id_cliente]);
        $carB->itens()->create([
            'id_produto' => $produto->id_produto,
            'id_variacao' => null,
            'quantidade' => 1,
            'preco_unit_snapshot' => 20,
        ]);

        $action = app(IniciarCheckoutAction::class);
        $action->executar($clienteA, $carA, ['modalidade' => 'retirada']);

        $this->expectException(ValidationException::class);
        $action->executar($clienteB, $carB, ['modalidade' => 'retirada']);
    }
}

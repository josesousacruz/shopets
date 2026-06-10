<?php

namespace Tests\Feature\Sprint5;

use App\Domain\Cart\CarrinhoService;
use App\Models\Carrinho;
use App\Models\Cliente;
use App\Models\Cupom;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CupomCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cria_cupom(): void
    {
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $this->postJson('/api/v1/painel/cupons', [
            'codigo' => 'bem10',
            'tipo' => 'percentual',
            'valor' => 10,
            'valor_minimo_pedido' => 0,
            'ativo' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'BEM10');
    }

    public function test_aplica_cupom_valido_no_carrinho(): void
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 100]);
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, 2);

        Cupom::create(['codigo' => 'BEM10', 'tipo' => 'percentual', 'valor' => 10, 'ativo' => true]);

        Sanctum::actingAs($cliente);

        $resp = $this->postJson('/api/v1/carrinho/cupom', ['codigo' => 'bem10'])
            ->assertOk()
            ->assertJsonPath('data.codigo', 'BEM10');
        $this->assertSame(20.0, (float) $resp->json('data.desconto'));

        $this->assertDatabaseHas('carrinhos', [
            'id_carrinho' => $carrinho->id_carrinho,
            'cupom_codigo' => 'BEM10',
        ]);
    }

    public function test_codigo_invalido_rejeitado(): void
    {
        $cliente = Cliente::factory()->create();
        Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        Sanctum::actingAs($cliente);

        $this->postJson('/api/v1/carrinho/cupom', ['codigo' => 'NAOEXISTE'])
            ->assertStatus(422);
    }

    public function test_remove_cupom(): void
    {
        $cliente = Cliente::factory()->create();
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente, 'cupom_codigo' => 'BEM10']);
        Sanctum::actingAs($cliente);

        $this->deleteJson('/api/v1/carrinho/cupom')->assertOk();

        $this->assertDatabaseHas('carrinhos', [
            'id_carrinho' => $carrinho->id_carrinho,
            'cupom_codigo' => null,
        ]);
    }

    public function test_checkout_aplica_desconto_no_total_e_incrementa_usos(): void
    {
        $cliente = Cliente::factory()->create();
        $endereco = \App\Models\EnderecoCliente::create([
            'id_cliente' => $cliente->id_cliente,
            'cep' => '01001000', 'logradouro' => 'Rua A', 'numero' => '1',
            'bairro' => 'Centro', 'cidade' => 'SP', 'uf' => 'SP', 'principal' => true,
        ]);
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 100]);
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, 2);

        $cupom = Cupom::create(['codigo' => 'BEM10', 'tipo' => 'percentual', 'valor' => 10, 'ativo' => true]);
        $carrinho->update(['cupom_codigo' => 'BEM10']);

        Sanctum::actingAs($cliente);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'entrega',
                'id_endereco' => $endereco->id_endereco,
                'frete_servico' => 'PAC',
                'cep' => '01001000',
            ])
            ->assertCreated();

        // subtotal 200, desconto 20.
        $this->assertSame(20.0, (float) $resp->json('data.desconto'));
        $subtotal = (float) $resp->json('data.subtotal');
        $frete = (float) $resp->json('data.frete');
        $this->assertSame($subtotal + $frete - 20.0, (float) $resp->json('data.total'));

        $this->assertEquals(1, $cupom->fresh()->usos_atuais);
        $this->assertDatabaseHas('pedidos', ['id_cupom' => $cupom->id_cupom]);
    }

    public function test_checkout_frete_gratis_zera_frete(): void
    {
        $cliente = Cliente::factory()->create();
        $endereco = \App\Models\EnderecoCliente::create([
            'id_cliente' => $cliente->id_cliente,
            'cep' => '01001000', 'logradouro' => 'Rua A', 'numero' => '1',
            'bairro' => 'Centro', 'cidade' => 'SP', 'uf' => 'SP', 'principal' => true,
        ]);
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 100]);
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, 1);

        Cupom::create(['codigo' => 'FRETEGRATIS', 'tipo' => 'frete_gratis', 'valor' => 0, 'ativo' => true]);
        $carrinho->update(['cupom_codigo' => 'FRETEGRATIS']);

        Sanctum::actingAs($cliente);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'entrega',
                'id_endereco' => $endereco->id_endereco,
                'frete_servico' => 'PAC',
                'cep' => '01001000',
            ])
            ->assertCreated();

        $this->assertSame(0.0, (float) $resp->json('data.frete'));
        $this->assertSame((float) $resp->json('data.subtotal'), (float) $resp->json('data.total'));
    }
}

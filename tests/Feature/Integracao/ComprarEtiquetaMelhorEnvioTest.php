<?php

namespace Tests\Feature\Integracao;

use App\Domain\Shipping\GerarEtiquetaAction;
use App\Models\Cliente;
use App\Models\ConfiguracaoEmpresa;
use App\Models\EnderecoCliente;
use App\Models\Pedido;
use App\Models\PedidoEvento;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ComprarEtiquetaMelhorEnvioTest extends TestCase
{
    use RefreshDatabase;

    private function empresaConectada(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja Teste',
            'cnpj' => '12345678000199',
            'telefone' => '71999998888',
            'email' => 'contato@loja.test',
            'shipping_driver' => 'melhorenvio',
            'endereco_cep' => '01001000',
            'endereco_logradouro' => 'Praça da Sé',
            'endereco_numero' => '100',
            'endereco_bairro' => 'Sé',
            'endereco_cidade' => 'São Paulo',
            'endereco_uf' => 'SP',
            'melhor_envio_access_token' => 'acc-token',
            'melhor_envio_refresh_token' => 'ref-token',
            'melhor_envio_token_expira_em' => Carbon::now()->addHour(),
        ]);
        config()->set('services.shipping.melhorenvio.client_id', 'app-123');
        config()->set('services.shipping.melhorenvio.client_secret', 'secret-xyz');
        // Ambiente sandbox é o default do banco (melhor_envio_sandbox = true).
    }

    private function pedidoElegivel(): Pedido
    {
        $cliente = Cliente::factory()->create(['telefone' => '71988887777', 'cpf_cnpj' => '39053344705']);
        $endereco = EnderecoCliente::create([
            'id_cliente' => $cliente->id_cliente,
            'cep' => '20040020',
            'logradouro' => 'Av. Rio Branco',
            'numero' => '1',
            'bairro' => 'Centro',
            'cidade' => 'Rio de Janeiro',
            'uf' => 'RJ',
        ]);
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'em_separacao',
            'modalidade' => 'entrega',
            'id_endereco_entrega' => $endereco->id_endereco,
            'subtotal' => 50,
            'frete' => 10,
            'desconto' => 0,
            'total' => 60,
            'frete_servico' => 'PAC',
            'frete_servico_id' => '1',
        ]);
        $pedido->itens()->create([
            'nome' => 'Produto X',
            'preco_unit' => 50,
            'quantidade' => 1,
            'subtotal' => 50,
        ]);

        return $pedido->fresh();
    }

    public function test_compra_etiqueta_real_quando_elegivel(): void
    {
        $this->empresaConectada();
        $pedido = $this->pedidoElegivel();

        Http::fake([
            'sandbox.melhorenvio.com.br/api/v2/me/cart' => Http::response(['id' => 'cart-abc']),
            'sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout' => Http::response([]),
            'sandbox.melhorenvio.com.br/api/v2/me/shipment/generate' => Http::response([]),
            'sandbox.melhorenvio.com.br/api/v2/me/shipment/print' => Http::response(['url' => 'https://me.test/etiqueta/cart-abc.pdf']),
        ]);

        $url = app(GerarEtiquetaAction::class)->executar($pedido);

        $this->assertSame('https://me.test/etiqueta/cart-abc.pdf', $url);
        $this->assertDatabaseHas('pedidos', [
            'id_pedido' => $pedido->id_pedido,
            'etiqueta_url' => 'https://me.test/etiqueta/cart-abc.pdf',
        ]);
        $this->assertSame(
            'Etiqueta comprada no Melhor Envio.',
            PedidoEvento::where('id_pedido', $pedido->id_pedido)->where('tipo', 'etiqueta_gerada')->value('descricao'),
        );

        Http::assertSent(fn ($r) => str_contains($r->url(), '/api/v2/me/cart')
            && $r['service'] === 1
            && $r['from']['postal_code'] === '01001000'
            && $r['to']['postal_code'] === '20040020');
    }

    public function test_cai_pro_pdf_quando_nao_elegivel_driver_stub(): void
    {
        // Sem ConfiguracaoEmpresa nenhuma → shipping_driver default 'stub'.
        $pedido = $this->pedidoElegivel();

        Http::fake();

        $url = app(GerarEtiquetaAction::class)->executar($pedido);

        $this->assertStringContainsString('.pdf', $url);
        Http::assertNothingSent();
        $this->assertSame(
            'Etiqueta de envio gerada (PDF interno).',
            PedidoEvento::where('id_pedido', $pedido->id_pedido)->where('tipo', 'etiqueta_gerada')->value('descricao'),
        );
    }

    public function test_cai_pro_pdf_quando_pedido_sem_frete_servico_id(): void
    {
        $this->empresaConectada();
        $pedido = $this->pedidoElegivel();
        $pedido->update(['frete_servico_id' => null]);

        Http::fake();

        $url = app(GerarEtiquetaAction::class)->executar($pedido->fresh());

        $this->assertStringContainsString('.pdf', $url);
        Http::assertNothingSent();
    }

    public function test_cai_pro_pdf_quando_compra_real_falha(): void
    {
        $this->empresaConectada();
        $pedido = $this->pedidoElegivel();

        Http::fake([
            'sandbox.melhorenvio.com.br/api/v2/me/cart' => Http::response(['message' => 'saldo insuficiente'], 422),
        ]);

        $url = app(GerarEtiquetaAction::class)->executar($pedido);

        $this->assertStringContainsString('.pdf', $url);
        $this->assertDatabaseHas('pedidos', ['id_pedido' => $pedido->id_pedido, 'etiqueta_url' => $url]);
    }
}

<?php

namespace Tests\Feature\Integracao;

use App\Domain\Shipping\MelhorEnvioService;
use App\Domain\Shipping\MelhorEnvioTokenManager;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class MelhorEnvioOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ambiente sandbox é o default do banco (melhor_envio_sandbox = true).
        config()->set('services.shipping.melhorenvio.client_id', 'app-123');
        config()->set('services.shipping.melhorenvio.client_secret', 'secret-xyz');
        config()->set('services.shipping.melhorenvio.redirect_uri', 'https://pontto.test/painel/integracoes/melhor-envio/callback');
    }

    private function manager(): MelhorEnvioTokenManager
    {
        return app(MelhorEnvioTokenManager::class);
    }

    public function test_authorize_url_contem_parametros_obrigatorios(): void
    {
        $url = $this->manager()->authorizeUrl('estado-csrf');

        $this->assertStringStartsWith('https://sandbox.melhorenvio.com.br/oauth/authorize?', $url);
        $this->assertStringContainsString('client_id=app-123', $url);
        $this->assertStringContainsString('response_type=code', $url);
        $this->assertStringContainsString('state=estado-csrf', $url);
        $this->assertStringContainsString('redirect_uri=', $url);
        $this->assertStringContainsString('scope=', $url);
    }

    public function test_exchange_code_armazena_tokens_na_configuracao(): void
    {
        Carbon::setTestNow('2026-06-30 12:00:00');
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja Teste']);

        Http::fake([
            'sandbox.melhorenvio.com.br/oauth/token' => Http::response([
                'access_token' => 'acc-novo',
                'refresh_token' => 'ref-novo',
                'expires_in' => 7200,
            ]),
        ]);

        $this->manager()->exchangeCode('auth-code-abc');

        $config = ConfiguracaoEmpresa::first();
        $this->assertSame('acc-novo', $config->melhor_envio_access_token);
        $this->assertSame('ref-novo', $config->melhor_envio_refresh_token);
        $this->assertEquals(
            Carbon::parse('2026-06-30 14:00:00')->timestamp,
            $config->melhor_envio_token_expira_em->timestamp,
        );

        Http::assertSent(function ($request) {
            return $request->url() === 'https://sandbox.melhorenvio.com.br/oauth/token'
                && $request['grant_type'] === 'authorization_code'
                && $request['code'] === 'auth-code-abc'
                && $request['client_id'] === 'app-123'
                && $request['client_secret'] === 'secret-xyz';
        });
    }

    public function test_valid_token_retorna_token_quando_nao_expirado(): void
    {
        Carbon::setTestNow('2026-06-30 12:00:00');
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja Teste',
            'melhor_envio_access_token' => 'acc-vigente',
            'melhor_envio_refresh_token' => 'ref-1',
            'melhor_envio_token_expira_em' => Carbon::parse('2026-06-30 13:00:00'),
        ]);

        Http::fake();

        $token = $this->manager()->validToken();

        $this->assertSame('acc-vigente', $token);
        Http::assertNothingSent();
    }

    public function test_valid_token_faz_refresh_quando_expirado(): void
    {
        Carbon::setTestNow('2026-06-30 12:00:00');
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja Teste',
            'melhor_envio_access_token' => 'acc-velho',
            'melhor_envio_refresh_token' => 'ref-velho',
            'melhor_envio_token_expira_em' => Carbon::parse('2026-06-30 11:00:00'),
        ]);

        Http::fake([
            'sandbox.melhorenvio.com.br/oauth/token' => Http::response([
                'access_token' => 'acc-renovado',
                'refresh_token' => 'ref-renovado',
                'expires_in' => 7200,
            ]),
        ]);

        $token = $this->manager()->validToken();

        $this->assertSame('acc-renovado', $token);

        $config = ConfiguracaoEmpresa::first();
        $this->assertSame('acc-renovado', $config->melhor_envio_access_token);
        $this->assertSame('ref-renovado', $config->melhor_envio_refresh_token);

        Http::assertSent(fn ($request) => $request['grant_type'] === 'refresh_token'
            && $request['refresh_token'] === 'ref-velho');
    }

    public function test_valid_token_lanca_quando_nao_conectado(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja Teste']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Melhor Envio não conectado');

        $this->manager()->validToken();
    }

    public function test_is_connected_reflete_presenca_do_token(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja Teste']);
        $this->assertFalse($this->manager()->isConnected());

        ConfiguracaoEmpresa::first()->update([
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => Carbon::now()->addHour(),
        ]);

        $this->assertTrue($this->manager()->isConnected());
    }

    public function test_cotar_envia_header_user_agent(): void
    {
        config()->set('services.shipping.melhorenvio.user_agent', 'Pontto (dev@pontto.com.br)');

        Http::fake([
            'sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate' => Http::response([]),
        ]);

        (new MelhorEnvioService('tok-estatico', true))
            ->cotar('01001000', collect([['quantidade' => 1, 'peso_gramas' => 300]]));

        Http::assertSent(fn ($request) => $request->hasHeader('User-Agent', 'Pontto (dev@pontto.com.br)'));
    }

    public function test_disconnect_limpa_tokens(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja Teste',
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => Carbon::now()->addHour(),
        ]);

        $this->manager()->disconnect();

        $config = ConfiguracaoEmpresa::first();
        $this->assertNull($config->melhor_envio_access_token);
        $this->assertNull($config->melhor_envio_refresh_token);
        $this->assertNull($config->melhor_envio_token_expira_em);
    }
}

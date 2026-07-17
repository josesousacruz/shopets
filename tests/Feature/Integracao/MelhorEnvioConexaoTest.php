<?php

namespace Tests\Feature\Integracao;

use App\Models\ConfiguracaoEmpresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MelhorEnvioConexaoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ambiente sandbox é o default do banco (melhor_envio_sandbox = true).
        config()->set('services.shipping.melhorenvio.client_id', 'app-123');
        config()->set('services.shipping.melhorenvio.client_secret', 'secret-xyz');
        config()->set('services.shipping.melhorenvio.redirect_uri', 'https://pontto.test/painel/integracoes/melhor-envio/callback');

        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja Teste']);
    }

    private function admin(): void
    {
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_connect_retorna_url_de_autorizacao_e_guarda_state(): void
    {
        $this->admin();

        $resp = $this->postJson('/api/v1/painel/integracoes/melhor-envio/connect')
            ->assertOk()
            ->assertJsonStructure(['data' => ['url']]);

        $url = $resp->json('data.url');
        $this->assertStringContainsString('sandbox.melhorenvio.com.br/oauth/authorize', $url);
        $this->assertNotNull(Cache::get('melhor_envio_oauth_state'));
        $this->assertStringContainsString('state='.Cache::get('melhor_envio_oauth_state'), $url);
    }

    public function test_connect_sem_app_registrado_retorna_422_com_instrucao(): void
    {
        $this->admin();

        // Sem credenciais do app nem na tela (banco) nem no .env, redirecionar pro
        // ME geraria um erro OAuth críptico — a API falha antes, com instrução.
        config()->set('services.shipping.melhorenvio.client_id', null);
        config()->set('services.shipping.melhorenvio.client_secret', null);

        $this->postJson('/api/v1/painel/integracoes/melhor-envio/connect')
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Aplicativo do Melhor Envio não configurado para este ambiente. Registre um aplicativo no painel do Melhor Envio (sandbox e produção são apps separados) e preencha o Client ID e o Client Secret no card Melhor Envio desta tela.']);

        $this->assertNull(Cache::get('melhor_envio_oauth_state'));
    }

    public function test_connect_usa_credenciais_do_banco_do_ambiente_ativo(): void
    {
        $this->admin();

        // Credenciais da tela (banco) têm prioridade sobre o fallback do .env.
        config()->set('services.shipping.melhorenvio.client_id', null);
        config()->set('services.shipping.melhorenvio.client_secret', null);
        ConfiguracaoEmpresa::first()->update([
            'melhor_envio_sandbox' => true,
            'melhor_envio_sandbox_client_id' => 'app-tela-999',
            'melhor_envio_sandbox_client_secret' => 'secret-tela',
            // Par de produção diferente — não pode vazar pro ambiente sandbox.
            'melhor_envio_prod_client_id' => 'app-prod-111',
            'melhor_envio_prod_client_secret' => 'secret-prod',
        ]);

        $url = $this->postJson('/api/v1/painel/integracoes/melhor-envio/connect')
            ->assertOk()
            ->json('data.url');

        $this->assertStringContainsString('sandbox.melhorenvio.com.br/oauth/authorize', $url);
        $this->assertStringContainsString('client_id=app-tela-999', $url);
    }

    public function test_status_reflete_conexao(): void
    {
        $this->admin();

        $this->getJson('/api/v1/painel/integracoes/melhor-envio')
            ->assertOk()
            ->assertJsonPath('data.conectado', false);

        ConfiguracaoEmpresa::first()->update([
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => Carbon::now()->addHour(),
        ]);

        $this->getJson('/api/v1/painel/integracoes/melhor-envio')
            ->assertOk()
            ->assertJsonPath('data.conectado', true);
    }

    public function test_disconnect_limpa_tokens(): void
    {
        $this->admin();
        ConfiguracaoEmpresa::first()->update([
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => Carbon::now()->addHour(),
        ]);

        $this->deleteJson('/api/v1/painel/integracoes/melhor-envio')
            ->assertOk()
            ->assertJsonPath('data.conectado', false);

        $this->assertNull(ConfiguracaoEmpresa::first()->melhor_envio_access_token);
    }

    public function test_callback_troca_code_e_persiste_tokens(): void
    {
        Cache::put('melhor_envio_oauth_state', 'estado-valido', now()->addMinutes(10));
        Http::fake([
            'sandbox.melhorenvio.com.br/oauth/token' => Http::response([
                'access_token' => 'acc-cb',
                'refresh_token' => 'ref-cb',
                'expires_in' => 7200,
            ]),
        ]);

        $this->get('/painel/integracoes/melhor-envio/callback?code=code-abc&state=estado-valido')
            ->assertRedirect();

        $config = ConfiguracaoEmpresa::first();
        $this->assertSame('acc-cb', $config->melhor_envio_access_token);
        $this->assertSame('ref-cb', $config->melhor_envio_refresh_token);
        // state é consumido (one-shot)
        $this->assertNull(Cache::get('melhor_envio_oauth_state'));
    }

    public function test_callback_rejeita_state_invalido_sem_trocar_code(): void
    {
        Cache::put('melhor_envio_oauth_state', 'estado-correto', now()->addMinutes(10));
        Http::fake();

        $this->get('/painel/integracoes/melhor-envio/callback?code=code-abc&state=estado-ERRADO')
            ->assertRedirect();

        $this->assertNull(ConfiguracaoEmpresa::first()->melhor_envio_access_token);
        Http::assertNothingSent();
    }
}

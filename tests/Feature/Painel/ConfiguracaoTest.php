<?php

namespace Tests\Feature\Painel;

use App\Models\ConfiguracaoEmpresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConfiguracaoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_get_retorna_loja_e_integracoes(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Shopets',
            'taxa_entrega' => 9.90,
            'valor_minimo_entrega' => 50,
        ]);

        $this->getJson('/api/v1/painel/configuracoes')
            ->assertOk()
            ->assertJsonPath('data.loja.nome_empresa', 'Shopets')
            ->assertJsonPath('data.loja.taxa_entrega', 9.9)
            ->assertJsonStructure([
                'data' => [
                    'loja' => ['nome_empresa', 'cnpj', 'telefone', 'email', 'taxa_entrega', 'valor_minimo_entrega'],
                    'integracoes' => ['payment_driver', 'shipping_driver'],
                ],
            ]);
    }

    public function test_put_atualiza_dados_da_loja(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Antigo']);

        $this->putJson('/api/v1/painel/configuracoes', [
            'nome_empresa' => 'Shopets Pet Shop',
            'telefone' => '7130001000',
            'taxa_entrega' => 12.50,
        ])
            ->assertOk()
            ->assertJsonPath('data.loja.nome_empresa', 'Shopets Pet Shop')
            ->assertJsonPath('data.loja.taxa_entrega', 12.5);

        $this->assertDatabaseHas('configuracoes_empresa', [
            'nome_empresa' => 'Shopets Pet Shop',
            'telefone' => '7130001000',
        ]);
    }

    public function test_salva_seo_e_fiscal(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', [
            'nome_empresa' => 'Pet Shop X',
            'seo_titulo' => 'Pet Shop X — tudo pro seu pet',
            'seo_descricao' => 'A melhor loja de produtos para pets.',
            'ambiente_nfce' => 1,
            'csc_nfce' => 'ABC123',
            'csc_id_nfce' => '000001',
        ])->assertOk();

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertSame('Pet Shop X — tudo pro seu pet', $r->json('data.seo.seo_titulo'));
        $this->assertSame(1, $r->json('data.fiscal.ambiente_nfce'));
        $this->assertSame('ABC123', $r->json('data.fiscal.csc_nfce'));
    }

    public function test_ambiente_nfce_default_homologacao(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', ['nome_empresa' => 'Loja'])->assertOk();
        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertSame(2, $r->json('data.fiscal.ambiente_nfce')); // homologação
    }

    public function test_senha_certificado_encriptada_e_nunca_exposta(): void
    {
        $config = ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'certificado_senha' => 'segredo123',
        ]);

        $raw = \Illuminate\Support\Facades\DB::table('configuracoes_empresa')->where('id', $config->id)->value('certificado_senha');
        $this->assertNotSame('segredo123', $raw);
        $this->assertSame('segredo123', $config->fresh()->certificado_senha);

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertTrue($r->json('data.fiscal.certificado_definido'));
        $this->assertArrayNotHasKey('certificado_senha', $r->json('data.fiscal'));
    }

    public function test_valida_ambiente_invalido(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', ['ambiente_nfce' => 9])
            ->assertStatus(422)->assertJsonValidationErrors('ambiente_nfce');
    }

    public function test_payment_driver_e_sandbox_default_fake_e_homologacao(): void
    {
        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();

        $this->assertSame('fake', $r->json('data.integracoes.payment_driver'));
        $this->assertTrue($r->json('data.integracoes.yapay_sandbox'));
        $this->assertFalse($r->json('data.integracoes.yapay_configurado'));
    }

    public function test_salva_driver_yapay_e_token(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', [
            'payment_driver' => 'yapay',
            'yapay_token_account' => 'tok-conta-real-123',
            'yapay_sandbox' => false,
        ])->assertOk();

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertSame('yapay', $r->json('data.integracoes.payment_driver'));
        $this->assertFalse($r->json('data.integracoes.yapay_sandbox'));
        $this->assertTrue($r->json('data.integracoes.yapay_configurado'));

        // Token nunca volta na resposta, mas fica encriptado no banco.
        $this->assertArrayNotHasKey('yapay_token_account', $r->json('data.integracoes'));
        $config = ConfiguracaoEmpresa::first();
        $this->assertSame('tok-conta-real-123', $config->yapay_token_account);
        $raw = \Illuminate\Support\Facades\DB::table('configuracoes_empresa')->where('id', $config->id)->value('yapay_token_account');
        $this->assertNotSame('tok-conta-real-123', $raw);
    }

    public function test_reenviar_token_em_branco_nao_apaga_o_ja_salvo(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'payment_driver' => 'yapay',
            'yapay_token_account' => 'tok-existente',
        ]);

        // Reenvia a aba sem preencher o token (campo write-only vazio).
        $this->putJson('/api/v1/painel/configuracoes', [
            'payment_driver' => 'yapay',
            'yapay_token_account' => '',
            'yapay_sandbox' => true,
        ])->assertOk();

        $this->assertSame('tok-existente', ConfiguracaoEmpresa::first()->yapay_token_account);
    }

    public function test_valida_payment_driver_invalido(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', ['payment_driver' => 'pagseguro'])
            ->assertStatus(422)->assertJsonValidationErrors('payment_driver');
    }

    public function test_salva_driver_mercadopago_e_access_token(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', [
            'payment_driver' => 'mercadopago',
            'mercadopago_access_token' => 'APP_USR-token-teste-123',
            'mercadopago_sandbox' => true,
        ])->assertOk();

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertSame('mercadopago', $r->json('data.integracoes.payment_driver'));
        $this->assertTrue($r->json('data.integracoes.mercadopago_sandbox'));
        $this->assertTrue($r->json('data.integracoes.mercadopago_configurado'));

        // Token nunca volta na resposta, mas fica encriptado no banco.
        $this->assertArrayNotHasKey('mercadopago_access_token', $r->json('data.integracoes'));
        $config = ConfiguracaoEmpresa::first();
        $this->assertSame('APP_USR-token-teste-123', $config->mercadopago_access_token);
        $raw = \Illuminate\Support\Facades\DB::table('configuracoes_empresa')->where('id', $config->id)->value('mercadopago_access_token');
        $this->assertNotSame('APP_USR-token-teste-123', $raw);
    }

    public function test_reenviar_access_token_mp_em_branco_nao_apaga_o_ja_salvo(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'payment_driver' => 'mercadopago',
            'mercadopago_access_token' => 'APP_USR-existente',
        ]);

        $this->putJson('/api/v1/painel/configuracoes', [
            'payment_driver' => 'mercadopago',
            'mercadopago_access_token' => '',
            'mercadopago_sandbox' => true,
        ])->assertOk();

        $this->assertSame('APP_USR-existente', ConfiguracaoEmpresa::first()->mercadopago_access_token);
    }

    public function test_melhor_envio_sandbox_default_homologacao(): void
    {
        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertTrue($r->json('data.integracoes.melhor_envio_sandbox'));
    }

    public function test_trocar_ambiente_melhor_envio_desconecta_tokens(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'melhor_envio_sandbox' => true,
            'melhor_envio_access_token' => 'acc-sandbox',
            'melhor_envio_refresh_token' => 'ref-sandbox',
            'melhor_envio_token_expira_em' => now()->addHour(),
        ]);

        // Sandbox e produção são contas separadas no ME: trocar o ambiente
        // invalida os tokens conectados — precisa reconectar na conta certa.
        $this->putJson('/api/v1/painel/configuracoes', ['melhor_envio_sandbox' => false])
            ->assertOk()
            ->assertJsonPath('data.integracoes.melhor_envio_sandbox', false);

        $config = ConfiguracaoEmpresa::first();
        $this->assertNull($config->melhor_envio_access_token);
        $this->assertNull($config->melhor_envio_refresh_token);
        $this->assertNull($config->melhor_envio_token_expira_em);
    }

    public function test_salvar_mesmo_ambiente_melhor_envio_mantem_tokens(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'melhor_envio_sandbox' => true,
            'melhor_envio_access_token' => 'acc-sandbox',
            'melhor_envio_refresh_token' => 'ref-sandbox',
            'melhor_envio_token_expira_em' => now()->addHour(),
        ]);

        $this->putJson('/api/v1/painel/configuracoes', ['melhor_envio_sandbox' => true])
            ->assertOk();

        $this->assertSame('acc-sandbox', ConfiguracaoEmpresa::first()->melhor_envio_access_token);
    }

    public function test_salva_credenciais_do_app_melhor_envio_por_ambiente(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', [
            'melhor_envio_sandbox_client_id' => 'app-sand-1',
            'melhor_envio_sandbox_client_secret' => 'secret-sand',
            'melhor_envio_prod_client_id' => 'app-prod-2',
            'melhor_envio_prod_client_secret' => 'secret-prod',
        ])->assertOk();

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        // client_id é público e volta; secret nunca volta — só a flag.
        $this->assertSame('app-sand-1', $r->json('data.integracoes.melhor_envio_sandbox_client_id'));
        $this->assertSame('app-prod-2', $r->json('data.integracoes.melhor_envio_prod_client_id'));
        $this->assertTrue($r->json('data.integracoes.melhor_envio_sandbox_secret_configurado'));
        $this->assertTrue($r->json('data.integracoes.melhor_envio_prod_secret_configurado'));
        $this->assertArrayNotHasKey('melhor_envio_sandbox_client_secret', $r->json('data.integracoes'));

        // Secret criptografado no banco.
        $config = ConfiguracaoEmpresa::first();
        $raw = \Illuminate\Support\Facades\DB::table('configuracoes_empresa')->where('id', $config->id)->value('melhor_envio_sandbox_client_secret');
        $this->assertNotSame('secret-sand', $raw);
        $this->assertSame('secret-sand', $config->melhor_envio_sandbox_client_secret);
    }

    public function test_trocar_credencial_do_ambiente_ativo_desconecta_tokens(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'melhor_envio_sandbox' => true,
            'melhor_envio_sandbox_client_id' => 'app-antigo',
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => now()->addHour(),
        ]);

        // Tokens foram emitidos pro app antigo: registrar app novo exige reconectar.
        $this->putJson('/api/v1/painel/configuracoes', [
            'melhor_envio_sandbox_client_id' => 'app-novo',
        ])->assertOk();

        $this->assertNull(ConfiguracaoEmpresa::first()->melhor_envio_access_token);
    }

    public function test_trocar_credencial_do_ambiente_inativo_mantem_tokens(): void
    {
        ConfiguracaoEmpresa::create([
            'nome_empresa' => 'Loja',
            'melhor_envio_sandbox' => true,
            'melhor_envio_access_token' => 'acc',
            'melhor_envio_refresh_token' => 'ref',
            'melhor_envio_token_expira_em' => now()->addHour(),
        ]);

        // Mexer no app de produção não afeta a conexão ativa (sandbox).
        $this->putJson('/api/v1/painel/configuracoes', [
            'melhor_envio_prod_client_id' => 'app-prod-novo',
        ])->assertOk();

        $this->assertSame('acc', ConfiguracaoEmpresa::first()->melhor_envio_access_token);
    }

    public function test_show_inclui_callback_url_do_melhor_envio(): void
    {
        config()->set('services.shipping.melhorenvio.redirect_uri', null);
        config()->set('app.url', 'https://loja.exemplo.com.br');

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();

        $this->assertSame(
            'https://loja.exemplo.com.br/painel/integracoes/melhor-envio/callback',
            $r->json('data.integracoes.melhor_envio_callback_url')
        );
    }

    public function test_mercadopago_webhook_secret_write_only(): void
    {
        $this->putJson('/api/v1/painel/configuracoes', [
            'mercadopago_webhook_secret' => 'mp-wh-secret-1',
        ])->assertOk();

        $r = $this->getJson('/api/v1/painel/configuracoes')->assertOk();
        $this->assertTrue($r->json('data.integracoes.mercadopago_webhook_configurado'));
        $this->assertArrayNotHasKey('mercadopago_webhook_secret', $r->json('data.integracoes'));

        // Reenviar em branco não apaga.
        $this->putJson('/api/v1/painel/configuracoes', [
            'mercadopago_webhook_secret' => '',
            'mercadopago_sandbox' => true,
        ])->assertOk();

        $this->assertSame('mp-wh-secret-1', ConfiguracaoEmpresa::first()->mercadopago_webhook_secret);
    }
}

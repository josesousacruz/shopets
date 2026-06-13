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
}

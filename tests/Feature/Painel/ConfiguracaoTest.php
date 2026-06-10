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
}

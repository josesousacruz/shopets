<?php

namespace Tests\Feature\Sprint5;

use App\Models\BannerHome;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BannerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cria_lista_atualiza_remove_banner(): void
    {
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));

        $resp = $this->postJson('/api/v1/painel/banners', [
            'titulo' => 'Promo de Inverno',
            'subtitulo' => 'Até 50% off',
            'imagem_path' => 'banners/inverno.jpg',
            'link' => '/promo',
            'ordem' => 1,
            'ativo' => true,
        ])->assertCreated()->assertJsonPath('data.titulo', 'Promo de Inverno');

        $id = $resp->json('data.id');

        $this->getJson('/api/v1/painel/banners')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->putJson("/api/v1/painel/banners/{$id}", [
            'titulo' => 'Promo Atualizada',
            'ordem' => 3,
        ])
            ->assertOk()
            ->assertJsonPath('data.titulo', 'Promo Atualizada')
            ->assertJsonPath('data.ordem', 3);

        $this->deleteJson("/api/v1/painel/banners/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('banners_home', ['id_banner' => $id]);
    }

    public function test_publico_retorna_apenas_vigentes_ordenados(): void
    {
        // Vigente (sem datas).
        BannerHome::create(['titulo' => 'B Segundo', 'ordem' => 2, 'ativo' => true]);
        BannerHome::create(['titulo' => 'A Primeiro', 'ordem' => 1, 'ativo' => true]);

        // Inativo.
        BannerHome::create(['titulo' => 'Inativo', 'ordem' => 0, 'ativo' => false]);

        // Expirado.
        BannerHome::create([
            'titulo' => 'Expirado',
            'ordem' => 0,
            'ativo' => true,
            'vigencia_ate' => now()->subDay(),
        ]);

        // Futuro.
        BannerHome::create([
            'titulo' => 'Futuro',
            'ordem' => 0,
            'ativo' => true,
            'vigencia_de' => now()->addDay(),
        ]);

        $resp = $this->getJson('/api/v1/banners')->assertOk();

        $titulos = collect($resp->json('data'))->pluck('titulo')->all();
        $this->assertSame(['A Primeiro', 'B Segundo'], $titulos);
    }
}

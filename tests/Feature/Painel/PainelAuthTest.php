<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PainelAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_admin_loga_e_recebe_token(): void
    {
        $user = User::factory()->create([
            'email' => 'lojista@shop.test',
            'password' => Hash::make('segredo123'),
            'nivel_acesso' => 'admin',
        ]);

        $this->postJson('/api/v1/painel/auth/login', [
            'email' => 'lojista@shop.test',
            'password' => 'segredo123',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.nivel_acesso', 'admin')
            ->assertJsonStructure(['user' => ['id', 'name', 'email', 'nivel_acesso'], 'token']);
    }

    public function test_login_com_senha_invalida_falha(): void
    {
        User::factory()->create([
            'email' => 'lojista@shop.test',
            'password' => Hash::make('segredo123'),
            'nivel_acesso' => 'admin',
        ]);

        $this->postJson('/api/v1/painel/auth/login', [
            'email' => 'lojista@shop.test',
            'password' => 'errada',
        ])->assertStatus(422);
    }

    public function test_user_inativo_nao_loga(): void
    {
        User::factory()->create([
            'email' => 'inativo@shop.test',
            'password' => Hash::make('segredo123'),
            'nivel_acesso' => 'admin',
            'ativo' => false,
        ]);

        $this->postJson('/api/v1/painel/auth/login', [
            'email' => 'inativo@shop.test',
            'password' => 'segredo123',
        ])->assertStatus(422);
    }

    public function test_me_retorna_user_autenticado(): void
    {
        $user = User::factory()->create(['nivel_acesso' => 'gerente']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/painel/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.nivel_acesso', 'gerente');
    }

    public function test_admin_e_gerente_passam_no_middleware(): void
    {
        foreach (['admin', 'gerente'] as $nivel) {
            $user = User::factory()->create(['nivel_acesso' => $nivel]);
            Sanctum::actingAs($user);

            $this->getJson('/api/v1/painel/auth/me')->assertOk();
        }
    }

    public function test_vendedor_e_bloqueado(): void
    {
        $user = User::factory()->create(['nivel_acesso' => 'vendedor']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/painel/auth/me')->assertStatus(403);
        $this->getJson('/api/v1/painel/pedidos')->assertStatus(403);
    }

    public function test_token_de_cliente_e_bloqueado(): void
    {
        $cliente = Cliente::factory()->create();
        Sanctum::actingAs($cliente);

        $this->getJson('/api/v1/painel/auth/me')->assertStatus(403);
        $this->getJson('/api/v1/painel/produtos')->assertStatus(403);
    }
}

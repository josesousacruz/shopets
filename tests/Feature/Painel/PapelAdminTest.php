<?php

namespace Tests\Feature\Painel;

use App\Models\User;
use Database\Seeders\PainelPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PapelAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PainelPermissionsSeeder::class);
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_lista_permissoes_agrupadas_por_modulo(): void
    {
        $r = $this->getJson('/api/v1/painel/permissoes')->assertOk();
        $data = $r->json('data');

        $this->assertIsArray($data['clientes']);
        $this->assertContains('painel.clientes.ver', $data['clientes']);
        $this->assertContains('painel.clientes.editar', $data['clientes']);
        $this->assertArrayHasKey('financeiro', $data);
        $this->assertArrayHasKey('estoque', $data);
    }

    public function test_cria_papel_com_permissoes(): void
    {
        $r = $this->postJson('/api/v1/painel/papeis', [
            'nome' => 'Gerente',
            'descricao' => 'Gerente de loja',
            'permissions' => [
                'painel.clientes.ver',
                'painel.clientes.editar',
                'painel.estoque.ver',
            ],
        ])->assertCreated();

        $role = Role::where('name', 'Gerente')->first();
        $this->assertNotNull($role);
        $this->assertCount(3, $role->permissions);
    }

    public function test_lista_papeis_com_contagem_de_permissoes(): void
    {
        $papel = Role::create(['name' => 'Caixa', 'guard_name' => 'web']);
        $papel->givePermissionTo('painel.clientes.ver');

        $r = $this->getJson('/api/v1/painel/papeis')->assertOk();
        $r->assertJsonFragment(['nome' => 'Caixa', 'permissions_count' => 1]);
    }

    public function test_atualiza_papel_substituindo_todas_as_permissoes(): void
    {
        $papel = Role::create(['name' => 'X', 'guard_name' => 'web']);
        $papel->givePermissionTo(['painel.clientes.ver', 'painel.clientes.editar']);

        $this->putJson("/api/v1/painel/papeis/{$papel->id}", [
            'nome' => 'X',
            'descricao' => null,
            'permissions' => ['painel.estoque.ver'],
        ])->assertOk();

        $papel->refresh();
        $this->assertSame(['painel.estoque.ver'], $papel->permissions->pluck('name')->toArray());
    }

    public function test_nao_permite_renomear_papel_admin(): void
    {
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $this->putJson("/api/v1/painel/papeis/{$admin->id}", [
            'nome' => 'super',
            'permissions' => [],
        ])->assertStatus(422);
    }

    public function test_nao_permite_excluir_papel_admin(): void
    {
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'web']);

        $this->deleteJson("/api/v1/painel/papeis/{$admin->id}")
            ->assertStatus(422);
    }

    public function test_exclui_papel_comum(): void
    {
        $papel = Role::create(['name' => 'Comum', 'guard_name' => 'web']);

        $this->deleteJson("/api/v1/painel/papeis/{$papel->id}")
            ->assertNoContent();

        $this->assertNull(Role::find($papel->id));
    }

    public function test_valida_nome_unico(): void
    {
        Role::create(['name' => 'Gerente', 'guard_name' => 'web']);

        $this->postJson('/api/v1/painel/papeis', [
            'nome' => 'Gerente',
            'permissions' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('nome');
    }

    public function test_valida_permissions_existentes(): void
    {
        $this->postJson('/api/v1/painel/papeis', [
            'nome' => 'Y',
            'permissions' => ['painel.fake.acao'],
        ])->assertStatus(422)->assertJsonValidationErrors('permissions.0');
    }
}

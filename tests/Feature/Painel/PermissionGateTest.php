<?php

namespace Tests\Feature\Painel;

use App\Models\User;
use Database\Seeders\PainelPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermissionGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PainelPermissionsSeeder::class);
    }

    public function test_super_admin_passa_qualquer_can(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin']);
        Role::create(['name' => 'super-admin', 'guard_name' => 'web']);
        $u->assignRole('super-admin');

        $this->assertTrue($u->can('painel.clientes.ver'));
        $this->assertTrue($u->can('painel.financeiro.dre'));
        $this->assertTrue($u->can('qualquer.coisa.absurda'));
    }

    public function test_usuario_sem_permissao_falha(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin']);

        $this->assertFalse($u->can('painel.clientes.ver'));
    }

    public function test_usuario_com_permissao_via_papel_passa(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin']);
        $papel = Role::create(['name' => 'Vendedor', 'guard_name' => 'web']);
        $papel->givePermissionTo('painel.clientes.ver');
        $u->assignRole('Vendedor');

        $this->assertTrue($u->can('painel.clientes.ver'));
        $this->assertFalse($u->can('painel.clientes.excluir'));
    }
}

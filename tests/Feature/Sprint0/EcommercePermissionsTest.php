<?php

namespace Tests\Feature\Sprint0;

use Database\Seeders\EcommercePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EcommercePermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_loja_roles_with_expected_permissions(): void
    {
        $this->seed(EcommercePermissionSeeder::class);

        $admin = Role::where('name', 'admin_loja')->first();
        $this->assertNotNull($admin);
        $this->assertSame(7, $admin->permissions->count());

        $operador = Role::where('name', 'operador_loja')->first();
        $this->assertNotNull($operador);
        $this->assertTrue($operador->hasPermissionTo('loja.pedidos.ver'));
        $this->assertFalse($operador->hasPermissionTo('loja.configuracoes.editar'));
    }
}

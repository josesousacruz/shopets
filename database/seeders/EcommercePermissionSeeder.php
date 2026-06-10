<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class EcommercePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'loja.pedidos.ver',
            'loja.pedidos.gerenciar',
            'loja.catalogo.editar',
            'loja.cupons.gerenciar',
            'loja.devolucoes.gerenciar',
            'loja.configuracoes.editar',
            'loja.banners.gerenciar',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'admin_loja', 'guard_name' => 'web']);
        $admin->syncPermissions($permissions);

        $operador = Role::firstOrCreate(['name' => 'operador_loja', 'guard_name' => 'web']);
        $operador->syncPermissions([
            'loja.pedidos.ver',
            'loja.pedidos.gerenciar',
            'loja.devolucoes.gerenciar',
        ]);
    }
}

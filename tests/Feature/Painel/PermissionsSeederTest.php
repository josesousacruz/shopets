<?php

namespace Tests\Feature\Painel;

use Database\Seeders\PainelPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PermissionsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeds_all_canonical_painel_permissions(): void
    {
        $this->seed(PainelPermissionsSeeder::class);

        $expected = [
            'painel.clientes.ver',
            'painel.clientes.criar',
            'painel.clientes.editar',
            'painel.clientes.excluir',
            'painel.estoque.ver',
            'painel.estoque.movimentar',
            'painel.estoque.ajustar',
            'painel.estoque.inventariar',
            'painel.fornecedores.ver',
            'painel.fornecedores.criar',
            'painel.fornecedores.editar',
            'painel.fornecedores.excluir',
            'painel.compras.ver',
            'painel.compras.criar',
            'painel.compras.receber',
            'painel.compras.cancelar',
            'painel.financeiro.ver',
            'painel.financeiro.lancar',
            'painel.financeiro.baixar',
            'painel.financeiro.conciliar',
            'painel.financeiro.dre',
            'painel.pdv.ver',
            'painel.pdv.gerenciar',
            'painel.pdv.fiscal',
            'painel.relatorios.ver',
            'painel.relatorios.exportar',
            'painel.relatorios.agendar',
            'painel.pedidos.ver',
            'painel.pedidos.gerenciar',
            'painel.pedidos.cancelar',
            'painel.produtos.ver',
            'painel.produtos.gerenciar',
            'painel.produtos.importar',
            'painel.config.ver',
            'painel.config.editar',
            'painel.config.fiscal',
            'painel.config.emails',
            'painel.usuarios.ver',
            'painel.usuarios.gerenciar',
            'painel.papeis.gerenciar',
        ];

        foreach ($expected as $perm) {
            $this->assertTrue(
                Permission::where('name', $perm)->where('guard_name', 'web')->exists(),
                "Permission missing: {$perm}"
            );
        }

        $this->assertSame(count($expected), Permission::where('name', 'like', 'painel.%')->count());
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(PainelPermissionsSeeder::class);
        $count = Permission::where('name', 'like', 'painel.%')->count();
        $this->seed(PainelPermissionsSeeder::class);
        $this->assertSame($count, Permission::where('name', 'like', 'painel.%')->count());
    }
}

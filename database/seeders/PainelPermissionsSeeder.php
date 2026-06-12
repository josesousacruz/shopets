<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Permissões canônicas do painel admin (RBAC matriz custom).
 *
 * Convenção: painel.<modulo>.<acao>.
 * Pode ser executado várias vezes — usa findOrCreate.
 */
class PainelPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $matriz = [
            'clientes' => ['ver', 'criar', 'editar', 'excluir'],
            'estoque' => ['ver', 'movimentar', 'ajustar', 'inventariar'],
            'fornecedores' => ['ver', 'criar', 'editar', 'excluir'],
            'compras' => ['ver', 'criar', 'receber', 'cancelar'],
            'financeiro' => ['ver', 'lancar', 'baixar', 'conciliar', 'dre'],
            'pdv' => ['ver', 'gerenciar', 'fiscal'],
            'relatorios' => ['ver', 'exportar', 'agendar'],
            'pedidos' => ['ver', 'gerenciar', 'cancelar'],
            'produtos' => ['ver', 'gerenciar', 'importar'],
            'config' => ['ver', 'editar', 'fiscal', 'emails'],
            'usuarios' => ['ver', 'gerenciar'],
            'papeis' => ['gerenciar'],
        ];

        foreach ($matriz as $modulo => $acoes) {
            foreach ($acoes as $acao) {
                Permission::findOrCreate("painel.{$modulo}.{$acao}", 'web');
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}

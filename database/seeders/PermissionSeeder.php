<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Criar permissões
        $permissions = [
            // Produtos
            'criar_produto',
            'editar_produto',
            'excluir_produto',
            'visualizar_produto',
            
            // Categorias
            'criar_categoria',
            'editar_categoria',
            'excluir_categoria',
            'visualizar_categoria',
            
            // Fornecedores
            'criar_fornecedor',
            'editar_fornecedor',
            'excluir_fornecedor',
            'visualizar_fornecedor',
            
            // Vendas
            'criar_venda',
            'editar_venda',
            'excluir_venda',
            'visualizar_venda',
            'cancelar_venda',
            
            // Estoque
            'visualizar_estoque',
            'ajustar_estoque',
            'movimentar_estoque',
            
            // Relatórios
            'visualizar_relatorios',
            'exportar_relatorios',
            
            // Financeiro
            'visualizar_financeiro',
            'gerenciar_fluxo_caixa',
            
            // Configurações
            'gerenciar_configuracoes',
            'gerenciar_usuarios',
            'gerenciar_permissoes',
            
            // PDV
            'acessar_pdv',
            'abrir_caixa',
            'fechar_caixa',
            
            // Pontos de Venda
            'criar_ponto_venda',
            'editar_ponto_venda',
            'excluir_ponto_venda',
            'visualizar_ponto_venda',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Criar roles
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $gerenteRole = Role::firstOrCreate(['name' => 'gerente', 'guard_name' => 'web']);
        $operadorRole = Role::firstOrCreate(['name' => 'operador', 'guard_name' => 'web']);

        // Atribuir todas as permissões ao admin
        $adminRole->givePermissionTo(Permission::all());

        // Permissões do gerente
        $gerentePermissions = [
            'criar_produto', 'editar_produto', 'visualizar_produto',
            'criar_categoria', 'editar_categoria', 'visualizar_categoria',
            'criar_fornecedor', 'editar_fornecedor', 'visualizar_fornecedor',
            'criar_venda', 'editar_venda', 'visualizar_venda', 'cancelar_venda',
            'visualizar_estoque', 'ajustar_estoque', 'movimentar_estoque',
            'visualizar_relatorios', 'exportar_relatorios',
            'visualizar_financeiro', 'gerenciar_fluxo_caixa',
            'acessar_pdv', 'abrir_caixa', 'fechar_caixa',
            'visualizar_ponto_venda',
        ];
        $gerenteRole->givePermissionTo($gerentePermissions);

        // Permissões do operador
        $operadorPermissions = [
            'visualizar_produto',
            'criar_venda', 'visualizar_venda',
            'visualizar_estoque',
            'acessar_pdv', 'abrir_caixa', 'fechar_caixa',
            'visualizar_ponto_venda',
        ];
        $operadorRole->givePermissionTo($operadorPermissions);
    }
}
<?php

/**
 * Registry declarativo de relatórios. Apenas metadados (sem closures, para
 * permanecer compatível com config:cache). A lógica de cada slug vive em
 * App\Services\Relatorios\RelatorioBuilder.
 */
return [
    'grupos' => [
        'vendas' => 'Vendas',
        'financeiro' => 'Financeiro',
        'clientes' => 'Clientes',
    ],

    'default_period_days' => 30,
    'max_rows_export' => 50000,
    'formatos' => ['csv', 'pdf', 'xlsx'],

    'relatorios' => [
        'vendas-por-periodo' => [
            'nome' => 'Vendas por período',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['data' => 'Data', 'pedidos' => 'Pedidos', 'total' => 'Total'],
        ],
        'vendas-por-produto' => [
            'nome' => 'Vendas por produto',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['produto' => 'Produto', 'quantidade' => 'Qtd', 'total' => 'Total'],
        ],
        'vendas-por-categoria' => [
            'nome' => 'Vendas por categoria',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['categoria' => 'Categoria', 'quantidade' => 'Qtd', 'total' => 'Total'],
        ],
        'vendas-por-canal' => [
            'nome' => 'Vendas por canal',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['canal' => 'Canal', 'pedidos' => 'Qtd', 'total' => 'Total'],
        ],
        'vendas-por-cupom' => [
            'nome' => 'Vendas por cupom',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['cupom' => 'Cupom', 'pedidos' => 'Pedidos', 'desconto' => 'Desconto', 'total' => 'Total'],
        ],
        'comparativo-online-vs-fisico' => [
            'nome' => 'Comparativo online vs físico',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['mes' => 'Mês', 'online' => 'Online', 'fisico' => 'Físico'],
        ],
        'vendas-por-pdv' => [
            'nome' => 'Vendas por PDV',
            'grupo' => 'vendas',
            'filtros' => ['de', 'ate'],
            'colunas' => ['pdv' => 'PDV', 'vendas' => 'Vendas', 'total' => 'Total'],
        ],
        'ap-vencidos' => [
            'nome' => 'Contas a pagar vencidas',
            'grupo' => 'financeiro',
            'filtros' => [],
            'colunas' => ['descricao' => 'Descrição', 'fornecedor' => 'Fornecedor', 'vencimento' => 'Vencimento', 'valor' => 'Valor'],
        ],
        'ar-vencidos' => [
            'nome' => 'Contas a receber vencidas',
            'grupo' => 'financeiro',
            'filtros' => [],
            'colunas' => ['descricao' => 'Descrição', 'cliente' => 'Cliente', 'vencimento' => 'Vencimento', 'valor' => 'Valor'],
        ],
        'fluxo-realizado' => [
            'nome' => 'Fluxo de caixa realizado',
            'grupo' => 'financeiro',
            'filtros' => ['de', 'ate'],
            'colunas' => ['data' => 'Data', 'entradas' => 'Entradas', 'saidas' => 'Saídas', 'saldo' => 'Saldo'],
        ],
        'fluxo-previsto' => [
            'nome' => 'Fluxo de caixa previsto',
            'grupo' => 'financeiro',
            'filtros' => ['de', 'ate'],
            'colunas' => ['data' => 'Data', 'entradas' => 'Entradas', 'saidas' => 'Saídas', 'saldo' => 'Saldo'],
        ],
        'dre-resumido' => [
            'nome' => 'DRE resumido',
            'grupo' => 'financeiro',
            'filtros' => ['de', 'ate'],
            'colunas' => ['tipo' => 'Tipo', 'plano' => 'Conta', 'total' => 'Total'],
        ],
        'novos-vs-recorrentes' => [
            'nome' => 'Clientes novos vs recorrentes',
            'grupo' => 'clientes',
            'filtros' => [],
            'colunas' => ['tipo' => 'Tipo', 'clientes' => 'Clientes'],
        ],
        'ltv-ranking' => [
            'nome' => 'Ranking de LTV',
            'grupo' => 'clientes',
            'filtros' => [],
            'colunas' => ['cliente' => 'Cliente', 'pedidos' => 'Pedidos', 'total' => 'Total gasto'],
        ],
        'inativos' => [
            'nome' => 'Clientes inativos',
            'grupo' => 'clientes',
            'filtros' => ['dias'],
            'colunas' => ['cliente' => 'Cliente', 'email' => 'E-mail', 'ultima_compra' => 'Última compra'],
        ],
    ],
];

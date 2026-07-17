<?php

use App\Http\Controllers\Admin\LojaPedidoController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ContaPagarController;
use App\Http\Controllers\ContaReceberController;
use App\Http\Controllers\EstoqueController;
use App\Http\Controllers\FinanceiroController;
use App\Http\Controllers\FluxoCaixaController;
use App\Http\Controllers\FornecedorController;
use App\Http\Controllers\NfceController;
use App\Http\Controllers\PDVController;
use App\Http\Controllers\RelatorioController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Redireciona a raiz para o PDV
Route::get('/', function () {
    return redirect()->route('pdv');
})->name('home');

Route::middleware('auth')->group(function () {
    // PDV - Ponto de Venda
    Route::get('/pdv', [PDVController::class, 'index'])->name('pdv');
    Route::get('/pdv/products', [PDVController::class, 'getProducts'])->name('pdv.products');
    Route::get('/pdv/cupom/{id}', [PDVController::class, 'getCupomDados'])->name('pdv.cupom');
    Route::get('/pdv/vendas/recentes', [PDVController::class, 'getRecentSales'])->name('pdv.vendas.recentes');
    Route::get('/estoque/produto/{id}/vendas', [PDVController::class, 'getSalesByProduct'])->name('estoque.produto.vendas');
    Route::get('/vendas/{id}/itens', [PDVController::class, 'getSaleItems'])->name('vendas.itens');
    Route::post('/vendas/{id}/devolucao', [PDVController::class, 'processDevolucao'])->name('vendas.devolucao');
    Route::post('/vendas/{id}/devolucao/finalizar', [PDVController::class, 'finalizarDevolucaoTroca'])->name('vendas.devolucao.finalizar');
    Route::post('/vendas/{id}/troca/finalizar', [PDVController::class, 'finalizarTroca'])->name('vendas.troca.finalizar');
    Route::get('/formas-pagamento/ativas', [PDVController::class, 'getActiveFormasPagamento'])->name('formas-pagamento.ativas');
    Route::get('/csrf-token', [PDVController::class, 'getCsrfToken'])->name('csrf-token');
    Route::post('/sales', [PDVController::class, 'storeSale'])->name('sales.store');
    Route::post('/sales/finalizar', [PDVController::class, 'finalizarVenda'])->name('sales.finalizar');
    Route::post('/sales/cancelar', [PDVController::class, 'cancelarVenda'])->name('sales.cancelar');

    // Caixa — sessão de abertura/fechamento/sangria (opcional, ver caixa_modo_sessao).
    Route::get('/caixa/status', [\App\Http\Controllers\CaixaSessaoController::class, 'status'])->name('caixa.status');
    Route::post('/caixa/abrir', [\App\Http\Controllers\CaixaSessaoController::class, 'abrir'])->name('caixa.abrir');
    Route::post('/caixa/movimento', [\App\Http\Controllers\CaixaSessaoController::class, 'movimento'])->name('caixa.movimento');
    Route::post('/caixa/fechar', [\App\Http\Controllers\CaixaSessaoController::class, 'fechar'])->name('caixa.fechar');

    Route::get('/estoque', [EstoqueController::class, 'index'])->name('estoque.index');
    Route::post('/estoque', [EstoqueController::class, 'store'])->name('estoque.store');
    Route::put('/estoque/{id}', [EstoqueController::class, 'update'])->name('estoque.update');
    Route::delete('/estoque/{id}', [EstoqueController::class, 'destroy'])->name('estoque.destroy');
    Route::post('/estoque/add-stock', [EstoqueController::class, 'addStock'])->name('estoque.add-stock');

    // Rotas para estatísticas de estoque
    Route::get('/estoque/statistics/product/{productId}', [EstoqueController::class, 'getProductStatistics'])->name('estoque.statistics.product');
    Route::get('/estoque/statistics/supplier/{supplierId}', [EstoqueController::class, 'getSupplierStatistics'])->name('estoque.statistics.supplier');
    Route::get('/estoque/history/{productId}', [EstoqueController::class, 'getStockHistory'])->name('estoque.history');
    Route::get('/estoque/latest-entries', [EstoqueController::class, 'getLatestStockEntries'])->name('estoque.latest-entries');

    // Rotas para categorias
    Route::post('/estoque/categories', [EstoqueController::class, 'storeCategory'])->name('estoque.categories.store');
    Route::put('/estoque/categories/{id}', [EstoqueController::class, 'updateCategory'])->name('estoque.categories.update');
    Route::delete('/estoque/categories/{id}', [EstoqueController::class, 'destroyCategory'])->name('estoque.categories.destroy');

    Route::get('/fornecedores', [FornecedorController::class, 'index'])->name('fornecedores.index');
    Route::post('/fornecedores', [FornecedorController::class, 'store'])->name('fornecedores.store');
    Route::put('/fornecedores/{id}', [FornecedorController::class, 'update'])->name('fornecedores.update');
    Route::delete('/fornecedores/{id}', [FornecedorController::class, 'destroy'])->name('fornecedores.destroy');
    Route::patch('/fornecedores/{id}/reactivate', [FornecedorController::class, 'reactivate'])->name('fornecedores.reactivate');

    Route::get('/clientes', [ClienteController::class, 'index'])->name('clientes.index');
    Route::post('/clientes', [ClienteController::class, 'store'])->name('clientes.store');
    Route::put('/clientes/{id}', [ClienteController::class, 'update'])->name('clientes.update');
    Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])->name('clientes.destroy');
    Route::patch('/clientes/{id}/toggle-status', [ClienteController::class, 'toggleStatus'])->name('clientes.toggle-status');
    Route::post('/clientes/loyalty-transaction', [ClienteController::class, 'addLoyaltyTransaction'])->name('clientes.loyalty-transaction');
    Route::post('/clientes/redeem-points', [ClienteController::class, 'redeemLoyaltyPoints'])->name('clientes.redeem-points');

    Route::get('/financeiro', [FinanceiroController::class, 'index'])->name('financeiro.index');

    // Rotas específicas para Contas a Pagar
    Route::get('/financeiro/contas-pagar', [ContaPagarController::class, 'index'])->name('contas-pagar.index');
    Route::post('/financeiro/contas-pagar', [ContaPagarController::class, 'store'])->name('contas-pagar.store');
    Route::put('/financeiro/contas-pagar/{contaPagar}', [ContaPagarController::class, 'update'])->name('contas-pagar.update');
    Route::delete('/financeiro/contas-pagar/{contaPagar}', [ContaPagarController::class, 'destroy'])->name('contas-pagar.destroy');
    Route::put('/financeiro/contas-pagar/{contaPagar}/pagar', [ContaPagarController::class, 'pagar'])->name('contas-pagar.pagar');
    Route::put('/financeiro/contas-pagar/{contaPagar}/cancelar', [ContaPagarController::class, 'cancelar'])->name('contas-pagar.cancelar');

    // Rotas específicas para Contas a Receber
    Route::get('/contas-receber', [ContaReceberController::class, 'index'])->name('contas-receber.index');
    Route::get('/contas-receber/create', [ContaReceberController::class, 'create'])->name('contas-receber.create');
    Route::get('/contas-receber/{contaReceber}', [ContaReceberController::class, 'show'])->name('contas-receber.show');
    Route::get('/contas-receber/{contaReceber}/edit', [ContaReceberController::class, 'edit'])->name('contas-receber.edit');
    Route::post('/contas-receber', [ContaReceberController::class, 'store'])->name('contas-receber.store');
    Route::put('/contas-receber/{contaReceber}', [ContaReceberController::class, 'update'])->name('contas-receber.update');
    Route::delete('/contas-receber/{contaReceber}', [ContaReceberController::class, 'destroy'])->name('contas-receber.destroy');
    Route::put('/contas-receber/{contaReceber}/receber', [ContaReceberController::class, 'receber'])->name('contas-receber.receber');

    // Rotas para Fluxo de Caixa
    Route::get('/fluxo-caixa', [FluxoCaixaController::class, 'index'])->name('fluxo-caixa.index');
    Route::post('/fluxo-caixa', [FluxoCaixaController::class, 'store'])->name('fluxo-caixa.store');
    Route::put('/fluxo-caixa/{fluxoCaixa}', [FluxoCaixaController::class, 'update'])->name('fluxo-caixa.update');
    Route::delete('/fluxo-caixa/{fluxoCaixa}', [FluxoCaixaController::class, 'destroy'])->name('fluxo-caixa.destroy');
    Route::get('/fluxo-caixa/dados-grafico', [FluxoCaixaController::class, 'getDadosGrafico'])->name('fluxo-caixa.dados-grafico');

    Route::get('/relatorios', [RelatorioController::class, 'index'])->name('relatorios.index');
    Route::get('/relatorios/fechamento-dia', [RelatorioController::class, 'fechamentoDia'])->name('relatorios.fechamento-dia');

    // Loja / Pedidos do ecommerce (painel do lojista)
    Route::prefix('admin/loja')->name('admin.loja.')->group(function () {
        Route::get('/pedidos', [LojaPedidoController::class, 'index'])->name('pedidos.index');
        Route::get('/pedidos/{pedido:numero}', [LojaPedidoController::class, 'show'])->name('pedidos.show');
        Route::put('/pedidos/{pedido:numero}/separacao', [LojaPedidoController::class, 'marcarEmSeparacao'])->name('pedidos.separacao');
        Route::put('/pedidos/{pedido:numero}/enviar', [LojaPedidoController::class, 'marcarEnviado'])->name('pedidos.enviar');
        Route::put('/pedidos/{pedido:numero}/entregar', [LojaPedidoController::class, 'marcarEntregue'])->name('pedidos.entregar');
        Route::put('/pedidos/{pedido:numero}/cancelar', [LojaPedidoController::class, 'cancelar'])->name('pedidos.cancelar');
    });
});
Route::post('/nfce/emitir', [NfceController::class, 'emitir']);

// Callback OAuth2 do Melhor Envio (navegação do browser; protegido por `state`).
Route::get('/painel/integracoes/melhor-envio/callback', [\App\Http\Controllers\Api\V1\Painel\MelhorEnvioIntegracaoController::class, 'callback'])
    ->name('painel.integracoes.melhor-envio.callback');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

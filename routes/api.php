<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ProdutoController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\CepController;
use App\Http\Controllers\Api\V1\EnderecoController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Rotas para categorias
Route::apiResource('categorias', CategoriaController::class);

// Rotas para produtos
Route::apiResource('produtos', ProdutoController::class);

// Rota adicional para produtos por categoria
Route::get('produtos/categoria/{categoria}', [ProdutoController::class, 'byCategory']);

// Storefront público (v1) — sem autenticação
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/produtos', [\App\Http\Controllers\Api\V1\Storefront\ProdutoController::class, 'index'])
        ->name('produtos.index');
    Route::get('/produtos/{slug}', [\App\Http\Controllers\Api\V1\Storefront\ProdutoController::class, 'show'])
        ->name('produtos.show');
    Route::get('/categorias', [\App\Http\Controllers\Api\V1\Storefront\CategoriaController::class, 'index'])
        ->name('categorias.index');
    Route::get('/busca', \App\Http\Controllers\Api\V1\Storefront\BuscaController::class)
        ->name('busca');
    Route::get('/banners', [\App\Http\Controllers\Api\V1\Storefront\BannerController::class, 'index'])
        ->name('banners.index');

    // Pontos de retirada habilitados (público — para o checkout).
    Route::get('/pontos-retirada', [\App\Http\Controllers\Api\V1\PontoRetiradaController::class, 'index'])
        ->name('pontos-retirada.index');

    // Autenticação de clientes (token-based / Sanctum)
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
        Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:4,1');
        Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:6,1');

        Route::middleware(['auth:sanctum', 'cliente'])->group(function () {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    // ViaCEP (público, server-side)
    Route::get('/cep/{cep}', CepController::class)->middleware('throttle:30,1');

    // Carrinho (público — identifica por header X-Cart-Token OU Bearer cliente)
    Route::get('/carrinho', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'show']);
    Route::post('/carrinho/itens', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'adicionar']);
    Route::put('/carrinho/itens/{item}', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'atualizar']);
    Route::delete('/carrinho/itens/{item}', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'remover']);
    Route::post('/carrinho/cupom', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'aplicarCupom'])
        ->middleware('throttle:20,1');
    Route::delete('/carrinho/cupom', [\App\Http\Controllers\Api\V1\CarrinhoController::class, 'removerCupom']);

    // Cotação de frete (público; usa carrinho se itens omitidos)
    Route::post('/frete/cotar', [\App\Http\Controllers\Api\V1\FreteController::class, 'cotar']);

    // Webhook de pagamento (público — sem auth; valida assinatura quando MP real)
    Route::post('/webhooks/pagamento', \App\Http\Controllers\Api\V1\WebhookPagamentoController::class)
        ->middleware('throttle:60,1')
        ->name('webhooks.pagamento');

    // DEV: aprovação manual de pagamento (só local ou driver=fake)
    Route::post('/dev/pagamentos/{gatewayId}/aprovar', [\App\Http\Controllers\Api\V1\PagamentoController::class, 'aprovarDev'])
        ->name('dev.pagamentos.aprovar');

    // Endereços do cliente (escopado por auth:sanctum + garante Cliente)
    Route::middleware(['auth:sanctum', 'cliente'])->group(function () {
        Route::apiResource('enderecos', EnderecoController::class)->except(['show']);

        // Checkout + pedidos (escopados ao cliente)
        Route::post('/checkout/iniciar', [\App\Http\Controllers\Api\V1\CheckoutController::class, 'iniciar'])
            ->middleware('throttle:30,1');
        Route::get('/pedidos', [\App\Http\Controllers\Api\V1\PedidoController::class, 'index']);
        Route::get('/pedidos/{numero}', [\App\Http\Controllers\Api\V1\PedidoController::class, 'show']);
        Route::post('/pedidos/{numero}/pagar', [\App\Http\Controllers\Api\V1\PagamentoController::class, 'pagar']);

        // Devoluções (cliente, escopadas ao próprio pedido)
        Route::get('/pedidos/{numero}/devolucoes', [\App\Http\Controllers\Api\V1\DevolucaoController::class, 'index']);
        Route::post('/pedidos/{numero}/devolucao', [\App\Http\Controllers\Api\V1\DevolucaoController::class, 'store'])
            ->middleware('throttle:10,1');
    });

    // ----------------------------------------------------------------
    // Painel do Lojista (admin) — autentica User do PDV via Sanctum
    // ----------------------------------------------------------------
    Route::prefix('painel')->name('painel.')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('/login', [\App\Http\Controllers\Api\V1\Painel\AuthController::class, 'login'])
                ->middleware('throttle:6,1');

            Route::middleware(['auth:sanctum', 'admin'])->group(function () {
                Route::post('/logout', [\App\Http\Controllers\Api\V1\Painel\AuthController::class, 'logout']);
                Route::get('/me', [\App\Http\Controllers\Api\V1\Painel\AuthController::class, 'me']);
            });
        });

        Route::middleware(['auth:sanctum', 'admin'])->group(function () {
            // Pedidos
            Route::get('/pedidos', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'index']);
            Route::get('/pedidos/{numero}', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'show']);
            Route::post('/pedidos/{numero}/separacao', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'separacao']);
            Route::post('/pedidos/{numero}/enviar', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'enviar']);
            Route::post('/pedidos/{numero}/entregar', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'entregar']);
            Route::post('/pedidos/{numero}/retirar', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'retirar']);
            Route::post('/pedidos/{numero}/cancelar', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'cancelar']);
            Route::post('/pedidos/{numero}/etiqueta', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'etiqueta']);

            // Catálogo — produtos
            Route::get('/produtos', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'index']);
            Route::post('/produtos', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'store']);
            Route::get('/produtos/{id}', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'show']);
            Route::put('/produtos/{id}', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'update']);
            Route::delete('/produtos/{id}', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'destroy']);

            // Fotos do produto (Spatie MediaLibrary)
            Route::post('/produtos/{id}/fotos', [\App\Http\Controllers\Api\V1\Painel\ProdutoFotoController::class, 'store']);
            Route::put('/produtos/{id}/fotos/ordem', [\App\Http\Controllers\Api\V1\Painel\ProdutoFotoController::class, 'ordem']);
            Route::delete('/produtos/{id}/fotos/{media}', [\App\Http\Controllers\Api\V1\Painel\ProdutoFotoController::class, 'destroy']);

            // Variações do produto
            Route::get('/produtos/{id}/variacoes', [\App\Http\Controllers\Api\V1\Painel\ProdutoVariacaoController::class, 'index']);
            Route::post('/produtos/{id}/variacoes', [\App\Http\Controllers\Api\V1\Painel\ProdutoVariacaoController::class, 'store']);
            Route::put('/produtos/{id}/variacoes/{variacao}', [\App\Http\Controllers\Api\V1\Painel\ProdutoVariacaoController::class, 'update']);
            Route::delete('/produtos/{id}/variacoes/{variacao}', [\App\Http\Controllers\Api\V1\Painel\ProdutoVariacaoController::class, 'destroy']);

            // Catálogo — categorias
            Route::get('/categorias', [\App\Http\Controllers\Api\V1\Painel\CategoriaAdminController::class, 'index']);
            Route::post('/categorias', [\App\Http\Controllers\Api\V1\Painel\CategoriaAdminController::class, 'store']);
            Route::get('/categorias/{id}', [\App\Http\Controllers\Api\V1\Painel\CategoriaAdminController::class, 'show']);
            Route::put('/categorias/{id}', [\App\Http\Controllers\Api\V1\Painel\CategoriaAdminController::class, 'update']);
            Route::delete('/categorias/{id}', [\App\Http\Controllers\Api\V1\Painel\CategoriaAdminController::class, 'destroy']);

            // Banners da home
            Route::get('/banners', [\App\Http\Controllers\Api\V1\Painel\BannerController::class, 'index']);
            Route::post('/banners', [\App\Http\Controllers\Api\V1\Painel\BannerController::class, 'store']);
            Route::get('/banners/{id}', [\App\Http\Controllers\Api\V1\Painel\BannerController::class, 'show']);
            Route::put('/banners/{id}', [\App\Http\Controllers\Api\V1\Painel\BannerController::class, 'update']);
            Route::delete('/banners/{id}', [\App\Http\Controllers\Api\V1\Painel\BannerController::class, 'destroy']);

            // Cupons
            Route::get('/cupons', [\App\Http\Controllers\Api\V1\Painel\CupomController::class, 'index']);
            Route::post('/cupons', [\App\Http\Controllers\Api\V1\Painel\CupomController::class, 'store']);
            Route::get('/cupons/{id}', [\App\Http\Controllers\Api\V1\Painel\CupomController::class, 'show']);
            Route::put('/cupons/{id}', [\App\Http\Controllers\Api\V1\Painel\CupomController::class, 'update']);
            Route::delete('/cupons/{id}', [\App\Http\Controllers\Api\V1\Painel\CupomController::class, 'destroy']);

            // Pontos de venda (toggle retirada por PDV)
            Route::get('/pontos-venda', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'index']);
            Route::put('/pontos-venda/{id}', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'update']);

            // Devoluções (fila + transições)
            Route::get('/devolucoes', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'index']);
            Route::get('/devolucoes/{id}', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'show']);
            Route::put('/devolucoes/{id}/aprovar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'aprovar']);
            Route::put('/devolucoes/{id}/rejeitar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'rejeitar']);
            Route::put('/devolucoes/{id}/receber', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'receber']);
            Route::put('/devolucoes/{id}/reembolsar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'reembolsar']);

            // Configurações da loja
            Route::get('/configuracoes', [\App\Http\Controllers\Api\V1\Painel\ConfiguracaoController::class, 'show']);
            Route::put('/configuracoes', [\App\Http\Controllers\Api\V1\Painel\ConfiguracaoController::class, 'update']);

            // RBAC — Permissões e Papéis (matriz custom)
            Route::get('/permissoes', [\App\Http\Controllers\Api\V1\Painel\PermissaoAdminController::class, 'index']);
            Route::apiResource('papeis', \App\Http\Controllers\Api\V1\Painel\PapelAdminController::class)
                ->parameters(['papeis' => 'papel']);
        });
    });
});
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
            Route::put('/pedidos/{numero}/rastreio', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'atualizarRastreio']);
            Route::get('/pedidos/{numero}/mensagens', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'mensagens']);
            Route::post('/pedidos/{numero}/mensagens', [\App\Http\Controllers\Api\V1\Painel\PedidoAdminController::class, 'enviarMensagem']);

            // Revisão fiscal — pedidos com NF-e/NFC-e que falhou na emissão.
            Route::get('/revisao-fiscal', [\App\Http\Controllers\Api\V1\Painel\RevisaoFiscalAdminController::class, 'index']);
            Route::post('/revisao-fiscal/{numero}/reemitir', [\App\Http\Controllers\Api\V1\Painel\RevisaoFiscalAdminController::class, 'reemitir']);

            // Catálogo — produtos
            Route::get('/produtos', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'index']);
            Route::post('/produtos/bulk', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'bulk']);
            Route::get('/produtos/import/template', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'importTemplate']);
            Route::post('/produtos/import', [\App\Http\Controllers\Api\V1\Painel\ProdutoAdminController::class, 'import']);
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
            Route::post('/pontos-venda', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'store']);
            Route::get('/pontos-venda/{id}', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'show']);
            Route::put('/pontos-venda/{id}', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'update']);
            Route::delete('/pontos-venda/{id}', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'destroy']);
            Route::post('/pontos-venda/{id}/operadores', [\App\Http\Controllers\Api\V1\Painel\PontoVendaAdminController::class, 'syncOperadores']);

            // Devoluções (fila + transições)
            Route::get('/devolucoes', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'index']);
            Route::get('/devolucoes/{id}', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'show']);
            Route::put('/devolucoes/{id}/aprovar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'aprovar']);
            Route::put('/devolucoes/{id}/rejeitar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'rejeitar']);
            Route::put('/devolucoes/{id}/receber', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'receber']);
            Route::put('/devolucoes/{id}/reembolsar', [\App\Http\Controllers\Api\V1\Painel\DevolucaoAdminController::class, 'reembolsar']);

            // Configurações da loja
            // Métodos de envio
            Route::get('/metodos-envio', [\App\Http\Controllers\Api\V1\Painel\MetodoEnvioAdminController::class, 'index']);
            Route::post('/metodos-envio', [\App\Http\Controllers\Api\V1\Painel\MetodoEnvioAdminController::class, 'store']);
            Route::put('/metodos-envio/{id}', [\App\Http\Controllers\Api\V1\Painel\MetodoEnvioAdminController::class, 'update']);
            Route::delete('/metodos-envio/{id}', [\App\Http\Controllers\Api\V1\Painel\MetodoEnvioAdminController::class, 'destroy']);

            // Templates de e-mail
            Route::get('/templates-email', [\App\Http\Controllers\Api\V1\Painel\TemplateEmailAdminController::class, 'index']);
            Route::post('/templates-email', [\App\Http\Controllers\Api\V1\Painel\TemplateEmailAdminController::class, 'store']);
            Route::put('/templates-email/{id}', [\App\Http\Controllers\Api\V1\Painel\TemplateEmailAdminController::class, 'update']);
            Route::delete('/templates-email/{id}', [\App\Http\Controllers\Api\V1\Painel\TemplateEmailAdminController::class, 'destroy']);
            Route::get('/templates-email/{id}/preview', [\App\Http\Controllers\Api\V1\Painel\TemplateEmailAdminController::class, 'preview']);

            Route::get('/configuracoes', [\App\Http\Controllers\Api\V1\Painel\ConfiguracaoController::class, 'show']);
            Route::put('/configuracoes', [\App\Http\Controllers\Api\V1\Painel\ConfiguracaoController::class, 'update']);
            Route::post('/configuracoes/certificado', [\App\Http\Controllers\Api\V1\Painel\ConfiguracaoController::class, 'uploadCertificado']);

            // Integração Melhor Envio (OAuth2) — status/connect/disconnect
            Route::get('/integracoes/melhor-envio', [\App\Http\Controllers\Api\V1\Painel\MelhorEnvioIntegracaoController::class, 'status']);
            Route::post('/integracoes/melhor-envio/connect', [\App\Http\Controllers\Api\V1\Painel\MelhorEnvioIntegracaoController::class, 'connect']);
            Route::delete('/integracoes/melhor-envio', [\App\Http\Controllers\Api\V1\Painel\MelhorEnvioIntegracaoController::class, 'disconnect']);

            // RBAC — Permissões e Papéis (matriz custom)
            Route::get('/permissoes', [\App\Http\Controllers\Api\V1\Painel\PermissaoAdminController::class, 'index']);
            Route::apiResource('papeis', \App\Http\Controllers\Api\V1\Painel\PapelAdminController::class)
                ->parameters(['papeis' => 'papel']);

            // Usuários do painel
            Route::apiResource('usuarios', \App\Http\Controllers\Api\V1\Painel\UsuarioAdminController::class)
                ->parameters(['usuarios' => 'usuario']);
            Route::post('/usuarios/{usuario}/toggle', [\App\Http\Controllers\Api\V1\Painel\UsuarioAdminController::class, 'toggle']);

            // Estoque
            Route::get('/estoque', [\App\Http\Controllers\Api\V1\Painel\EstoqueAdminController::class, 'index'])->middleware('pdv.scope');
            Route::get('/estoque/depositos', [\App\Http\Controllers\Api\V1\Painel\EstoqueAdminController::class, 'depositos']);
            Route::post('/estoque/ajuste', [\App\Http\Controllers\Api\V1\Painel\EstoqueAdminController::class, 'ajustar']);
            Route::post('/estoque/transferencias', [\App\Http\Controllers\Api\V1\Painel\EstoqueAdminController::class, 'transferir']);
            Route::get('/estoque/kardex/{variacao}', [\App\Http\Controllers\Api\V1\Painel\EstoqueAdminController::class, 'kardex']);

            // Inventário
            Route::get('/inventarios', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'index']);
            Route::post('/inventarios', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'store']);
            Route::get('/inventarios/{inventario}', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'show']);
            Route::post('/inventarios/{inventario}/contagens', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'registrarContagem']);
            Route::post('/inventarios/{inventario}/concluir', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'concluir']);
            Route::post('/inventarios/{inventario}/cancelar', [\App\Http\Controllers\Api\V1\Painel\InventarioAdminController::class, 'cancelar']);

            // Curva ABC
            Route::get('/relatorios/curva-abc', [\App\Http\Controllers\Api\V1\Painel\CurvaAbcController::class, 'index']);

            // Fornecedores
            Route::get('/fornecedores', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'index']);
            Route::post('/fornecedores', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'store']);
            Route::get('/fornecedores/{id}', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'show']);
            Route::put('/fornecedores/{id}', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'update']);
            Route::delete('/fornecedores/{id}', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'destroy']);
            Route::get('/fornecedores/{id}/produtos', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'produtos']);
            Route::post('/fornecedores/{id}/produtos', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'vincularProduto']);
            Route::delete('/fornecedores/{id}/produtos/{produto}', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'desvincularProduto']);
            Route::get('/fornecedores/{id}/historico', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'historico']);
            Route::get('/fornecedores/{id}/documentos', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'documentos']);
            Route::post('/fornecedores/{id}/documentos', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'anexarDocumento']);
            Route::delete('/fornecedores/{id}/documentos/{media}', [\App\Http\Controllers\Api\V1\Painel\FornecedorAdminController::class, 'removerDocumento']);

            // Pedidos de Compra (PO)
            Route::get('/compras/sugestao-reposicao', \App\Http\Controllers\Api\V1\Painel\SugestaoReposicaoController::class);
            Route::get('/compras', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'index']);
            Route::post('/compras', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'store']);
            Route::get('/compras/{id}', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'show']);
            Route::put('/compras/{id}', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'update']);
            Route::delete('/compras/{id}', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'destroy']);
            Route::post('/compras/{id}/enviar', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'enviar']);
            Route::post('/compras/{id}/receber', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'receber']);
            Route::post('/compras/{id}/cancelar', [\App\Http\Controllers\Api\V1\Painel\PedidoCompraAdminController::class, 'cancelar']);

            // Financeiro — Plano de contas
            Route::get('/financeiro/plano-contas', [\App\Http\Controllers\Api\V1\Painel\PlanoContaAdminController::class, 'index']);
            Route::post('/financeiro/plano-contas', [\App\Http\Controllers\Api\V1\Painel\PlanoContaAdminController::class, 'store']);
            Route::put('/financeiro/plano-contas/{id}', [\App\Http\Controllers\Api\V1\Painel\PlanoContaAdminController::class, 'update']);
            Route::post('/financeiro/plano-contas/{id}/mover', [\App\Http\Controllers\Api\V1\Painel\PlanoContaAdminController::class, 'mover']);
            Route::delete('/financeiro/plano-contas/{id}', [\App\Http\Controllers\Api\V1\Painel\PlanoContaAdminController::class, 'destroy']);

            // Financeiro — Contas bancárias
            Route::get('/financeiro/contas-bancarias', [\App\Http\Controllers\Api\V1\Painel\ContaBancariaAdminController::class, 'index']);
            Route::post('/financeiro/contas-bancarias', [\App\Http\Controllers\Api\V1\Painel\ContaBancariaAdminController::class, 'store']);
            Route::put('/financeiro/contas-bancarias/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaBancariaAdminController::class, 'update']);
            Route::delete('/financeiro/contas-bancarias/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaBancariaAdminController::class, 'destroy']);

            // Financeiro — Contas a pagar
            Route::get('/financeiro/contas-pagar', [\App\Http\Controllers\Api\V1\Painel\ContaPagarAdminController::class, 'index']);
            Route::post('/financeiro/contas-pagar', [\App\Http\Controllers\Api\V1\Painel\ContaPagarAdminController::class, 'store']);
            Route::put('/financeiro/contas-pagar/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaPagarAdminController::class, 'update']);
            Route::post('/financeiro/contas-pagar/{id}/baixar', [\App\Http\Controllers\Api\V1\Painel\ContaPagarAdminController::class, 'baixar']);
            Route::delete('/financeiro/contas-pagar/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaPagarAdminController::class, 'destroy']);

            // Financeiro — Contas a receber
            Route::get('/financeiro/contas-receber', [\App\Http\Controllers\Api\V1\Painel\ContaReceberAdminController::class, 'index']);
            Route::post('/financeiro/contas-receber', [\App\Http\Controllers\Api\V1\Painel\ContaReceberAdminController::class, 'store']);
            Route::put('/financeiro/contas-receber/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaReceberAdminController::class, 'update']);
            Route::post('/financeiro/contas-receber/{id}/baixar', [\App\Http\Controllers\Api\V1\Painel\ContaReceberAdminController::class, 'baixar']);
            Route::delete('/financeiro/contas-receber/{id}', [\App\Http\Controllers\Api\V1\Painel\ContaReceberAdminController::class, 'destroy']);

            // Financeiro — Fluxo de caixa / DRE
            Route::get('/financeiro/fluxo-caixa', [\App\Http\Controllers\Api\V1\Painel\FluxoCaixaAdminController::class, 'index']);
            Route::get('/financeiro/dre', [\App\Http\Controllers\Api\V1\Painel\DREAdminController::class, 'index']);

            // Financeiro — Conciliação OFX
            Route::get('/financeiro/conciliacao/linhas', [\App\Http\Controllers\Api\V1\Painel\ConciliacaoOfxController::class, 'linhas']);
            Route::post('/financeiro/conciliacao', [\App\Http\Controllers\Api\V1\Painel\ConciliacaoOfxController::class, 'store']);
            Route::get('/financeiro/conciliacao/{linha}/sugestoes', [\App\Http\Controllers\Api\V1\Painel\ConciliacaoOfxController::class, 'sugestoes']);
            Route::post('/financeiro/conciliacao/{linha}/match', [\App\Http\Controllers\Api\V1\Painel\ConciliacaoOfxController::class, 'aplicar']);

            // Dashboard — agregações
            Route::get('/dashboard/serie-vendas', [\App\Http\Controllers\Api\V1\Painel\DashboardAdminController::class, 'serieVendas']);
            Route::get('/dashboard/top-produtos', [\App\Http\Controllers\Api\V1\Painel\DashboardAdminController::class, 'topProdutos']);
            Route::get('/dashboard/top-categorias', [\App\Http\Controllers\Api\V1\Painel\DashboardAdminController::class, 'topCategorias']);
            Route::get('/dashboard/kpis', [\App\Http\Controllers\Api\V1\Painel\DashboardAdminController::class, 'kpis']);

            // Relatórios (rotas específicas ANTES do {slug} dinâmico)
            Route::get('/relatorios', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'index']);
            Route::post('/relatorios/favoritos', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'favoritar']);
            Route::delete('/relatorios/favoritos/{id}', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'removerFavorito']);
            Route::get('/relatorios/agendamentos', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'agendamentos']);
            Route::post('/relatorios/agendamentos', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'agendar']);
            Route::delete('/relatorios/agendamentos/{id}', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'removerAgendamento']);
            Route::get('/relatorios/{slug}/export', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'export']);
            Route::get('/relatorios/{slug}', [\App\Http\Controllers\Api\V1\Painel\RelatorioAdminController::class, 'show']);

            // Clientes
            Route::get('/clientes', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'index']);
            Route::post('/clientes', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'store']);
            Route::get('/clientes-export', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'export']);
            Route::get('/clientes/{cliente}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'show'])
                ->scopeBindings();
            Route::put('/clientes/{cliente}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'update']);
            Route::post('/clientes/{cliente}/toggle', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'toggle']);
            Route::delete('/clientes/{cliente}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'destroy']);
            Route::post('/clientes/{cliente}/notas', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'storeNota']);
            Route::delete('/clientes/{cliente}/notas/{nota}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'destroyNota']);
            Route::post('/clientes/{cliente}/tags', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'syncTags']);
            Route::post('/clientes/{cliente}/email', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'enviarEmail']);
            Route::post('/clientes/{cliente}/cupom', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'gerarCupom']);
            Route::get('/cliente-tags', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'tagsIndex']);
            Route::post('/cliente-tags', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'tagsStore']);
            Route::delete('/cliente-tags/{tag}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'tagsDestroy']);
            Route::get('/segmentos-clientes', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'segmentosIndex']);
            Route::post('/segmentos-clientes', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'segmentosStore']);
            Route::delete('/segmentos-clientes/{segmento}', [\App\Http\Controllers\Api\V1\Painel\ClienteAdminController::class, 'segmentosDestroy']);

            // Busca global ⌘K
            Route::get('/busca', \App\Http\Controllers\Api\V1\Painel\BuscaGlobalController::class);

            // Notificações in-app
            Route::get('/notificacoes', [\App\Http\Controllers\Api\V1\Painel\NotificacaoAdminController::class, 'index']);
            Route::get('/notificacoes/summary', [\App\Http\Controllers\Api\V1\Painel\NotificacaoAdminController::class, 'summary']);
            Route::post('/notificacoes/marcar-todas-lidas', [\App\Http\Controllers\Api\V1\Painel\NotificacaoAdminController::class, 'marcarTodasLidas']);
            Route::post('/notificacoes/{notificacao}/marcar-lida', [\App\Http\Controllers\Api\V1\Painel\NotificacaoAdminController::class, 'marcarLida']);
        });
    });
});
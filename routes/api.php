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

    // Endereços do cliente (escopado por auth:sanctum + garante Cliente)
    Route::middleware(['auth:sanctum', 'cliente'])->group(function () {
        Route::apiResource('enderecos', EnderecoController::class)->except(['show']);
    });
});
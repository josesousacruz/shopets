<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ProdutoController;

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
});
<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PDVController extends Controller
{
    /**
     * Display the PDV page.
     */
    public function index(): Response
    {
        // Carrega produtos ativos com suas categorias
        $produtos = Produto::with('categoria')
            ->where('ativo', true)
            ->orderBy('nome')
            ->get();

        // Carrega categorias ativas
        $categorias = Categoria::where('ativo', true)
            ->orderBy('nome')
            ->get();

        // Transforma os dados para o formato esperado pelo frontend
        $products = $produtos->map(function ($produto) {
            return [
                'id' => $produto->id_produto,
                'name' => $produto->nome,
                'price' => (float) $produto->preco_venda,
                'stock' => (int) $produto->estoque_atual,
                'category' => $produto->categoria ? $produto->categoria->nome : 'Sem categoria',
                'categoryId' => $produto->id_categoria,
                'barcode' => $produto->codigo_barras,
                'internalCode' => $produto->codigo_interno,
                'description' => $produto->descricao,
                'unit' => $produto->unidade,
                'allowFraction' => (bool) $produto->permite_fracao,
                'image' => null // Por enquanto sem imagem
            ];
        });

        $categories = $categorias->map(function ($categoria) {
            return [
                'id' => $categoria->id_categoria,
                'name' => $categoria->nome,
                'description' => $categoria->descricao,
                'color' => $categoria->cor
            ];
        });

        return Inertia::render('Pdv/Index', [
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    /**
     * Store a new sale.
     */
    public function storeSale(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.price' => 'required|numeric|min:0.01',
            'total' => 'required|numeric|min:0.01',
            'paymentMethod' => 'required|string',
            'customerId' => 'nullable|integer',
            'discount' => 'nullable|numeric|min:0',
        ]);

        // Aqui você salvaria a venda no banco de dados
        // Por enquanto, vamos apenas simular o sucesso
        $saleId = rand(1000, 9999); // ID fictício
        
        return back()->with('success', "Venda #{$saleId} realizada com sucesso!");
    }
}
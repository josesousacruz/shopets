<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProdutoController extends Controller
{
    public function index()
    {
        $produtos = Produto::with('categoria', 'media')
            ->paginate(10);

        return Inertia::render('Produtos/Index', [
            'produtos' => $produtos
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nome' => 'required|string|max:255',
            'preco' => 'required|numeric|min:0',
            'categoria_id' => 'required|exists:categorias,id',
            'imagem' => 'nullable|image|max:2048', // 2MB max
        ]);

        $produto = Produto::create($request->only([
            'nome', 'descricao', 'preco', 'categoria_id', 'estoque_atual'
        ]));

        // Upload da imagem usando Media Library
        if ($request->hasFile('imagem')) {
            $produto->addMediaFromRequest('imagem')
                   ->toMediaCollection('imagens');
        }

        return redirect()->route('produtos.index')
                        ->with('success', 'Produto criado com sucesso!');
    }

    public function update(Request $request, Produto $produto)
    {
        $request->validate([
            'nome' => 'required|string|max:255',
            'preco' => 'required|numeric|min:0',
            'categoria_id' => 'required|exists:categorias,id',
            'imagem' => 'nullable|image|max:2048',
        ]);

        $produto->update($request->only([
            'nome', 'descricao', 'preco', 'categoria_id', 'estoque_atual'
        ]));

        // Atualizar imagem se fornecida
        if ($request->hasFile('imagem')) {
            // Remove imagem antiga
            $produto->clearMediaCollection('imagens');
            
            // Adiciona nova imagem
            $produto->addMediaFromRequest('imagem')
                   ->toMediaCollection('imagens');
        }

        return redirect()->route('produtos.index')
                        ->with('success', 'Produto atualizado com sucesso!');
    }

    public function destroy(Produto $produto)
    {
        // Remove todas as mídias associadas
        $produto->clearMediaCollection('imagens');
        
        $produto->delete();

        return redirect()->route('produtos.index')
                        ->with('success', 'Produto excluído com sucesso!');
    }
}
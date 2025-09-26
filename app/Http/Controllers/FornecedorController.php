<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Fornecedor;
use App\Models\Produto;
use Illuminate\Support\Facades\Validator;

class FornecedorController extends Controller
{
    public function index()
    {
        // Buscar fornecedores ativos com produtos relacionados
        $fornecedores = Fornecedor::with('produtos')->where('ativo', true)->get();
        
        // Mapear dados para o formato esperado pelo frontend
        $suppliers = $fornecedores->map(function ($fornecedor) {
            return [
                'id' => (string) $fornecedor->id_fornecedor,
                'name' => $fornecedor->nome,
                'contactPerson' => $fornecedor->contato_principal,
                'phone' => $fornecedor->telefone,
                'email' => $fornecedor->email,
                'address' => $fornecedor->endereco,
                'productIds' => $fornecedor->produtos->pluck('id_produto')->map(fn($id) => (string) $id)->toArray(),
                'purchaseHistory' => []
            ];
        });

        // Buscar todos os produtos ativos
        $produtos = Produto::where('ativo', true)->get();
        $products = $produtos->map(function ($produto) {
            return [
                'id' => (string) $produto->id_produto,
                'name' => $produto->nome,
                'price' => (float) $produto->preco,
                'stock' => (int) $produto->estoque,
                'category' => $produto->categoria->nome ?? 'Sem categoria',
                'supplierId' => null // Será preenchido pela relação many-to-many
            ];
        });

        return inertia('Fornecedor/Index', [
            'suppliers' => $suppliers,
            'products' => $products
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'contactPerson' => 'nullable|string|max:100',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:150',
            'address' => 'nullable|string',
            'productIds' => 'nullable|array',
            'productIds.*' => 'exists:produtos,id_produto'
        ]);

        try {
            $fornecedor = Fornecedor::create([
                'nome' => $request->name,
                'contato_principal' => $request->contactPerson,
                'telefone' => $request->phone,
                'email' => $request->email,
                'endereco' => $request->address,
                'ativo' => true
            ]);

            // Associar produtos se fornecidos
            if ($request->productIds) {
                $fornecedor->produtos()->attach($request->productIds);
            }

            return redirect()->route('fornecedores.index')
                           ->with('success', 'Fornecedor criado com sucesso!');
        } catch (\Exception $e) {
            return redirect()->route('fornecedores.index')
                           ->with('error', 'Erro ao criar fornecedor: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:150',
            'contactPerson' => 'nullable|string|max:100',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:150',
            'address' => 'nullable|string',
            'productIds' => 'nullable|array',
            'productIds.*' => 'exists:produtos,id_produto'
        ]);

        try {
            $fornecedor = Fornecedor::where('id_fornecedor', $id)->firstOrFail();
            
            $fornecedor->update([
                'nome' => $request->name,
                'contato_principal' => $request->contactPerson,
                'telefone' => $request->phone,
                'email' => $request->email,
                'endereco' => $request->address
            ]);

            // Sincronizar produtos
            if ($request->has('productIds')) {
                $fornecedor->produtos()->sync($request->productIds ?? []);
            }

            return redirect()->route('fornecedores.index')
                           ->with('success', 'Fornecedor atualizado com sucesso!');
        } catch (\Exception $e) {
            return redirect()->route('fornecedores.index')
                           ->with('error', 'Erro ao atualizar fornecedor: ' . $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $fornecedor = Fornecedor::where('id_fornecedor', $id)->firstOrFail();
            
            // Verificar se o fornecedor tem produtos associados
            $produtosAssociados = $fornecedor->produtos()->count();
            
            if ($produtosAssociados > 0) {
                return redirect()->route('fornecedores.index')
                               ->with('error', 'Não é possível excluir o fornecedor pois ele possui produtos associados. Remova os produtos primeiro.');
            }
            
            // Marcar como inativo em vez de deletar fisicamente
            $fornecedor->update(['ativo' => false]);
            
            return redirect()->route('fornecedores.index')
                           ->with('success', 'Fornecedor excluído com sucesso!');
        } catch (\Exception $e) {
            return redirect()->route('fornecedores.index')
                           ->with('error', 'Erro ao excluir fornecedor: ' . $e->getMessage());
        }
    }
}
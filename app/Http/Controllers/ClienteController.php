<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class ClienteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Cliente::query();

        // Filtros
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telefone', 'like', "%{$search}%")
                  ->orWhere('cpf_cnpj', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('ativo', $request->status);
        }

        if ($request->has('loyaltyLevel') && $request->loyaltyLevel) {
            // Filtro por nível de fidelidade baseado nos pontos
            $level = $request->loyaltyLevel;
            switch($level) {
                case 'bronze':
                    $query->where('pontos_fidelidade', '<', 500);
                    break;
                case 'prata':
                case 'silver':
                    $query->whereBetween('pontos_fidelidade', [500, 1499]);
                    break;
                case 'ouro':
                case 'gold':
                    $query->whereBetween('pontos_fidelidade', [1500, 2999]);
                    break;
                case 'diamante':
                case 'platinum':
                    $query->where('pontos_fidelidade', '>=', 3000);
                    break;
            }
        }

        // Ordenação
        $sortBy = $request->get('sortBy', 'nome');
        $sortOrder = $request->get('sortOrder', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $clientes = $query->paginate(15);

        // Transformar dados para o formato esperado pelo frontend
        $customers = $clientes->getCollection()->map(function($cliente) {
            return [
                'id' => $cliente->id_cliente,
                'name' => $cliente->nome,
                'email' => $cliente->email,
                'phone' => $cliente->telefone,
                'address' => $cliente->endereco,
                'cpf' => $cliente->cpf_cnpj,
                'birthDate' => $cliente->data_nascimento,
                'loyaltyPoints' => (float) $cliente->pontos_fidelidade,
                'loyaltyLevel' => $cliente->loyalty_level,
                'isActive' => $cliente->ativo,
                'totalSpent' => $cliente->total_spent,
                'lastPurchase' => $cliente->last_purchase,
                'registrationDate' => $cliente->created_at,
                'purchaseCount' => $cliente->vendas()->count(),
                'notes' => $cliente->observacoes,
                'creditLimit' => (float) $cliente->limite_credito,
                'creditUsed' => (float) $cliente->credito_utilizado,
                'personType' => $cliente->tipo_pessoa,
            ];
        });

        // Programa de fidelidade padrão
        $loyaltyProgram = [
            'id' => 'loyalty-1',
            'name' => 'Programa Amigo Pet',
            'pointsPerReal' => 1,
            'levels' => [
                [
                    'level' => 'bronze',
                    'minPoints' => 0,
                    'discount' => 5,
                    'benefits' => ['5% de desconto', 'Aniversário do pet com brinde', 'Newsletter mensal']
                ],
                [
                    'level' => 'prata',
                    'minPoints' => 500,
                    'discount' => 10,
                    'benefits' => ['10% de desconto', 'Consulta veterinária gratuita anual', 'Desconto em banho e tosa', 'Atendimento prioritário']
                ],
                [
                    'level' => 'ouro',
                    'minPoints' => 1500,
                    'discount' => 15,
                    'benefits' => ['15% de desconto', '2 consultas veterinárias gratuitas', 'Entrega grátis', 'Produtos exclusivos', 'Desconto em medicamentos']
                ],
                [
                    'level' => 'diamante',
                    'minPoints' => 3000,
                    'discount' => 20,
                    'benefits' => ['20% de desconto', 'Consultas veterinárias ilimitadas', 'Entrega grátis express', 'Acesso a produtos premium', 'Personal pet trainer']
                ]
            ],
            'isActive' => true
        ];

        return Inertia::render('Cliente/Index', [
            'customers' => $customers,
            'loyaltyProgram' => $loyaltyProgram,
            'pagination' => [
                'current_page' => $clientes->currentPage(),
                'last_page' => $clientes->lastPage(),
                'per_page' => $clientes->perPage(),
                'total' => $clientes->total(),
            ],
            'filters' => [
                'search' => $request->get('search'),
                'status' => $request->get('status'),
                'loyaltyLevel' => $request->get('loyaltyLevel'),
                'sortBy' => $request->get('sortBy', 'nome'),
                'sortOrder' => $request->get('sortOrder', 'asc'),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'cpf' => 'nullable|string|max:20|unique:clientes,cpf_cnpj',
            'email' => 'nullable|email|max:150|unique:clientes,email',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'birthDate' => 'nullable|date',
            'personType' => 'nullable|in:fisica,juridica',
            'loyaltyPoints' => 'nullable|numeric|min:0',
            'creditLimit' => 'nullable|numeric|min:0',
            'creditUsed' => 'nullable|numeric|min:0',
            'isActive' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        // Mapear campos do frontend para o banco
        $dadosCliente = [
            'nome' => $validated['name'],
            'cpf_cnpj' => $validated['cpf'] ?? null,
            'email' => $validated['email'] ?? null,
            'telefone' => $validated['phone'] ?? null,
            'endereco' => $validated['address'] ?? null,
            'data_nascimento' => $validated['birthDate'] ?? null,
            'tipo_pessoa' => $validated['personType'] ?? 'fisica',
            'pontos_fidelidade' => $validated['loyaltyPoints'] ?? 0,
            'limite_credito' => $validated['creditLimit'] ?? 0,
            'credito_utilizado' => $validated['creditUsed'] ?? 0,
            'ativo' => $validated['isActive'] ?? true,
            'observacoes' => $validated['notes'] ?? null,
        ];

        $cliente = Cliente::create($dadosCliente);

        return back()->with('success', 'Cliente criado com sucesso!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $cliente = Cliente::where('id_cliente', $id)->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'cpf' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('clientes', 'cpf_cnpj')->ignore($cliente->id_cliente, 'id_cliente')
            ],
            'email' => [
                'nullable',
                'email',
                'max:150',
                Rule::unique('clientes', 'email')->ignore($cliente->id_cliente, 'id_cliente')
            ],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'birthDate' => 'nullable|date',
            'personType' => 'nullable|in:fisica,juridica',
            'loyaltyPoints' => 'nullable|numeric|min:0',
            'creditLimit' => 'nullable|numeric|min:0',
            'creditUsed' => 'nullable|numeric|min:0',
            'isActive' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        // Mapear campos do frontend para o banco
        $dadosCliente = [
            'nome' => $validated['name'],
            'cpf_cnpj' => $validated['cpf'] ?? null,
            'email' => $validated['email'] ?? null,
            'telefone' => $validated['phone'] ?? null,
            'endereco' => $validated['address'] ?? null,
            'data_nascimento' => $validated['birthDate'] ?? null,
            'tipo_pessoa' => $validated['personType'] ?? 'fisica',
            'pontos_fidelidade' => $validated['loyaltyPoints'] ?? $cliente->pontos_fidelidade,
            'limite_credito' => $validated['creditLimit'] ?? $cliente->limite_credito,
            'credito_utilizado' => $validated['creditUsed'] ?? $cliente->credito_utilizado,
            'ativo' => $validated['isActive'] ?? $cliente->ativo,
            'observacoes' => $validated['notes'] ?? $cliente->observacoes,
        ];

        $cliente->update($dadosCliente);

        return back()->with('success', 'Cliente atualizado com sucesso!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $cliente = Cliente::where('id_cliente', $id)->firstOrFail();

        // Verificar se o cliente tem vendas associadas
        if ($cliente->vendas()->exists()) {
            return back()->with('error', 'Não é possível excluir cliente com vendas associadas. Desative o cliente ao invés de excluí-lo.');
        }

        $cliente->delete();

        return back()->with('success', 'Cliente excluído com sucesso!');
    }

    /**
     * Toggle customer status
     */
    public function toggleStatus($id)
    {
        $cliente = Cliente::where('id_cliente', $id)->firstOrFail();
        $cliente->update(['ativo' => !$cliente->ativo]);

        $status = $cliente->ativo ? 'ativado' : 'desativado';
        return back()->with('success', "Cliente {$status} com sucesso!");
    }

    /**
     * Add loyalty points
     */
    public function addLoyaltyTransaction(Request $request)
    {
        $validated = $request->validate([
            'customerId' => 'required|exists:clientes,id_cliente',
            'points' => 'required|numeric|min:1',
            'description' => 'nullable|string|max:255',
        ]);

        $cliente = Cliente::where('id_cliente', $validated['customerId'])->firstOrFail();
        $cliente->adicionarPontos($validated['points'], $validated['description'] ?? null);

        return back()->with('success', 'Pontos de fidelidade adicionados com sucesso!');
    }

    /**
     * Redeem loyalty points
     */
    public function redeemLoyaltyPoints(Request $request)
    {
        $validated = $request->validate([
            'customerId' => 'required|exists:clientes,id_cliente',
            'points' => 'required|numeric|min:1',
            'description' => 'nullable|string|max:255',
        ]);

        try {
            $cliente = Cliente::where('id_cliente', $validated['customerId'])->firstOrFail();
            $cliente->resgatarPontos($validated['points'], $validated['description'] ?? null);
            
            return back()->with('success', 'Pontos resgatados com sucesso!');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
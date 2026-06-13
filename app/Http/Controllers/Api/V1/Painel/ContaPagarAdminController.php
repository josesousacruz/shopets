<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\ContaPagar;
use App\Models\PontoVenda;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContaPagarAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ContaPagar::query()
            ->with('fornecedor:id_fornecedor,nome')
            ->where('ativo', true)
            ->when($request->query('status'), fn ($qq, $v) => $qq->where('status', $v))
            ->when($request->query('fornecedor_id'), fn ($qq, $v) => $qq->where('id_fornecedor', $v))
            ->when($request->query('plano_conta_id'), fn ($qq, $v) => $qq->where('plano_conta_id', $v))
            ->when($request->query('vencimento_de'), fn ($qq, $v) => $qq->whereDate('data_vencimento', '>=', $v))
            ->when($request->query('vencimento_ate'), fn ($qq, $v) => $qq->whereDate('data_vencimento', '<=', $v));

        $page = $q->orderBy('data_vencimento')->paginate(20);

        return response()->json([
            'data' => $page->items(),
            'meta' => $this->meta($page),
            'resumo' => $this->resumo(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'descricao' => ['required', 'string', 'max:200'],
            'id_fornecedor' => ['nullable', 'integer', 'exists:fornecedores,id_fornecedor'],
            'plano_conta_id' => ['nullable', 'integer', 'exists:planos_contas,id'],
            'valor_original' => ['required', 'numeric', 'min:0.01'],
            'data_vencimento' => ['required', 'date'],
            'categoria' => ['required', 'in:fornecedor,despesa_operacional,imposto,financiamento,outros'],
            'tipo_documento' => ['nullable', 'in:nota_fiscal,boleto,duplicata,recibo,outros'],
            'numero_documento' => ['nullable', 'string', 'max:50'],
            'parcelas' => ['nullable', 'integer', 'min:1', 'max:60'],
            'intervalo_dias' => ['nullable', 'integer', 'min:1'],
            'observacoes' => ['nullable', 'string'],
        ]);

        $idPdv = $request->input('id_pdv') ?? PontoVenda::query()->value('id_pdv');
        if (! $idPdv) {
            throw ValidationException::withMessages(['id_pdv' => 'Nenhum ponto de venda configurado.']);
        }

        $parcelas = (int) ($data['parcelas'] ?? 1);
        $intervalo = (int) ($data['intervalo_dias'] ?? 30);
        $valorParcela = round($data['valor_original'] / $parcelas, 2);

        $criadas = DB::transaction(function () use ($data, $idPdv, $request, $parcelas, $intervalo, $valorParcela) {
            $base = null;
            $out = [];
            for ($i = 0; $i < $parcelas; $i++) {
                $vp = $i === $parcelas - 1 ? round($data['valor_original'] - ($valorParcela * ($parcelas - 1)), 2) : $valorParcela;
                $conta = ContaPagar::create([
                    'numero_documento' => $data['numero_documento'] ?? null,
                    'descricao' => $data['descricao'].($parcelas > 1 ? ' ('.($i + 1)."/{$parcelas})" : ''),
                    'id_fornecedor' => $data['id_fornecedor'] ?? null,
                    'id_pdv' => $idPdv,
                    'user_id' => $request->user()->id,
                    'valor_original' => $vp,
                    'data_vencimento' => Carbon::parse($data['data_vencimento'])->addDays($intervalo * $i)->toDateString(),
                    'status' => 'pendente',
                    'categoria' => $data['categoria'],
                    'plano_conta_id' => $data['plano_conta_id'] ?? null,
                    'tipo_documento' => $data['tipo_documento'] ?? 'outros',
                    'numero_parcela' => $i + 1,
                    'total_parcelas' => $parcelas,
                    'id_conta_origem' => $base?->id_conta_pagar,
                    'observacoes' => $data['observacoes'] ?? null,
                ]);
                $base ??= $conta;
                $out[] = $conta;
            }

            return $out;
        });

        return response()->json(['data' => $criadas], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $conta = ContaPagar::findOrFail($id);
        $data = $request->validate([
            'descricao' => ['sometimes', 'string', 'max:200'],
            'plano_conta_id' => ['nullable', 'integer', 'exists:planos_contas,id'],
            'data_vencimento' => ['sometimes', 'date'],
            'categoria' => ['sometimes', 'in:fornecedor,despesa_operacional,imposto,financiamento,outros'],
            'observacoes' => ['nullable', 'string'],
        ]);
        $conta->update($data);

        return response()->json(['data' => $conta->fresh()]);
    }

    public function baixar(Request $request, int $id): JsonResponse
    {
        $conta = ContaPagar::findOrFail($id);
        if ($conta->status === 'pago') {
            throw ValidationException::withMessages(['status' => 'Conta já está paga.']);
        }
        $data = $request->validate([
            'valor_pago' => ['nullable', 'numeric', 'min:0'],
            'data_pagamento' => ['nullable', 'date'],
            'conta_bancaria_id' => ['nullable', 'integer', 'exists:contas_bancarias,id'],
        ]);

        $conta->update([
            'status' => 'pago',
            'valor_pago' => $data['valor_pago'] ?? $conta->valor_original,
            'data_pagamento' => $data['data_pagamento'] ?? now()->toDateString(),
            'conta_bancaria_id' => $data['conta_bancaria_id'] ?? $conta->conta_bancaria_id,
        ]);

        return response()->json(['data' => $conta->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        ContaPagar::findOrFail($id)->update(['ativo' => false, 'status' => 'cancelado']);

        return response()->json(null, 204);
    }

    private function resumo(): array
    {
        $base = ContaPagar::where('ativo', true);

        return [
            'pendente' => (float) (clone $base)->where('status', 'pendente')->sum('valor_original'),
            'vencido' => (float) (clone $base)->where('status', 'pendente')
                ->whereDate('data_vencimento', '<', now()->toDateString())->sum('valor_original'),
            'pago_mes' => (float) (clone $base)->where('status', 'pago')
                ->whereBetween('data_pagamento', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
                ->sum('valor_pago'),
        ];
    }

    private function meta($page): array
    {
        return [
            'total' => $page->total(),
            'per_page' => $page->perPage(),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
        ];
    }
}

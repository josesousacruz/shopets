<?php

namespace App\Http\Controllers;

use App\Models\CaixaSessao;
use App\Models\ConfiguracaoEmpresa;
use App\Models\FluxoCaixa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Sessão de caixa do PDV físico — abertura/fechamento/sangria/suprimento.
 *
 * Só é EXIGIDA quando `configuracoes_empresa.caixa_modo_sessao` está ligado
 * (Configurações → Loja → PDV). Desligado (padrão), o PDV vende igual sempre
 * vendeu — sem sessão, cada venda só registra o usuário logado (auth()->id()),
 * que já é o comportamento atual do fluxo_caixa.
 */
class CaixaSessaoController extends Controller
{
    public static function modoSessaoAtivo(): bool
    {
        return (bool) (ConfiguracaoEmpresa::first()?->caixa_modo_sessao ?? false);
    }

    /** GET /caixa/status?id_pdv= — sessão aberta atual do PDV, ou null. */
    public function status(Request $request): JsonResponse
    {
        $idPdv = (int) $request->query('id_pdv', 1);
        $sessao = CaixaSessao::where('id_pdv', $idPdv)->where('status', 'aberta')->first();

        return response()->json([
            'data' => [
                'modo_sessao_ativo' => self::modoSessaoAtivo(),
                'sessao' => $sessao,
            ],
        ]);
    }

    /** POST /caixa/abrir */
    public function abrir(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_pdv' => ['required', 'integer', 'exists:pontos_venda,id_pdv'],
            'valor_abertura' => ['required', 'numeric', 'min:0'],
        ]);

        $existente = CaixaSessao::where('id_pdv', $data['id_pdv'])->where('status', 'aberta')->first();
        if ($existente) {
            return response()->json(['message' => 'Já existe uma sessão de caixa aberta neste PDV.'], 422);
        }

        $sessao = CaixaSessao::create([
            'id_pdv' => $data['id_pdv'],
            'id_usuario_abertura' => $request->user()->id,
            'valor_abertura' => $data['valor_abertura'],
            'status' => 'aberta',
            'aberta_em' => now(),
        ]);

        return response()->json(['data' => $sessao], 201);
    }

    /** POST /caixa/movimento — sangria (saída) ou suprimento (entrada). */
    public function movimento(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_pdv' => ['required', 'integer', 'exists:pontos_venda,id_pdv'],
            'tipo' => ['required', 'in:sangria,suprimento'],
            'valor' => ['required', 'numeric', 'min:0.01'],
            'descricao' => ['nullable', 'string', 'max:200'],
        ]);

        $sessao = CaixaSessao::where('id_pdv', $data['id_pdv'])->where('status', 'aberta')->first();
        if (! $sessao) {
            return response()->json(['message' => 'Nenhuma sessão de caixa aberta neste PDV.'], 422);
        }

        $mov = FluxoCaixa::create([
            'user_id' => $request->user()->id,
            'id_pdv' => $data['id_pdv'],
            'id_caixa_sessao' => $sessao->id,
            'tipo_operacao' => $data['tipo'] === 'sangria' ? 'saida' : 'entrada',
            'valor' => $data['valor'],
            'descricao' => $data['descricao'] ?? ucfirst($data['tipo']),
            'categoria' => $data['tipo'],
        ]);

        return response()->json(['data' => $mov], 201);
    }

    /** POST /caixa/fechar */
    public function fechar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_pdv' => ['required', 'integer', 'exists:pontos_venda,id_pdv'],
            'valor_fechamento_informado' => ['required', 'numeric', 'min:0'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ]);

        $sessao = CaixaSessao::where('id_pdv', $data['id_pdv'])->where('status', 'aberta')->first();
        if (! $sessao) {
            return response()->json(['message' => 'Nenhuma sessão de caixa aberta neste PDV.'], 422);
        }

        // Calculado = abertura + tudo que entrou/saiu no fluxo_caixa deste PDV
        // durante a janela da sessão (vendas, sangria, suprimento, devolução...).
        $movimentos = DB::table('fluxo_caixa')
            ->where('id_pdv', $sessao->id_pdv)
            ->where('created_at', '>=', $sessao->aberta_em)
            ->selectRaw("SUM(CASE WHEN tipo_operacao = 'entrada' THEN valor ELSE -valor END) as saldo")
            ->value('saldo');

        $calculado = (float) $sessao->valor_abertura + (float) ($movimentos ?? 0);
        $informado = (float) $data['valor_fechamento_informado'];

        $sessao->update([
            'id_usuario_fechamento' => $request->user()->id,
            'valor_fechamento_informado' => $informado,
            'valor_fechamento_calculado' => $calculado,
            'diferenca' => round($informado - $calculado, 2),
            'observacoes' => $data['observacoes'] ?? null,
            'status' => 'fechada',
            'fechada_em' => now(),
        ]);

        return response()->json(['data' => $sessao->fresh()]);
    }
}

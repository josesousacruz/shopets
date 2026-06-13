<?php

namespace App\Http\Controllers\Api\V1\Painel;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConfiguracaoController extends Controller
{
    public function show(): JsonResponse
    {
        $config = ConfiguracaoEmpresa::first();

        return response()->json([
            'data' => [
                'loja' => [
                    'nome_empresa' => $config?->nome_empresa,
                    'cnpj' => $config?->cnpj,
                    'endereco' => $config?->endereco,
                    'telefone' => $config?->telefone,
                    'email' => $config?->email,
                    'logo_path' => $config?->logo_path,
                    'taxa_entrega' => (float) ($config?->taxa_entrega ?? 0),
                    'valor_minimo_entrega' => (float) ($config?->valor_minimo_entrega ?? 0),
                ],
                'seo' => [
                    'seo_titulo' => $config?->seo_titulo,
                    'seo_descricao' => $config?->seo_descricao,
                    'og_image_path' => $config?->og_image_path,
                ],
                'fiscal' => [
                    'ambiente_nfce' => (int) ($config?->ambiente_nfce ?? 2),
                    'csc_nfce' => $config?->csc_nfce,
                    'csc_id_nfce' => $config?->csc_id_nfce,
                    'certificado_path' => $config?->certificado_path,
                    // Nunca devolver a senha do certificado; apenas se está definida.
                    'certificado_definido' => ! empty($config?->certificado_senha),
                ],
                'integracoes' => [
                    'payment_driver' => config('services.payment.driver'),
                    'shipping_driver' => config('services.shipping.driver'),
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome_empresa' => ['nullable', 'string', 'max:100'],
            'cnpj' => ['nullable', 'string', 'max:18'],
            'endereco' => ['nullable', 'string', 'max:200'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100'],
            'logo_path' => ['nullable', 'string', 'max:255'],
            'taxa_entrega' => ['nullable', 'numeric', 'min:0'],
            'valor_minimo_entrega' => ['nullable', 'numeric', 'min:0'],
            'seo_titulo' => ['nullable', 'string', 'max:70'],
            'seo_descricao' => ['nullable', 'string', 'max:200'],
            'og_image_path' => ['nullable', 'string', 'max:255'],
            'ambiente_nfce' => ['nullable', 'integer', 'in:1,2'],
            'csc_nfce' => ['nullable', 'string', 'max:60'],
            'csc_id_nfce' => ['nullable', 'string', 'max:10'],
        ]);

        $config = ConfiguracaoEmpresa::first();

        if ($config) {
            $config->update($data);
        } else {
            $config = ConfiguracaoEmpresa::create($data);
        }

        return $this->show();
    }
}

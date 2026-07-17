<?php

namespace App\Domain\Shipping;

use App\Models\ConfiguracaoEmpresa;
use App\Models\EnderecoCliente;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use RuntimeException;

/**
 * Compra a etiqueta de verdade no Melhor Envio (carrinho → checkout → gerar →
 * imprimir, via MelhorEnvioService::gerarEtiqueta). Só roda quando o pedido
 * carrega o `frete_servico_id` capturado na re-cotação do checkout — sem ele
 * não dá pra saber qual serviço (PAC/SEDEX/etc.) comprar.
 *
 * ⚠️ Payload montado conforme a documentação pública do ME v2 (POST /me/cart);
 * ainda não validado contra a API real, mesma ressalva já registrada para o
 * YapayGateway — confirmar em sandbox antes do go-live.
 */
class ComprarEtiquetaMelhorEnvioAction
{
    private const PESO_PADRAO_GRAMAS = 200;

    // Mesma simplificação de dimensões já usada na cotação (MelhorEnvioService::cotar).
    private const DIMENSOES_PADRAO_CM = ['width' => 11, 'height' => 2, 'length' => 16];

    public function __construct(private readonly MelhorEnvioService $melhorEnvio) {}

    public function executar(Pedido $pedido): string
    {
        if (empty($pedido->frete_servico_id)) {
            throw new RuntimeException('Pedido sem serviço de frete do Melhor Envio identificado (frete_servico_id ausente).');
        }

        $pedido->loadMissing(['cliente', 'enderecoEntrega', 'itens']);

        $empresa = ConfiguracaoEmpresa::first();
        if (! $empresa || empty($empresa->endereco_cep)) {
            throw new RuntimeException('Endereço da loja não configurado (Configurações → Loja).');
        }

        $endereco = $pedido->enderecoEntrega;
        if (! $endereco) {
            throw new RuntimeException('Pedido sem endereço de entrega.');
        }

        $url = $this->melhorEnvio->gerarEtiqueta([
            'service' => (int) $pedido->frete_servico_id,
            'from' => $this->enderecoEmpresa($empresa),
            'to' => $this->enderecoCliente($pedido, $endereco),
            'products' => $pedido->itens->map(fn ($item) => [
                'name' => $item->nome,
                'quantity' => (string) $item->quantidade,
                'unitary_value' => (string) $item->preco_unit,
            ])->values()->all(),
            'volumes' => [array_merge(self::DIMENSOES_PADRAO_CM, [
                'weight' => $this->pesoTotalKg($pedido),
            ])],
            'options' => [
                'insurance_value' => (float) $pedido->subtotal,
                'receipt' => false,
                'own_hand' => false,
                'non_commercial' => false,
            ],
        ]);

        if (empty($url)) {
            throw new RuntimeException('Melhor Envio não retornou a URL da etiqueta.');
        }

        return $url;
    }

    private function enderecoEmpresa(ConfiguracaoEmpresa $empresa): array
    {
        $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj);

        return [
            'name' => $empresa->nome_empresa,
            'phone' => preg_replace('/\D/', '', (string) $empresa->telefone),
            'email' => $empresa->email,
            'document' => $cnpj,
            'company_document' => $cnpj,
            'address' => $empresa->endereco_logradouro,
            'complement' => $empresa->endereco_complemento,
            'number' => $empresa->endereco_numero,
            'district' => $empresa->endereco_bairro,
            'city' => $empresa->endereco_cidade,
            'state_abbr' => $empresa->endereco_uf,
            'country_id' => 'BR',
            'postal_code' => preg_replace('/\D/', '', (string) $empresa->endereco_cep),
        ];
    }

    private function enderecoCliente(Pedido $pedido, EnderecoCliente $endereco): array
    {
        $cliente = $pedido->cliente;

        return [
            'name' => $cliente?->nome ?? 'Cliente',
            'phone' => preg_replace('/\D/', '', (string) $cliente?->telefone),
            'email' => $cliente?->email,
            'document' => preg_replace('/\D/', '', (string) $cliente?->cpf_cnpj),
            'address' => $endereco->logradouro,
            'complement' => $endereco->complemento,
            'number' => $endereco->numero,
            'district' => $endereco->bairro,
            'city' => $endereco->cidade,
            'state_abbr' => $endereco->uf,
            'country_id' => 'BR',
            'postal_code' => preg_replace('/\D/', '', (string) $endereco->cep),
        ];
    }

    private function pesoTotalKg(Pedido $pedido): float
    {
        $gramas = 0.0;

        foreach ($pedido->itens as $item) {
            $peso = $item->id_variacao
                ? ProdutoVariacao::where('id_variacao', $item->id_variacao)->value('peso_gramas')
                : null;
            $peso ??= Produto::where('id_produto', $item->id_produto)->value('peso_gramas');
            $gramas += (float) ($peso ?: self::PESO_PADRAO_GRAMAS) * $item->quantidade;
        }

        return round($gramas / 1000.0, 3);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Cart\CarrinhoService;
use App\Domain\Checkout\IniciarCheckoutAction;
use App\Domain\Shipping\ShippingQuoteInterface;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\PedidoResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly IniciarCheckoutAction $action,
        private readonly CarrinhoService $carrinhoService,
        private readonly ShippingQuoteInterface $shipping,
    ) {
    }

    public function iniciar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'modalidade' => ['required', 'in:entrega,retirada'],
            'id_endereco' => ['nullable', 'integer'],
            'id_pdv' => ['nullable', 'integer'],
            'pagamento_modo' => ['nullable', 'in:online,na_retirada'],
            'frete_servico' => ['required_if:modalidade,entrega', 'nullable', 'string'],
            'cep' => ['required_if:modalidade,entrega', 'nullable', 'string'],
        ]);

        $cliente = $request->user();

        // Valida endereço pertence ao cliente quando entrega.
        if ($data['modalidade'] === 'entrega') {
            if (empty($data['id_endereco'])) {
                throw ValidationException::withMessages(['id_endereco' => 'Endereço obrigatório para entrega.']);
            }
            $endereco = $cliente->enderecos()->where('id_endereco', $data['id_endereco'])->first();
            if (! $endereco) {
                throw ValidationException::withMessages(['id_endereco' => 'Endereço inválido.']);
            }
        }

        // Valida PDV de retirada: precisa existir, estar ativo e permitir retirada.
        if ($data['modalidade'] === 'retirada') {
            if (empty($data['id_pdv'])) {
                throw ValidationException::withMessages(['id_pdv' => 'Ponto de retirada obrigatório.']);
            }
            $pdv = \App\Models\PontoVenda::where('id_pdv', $data['id_pdv'])
                ->where('ativo', true)
                ->where('permite_retirada', true)
                ->first();
            if (! $pdv) {
                throw ValidationException::withMessages(['id_pdv' => 'Ponto de retirada inválido.']);
            }
        }

        $carrinho = $this->carrinhoService->resolver($cliente, $request->header('X-Cart-Token'));

        // Resolve frete escolhido (entrega) a partir da cotação.
        $frete = 0.0;
        $prazo = null;
        if ($data['modalidade'] === 'entrega') {
            $opcoes = $this->shipping->cotar($data['cep'], $carrinho->itens->map(fn ($i) => [
                'quantidade' => $i->quantidade,
                'peso_gramas' => $i->variacao?->peso_gramas ?? $i->produto?->peso_gramas,
            ]));

            $escolhida = collect($opcoes)->firstWhere('servico', $data['frete_servico']);
            if (! $escolhida) {
                throw ValidationException::withMessages(['frete_servico' => 'Serviço de frete inválido.']);
            }
            $frete = $escolhida['preco'];
            $prazo = $escolhida['prazo_dias'];
        }

        $pedido = $this->action->executar($cliente, $carrinho, [
            'modalidade' => $data['modalidade'],
            'id_endereco' => $data['id_endereco'] ?? null,
            'id_pdv' => $data['id_pdv'] ?? null,
            'pagamento_modo' => $data['pagamento_modo'] ?? null,
            'frete_servico' => $data['frete_servico'] ?? null,
            'frete' => $frete,
            'prazo_entrega_dias' => $prazo,
        ]);

        return (new PedidoResource($pedido->load(['itens', 'enderecoEntrega'])))
            ->response()
            ->setStatusCode(201);
    }
}

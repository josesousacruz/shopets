<?php

namespace App\Domain\Payment;

use App\Models\PagamentoPedido;
use App\Models\Pedido;

/**
 * Gateway fake para dev/teste. Gera cobrança Pix "pendente" com QR/copia-cola
 * determinísticos (derivados do número do pedido) e permite simular aprovação
 * via aprovar()/aprovarManualmente() — usado pelo endpoint dev e por testes.
 */
class FakePaymentGateway implements PaymentGatewayInterface
{
    public function criarCobranca(Pedido $pedido, string $metodo): array
    {
        $gatewayId = $this->gerarGatewayId($pedido);

        $resultado = [
            'gateway_id' => $gatewayId,
            'status' => 'pendente',
        ];

        if ($metodo === 'pix') {
            $resultado['pix_qr'] = 'data:image/png;base64,FAKEQR_'.$gatewayId;
            $resultado['pix_copia_cola'] = $this->pixCopiaCola($pedido);
        }

        return $resultado;
    }

    public function consultarStatus(string $gatewayId): string
    {
        $pagamento = PagamentoPedido::where('gateway_id_externo', $gatewayId)->first();

        return $pagamento?->status ?? 'pendente';
    }

    public function estornar(string $gatewayId, float $valor): bool
    {
        $pagamento = PagamentoPedido::where('gateway_id_externo', $gatewayId)->first();

        if (! $pagamento) {
            return false;
        }

        $pagamento->update(['status' => 'estornado', 'processado_em' => now()]);

        return true;
    }

    /**
     * Simula o callback de aprovação do gateway: marca o pagamento como aprovado.
     * Retorna o pagamento atualizado (ou null se não encontrado).
     */
    public function aprovar(string $gatewayId): ?PagamentoPedido
    {
        $pagamento = PagamentoPedido::where('gateway_id_externo', $gatewayId)->first();

        if (! $pagamento) {
            return null;
        }

        $pagamento->update([
            'status' => 'aprovado',
            'processado_em' => now(),
        ]);

        return $pagamento->fresh();
    }

    /** Alias semântico. */
    public function aprovarManualmente(string $gatewayId): ?PagamentoPedido
    {
        return $this->aprovar($gatewayId);
    }

    private function gerarGatewayId(Pedido $pedido): string
    {
        // Determinístico: estável por pedido (idempotência da cobrança).
        return 'fake_'.strtolower(str_replace('-', '', $pedido->numero));
    }

    private function pixCopiaCola(Pedido $pedido): string
    {
        $valor = number_format((float) $pedido->total, 2, '', '');

        return '00020126FAKE'.$pedido->numero.'5204000053039865802BR5909LOJA ONLINE6009SAO PAULO62070503'.$valor.'6304ABCD';
    }
}

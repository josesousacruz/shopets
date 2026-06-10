<?php

namespace App\Mail;

use App\Models\DevolucaoPedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Notifica o lojista de uma nova solicitação de devolução.
 * ShouldQueue: em dev/test o driver de fila/log apenas registra.
 */
class DevolucaoSolicitada extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public DevolucaoPedido $devolucao)
    {
    }

    public function envelope(): Envelope
    {
        $numero = $this->devolucao->pedido?->numero ?? $this->devolucao->id_pedido;

        return new Envelope(
            subject: "Nova solicitação de devolução — pedido {$numero}",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: '<p>Uma nova solicitação de devolução foi registrada.</p>'
                .'<p>Pedido: '.e($this->devolucao->pedido?->numero ?? $this->devolucao->id_pedido).'</p>'
                .'<p>Motivo: '.e($this->devolucao->motivo).'</p>',
        );
    }
}

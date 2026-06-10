<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PagamentoConfirmado extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Pagamento confirmado — Pedido {$this->pedido->numero}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.pedidos.pagamento-confirmado',
            with: [
                'numero' => $this->pedido->numero,
                'total' => (float) $this->pedido->total,
            ],
        );
    }
}

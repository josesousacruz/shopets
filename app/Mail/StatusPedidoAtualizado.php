<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StatusPedidoAtualizado extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido, public string $novoStatus)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Atualização do Pedido {$this->pedido->numero}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.pedidos.status-atualizado',
            with: [
                'numero' => $this->pedido->numero,
                'novoStatus' => $this->novoStatus,
            ],
        );
    }
}

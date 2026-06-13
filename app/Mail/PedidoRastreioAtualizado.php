<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoRastreioAtualizado extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido, public string $rastreio)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Código de rastreio — Pedido {$this->pedido->numero}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.pedidos.rastreio-atualizado',
            with: [
                'numero' => $this->pedido->numero,
                'rastreio' => $this->rastreio,
            ],
        );
    }
}

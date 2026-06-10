<?php

namespace App\Mail;

use App\Models\Pedido;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PedidoEnviado extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Pedido $pedido)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Seu pedido {$this->pedido->numero} foi enviado",
        );
    }

    public function content(): Content
    {
        $rastreio = $this->pedido->codigo_rastreio;

        return new Content(
            markdown: 'emails.pedidos.enviado',
            with: [
                'numero' => $this->pedido->numero,
                'rastreio' => $rastreio,
                'linkRastreio' => $rastreio
                    ? 'https://www.melhorrastreio.com.br/rastreio/'.$rastreio
                    : null,
            ],
        );
    }
}

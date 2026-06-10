<?php

namespace App\Mail;

use App\Models\Cliente;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BoasVindasCliente extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Cliente $cliente)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bem-vindo à Shopets',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.clientes.boas-vindas',
            with: [
                'nome' => $this->cliente->nome,
            ],
        );
    }
}

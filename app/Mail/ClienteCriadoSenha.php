<?php

namespace App\Mail;

use App\Models\Cliente;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClienteCriadoSenha extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Cliente $cliente, public string $senha) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Sua conta foi criada — Shopets');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cliente.cadastro-admin',
            with: ['cliente' => $this->cliente, 'senha' => $this->senha],
        );
    }
}

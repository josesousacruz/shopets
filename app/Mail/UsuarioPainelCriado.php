<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UsuarioPainelCriado extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $senha) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Acesso ao Painel Shopets criado');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.painel.usuario-criado',
            with: ['user' => $this->user, 'senha' => $this->senha],
        );
    }
}

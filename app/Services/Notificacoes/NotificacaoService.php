<?php

namespace App\Services\Notificacoes;

use App\Models\Notificacao;

class NotificacaoService
{
    /**
     * Cria uma notificação. user_id nulo = notificação para todos os admins.
     */
    public function push(
        ?int $idEmpresa,
        ?int $userId,
        string $tipo,
        string $titulo,
        ?string $mensagem = null,
        ?string $link = null,
        array $payload = []
    ): Notificacao {
        return Notificacao::create([
            'id_empresa' => $idEmpresa,
            'user_id' => $userId,
            'tipo' => $tipo,
            'titulo' => $titulo,
            'mensagem' => $mensagem,
            'link' => $link,
            'payload' => $payload,
        ]);
    }
}

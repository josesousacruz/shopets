<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'melhor_envio_access_token')) {
                // Tokens OAuth2 do Melhor Envio da loja (cast 'encrypted').
                $t->text('melhor_envio_access_token')->nullable();
                $t->text('melhor_envio_refresh_token')->nullable();
                $t->timestamp('melhor_envio_token_expira_em')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn([
                'melhor_envio_access_token',
                'melhor_envio_refresh_token',
                'melhor_envio_token_expira_em',
            ]);
        });
    }
};

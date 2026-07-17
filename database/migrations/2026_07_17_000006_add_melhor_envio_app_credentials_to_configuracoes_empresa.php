<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'melhor_envio_sandbox_client_id')) {
                // Credenciais do APLICATIVO registrado no Melhor Envio, configuráveis
                // pela tela do admin. Sandbox e produção são apps SEPARADOS, cada um
                // com seu par — o toggle melhor_envio_sandbox escolhe qual par usar.
                // client_id é identificador público; secret é cast 'encrypted' + write-only.
                $t->string('melhor_envio_sandbox_client_id')->nullable();
                $t->text('melhor_envio_sandbox_client_secret')->nullable();
                $t->string('melhor_envio_prod_client_id')->nullable();
                $t->text('melhor_envio_prod_client_secret')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn([
                'melhor_envio_sandbox_client_id',
                'melhor_envio_sandbox_client_secret',
                'melhor_envio_prod_client_id',
                'melhor_envio_prod_client_secret',
            ]);
        });
    }
};

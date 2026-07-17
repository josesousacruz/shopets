<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'melhor_envio_sandbox')) {
                // true = sandbox.melhorenvio.com.br (padrão), false = produção.
                // Sandbox e produção são AMBIENTES SEPARADOS (contas e apps distintos) —
                // trocar o toggle desconecta os tokens OAuth salvos (ver ConfiguracaoController).
                $t->boolean('melhor_envio_sandbox')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn('melhor_envio_sandbox');
        });
    }
};

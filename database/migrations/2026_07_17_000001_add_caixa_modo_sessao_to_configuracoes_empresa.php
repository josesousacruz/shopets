<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'caixa_modo_sessao')) {
                // false (padrão) = modo simples: vendas seguem como hoje, sem
                // exigir abertura de caixa (só registram o usuário logado).
                // true = exige abrir sessão de caixa (com sangria/suprimento e
                // fechamento com contagem) antes de vender em qualquer PDV.
                $t->boolean('caixa_modo_sessao')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn('caixa_modo_sessao');
        });
    }
};

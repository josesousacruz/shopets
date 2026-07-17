<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'certificado_validade')) {
                // Data de expiração do certificado A1, extraída no upload — evita
                // reabrir o .pfx (que exige a senha) só pra mostrar isso na tela.
                $t->timestamp('certificado_validade')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn('certificado_validade');
        });
    }
};

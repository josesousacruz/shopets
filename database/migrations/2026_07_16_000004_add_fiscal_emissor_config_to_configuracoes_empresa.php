<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'inscricao_estadual')) {
                $t->string('inscricao_estadual', 20)->nullable();
                // CRT: 1=Simples Nacional, 2=Simples excesso sublimite, 3=Regime normal.
                $t->string('regime_tributario', 2)->default('1');
                // Numeração da NF-e (modelo 55) — única para a empresa toda (1 CNPJ).
                $t->string('nfe_serie', 10)->default('1');
                $t->unsignedInteger('nfe_proximo_numero')->default(1);
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn(['inscricao_estadual', 'regime_tributario', 'nfe_serie', 'nfe_proximo_numero']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pontos_venda', function (Blueprint $t) {
            if (! Schema::hasColumn('pontos_venda', 'nfce_proximo_numero')) {
                // Numeração da NFC-e (modelo 65) — uma sequência por PDV (usa
                // serie_fiscal_default, já existente, como série).
                $t->unsignedInteger('nfce_proximo_numero')->default(1);
            }
        });
    }

    public function down(): void
    {
        Schema::table('pontos_venda', function (Blueprint $t) {
            $t->dropColumn('nfce_proximo_numero');
        });
    }
};

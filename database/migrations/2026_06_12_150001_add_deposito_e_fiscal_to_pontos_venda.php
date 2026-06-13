<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pontos_venda', function (Blueprint $t) {
            if (! Schema::hasColumn('pontos_venda', 'deposito_id')) {
                $t->foreignId('deposito_id')->nullable()->after('ativo')->constrained('depositos')->nullOnDelete();
            }
            if (! Schema::hasColumn('pontos_venda', 'serie_fiscal_default')) {
                $t->string('serie_fiscal_default', 10)->nullable()->after('deposito_id');
            }
            if (! Schema::hasColumn('pontos_venda', 'regime_tributario')) {
                $t->string('regime_tributario', 30)->nullable()->after('serie_fiscal_default');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pontos_venda', function (Blueprint $t) {
            $t->dropConstrainedForeignId('deposito_id');
            $t->dropColumn(['serie_fiscal_default', 'regime_tributario']);
        });
    }
};

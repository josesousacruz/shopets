<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('fluxo_caixa', 'id_caixa_sessao')) {
            Schema::table('fluxo_caixa', function (Blueprint $t) {
                $t->foreignId('id_caixa_sessao')->nullable()->after('id_pdv')
                    ->constrained('caixa_sessoes')->onDelete('set null');
            });
        }

        // Sangria/suprimento como categorias próprias (sqlite não tem enum de
        // verdade — a coluna já aceita qualquer string lá, então só MySQL precisa
        // do ALTER. Mesmo padrão já usado pra adicionar 'devolucao' antes.
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE fluxo_caixa MODIFY COLUMN categoria ENUM('venda', 'compra', 'despesa', 'receita', 'outros', 'devolucao', 'sangria', 'suprimento') NOT NULL");
        }
    }

    public function down(): void
    {
        Schema::table('fluxo_caixa', function (Blueprint $t) {
            $t->dropForeign(['id_caixa_sessao']);
            $t->dropColumn('id_caixa_sessao');
        });

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE fluxo_caixa MODIFY COLUMN categoria ENUM('venda', 'compra', 'despesa', 'receita', 'outros', 'devolucao') NOT NULL");
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimentacoes_estoque', function (Blueprint $t) {
            if (! Schema::hasColumn('movimentacoes_estoque', 'id_produto_variacao')) {
                $t->unsignedBigInteger('id_produto_variacao')->nullable()->after('id_produto');
                $t->index('id_produto_variacao', 'mov_variacao_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('movimentacoes_estoque', function (Blueprint $t) {
            if (Schema::hasColumn('movimentacoes_estoque', 'id_produto_variacao')) {
                $t->dropIndex('mov_variacao_idx');
                $t->dropColumn('id_produto_variacao');
            }
        });
    }
};

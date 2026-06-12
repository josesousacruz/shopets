<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depositos', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->cascadeOnDelete();
            $t->unsignedBigInteger('ponto_venda_id')->nullable();
            $t->foreign('ponto_venda_id')->references('id_pdv')->on('pontos_venda')->nullOnDelete();
            $t->string('nome', 80);
            $t->boolean('default')->default(false);
            $t->boolean('ativo')->default(true);
            $t->timestamps();
        });

        Schema::create('estoque_saldos', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('produto_variacao_id');
            $t->foreign('produto_variacao_id')->references('id_variacao')->on('produto_variacoes')->cascadeOnDelete();
            $t->foreignId('deposito_id')->constrained('depositos')->cascadeOnDelete();
            $t->integer('saldo')->default(0);
            $t->integer('reservado')->default(0);
            $t->integer('minimo')->default(0);
            $t->decimal('custo_medio', 12, 4)->default(0);
            $t->timestamps();
            $t->unique(['produto_variacao_id', 'deposito_id'], 'es_var_dep_unique');
        });

        // Adiciona deposito_id + origem polimorfica em movimentacoes_estoque
        Schema::table('movimentacoes_estoque', function (Blueprint $t) {
            if (!Schema::hasColumn('movimentacoes_estoque', 'deposito_id')) {
                $t->foreignId('deposito_id')->nullable()->after('id_movimentacao')->constrained('depositos');
            }
            if (!Schema::hasColumn('movimentacoes_estoque', 'origem_type')) {
                $t->string('origem_type', 80)->nullable()->after('deposito_id');
                $t->unsignedBigInteger('origem_id')->nullable()->after('origem_type');
                $t->index(['origem_type', 'origem_id'], 'mov_origem_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('movimentacoes_estoque', function (Blueprint $t) {
            if (Schema::hasColumn('movimentacoes_estoque', 'deposito_id')) {
                $t->dropConstrainedForeignId('deposito_id');
            }
            if (Schema::hasColumn('movimentacoes_estoque', 'origem_type')) {
                $t->dropIndex('mov_origem_idx');
                $t->dropColumn(['origem_type', 'origem_id']);
            }
        });
        Schema::dropIfExists('estoque_saldos');
        Schema::dropIfExists('depositos');
    }
};

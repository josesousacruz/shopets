<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('deposito_id')->constrained('depositos')->cascadeOnDelete();
            $t->foreignId('aberto_por')->constrained('users');
            $t->timestamp('aberto_em')->useCurrent();
            $t->timestamp('finalizado_em')->nullable();
            $t->enum('status', ['aberto', 'contando', 'divergencias', 'concluido', 'cancelado'])
                ->default('aberto');
            $t->text('observacoes')->nullable();
            $t->timestamps();
        });

        Schema::create('inventario_contagens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('inventario_id')->constrained('inventarios')->cascadeOnDelete();
            $t->unsignedBigInteger('produto_variacao_id');
            $t->foreign('produto_variacao_id')
                ->references('id_variacao')->on('produto_variacoes')->cascadeOnDelete();
            $t->integer('saldo_sistema');
            $t->integer('saldo_contado')->nullable();
            $t->integer('diferenca')->nullable();
            $t->text('observacoes')->nullable();
            $t->timestamps();
            $t->unique(['inventario_id', 'produto_variacao_id'], 'inv_var_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventario_contagens');
        Schema::dropIfExists('inventarios');
    }
};

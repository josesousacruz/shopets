<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caixa_sessoes', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('id_pdv');
            $t->foreign('id_pdv')->references('id_pdv')->on('pontos_venda')->onDelete('restrict');
            $t->foreignId('id_usuario_abertura')->constrained('users')->onDelete('restrict');
            $t->foreignId('id_usuario_fechamento')->nullable()->constrained('users')->onDelete('restrict');
            $t->decimal('valor_abertura', 10, 2);
            $t->decimal('valor_fechamento_informado', 10, 2)->nullable();
            // Abertura + entradas do fluxo_caixa no período − saídas (venda, sangria etc).
            $t->decimal('valor_fechamento_calculado', 10, 2)->nullable();
            // informado − calculado. Positivo = sobra, negativo = falta.
            $t->decimal('diferenca', 10, 2)->nullable();
            $t->enum('status', ['aberta', 'fechada'])->default('aberta');
            $t->text('observacoes')->nullable();
            $t->timestamp('aberta_em');
            $t->timestamp('fechada_em')->nullable();
            $t->timestamps();

            $t->index(['id_pdv', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caixa_sessoes');
    }
};

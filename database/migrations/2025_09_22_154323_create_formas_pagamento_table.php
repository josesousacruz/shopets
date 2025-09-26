<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formas_pagamento', function (Blueprint $table) {
            $table->id('id_forma_pagamento');
            $table->string('nome', 100);
            $table->text('descricao')->nullable();
            $table->enum('tipo', ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'cheque', 'crediario', 'outros'])->default('dinheiro');
            $table->boolean('permite_parcelamento')->default(false);
            $table->integer('max_parcelas')->default(1);
            $table->decimal('taxa_juros', 5, 2)->default(0.00);
            $table->decimal('taxa_desconto', 5, 2)->default(0.00);
            $table->boolean('ativo')->default(true);
            $table->integer('ordem_exibicao')->default(0);
            $table->timestamps();

            // Índices
            $table->index('tipo');
            $table->index('ativo');
            $table->index('ordem_exibicao');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formas_pagamento');
    }
};
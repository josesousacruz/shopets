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
        Schema::create('pontos_venda', function (Blueprint $table) {
            $table->id('id_pdv');
            $table->string('nome_pdv', 100);
            $table->string('descricao', 200)->nullable();
            $table->string('endereco', 200)->nullable();
            $table->string('responsavel', 100)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->boolean('ativo')->default(true);
            $table->json('configuracoes_pdv')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pontos_venda');
    }
};

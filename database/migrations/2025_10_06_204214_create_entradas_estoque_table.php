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
        Schema::create('entradas_estoque', function (Blueprint $table) {
            $table->id('id_entrada');
            $table->unsignedBigInteger('id_produto');
            $table->unsignedBigInteger('id_fornecedor');
            $table->decimal('quantidade', 10, 3);
            $table->decimal('preco_unitario', 10, 2);
            $table->decimal('valor_total', 10, 2);
            $table->string('numero_nota_fiscal', 50)->nullable();
            $table->timestamp('data_entrada');
            $table->unsignedBigInteger('id_usuario');
            $table->text('observacoes')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('id_produto')->references('id_produto')->on('produtos')->onDelete('cascade');
            $table->foreign('id_fornecedor')->references('id_fornecedor')->on('fornecedores')->onDelete('cascade');
            $table->foreign('id_usuario')->references('id')->on('users')->onDelete('cascade');

            // Indexes para performance
            $table->index(['id_produto', 'data_entrada']);
            $table->index(['id_fornecedor', 'data_entrada']);
            $table->index('data_entrada');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entradas_estoque');
    }
};

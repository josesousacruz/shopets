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
        Schema::create('produtos_fornecedores', function (Blueprint $table) {
            $table->id('id_relacao');
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->onDelete('cascade');
            $table->foreignId('id_fornecedor')->constrained('fornecedores', 'id_fornecedor')->onDelete('cascade');
            $table->string('codigo_fornecedor', 50)->nullable();
            $table->decimal('preco_custo_fornecedor', 10, 2)->nullable();
            $table->integer('prazo_entrega_dias')->nullable();
            $table->decimal('quantidade_minima_pedido', 10, 3)->nullable();
            $table->boolean('fornecedor_principal')->default(false);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            
            // Unique constraint to prevent duplicate relationships
            $table->unique(['id_produto', 'id_fornecedor']);
            
            // Index for performance
            $table->index(['id_produto', 'fornecedor_principal']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produtos_fornecedores');
    }
};

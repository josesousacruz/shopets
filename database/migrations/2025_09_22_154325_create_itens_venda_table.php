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
        Schema::create('itens_venda', function (Blueprint $table) {
            $table->id('id_item');
            $table->foreignId('id_venda')->constrained('vendas', 'id_venda')->onDelete('cascade');
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->onDelete('restrict');
            $table->decimal('quantidade', 10, 3);
            $table->decimal('preco_unitario', 10, 2);
            $table->decimal('desconto_item', 10, 2)->default(0.00);
            $table->decimal('valor_total_item', 10, 2);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('id_venda');
            $table->index('id_produto');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('itens_venda');
    }
};
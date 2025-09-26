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
        Schema::create('produtos', function (Blueprint $table) {
            $table->id('id_produto');
            $table->string('nome', 200);
            $table->string('codigo_barras', 50)->nullable();
            $table->string('codigo_interno', 50)->nullable();
            $table->text('descricao')->nullable();
            $table->decimal('preco_custo', 10, 2);
            $table->decimal('preco_venda', 10, 2);
            $table->decimal('margem_lucro', 5, 2)->nullable();
            $table->decimal('estoque_atual', 10, 3)->default(0);
            $table->decimal('estoque_minimo', 10, 3)->default(0);
            $table->decimal('estoque_maximo', 10, 3)->nullable();
            $table->enum('unidade', ['un', 'kg', 'g', 'l', 'ml', 'cx', 'm', 'cm']);
            $table->boolean('permite_fracao')->default(false);
            $table->foreignId('id_categoria')->nullable()->constrained('categorias', 'id_categoria')->onDelete('restrict');
            $table->string('ncm', 10)->nullable();
            $table->string('cest', 10)->nullable();
            $table->enum('origem', ['nacional', 'importado'])->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            
            // Indexes
            $table->index('codigo_barras');
            $table->index('codigo_interno');
            $table->index('id_categoria');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};

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
        Schema::create('enderecos_cliente', function (Blueprint $table) {
            $table->id('id_endereco');
            $table->unsignedBigInteger('id_cliente');
            $table->string('apelido', 50)->nullable();
            $table->string('cep', 9);
            $table->string('logradouro', 150);
            $table->string('numero', 20);
            $table->string('complemento', 100)->nullable();
            $table->string('bairro', 100);
            $table->string('cidade', 100);
            $table->string('uf', 2);
            $table->enum('tipo', ['entrega', 'cobranca', 'ambos'])->default('entrega');
            $table->boolean('principal')->default(false);
            $table->timestamps();

            $table->index('id_cliente');
            $table->foreign('id_cliente')
                ->references('id_cliente')
                ->on('clientes')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enderecos_cliente');
    }
};

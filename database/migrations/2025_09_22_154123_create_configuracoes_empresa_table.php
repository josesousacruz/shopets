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
        Schema::create('configuracoes_empresa', function (Blueprint $table) {
            $table->id();
            $table->string('nome_empresa', 100)->nullable();
            $table->string('cnpj', 18)->nullable();
            $table->string('endereco', 200)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('logo_path', 255)->nullable();
            $table->decimal('taxa_entrega', 8, 2)->default(0.00);
            $table->decimal('valor_minimo_entrega', 8, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracoes_empresa');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('vendas_devolucao', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_origem_venda');
            $table->unsignedBigInteger('id_nova_venda');
            $table->timestamps();

            $table->foreign('id_origem_venda')->references('id_venda')->on('vendas')->onDelete('cascade');
            $table->foreign('id_nova_venda')->references('id_venda')->on('vendas')->onDelete('cascade');
            $table->index(['id_origem_venda', 'id_nova_venda']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendas_devolucao');
    }
};


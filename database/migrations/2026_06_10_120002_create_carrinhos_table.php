<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('carrinhos', function (Blueprint $table) {
            $table->id('id_carrinho');
            $table->uuid('token')->unique();
            $table->unsignedBigInteger('id_cliente')->nullable();
            $table->timestamp('expira_em')->nullable();
            $table->timestamps();

            $table->index('id_cliente');

            $table->foreign('id_cliente')->references('id_cliente')->on('clientes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carrinhos');
    }
};

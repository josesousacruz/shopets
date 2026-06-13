<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedido_mensagens', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('id_pedido');
            $t->foreign('id_pedido')->references('id_pedido')->on('pedidos')->cascadeOnDelete();
            $t->enum('autor_tipo', ['admin', 'cliente']);
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $t->unsignedBigInteger('cliente_id')->nullable();
            $t->foreign('cliente_id')->references('id_cliente')->on('clientes')->nullOnDelete();
            $t->text('texto');
            $t->timestamp('lida_em')->nullable();
            $t->timestamps();

            $t->index('id_pedido');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_mensagens');
    }
};

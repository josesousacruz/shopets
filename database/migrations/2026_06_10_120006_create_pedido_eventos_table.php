<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pedido_eventos', function (Blueprint $table) {
            $table->id('id_evento');
            $table->foreignId('id_pedido')->constrained('pedidos', 'id_pedido')->cascadeOnDelete();
            $table->string('tipo', 60);
            $table->string('descricao', 255)->nullable();
            $table->unsignedBigInteger('criado_por_user_id')->nullable();
            $table->timestamp('criado_em')->useCurrent();

            $table->index('id_pedido');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_eventos');
    }
};

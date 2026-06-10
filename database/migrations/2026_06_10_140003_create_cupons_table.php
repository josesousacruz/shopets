<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cupons', function (Blueprint $table) {
            $table->id('id_cupom');
            $table->unsignedBigInteger('id_empresa')->default(1);
            $table->string('codigo');
            $table->enum('tipo', ['percentual', 'valor_fixo', 'frete_gratis']);
            $table->decimal('valor', 10, 2)->default(0);
            $table->decimal('valor_minimo_pedido', 10, 2)->default(0);
            $table->timestamp('valido_de')->nullable();
            $table->timestamp('valido_ate')->nullable();
            $table->unsignedInteger('uso_maximo')->nullable();
            $table->unsignedInteger('usos_atuais')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['id_empresa', 'codigo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cupons');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pagamentos_pedido', function (Blueprint $t) {
            $t->enum('gateway', ['mercadopago', 'asaas', 'stripe', 'fake', 'retirada_loja', 'yapay'])
                ->default('fake')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('pagamentos_pedido', function (Blueprint $t) {
            $t->enum('gateway', ['mercadopago', 'asaas', 'stripe', 'fake', 'retirada_loja'])
                ->default('fake')
                ->change();
        });
    }
};

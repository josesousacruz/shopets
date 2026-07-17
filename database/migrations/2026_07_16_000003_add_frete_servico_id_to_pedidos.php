<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            if (! Schema::hasColumn('pedidos', 'frete_servico_id')) {
                // ID numérico do serviço no Melhor Envio (ex.: PAC=1, SEDEX=2) — capturado
                // na re-cotação do checkout, junto com o nome em `frete_servico`. Sem ele
                // não é possível comprar a etiqueta real depois (a API do ME exige o ID).
                // Null quando o driver de frete é o stub (não tem ID real).
                $t->string('frete_servico_id', 20)->nullable()->after('frete_servico');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            $t->dropColumn('frete_servico_id');
        });
    }
};

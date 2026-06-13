<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fornecedores', function (Blueprint $t) {
            if (! Schema::hasColumn('fornecedores', 'prazo_medio_dias')) {
                $t->integer('prazo_medio_dias')->nullable()->after('contato_principal');
            }
            if (! Schema::hasColumn('fornecedores', 'condicao_pagamento_padrao')) {
                $t->string('condicao_pagamento_padrao')->nullable()->after('prazo_medio_dias');
            }
            if (! Schema::hasColumn('fornecedores', 'desconto_padrao')) {
                $t->decimal('desconto_padrao', 5, 2)->default(0)->after('condicao_pagamento_padrao');
            }
        });
    }

    public function down(): void
    {
        Schema::table('fornecedores', function (Blueprint $t) {
            $t->dropColumn(['prazo_medio_dias', 'condicao_pagamento_padrao', 'desconto_padrao']);
        });
    }
};

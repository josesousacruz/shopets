<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('nfe_chave', 60)->nullable()->after('codigo_rastreio');
            $table->string('nfe_numero', 30)->nullable()->after('nfe_chave');
        });

        // Adiciona o status fiscal 'aguardando_revisao_fiscal'.
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pedidos MODIFY COLUMN status ENUM(
                'aguardando_pagamento',
                'aguardando_retirada',
                'pago',
                'em_separacao',
                'enviado',
                'entregue',
                'cancelado',
                'devolvido',
                'aguardando_revisao_fiscal'
            ) NOT NULL DEFAULT 'aguardando_pagamento'");
        } else {
            // SQLite: o enum vira um CHECK IN(...). Troca por string para liberar
            // o novo status (suíte de testes). Mantém default.
            Schema::table('pedidos', function (Blueprint $table) {
                $table->string('status', 40)->default('aguardando_pagamento')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE pedidos MODIFY COLUMN status ENUM(
                'aguardando_pagamento',
                'aguardando_retirada',
                'pago',
                'em_separacao',
                'enviado',
                'entregue',
                'cancelado',
                'devolvido'
            ) NOT NULL DEFAULT 'aguardando_pagamento'");
        }

        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['nfe_chave', 'nfe_numero']);
        });
    }
};

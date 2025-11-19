<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill pagamentos_venda for vendas that have id_forma_pagamento set and no pagamentos yet
        DB::statement('
            INSERT INTO pagamentos_venda (
                id_venda,
                id_forma_pagamento,
                valor_pagamento,
                numero_parcelas,
                valor_parcela,
                numero_transacao,
                numero_autorizacao,
                status_pagamento,
                data_pagamento,
                observacoes,
                created_at,
                updated_at
            )
            SELECT
                v.id_venda,
                v.id_forma_pagamento,
                v.valor_total,
                1,
                v.valor_total,
                NULL,
                NULL,
                "aprovado",
                COALESCE(v.data_venda, NOW()),
                "Migrado de vendas.id_forma_pagamento",
                NOW(),
                NOW()
            FROM vendas v
            LEFT JOIN pagamentos_venda p ON p.id_venda = v.id_venda
            WHERE v.id_forma_pagamento IS NOT NULL
              AND p.id_pagamento IS NULL
              AND v.valor_total IS NOT NULL
              AND v.valor_total > 0
        ');
    }

    public function down(): void
    {
        // This backfill is irreversible safely; keep it empty
    }
};
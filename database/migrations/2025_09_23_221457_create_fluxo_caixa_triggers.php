<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Trigger 1: Fluxo de caixa para vendas finalizadas
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_venda
            AFTER UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                IF NEW.status = "finalizada" AND OLD.status != "finalizada" THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.id_usuario, NEW.id_pdv, "entrada", NEW.valor_total, 
                        CONCAT("Venda #", NEW.numero_venda), "venda", NOW(), NOW()
                    );
                END IF;
            END
        ');

        // Trigger 2: Fluxo de caixa para pagamento de contas a pagar
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_conta_pagar
            AFTER UPDATE ON contas_pagar
            FOR EACH ROW
            BEGIN
                IF NEW.status = "pago" AND OLD.status != "pago" AND NEW.data_pagamento IS NOT NULL THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.user_id, NEW.id_pdv, "saida", NEW.valor_pago, 
                        CONCAT("Pagamento - ", NEW.descricao), "despesa", NOW(), NOW()
                    );
                END IF;
            END
        ');

        // Trigger 3: Fluxo de caixa para recebimento de contas a receber
        DB::unprepared('
            CREATE TRIGGER tr_fluxo_caixa_conta_receber
            AFTER UPDATE ON contas_receber
            FOR EACH ROW
            BEGIN
                IF NEW.status = "recebido" AND OLD.status != "recebido" AND NEW.data_recebimento IS NOT NULL THEN
                    INSERT INTO fluxo_caixa (
                        user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                    ) VALUES (
                        NEW.user_id, NEW.id_pdv, "entrada", NEW.valor_recebido, 
                        CONCAT("Recebimento - ", NEW.descricao), "receita", NOW(), NOW()
                    );
                END IF;
            END
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_pagar');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_receber');
    }
};

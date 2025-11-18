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
        // Só executar triggers em bancos MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // Trigger 1: Fluxo de caixa para vendas finalizadas
        if (!$this->triggerExists('tr_fluxo_caixa_venda')) {
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
        }

        // Trigger 2: Fluxo de caixa para pagamento de contas a pagar
        if (!$this->triggerExists('tr_fluxo_caixa_conta_pagar')) {
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
        }

        // Trigger 3: Fluxo de caixa para recebimento de contas a receber
        if (!$this->triggerExists('tr_fluxo_caixa_conta_receber')) {
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Só executar em bancos MySQL/MariaDB
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_venda');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_pagar');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_conta_receber');
    }
    
    /**
     * Verificar se uma trigger existe
     */
    private function triggerExists(string $triggerName): bool
    {
        $result = DB::select("SHOW TRIGGERS LIKE '%{$triggerName}%' ");
        return count($result) > 0;
    }
};

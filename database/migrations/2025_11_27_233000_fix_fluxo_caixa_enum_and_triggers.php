<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update the ENUM column to include 'devolucao'
        // Note: Changing ENUMs in Doctrine/Laravel can be tricky, raw SQL is often safer for ENUM modifications to avoid losing data or complex mapping issues.
        DB::statement("ALTER TABLE fluxo_caixa MODIFY COLUMN categoria ENUM('venda', 'compra', 'despesa', 'receita', 'outros', 'devolucao') NOT NULL");

        // 2. Update the trigger
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_operacoes_venda');
            DB::unprepared('
                CREATE TRIGGER tr_fluxo_caixa_operacoes_venda
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

                    IF NEW.status = "devolvida" AND OLD.status != "devolvida" THEN
                        INSERT INTO fluxo_caixa (
                            user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                        ) VALUES (
                            NEW.id_usuario, NEW.id_pdv, "saida", NEW.valor_total,
                            CONCAT("Devolução #", NEW.numero_venda), "devolucao", NOW(), NOW()
                        );
                    END IF;

                    IF NEW.status = "cancelada" AND OLD.status = "finalizada" THEN
                        INSERT INTO fluxo_caixa (
                            user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                        ) VALUES (
                            NEW.id_usuario, NEW.id_pdv, "saida", NEW.valor_total,
                            CONCAT("Cancelamento #", NEW.numero_venda), "devolucao", NOW(), NOW()
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
        // Revert trigger to use 'despesa' instead of 'devolucao'
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_operacoes_venda');
            DB::unprepared('
                CREATE TRIGGER tr_fluxo_caixa_operacoes_venda
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

                    IF NEW.status = "devolvida" AND OLD.status != "devolvida" THEN
                        INSERT INTO fluxo_caixa (
                            user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                        ) VALUES (
                            NEW.id_usuario, NEW.id_pdv, "saida", NEW.valor_total,
                            CONCAT("Devolução #", NEW.numero_venda), "despesa", NOW(), NOW()
                        );
                    END IF;

                    IF NEW.status = "cancelada" AND OLD.status = "finalizada" THEN
                        INSERT INTO fluxo_caixa (
                            user_id, id_pdv, tipo_operacao, valor, descricao, categoria, created_at, updated_at
                        ) VALUES (
                            NEW.id_usuario, NEW.id_pdv, "saida", NEW.valor_total,
                            CONCAT("Cancelamento #", NEW.numero_venda), "despesa", NOW(), NOW()
                        );
                    END IF;
                END
            ');
        }

        // Revert ENUM (Warning: if there are 'devolucao' records, this might fail or truncate data depending on SQL mode, but for down() we try our best)
        // Ideally we should handle data cleanup before reverting enum, but for this fix we assume we can just revert the definition.
        DB::statement("ALTER TABLE fluxo_caixa MODIFY COLUMN categoria ENUM('venda', 'compra', 'despesa', 'receita', 'outros') NOT NULL");
    }
};

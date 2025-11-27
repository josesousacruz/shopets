<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS tr_atualizar_estoque_venda_finalizada');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_operacoes_venda_estoque');
        DB::unprepared('
            CREATE TRIGGER tr_operacoes_venda_estoque
            AFTER UPDATE ON vendas
            FOR EACH ROW
            BEGIN
                IF NEW.status = "finalizada" AND OLD.status != "finalizada" THEN
                    UPDATE produtos p
                    INNER JOIN itens_venda iv ON p.id_produto = iv.id_produto
                    SET p.estoque_atual = p.estoque_atual - iv.quantidade
                    WHERE iv.id_venda = NEW.id_venda;

                    INSERT INTO movimentacoes_estoque (
                        id_produto, id_usuario, id_item_venda, tipo_movimentacao,
                        quantidade, valor_unitario, data_movimentacao, observacoes, created_at, updated_at
                    )
                    SELECT 
                        iv.id_produto, NEW.id_usuario, iv.id_item, "venda",
                        iv.quantidade, iv.preco_unitario, NOW(), CONCAT("Venda #", NEW.numero_venda), NOW(), NOW()
                    FROM itens_venda iv
                    WHERE iv.id_venda = NEW.id_venda;
                END IF;

                IF NEW.status = "cancelada" AND OLD.status = "finalizada" THEN
                    UPDATE produtos p
                    INNER JOIN itens_venda iv ON p.id_produto = iv.id_produto
                    SET p.estoque_atual = p.estoque_atual + iv.quantidade
                    WHERE iv.id_venda = NEW.id_venda;

                    INSERT INTO movimentacoes_estoque (
                        id_produto, id_usuario, id_item_venda, tipo_movimentacao,
                        quantidade, valor_unitario, data_movimentacao, observacoes, created_at, updated_at
                    )
                    SELECT 
                        iv.id_produto, NEW.id_usuario, iv.id_item, "devolucao",
                        iv.quantidade, iv.preco_unitario, NOW(), CONCAT("Cancelamento da venda #", NEW.numero_venda), NOW(), NOW()
                    FROM itens_venda iv
                    WHERE iv.id_venda = NEW.id_venda;
                END IF;

                IF NEW.status = "devolvida" AND OLD.status != "devolvida" THEN
                    UPDATE produtos p
                    INNER JOIN itens_venda iv ON p.id_produto = iv.id_produto
                    SET p.estoque_atual = p.estoque_atual + iv.quantidade
                    WHERE iv.id_venda = NEW.id_venda;

                    INSERT INTO movimentacoes_estoque (
                        id_produto, id_usuario, id_item_venda, tipo_movimentacao,
                        quantidade, valor_unitario, data_movimentacao, observacoes, created_at, updated_at
                    )
                    SELECT 
                        iv.id_produto, NEW.id_usuario, iv.id_item, "devolucao",
                        iv.quantidade, iv.preco_unitario, NOW(), CONCAT("Devolução da venda #", NEW.numero_venda), NOW(), NOW()
                    FROM itens_venda iv
                    WHERE iv.id_venda = NEW.id_venda;
                END IF;
            END
        ');

        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_venda');
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

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }
        DB::unprepared('DROP TRIGGER IF EXISTS tr_operacoes_venda_estoque');
        DB::unprepared('DROP TRIGGER IF EXISTS tr_fluxo_caixa_operacoes_venda');
    }
};


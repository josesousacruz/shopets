<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\FormaPagamento;

class FormasPagamentoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $formasPagamento = [
            [
                'nome' => 'Dinheiro',
                'descricao' => 'Pagamento em dinheiro/espécie',
                'tipo' => 'dinheiro',
                'permite_parcelamento' => false,
                'max_parcelas' => 1,
                'taxa_juros' => 0.00,
                'taxa_desconto' => 0.00,
                'ativo' => true,
                'ordem_exibicao' => 1,
            ],
            [
                'nome' => 'Cartão de Crédito',
                'descricao' => 'Pagamento com cartão de crédito',
                'tipo' => 'cartao_credito',
                'permite_parcelamento' => true,
                'max_parcelas' => 12,
                'taxa_juros' => 0.00,
                'taxa_desconto' => 0.00,
                'ativo' => true,
                'ordem_exibicao' => 2,
            ],
            [
                'nome' => 'Cartão de Débito',
                'descricao' => 'Pagamento com cartão de débito',
                'tipo' => 'cartao_debito',
                'permite_parcelamento' => false,
                'max_parcelas' => 1,
                'taxa_juros' => 0.00,
                'taxa_desconto' => 0.00,
                'ativo' => true,
                'ordem_exibicao' => 3,
            ],
            [
                'nome' => 'PIX',
                'descricao' => 'Pagamento via PIX',
                'tipo' => 'pix',
                'permite_parcelamento' => false,
                'max_parcelas' => 1,
                'taxa_juros' => 0.00,
                'taxa_desconto' => 0.00,
                'ativo' => true,
                'ordem_exibicao' => 4,
            ],
        ];

        foreach ($formasPagamento as $forma) {
            FormaPagamento::updateOrCreate(
                ['nome' => $forma['nome']],
                $forma
            );
        }

        $this->command->info('Formas de pagamento criadas com sucesso!');
    }
}

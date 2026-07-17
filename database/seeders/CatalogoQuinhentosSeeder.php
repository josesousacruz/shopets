<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Cria 500 produtos COMPLETOS de uma loja de acessórios de celular:
 * categorias visíveis na loja, preços/custo/margem, SEO, estoque e
 * variações (cor/modelo/comprimento/capacidade) quando fazem sentido.
 *
 * Idempotência: as categorias usam firstOrCreate; os produtos são
 * sempre ADICIONADOS por cima (a meta é criar 500 novos por execução).
 * As fotos ficam a cargo do CatalogoFotosSeeder.
 */
class CatalogoQuinhentosSeeder extends Seeder
{
    private const META = 500;

    /** Marcas plausíveis do segmento. */
    private array $marcas = [
        'Baseus', 'Anker', 'JBL', 'Geonav', 'i2GO', 'Multilaser', 'Intelbras',
        'ELG', 'PMCELL', 'Hrebos', 'Devia', 'Ugreen', 'Romoss', 'Edifier', 'QGeeM',
    ];

    /** Modelos de celular para capas/películas. */
    private array $modelos = [
        'iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 14',
        'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
        'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S24', 'Galaxy S24 Ultra',
        'Galaxy A14', 'Galaxy A34', 'Galaxy A54', 'Redmi Note 12', 'Redmi Note 13',
        'Poco X6', 'Moto G84', 'Moto Edge 40', 'Moto G54', 'Xiaomi 13',
    ];

    private array $cores = [
        'Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde',
        'Transparente', 'Roxo', 'Dourado', 'Grafite',
    ];

    /**
     * Config por categoria: ícone, NCM, faixa de preço (venda),
     * faixa de peso (g), tipos de produto, se usa modelo de celular no nome,
     * e a estratégia de variação (cor/pack/comprimento/capacidade/nenhuma).
     */
    private function categoriasConfig(): array
    {
        return [
            'Capas para Celular' => [
                'icone' => '📱', 'ncm' => '3926.90.90', 'preco' => [19.90, 89.90], 'peso' => [25, 70],
                'tipos' => ['Capa Anti-Impacto', 'Capa de Silicone', 'Capa Transparente', 'Capa Carteira',
                    'Capa Flip Espelhada', 'Capa Magnética MagSafe', 'Capa Rígida Premium', 'Capa de Couro Sintético'],
                'usaModelo' => true, 'variacao' => 'cor', 'peso_var' => 0,
            ],
            'Películas e Protetores' => [
                'icone' => '🛡️', 'ncm' => '3919.90.90', 'preco' => [9.90, 49.90], 'peso' => [10, 40],
                'tipos' => ['Película de Vidro 3D', 'Película de Hidrogel', 'Película Cerâmica Flexível',
                    'Película de Privacidade', 'Película Fosca Anti-Reflexo'],
                'usaModelo' => true, 'variacao' => 'pack', 'peso_var' => 0,
            ],
            'Carregadores' => [
                'icone' => '🔌', 'ncm' => '8504.40.90', 'preco' => [34.90, 199.90], 'peso' => [60, 220],
                'tipos' => ['Carregador Turbo 20W', 'Carregador de Parede 33W', 'Carregador Veicular 30W',
                    'Carregador Wireless 15W', 'Carregador GaN 65W', 'Fonte USB-C PD 45W'],
                'usaModelo' => false, 'variacao' => 'cor', 'peso_var' => 0,
            ],
            'Cabos USB' => [
                'icone' => '🔗', 'ncm' => '8544.42.00', 'preco' => [14.90, 69.90], 'peso' => [30, 120],
                'tipos' => ['Cabo USB-C', 'Cabo Lightning', 'Cabo Micro USB', 'Cabo USB-C para Lightning',
                    'Cabo 3 em 1', 'Cabo Trançado Premium USB-C'],
                'usaModelo' => false, 'variacao' => 'comprimento', 'peso_var' => 10,
            ],
            'Fones de Ouvido' => [
                'icone' => '🎧', 'ncm' => '8518.30.00', 'preco' => [29.90, 349.90], 'peso' => [20, 280],
                'tipos' => ['Fone Bluetooth TWS', 'Fone In-Ear com Fio', 'Headset Gamer RGB',
                    'Fone Esportivo à Prova de Suor', 'Earbuds com Cancelamento de Ruído'],
                'usaModelo' => false, 'variacao' => 'cor', 'peso_var' => 0,
            ],
            'Caixas de Som Bluetooth' => [
                'icone' => '🔊', 'ncm' => '8518.22.00', 'preco' => [79.90, 599.90], 'peso' => [200, 1500],
                'tipos' => ['Caixa Bluetooth Portátil', 'Speaker à Prova d\'Água IPX7', 'Mini Speaker de Bolso',
                    'Caixa de Som 20W Stereo', 'Soundbar Compacta'],
                'usaModelo' => false, 'variacao' => 'cor', 'peso_var' => 0,
            ],
            'Suportes e Acessórios' => [
                'icone' => '🧷', 'ncm' => '3926.90.90', 'preco' => [9.90, 99.90], 'peso' => [30, 400],
                'tipos' => ['Suporte Veicular Magnético', 'Pop Socket', 'Anel Suporte 360°', 'Tripé Selfie Bluetooth',
                    'Suporte de Mesa Ajustável', 'Organizador de Cabos', 'Caneta Stylus'],
                'usaModelo' => false, 'variacao' => 'nenhuma', 'peso_var' => 0,
            ],
            'Power Banks' => [
                'icone' => '🔋', 'ncm' => '8507.60.00', 'preco' => [59.90, 299.90], 'peso' => [150, 600],
                'tipos' => ['Power Bank', 'Carregador Portátil Turbo', 'Bateria Externa Slim'],
                'usaModelo' => false, 'variacao' => 'capacidade', 'peso_var' => 80,
            ],
            'Smartwatches e Pulseiras' => [
                'icone' => '⌚', 'ncm' => '9102.12.00', 'preco' => [89.90, 699.90], 'peso' => [30, 120],
                'tipos' => ['Smartwatch', 'Relógio Inteligente Fitness', 'Pulseira de Silicone para Smartwatch',
                    'Pulseira Milanese para Smartwatch'],
                'usaModelo' => false, 'variacao' => 'cor', 'peso_var' => 0,
            ],
            'Adaptadores e Hubs' => [
                'icone' => '🧩', 'ncm' => '8517.62.59', 'preco' => [19.90, 149.90], 'peso' => [20, 200],
                'tipos' => ['Adaptador USB-C para USB', 'Hub USB 4 Portas', 'Adaptador HDMI 4K',
                    'Leitor de Cartão SD', 'Adaptador OTG', 'Dock Station USB-C'],
                'usaModelo' => false, 'variacao' => 'nenhuma', 'peso_var' => 0,
            ],
        ];
    }

    public function run(): void
    {
        mt_srand(20260613); // saída reproduzível

        $config = $this->categoriasConfig();

        // 1) Categorias (visíveis na loja)
        $ordem = 1;
        $categorias = [];
        foreach ($config as $nome => $cfg) {
            $categorias[$nome] = Categoria::firstOrCreate(
                ['slug' => Str::slug($nome)],
                [
                    'nome' => $nome,
                    'descricao' => 'Acessórios da categoria '.$nome.'.',
                    'descricao_seo' => $nome.' com entrega rápida para todo o Brasil. Qualidade e garantia Shopets.',
                    'icone' => $cfg['icone'],
                    'ativo' => true,
                    'visivel_ecommerce' => true,
                    'ordem' => $ordem++,
                ]
            );
        }
        $this->command->info('Categorias prontas: '.count($categorias));

        // 2) Distribuição dos 500 produtos (peso maior nas categorias âncora)
        $pesos = [
            'Capas para Celular' => 150,
            'Películas e Protetores' => 90,
            'Carregadores' => 55,
            'Cabos USB' => 55,
            'Fones de Ouvido' => 50,
            'Power Banks' => 30,
            'Suportes e Acessórios' => 30,
            'Caixas de Som Bluetooth' => 15,
            'Smartwatches e Pulseiras' => 15,
            'Adaptadores e Hubs' => 10,
        ];
        // Normaliza para somar exatamente 500
        $fila = [];
        foreach ($pesos as $nome => $qtd) {
            for ($i = 0; $i < $qtd; $i++) {
                $fila[] = $nome;
            }
        }
        while (count($fila) < self::META) {
            $fila[] = 'Capas para Celular';
        }
        $fila = array_slice($fila, 0, self::META);

        $nomesUsados = [];
        $skusUsados = [];
        $seq = (int) (Produto::query()->withoutGlobalScopes()->max('id_produto') ?? 0);
        $criados = 0;
        $comVariacao = 0;
        $totalVariacoes = 0;

        DB::transaction(function () use (
            $config, $categorias, $fila,
            &$nomesUsados, &$skusUsados, &$seq, &$criados, &$comVariacao, &$totalVariacoes
        ) {
            foreach ($fila as $catNome) {
                $cfg = $config[$catNome];
                $seq++;

                $nome = $this->gerarNomeUnico($cfg, $nomesUsados);
                $nomesUsados[$nome] = true;

                $precoVenda = $this->precoNaFaixa($cfg['preco']);
                $precoCusto = round($precoVenda * $this->mtRandFloat(0.45, 0.62), 2);
                $emPromocao = mt_rand(1, 100) <= 25;
                $precoPromo = $emPromocao ? round($precoVenda * $this->mtRandFloat(0.78, 0.92), 2) : null;
                $peso = mt_rand($cfg['peso'][0], $cfg['peso'][1]);

                $codigoInterno = 'SKU-'.str_pad((string) $seq, 6, '0', STR_PAD_LEFT);
                $slug = Str::limit(Str::slug($nome), 210, '').'-'.$seq; // único e estável

                $produto = Produto::create([
                    'nome' => $nome,
                    'slug' => $slug,
                    'codigo_barras' => $this->gerarEan13(),
                    'codigo_interno' => $codigoInterno,
                    'descricao' => $this->descricaoCurta($catNome),
                    'descricao_curta' => $this->descricaoCurta($catNome),
                    'descricao_longa' => $this->descricaoLonga($nome, $catNome),
                    'preco_custo' => $precoCusto,
                    'preco_venda' => $precoVenda,
                    'margem_lucro' => $precoCusto > 0 ? round((($precoVenda - $precoCusto) / $precoCusto) * 100, 2) : 0,
                    'estoque_minimo' => 5,
                    'estoque_maximo' => 500,
                    'unidade' => 'un',
                    'permite_fracao' => false,
                    'id_categoria' => $categorias[$catNome]->id_categoria,
                    'ncm' => $cfg['ncm'],
                    'ativo' => true,
                    'visivel_ecommerce' => true,
                    'destaque' => mt_rand(1, 100) <= 12,
                    'novo' => mt_rand(1, 100) <= 25,
                    'em_promocao' => $emPromocao,
                    'preco_promocional' => $precoPromo,
                    'peso_gramas' => $peso,
                    'altura_cm' => $this->mtRandFloat(1, 18),
                    'largura_cm' => $this->mtRandFloat(4, 20),
                    'comprimento_cm' => $this->mtRandFloat(6, 22),
                    'meta_title' => Str::limit($nome.' | Shopets', 60, ''),
                    'meta_description' => Str::limit($this->descricaoCurta($catNome), 155, '...'),
                    'estoque_atual' => 0, // ajustado abaixo
                ]);

                // Variações quando a categoria pede
                $opcoes = $this->opcoesVariacao($cfg['variacao']);
                if (! empty($opcoes)) {
                    $estoqueTotal = 0;
                    $vIndex = 0;
                    foreach ($opcoes as $label => $delta) {
                        $vIndex++;
                        $sku = $this->skuUnico($codigoInterno, $vIndex, $skusUsados);
                        $skusUsados[$sku] = true;
                        $estoqueVar = mt_rand(3, 45);
                        $estoqueTotal += $estoqueVar;
                        $precoVar = round($precoVenda + $delta, 2);

                        ProdutoVariacao::create([
                            'id_produto' => $produto->id_produto,
                            'sku' => $sku,
                            'nome_variacao' => $label,
                            'atributos' => [$cfg['variacao'] => $label],
                            'preco_venda' => $precoVar,
                            'preco_promocional' => $emPromocao ? round($precoVar * 0.85, 2) : null,
                            'estoque_atual' => $estoqueVar,
                            'estoque_minimo' => 2,
                            'peso_gramas' => $peso + ($cfg['peso_var'] * ($vIndex - 1)),
                            'ativo' => true,
                        ]);
                    }
                    $produto->update(['estoque_atual' => $estoqueTotal]);
                    $comVariacao++;
                    $totalVariacoes += $vIndex;
                } else {
                    $produto->update(['estoque_atual' => mt_rand(8, 150)]);
                }

                $criados++;
                if ($criados % 50 === 0) {
                    $this->command->getOutput()->write(' '.$criados);
                }
            }
        });

        $this->command->getOutput()->writeln('');
        $this->command->info("Produtos criados: {$criados} ({$comVariacao} com variações, {$totalVariacoes} variações no total).");
        $this->command->info('Agora rode: php artisan db:seed --class=CatalogoFotosSeeder');
    }

    /* ----------------- helpers ----------------- */

    private function gerarNomeUnico(array $cfg, array $usados): string
    {
        for ($tentativa = 0; $tentativa < 60; $tentativa++) {
            $marca = $this->marcas[array_rand($this->marcas)];
            $tipo = $cfg['tipos'][array_rand($cfg['tipos'])];

            if ($cfg['usaModelo']) {
                $modelo = $this->modelos[array_rand($this->modelos)];
                $nome = "{$marca} {$tipo} para {$modelo}";
            } else {
                $nome = "{$marca} {$tipo}";
            }

            if (! isset($usados[$nome])) {
                return $nome;
            }
        }

        // Fallback garantido: anexa um sufixo curto único
        return $nome.' '.strtoupper(Str::random(4));
    }

    private function opcoesVariacao(string $tipo): array
    {
        switch ($tipo) {
            case 'cor':
                $qtd = mt_rand(3, 5);
                $cores = $this->cores;
                shuffle($cores);

                return array_fill_keys(array_slice($cores, 0, $qtd), 0.0);
            case 'pack':
                return ['1 unidade' => 0.0, 'Kit 2 unidades' => 8.0, 'Kit 3 unidades' => 14.0];
            case 'comprimento':
                return ['1 m' => 0.0, '1,5 m' => 5.0, '2 m' => 10.0, '3 m' => 18.0];
            case 'capacidade':
                return ['5.000 mAh' => 0.0, '10.000 mAh' => 30.0, '20.000 mAh' => 70.0, '30.000 mAh' => 120.0];
            default:
                return [];
        }
    }

    private function skuUnico(string $base, int $idx, array $usados): string
    {
        $sku = $base.'-V'.$idx;
        while (isset($usados[$sku])) {
            $sku = $base.'-V'.$idx.strtoupper(Str::random(2));
        }

        return Str::limit($sku, 60, '');
    }

    private function precoNaFaixa(array $faixa): float
    {
        $valor = $this->mtRandFloat($faixa[0], $faixa[1]);

        // Termina em ,90 (preço psicológico comum no varejo)
        return (float) (floor($valor) + 0.90);
    }

    private function mtRandFloat(float $min, float $max): float
    {
        return round($min + (mt_rand() / mt_getrandmax()) * ($max - $min), 2);
    }

    private function gerarEan13(): string
    {
        $n = '789'; // prefixo Brasil
        for ($i = 0; $i < 10; $i++) {
            $n .= mt_rand(0, 9);
        }

        return $n;
    }

    private function descricaoCurta(string $cat): string
    {
        $map = [
            'Capas para Celular' => 'Capa resistente com proteção contra quedas e arranhões no dia a dia.',
            'Películas e Protetores' => 'Proteção de tela com alta transparência e toque suave.',
            'Carregadores' => 'Carregamento rápido e seguro com proteção contra sobrecarga.',
            'Cabos USB' => 'Cabo reforçado para carga e sincronização de dados em alta velocidade.',
            'Fones de Ouvido' => 'Áudio nítido com graves potentes e conforto para uso prolongado.',
            'Caixas de Som Bluetooth' => 'Som potente e portátil com conexão Bluetooth estável.',
            'Suportes e Acessórios' => 'Acessório prático para o dia a dia com seu smartphone.',
            'Power Banks' => 'Bateria externa de alta capacidade para recarregar onde estiver.',
            'Smartwatches e Pulseiras' => 'Acompanhe saúde, notificações e atividades no seu pulso.',
            'Adaptadores e Hubs' => 'Expanda as conexões do seu dispositivo com praticidade.',
        ];

        return $map[$cat] ?? 'Acessório de alta qualidade para o seu smartphone.';
    }

    private function descricaoLonga(string $nome, string $cat): string
    {
        return "{$nome} é a escolha ideal para quem busca qualidade e durabilidade. ".
            $this->descricaoCurta($cat).' '.
            'Produto com garantia, materiais selecionados e acabamento premium. '.
            'Envio rápido para todo o Brasil e suporte dedicado da Shopets.';
    }
}

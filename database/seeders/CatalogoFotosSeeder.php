<?php

namespace Database\Seeders;

use App\Models\Produto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

/**
 * Anexa UMA foto por produto visível na loja que ainda não tem mídia.
 * Tenta baixar foto real (loremflickr, por palavra-chave da categoria);
 * se falhar, gera um placeholder GD com gradiente + nome do produto.
 *
 * Idempotente e resumível: pula produtos que já têm imagem, então pode
 * ser interrompido e re-executado sem duplicar nem rebaixar tudo.
 */
class CatalogoFotosSeeder extends Seeder
{
    private array $keywords = [
        'Capas para Celular' => 'smartphone,case',
        'Películas e Protetores' => 'smartphone,screen',
        'Carregadores' => 'phone,charger',
        'Cabos USB' => 'usb,cable',
        'Fones de Ouvido' => 'earphones,headphones',
        'Caixas de Som Bluetooth' => 'bluetooth,speaker',
        'Suportes e Acessórios' => 'phone,holder,stand',
        'Power Banks' => 'powerbank,battery',
        'Smartwatches e Pulseiras' => 'smartwatch,watch',
        'Adaptadores e Hubs' => 'usb,adapter,hub',
    ];

    /** Cores (RGB) por categoria para o placeholder. */
    private array $cores = [
        'Capas para Celular' => [124, 58, 237],
        'Películas e Protetores' => [14, 165, 233],
        'Carregadores' => [22, 163, 74],
        'Cabos USB' => [202, 138, 4],
        'Fones de Ouvido' => [219, 39, 119],
        'Caixas de Som Bluetooth' => [147, 51, 234],
        'Suportes e Acessórios' => [13, 148, 136],
        'Power Banks' => [220, 38, 38],
        'Smartwatches e Pulseiras' => [37, 99, 235],
        'Adaptadores e Hubs' => [100, 116, 139],
    ];

    private string $fonte = 'C:\\Windows\\Fonts\\arialbd.ttf';

    public function run(): void
    {
        $fonte = is_file($this->fonte) ? $this->fonte : null;

        $produtos = Produto::query()
            ->where('visivel_ecommerce', true)
            ->with('categoria')
            ->get();

        $total = $produtos->count();
        $this->command->info("Verificando fotos de {$total} produtos (baixa real, fallback placeholder)...");

        $baixadas = 0;
        $placeholders = 0;
        $pulados = 0;

        foreach ($produtos as $produto) {
            if ($produto->getFirstMedia('images')) {
                $pulados++;
                continue; // já tem foto — resumível
            }

            $catNome = optional($produto->categoria)->nome ?? 'Capas para Celular';
            $kw = $this->keywords[$catNome] ?? 'smartphone,accessory';
            $url = "https://loremflickr.com/800/800/{$kw}?lock={$produto->id_produto}";

            $conteudo = null;
            try {
                $resp = Http::timeout(30)->retry(2, 600)->get($url);
                if ($resp->successful()
                    && strlen($resp->body()) > 5000
                    && str_starts_with($resp->header('Content-Type', ''), 'image/')
                ) {
                    $conteudo = $resp->body();
                }
            } catch (\Throwable $e) {
                // cai no placeholder
            }

            if ($conteudo !== null) {
                $produto->addMediaFromString($conteudo)
                    ->usingFileName($produto->slug.'.jpg')
                    ->usingName($produto->nome)
                    ->toMediaCollection('images');
                $baixadas++;
                $this->command->getOutput()->write('.');
                usleep(220_000); // gentil com o serviço
            } elseif (extension_loaded('gd')) {
                $cor = $this->cores[$catNome] ?? [100, 116, 139];
                $png = $this->gerarPng($produto->nome, $catNome, $cor, $fonte);
                $produto->addMediaFromString($png)
                    ->usingFileName($produto->slug.'.png')
                    ->usingName($produto->nome)
                    ->toMediaCollection('images');
                $placeholders++;
                $this->command->getOutput()->write('p');
            } else {
                $this->command->getOutput()->write('x');
            }

            if (($baixadas + $placeholders) % 50 === 0 && ($baixadas + $placeholders) > 0) {
                $this->command->getOutput()->write(' '.($baixadas + $placeholders).' ');
            }
        }

        $this->command->getOutput()->writeln('');
        $this->command->info("Fotos: {$baixadas} reais, {$placeholders} placeholders, {$pulados} já tinham.");
        $this->command->info('Rode "php artisan queue:work --stop-when-empty" para gerar conversões (thumb/medium/large).');
    }

    private function gerarPng(string $nome, string $categoria, array $cor, ?string $fonte): string
    {
        $w = 800;
        $h = 800;
        $img = imagecreatetruecolor($w, $h);
        [$r, $g, $b] = $cor;

        for ($y = 0; $y < $h; $y++) {
            $t = $y / $h;
            $cr = (int) ($r + (255 - $r) * (1 - $t) * 0.85);
            $cg = (int) ($g + (255 - $g) * (1 - $t) * 0.85);
            $cb = (int) ($b + (255 - $b) * (1 - $t) * 0.85);
            $linha = imagecolorallocate($img, min(255, $cr), min(255, $cg), min(255, $cb));
            imagefilledrectangle($img, 0, $y, $w, $y, $linha);
        }

        $branco = imagecolorallocatealpha($img, 255, 255, 255, 40);
        imagefilledellipse($img, (int) ($w / 2), 320, 280, 280, $branco);

        $corEscura = imagecolorallocate($img, (int) ($r * 0.6), (int) ($g * 0.6), (int) ($b * 0.6));
        $inicial = mb_strtoupper(mb_substr($nome, 0, 1));

        if ($fonte) {
            $bbox = imagettfbbox(140, 0, $fonte, $inicial);
            $larguraTexto = $bbox[2] - $bbox[0];
            imagettftext($img, 140, 0, (int) (($w - $larguraTexto) / 2), 375, $corEscura, $fonte, $inicial);

            $branco2 = imagecolorallocate($img, 255, 255, 255);
            $cat = mb_strtoupper($categoria);
            $bboxCat = imagettfbbox(22, 0, $fonte, $cat);
            $lc = $bboxCat[2] - $bboxCat[0];
            imagettftext($img, 22, 0, (int) (($w - $lc) / 2), 100, $branco2, $fonte, $cat);

            $linhas = $this->quebrarTexto($nome, $fonte, 30, $w - 120);
            $yTexto = 560;
            foreach (array_slice($linhas, 0, 3) as $linha) {
                $bb = imagettfbbox(30, 0, $fonte, $linha);
                $ll = $bb[2] - $bb[0];
                imagettftext($img, 30, 0, (int) (($w - $ll) / 2), $yTexto, $branco2, $fonte, $linha);
                $yTexto += 46;
            }
        } else {
            $branco2 = imagecolorallocate($img, 255, 255, 255);
            imagestring($img, 5, (int) ($w / 2 - 40), 300, $inicial, $corEscura);
            imagestring($img, 4, 40, 560, $nome, $branco2);
        }

        ob_start();
        imagepng($img);
        $png = ob_get_clean();
        imagedestroy($img);

        return $png;
    }

    private function quebrarTexto(string $texto, string $fonte, int $tamanho, int $larguraMax): array
    {
        $palavras = explode(' ', $texto);
        $linhas = [];
        $atual = '';

        foreach ($palavras as $palavra) {
            $teste = $atual === '' ? $palavra : $atual.' '.$palavra;
            $bbox = imagettfbbox($tamanho, 0, $fonte, $teste);
            $largura = $bbox[2] - $bbox[0];

            if ($largura > $larguraMax && $atual !== '') {
                $linhas[] = $atual;
                $atual = $palavra;
            } else {
                $atual = $teste;
            }
        }

        if ($atual !== '') {
            $linhas[] = $atual;
        }

        return $linhas;
    }
}

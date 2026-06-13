<?php

namespace App\Services\Relatorios;

use Barryvdh\DomPDF\Facade\Pdf;
use League\Csv\Writer;

class RelatorioExportService
{
    /**
     * Exporta o relatório no formato pedido.
     * XLSX cai para CSV (phpspreadsheet não instalado).
     *
     * @return array{conteudo:string, content_type:string, filename:string}
     */
    public function exportar(array $definicao, array $linhas, string $formato): array
    {
        $colunas = $definicao['colunas']; // key => label
        $slug = $definicao['slug'];

        if ($formato === 'pdf') {
            return $this->pdf($definicao, $colunas, $linhas, $slug);
        }

        // csv (e xlsx como fallback)
        return $this->csv($colunas, $linhas, $slug);
    }

    private function csv(array $colunas, array $linhas, string $slug): array
    {
        $csv = Writer::createFromString();
        $csv->insertOne(array_values($colunas));
        foreach ($linhas as $linha) {
            $csv->insertOne(array_map(
                fn ($k) => $this->valor($linha[$k] ?? ''),
                array_keys($colunas),
            ));
        }

        return [
            'conteudo' => $csv->toString(),
            'content_type' => 'text/csv; charset=UTF-8',
            'filename' => "{$slug}.csv",
        ];
    }

    private function pdf(array $definicao, array $colunas, array $linhas, string $slug): array
    {
        $head = '';
        foreach ($colunas as $label) {
            $head .= '<th style="text-align:left;border-bottom:1px solid #333;padding:4px">'.e($label).'</th>';
        }
        $body = '';
        foreach ($linhas as $linha) {
            $body .= '<tr>';
            foreach (array_keys($colunas) as $k) {
                $body .= '<td style="padding:4px;border-bottom:1px solid #ddd">'.e($this->valor($linha[$k] ?? '')).'</td>';
            }
            $body .= '</tr>';
        }

        $html = '<html><body style="font-family:sans-serif;font-size:12px">'
            .'<h2>'.e($definicao['nome']).'</h2>'
            .'<table style="width:100%;border-collapse:collapse"><thead><tr>'.$head.'</tr></thead>'
            .'<tbody>'.$body.'</tbody></table></body></html>';

        return [
            'conteudo' => Pdf::loadHTML($html)->output(),
            'content_type' => 'application/pdf',
            'filename' => "{$slug}.pdf",
        ];
    }

    private function valor($v): string
    {
        if (is_float($v)) {
            return number_format($v, 2, ',', '.');
        }

        return (string) $v;
    }
}

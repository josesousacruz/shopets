<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Fechamento do Dia - {{ $data }}</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 12px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin-top: 18px; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; }
        .text-right { text-align: right; }
        .summary { margin-top: 8px; }
    </style>
</head>
<body>
    <h1>Fechamento de Caixa</h1>
    <div>Data: {{ \Carbon\Carbon::parse($data)->format('d/m/Y') }}</div>

    <h2>Produtos Vendidos</h2>
    <table>
        <thead>
            <tr>
                <th>Produto</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Bruto</th>
                <th class="text-right">Desconto</th>
                <th class="text-right">Líquido</th>
            </tr>
        </thead>
        <tbody>
            @forelse($produtos as $nome => $info)
                <tr>
                    <td>{{ $nome }}</td>
                    <td class="text-right">{{ number_format($info['quantidade'],0,',','.') }}</td>
                    <td class="text-right">R$ {{ number_format($info['bruto'],2,',','.') }}</td>
                    <td class="text-right">R$ {{ number_format($info['desconto'],2,',','.') }}</td>
                    <td class="text-right">R$ {{ number_format($info['liquido'],2,',','.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5">Nenhum produto vendido nesta data.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="summary">
        <strong>Total de itens:</strong> {{ number_format($total_itens,0,',','.') }}<br>
        <strong>Valor líquido arrecadado:</strong> R$ {{ number_format($total_liquido,2,',','.') }}
    </div>

    <h2>Vendas por Forma de Pagamento</h2>
    <table>
        <thead>
            <tr>
                <th>Forma</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @forelse($formas as $f)
                <tr>
                    <td>{{ $f->nome }}</td>
                    <td class="text-right">R$ {{ number_format((float)$f->total,2,',','.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="2">Nenhuma venda em formas de pagamento nesta data.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
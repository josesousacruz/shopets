<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Testing EstoqueController logic ===\n";

// Carregar dados reais do banco
$fornecedores = App\Models\Fornecedor::all();

echo "Fornecedores encontrados: " . $fornecedores->count() . "\n\n";

// Converter fornecedores para formato esperado pelo frontend
$suppliers = $fornecedores->map(function ($fornecedor) {
    echo "Processando fornecedor: {$fornecedor->nome} (ID: {$fornecedor->id_fornecedor})\n";
    
    // Carregar produtos associados ao fornecedor
    try {
        $productIds = $fornecedor->produtos()->pluck('produtos.id_produto')->toArray();
        echo "Produtos associados: " . implode(', ', $productIds) . "\n";
    } catch (Exception $e) {
        echo "ERRO ao carregar produtos: " . $e->getMessage() . "\n";
        $productIds = [];
    }
    
    $supplier = [
        'id' => $fornecedor->id_fornecedor,
        'name' => $fornecedor->nome,
        'contactPerson' => $fornecedor->contato,
        'phone' => $fornecedor->telefone,
        'email' => $fornecedor->email,
        'address' => $fornecedor->endereco,
        'productIds' => $productIds
    ];
    
    echo "Supplier final: " . json_encode($supplier, JSON_PRETTY_PRINT) . "\n\n";
    
    return $supplier;
});

echo "=== Resultado final ===\n";
echo json_encode($suppliers->toArray(), JSON_PRETTY_PRINT) . "\n";

echo "\n=== Testing AddStockModal filtering logic ===\n";
$productId = 1; // ID do produto que tem fornecedores associados
echo "Testando para produto ID: {$productId}\n";

$associatedSuppliers = $suppliers->filter(function($supplier) use ($productId) {
    $hasProduct = $supplier['productIds'] && in_array($productId, $supplier['productIds']);
    echo "Fornecedor {$supplier['name']}: " . ($hasProduct ? "TEM" : "NÃO TEM") . " produto {$productId}\n";
    return $hasProduct;
});

echo "Fornecedores associados ao produto {$productId}: " . $associatedSuppliers->count() . "\n";
foreach ($associatedSuppliers as $supplier) {
    echo "- {$supplier['name']}\n";
}
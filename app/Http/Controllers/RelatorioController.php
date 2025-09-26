<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class RelatorioController extends Controller
{
    public function index()
    {
        // Dados mockados para vendas
        $sales = [
            [
                'id' => '1',
                'customerId' => '1',
                'total' => 150.00,
                'date' => '2024-01-20',
                'paymentMethod' => 'credit',
                'items' => [
                    [
                        'product' => [
                            'id' => '1',
                            'name' => 'Ração Premium',
                            'price' => 45.90,
                            'category' => 'Ração'
                        ],
                        'quantity' => 2,
                        'unitPrice' => 45.90
                    ],
                    [
                        'product' => [
                            'id' => '3',
                            'name' => 'Shampoo Pet',
                            'price' => 24.90,
                            'category' => 'Higiene'
                        ],
                        'quantity' => 1,
                        'unitPrice' => 24.90
                    ]
                ]
            ],
            [
                'id' => '2',
                'customerId' => '2',
                'total' => 300.00,
                'date' => '2024-01-22',
                'paymentMethod' => 'debit',
                'items' => [
                    [
                        'product' => [
                            'id' => '1',
                            'name' => 'Ração Premium',
                            'price' => 45.90,
                            'category' => 'Ração'
                        ],
                        'quantity' => 4,
                        'unitPrice' => 45.90
                    ],
                    [
                        'product' => [
                            'id' => '2',
                            'name' => 'Bola de Borracha',
                            'price' => 12.50,
                            'category' => 'Brinquedos'
                        ],
                        'quantity' => 3,
                        'unitPrice' => 12.50
                    ]
                ]
            ],
            [
                'id' => '3',
                'customerId' => '1',
                'total' => 89.80,
                'date' => '2024-01-25',
                'paymentMethod' => 'pix',
                'items' => [
                    [
                        'product' => [
                            'id' => '1',
                            'name' => 'Ração Premium',
                            'price' => 45.90,
                            'category' => 'Ração'
                        ],
                        'quantity' => 1,
                        'unitPrice' => 45.90
                    ],
                    [
                        'product' => [
                            'id' => '3',
                            'name' => 'Shampoo Pet',
                            'price' => 24.90,
                            'category' => 'Higiene'
                        ],
                        'quantity' => 1,
                        'unitPrice' => 24.90
                    ]
                ]
            ],
            [
                'id' => '4',
                'customerId' => '3',
                'total' => 125.00,
                'date' => '2024-01-18',
                'paymentMethod' => 'cash',
                'items' => [
                    [
                        'product' => [
                            'id' => '2',
                            'name' => 'Bola de Borracha',
                            'price' => 12.50,
                            'category' => 'Brinquedos'
                        ],
                        'quantity' => 10,
                        'unitPrice' => 12.50
                    ]
                ]
            ]
        ];

        // Dados mockados para produtos
        $products = [
            [
                'id' => '1',
                'name' => 'Ração Premium',
                'price' => 45.90,
                'purchasePrice' => 30.00,
                'salePrice' => 45.90,
                'stock' => 15,
                'category' => 'Ração',
                'barcode' => '7891234567890',
                'description' => 'Ração premium para cães adultos',
                'unit' => 'kg',
                'allowFractional' => true,
                'minQuantity' => 0.5,
                'stepQuantity' => 0.5,
                'minStock' => 10,
                'supplierId' => '1'
            ],
            [
                'id' => '2',
                'name' => 'Bola de Borracha',
                'price' => 12.50,
                'purchasePrice' => 8.00,
                'salePrice' => 12.50,
                'stock' => 8,
                'category' => 'Brinquedos',
                'barcode' => '7891234567891',
                'description' => 'Bola de borracha resistente',
                'unit' => 'un',
                'allowFractional' => false,
                'minQuantity' => 1,
                'stepQuantity' => 1,
                'minStock' => 5,
                'supplierId' => '2'
            ],
            [
                'id' => '3',
                'name' => 'Shampoo Pet',
                'price' => 24.90,
                'purchasePrice' => 15.00,
                'salePrice' => 24.90,
                'stock' => 3,
                'category' => 'Higiene',
                'barcode' => '7891234567892',
                'description' => 'Shampoo neutro para pets',
                'unit' => 'ml',
                'allowFractional' => true,
                'minQuantity' => 0.1,
                'stepQuantity' => 0.1,
                'minStock' => 5,
                'supplierId' => '1'
            ]
        ];

        return inertia('Relatorio/Index', [
            'sales' => $sales,
            'products' => $products
        ]);
    }
}
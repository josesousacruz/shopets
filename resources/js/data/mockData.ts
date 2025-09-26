import { faker } from '@faker-js/faker';
import { Product, Category, UnitType, Sale, Supplier, Customer, AccountPayable, AccountReceivable, LoyaltyProgram, LoyaltyTransaction, LoyaltyLevel } from '../types';

export const categories: Category[] = [
  { id: '1', name: 'Ração', icon: '🥗' },
  { id: '2', name: 'Brinquedos', icon: '🎾' },
  { id: '3', name: 'Higiene', icon: '🧴' },
  { id: '4', name: 'Medicamentos', icon: '💊' },
  { id: '5', name: 'Acessórios', icon: '🦮' },
  { id: '6', name: 'Petiscos', icon: '🦴' },
];

const productData = {
  'Ração': [
    { name: 'Ração Premium Cães Adultos', unit: 'kg' as UnitType, allowFractional: true, price: 12.50, minQuantity: 0.5, stepQuantity: 0.1, minStock: 5 },
    { name: 'Ração Filhotes Golden', unit: 'kg' as UnitType, allowFractional: true, price: 15.80, minQuantity: 0.5, stepQuantity: 0.1, minStock: 5 },
    { name: 'Ração Gatos Castrados 10kg', unit: 'pacote' as UnitType, allowFractional: false, price: 89.90, minQuantity: 1, stepQuantity: 1, minStock: 3 },
    { name: 'Ração Senior Royal Canin', unit: 'kg' as UnitType, allowFractional: true, price: 18.90, minQuantity: 0.5, stepQuantity: 0.1, minStock: 4 },
    { name: 'Ração Hipoalergênica Saco 15kg', unit: 'pacote' as UnitType, allowFractional: false, price: 165.00, minQuantity: 1, stepQuantity: 1, minStock: 2 }
  ],
  'Brinquedos': [
    { name: 'Bolinha de Tênis', unit: 'peca' as UnitType, allowFractional: false, price: 8.50, minQuantity: 1, stepQuantity: 1, minStock: 10 },
    { name: 'Corda Colorida 30cm', unit: 'peca' as UnitType, allowFractional: false, price: 12.90, minQuantity: 1, stepQuantity: 1, minStock: 10 },
    { name: 'Mordedor Borracha', unit: 'peca' as UnitType, allowFractional: false, price: 15.70, minQuantity: 1, stepQuantity: 1, minStock: 8 },
    { name: 'Arranhador para Gatos 60cm', unit: 'peca' as UnitType, allowFractional: false, price: 45.90, minQuantity: 1, stepQuantity: 1, minStock: 5 },
    { name: 'Kit Brinquedos Variados', unit: 'pacote' as UnitType, allowFractional: false, price: 29.90, minQuantity: 1, stepQuantity: 1, minStock: 6 }
  ],
  'Higiene': [
    { name: 'Shampoo Neutro', unit: 'ml' as UnitType, allowFractional: true, price: 0.05, minQuantity: 50, stepQuantity: 10, minStock: 500 },
    { name: 'Condicionador Hidratante 500ml', unit: 'peca' as UnitType, allowFractional: false, price: 18.90, minQuantity: 1, stepQuantity: 1, minStock: 5 },
    { name: 'Escova de Dentes Pet', unit: 'peca' as UnitType, allowFractional: false, price: 9.50, minQuantity: 1, stepQuantity: 1, minStock: 15 },
    { name: 'Lenços Umedecidos 100un', unit: 'pacote' as UnitType, allowFractional: false, price: 12.40, minQuantity: 1, stepQuantity: 1, minStock: 10 },
    { name: 'Talco Antipulgas', unit: 'g' as UnitType, allowFractional: true, price: 0.08, minQuantity: 50, stepQuantity: 10, minStock: 200 }
  ],
  'Medicamentos': [
    { name: 'Vermífugo Líquido', unit: 'ml' as UnitType, allowFractional: true, price: 0.45, minQuantity: 5, stepQuantity: 1, minStock: 50 },
    { name: 'Antipulgas Pipeta 1ml', unit: 'peca' as UnitType, allowFractional: false, price: 8.90, minQuantity: 1, stepQuantity: 1, minStock: 20 },
    { name: 'Vitamina Filhotes', unit: 'ml' as UnitType, allowFractional: true, price: 0.25, minQuantity: 10, stepQuantity: 5, minStock: 100 },
    { name: 'Cicatrizante Spray 125ml', unit: 'peca' as UnitType, allowFractional: false, price: 22.50, minQuantity: 1, stepQuantity: 1, minStock: 8 },
    { name: 'Colírio Oftálmico', unit: 'ml' as UnitType, allowFractional: true, price: 1.20, minQuantity: 2, stepQuantity: 1, minStock: 30 }
  ],
  'Acessórios': [
    { name: 'Coleira Ajustável', unit: 'peca' as UnitType, allowFractional: false, price: 18.90, minQuantity: 1, stepQuantity: 1, minStock: 15 },
    { name: 'Guia Retrátil 5m', unit: 'peca' as UnitType, allowFractional: false, price: 35.70, minQuantity: 1, stepQuantity: 1, minStock: 10 },
    { name: 'Bebedouro Automático 2L', unit: 'peca' as UnitType, allowFractional: false, price: 42.50, minQuantity: 1, stepQuantity: 1, minStock: 7 },
    { name: 'Cama Ortopédica M', unit: 'peca' as UnitType, allowFractional: false, price: 89.90, minQuantity: 1, stepQuantity: 1, minStock: 5 },
    { name: 'Transportadora Pequena', unit: 'peca' as UnitType, allowFractional: false, price: 65.00, minQuantity: 1, stepQuantity: 1, minStock: 4 }
  ],
  'Petiscos': [
    { name: 'Bifinho Natural', unit: 'g' as UnitType, allowFractional: true, price: 0.12, minQuantity: 50, stepQuantity: 25, minStock: 500 },
    { name: 'Osso de Couro Grande', unit: 'peca' as UnitType, allowFractional: false, price: 4.50, minQuantity: 1, stepQuantity: 1, minStock: 20 },
    { name: 'Snack Dental 500g', unit: 'pacote' as UnitType, allowFractional: false, price: 28.90, minQuantity: 1, stepQuantity: 1, minStock: 8 },
    { name: 'Sachê Gourmet', unit: 'peca' as UnitType, allowFractional: false, price: 3.20, minQuantity: 1, stepQuantity: 1, minStock: 30 },
    { name: 'Cookies Integrais', unit: 'g' as UnitType, allowFractional: true, price: 0.15, minQuantity: 100, stepQuantity: 50, minStock: 1000 }
  ]
};

export const generateMockProducts = (): Product[] => {
  const products: Product[] = [];
  
  categories.forEach(category => {
    const categoryProducts = productData[category.name as keyof typeof productData] || [];
    
    categoryProducts.forEach((productInfo, index) => {
      const salePrice = productInfo.price;
      const purchasePrice = Number((salePrice * 0.7).toFixed(2)); // 70% do preço de venda
      const currentStock = faker.number.int({ min: 0, max: 100 });
      const productId = `${category.id}-${index + 1}`;
      
      // Gerar histórico de estoque simulado
      const stockHistory = [];
      const numEntries = faker.number.int({ min: 1, max: 3 }); // 1-3 entradas
      
      for (let i = 0; i < numEntries; i++) {
        const entryDate = new Date();
        entryDate.setDate(entryDate.getDate() - (numEntries - i) * 7); // Entradas semanais
        
        stockHistory.push({
          id: `stock-entry-${productId}-${i + 1}`,
          productId: productId,
          quantity: faker.number.int({ min: 10, max: 60 }),
          purchasePrice: Number((purchasePrice + faker.number.float({ min: -2, max: 2, precision: 0.01 })).toFixed(2)), // Variação no preço
          supplierId: `sup-${faker.number.int({ min: 1, max: 4 })}`,
          date: entryDate,
          notes: i === 0 ? 'Estoque inicial' : undefined,
        });
      }
      
      products.push({
        id: productId,
        name: productInfo.name,
        price: productInfo.price,
        purchasePrice: purchasePrice,
        salePrice: salePrice,
        stock: currentStock,
        category: category.name,
        barcode: faker.string.numeric(13),
        description: faker.commerce.productDescription(),
        unit: productInfo.unit,
        allowFractional: productInfo.allowFractional,
        minQuantity: productInfo.minQuantity,
        stepQuantity: productInfo.stepQuantity,
        minStock: productInfo.minStock,
        stockHistory,
      });
    });
  });
  
  return products;
};

export const mockProducts = generateMockProducts();

export const generateMockSuppliers = (products: Product[]): Supplier[] => {
  const suppliers: Supplier[] = [];
  const supplierNames = ['PetFood Distribuidora', 'Mundo Pet Atacado', 'Central de Acessórios Pet', 'Vida Animal Farmácia'];

  supplierNames.forEach((name, index) => {
    const numProducts = faker.number.int({ min: 3, max: 8 });
    const supplierProducts = faker.helpers.arrayElements(products, numProducts);
    const productIds = supplierProducts.map(p => p.id);

    // Gerar histórico de compras para este fornecedor
    const purchaseHistory = [];
    const numPurchases = faker.number.int({ min: 5, max: 15 });
    
    for (let i = 0; i < numPurchases; i++) {
      const product = faker.helpers.arrayElement(supplierProducts);
      const quantity = faker.number.float({ min: 1, max: 50, fractionDigits: product.allowFractional ? 1 : 0 });
      const unitPrice = faker.number.float({ min: product.price * 0.6, max: product.price * 0.9, fractionDigits: 2 });
      
      purchaseHistory.push({
        id: `purchase-${index + 1}-${i + 1}`,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
        date: faker.date.recent({ days: 90 }),
        notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 })
      });
    }

    // Ordenar por data (mais recente primeiro)
    purchaseHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    suppliers.push({
      id: `sup-${index + 1}`,
      name,
      contactPerson: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.location.streetAddress(true),
      productIds,
      purchaseHistory,
    });
  });

  return suppliers;
};

export const mockSuppliers = generateMockSuppliers(mockProducts);

export const mockLoyaltyProgram: LoyaltyProgram = {
  id: 'loyalty-1',
  name: 'Programa Amigo Pet',
  pointsPerReal: 1, // 1 ponto por real gasto
  levels: [
    {
      level: 'bronze',
      minPoints: 0,
      discount: 5,
      benefits: ['5% de desconto', 'Aniversário do pet com brinde', 'Newsletter mensal']
    },
    {
      level: 'prata',
      minPoints: 500,
      discount: 10,
      benefits: ['10% de desconto', 'Consulta veterinária gratuita anual', 'Desconto em banho e tosa', 'Atendimento prioritário']
    },
    {
      level: 'ouro',
      minPoints: 1500,
      discount: 15,
      benefits: ['15% de desconto', '2 consultas veterinárias gratuitas', 'Entrega grátis', 'Produtos exclusivos', 'Desconto em medicamentos']
    },
    {
      level: 'diamante',
      minPoints: 3000,
      discount: 20,
      benefits: ['20% de desconto', 'Consultas veterinárias ilimitadas', 'Entrega grátis express', 'Acesso a produtos premium', 'Personal pet trainer']
    }
  ],
  isActive: true
};

const getLoyaltyLevel = (points: number): LoyaltyLevel => {
  if (points >= 3000) return 'diamante';
  if (points >= 1500) return 'ouro';
  if (points >= 500) return 'prata';
  return 'bronze';
};

export const generateMockCustomers = (): Customer[] => {
  return Array.from({ length: 25 }, (_, i) => {
    const totalSpent = faker.number.float({ min: 50, max: 5000, precision: 0.01 });
    const loyaltyPoints = Math.floor(totalSpent * mockLoyaltyProgram.pointsPerReal);
    const loyaltyLevel = getLoyaltyLevel(loyaltyPoints);
    const createdAt = faker.date.past({ years: 2 });
    const lastPurchase = faker.helpers.maybe(() => faker.date.between({ from: createdAt, to: new Date() }), { probability: 0.8 });
    
    return {
      id: `cust-${i + 1}`,
      name: faker.person.fullName(),
      phone: faker.phone.number('(##) #####-####'),
      email: faker.helpers.maybe(() => faker.internet.email(), { probability: 0.7 }),
      address: faker.helpers.maybe(() => faker.location.streetAddress(true), { probability: 0.6 }),
      birthDate: faker.helpers.maybe(() => faker.date.birthdate({ min: 18, max: 80, mode: 'age' }), { probability: 0.5 }),
      cpf: faker.helpers.maybe(() => {
        const numbers = faker.string.numeric(11);
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }, { probability: 0.4 }),
      loyaltyPoints,
      loyaltyLevel,
      totalSpent,
      lastPurchase,
      createdAt,
      isActive: faker.helpers.maybe(() => false, { probability: 0.1 }) || true
    };
  });
};

export const generateMockLoyaltyTransactions = (customers: Customer[]): LoyaltyTransaction[] => {
  const transactions: LoyaltyTransaction[] = [];
  
  customers.forEach(customer => {
    // Gerar transações de ganho de pontos (compras)
    const earnTransactions = faker.number.int({ min: 1, max: 15 });
    
    for (let i = 0; i < earnTransactions; i++) {
      const date = faker.date.between({ 
        from: customer.createdAt, 
        to: customer.lastPurchase || new Date() 
      });
      const purchaseAmount = faker.number.float({ min: 20, max: 500, precision: 0.01 });
      const points = Math.floor(purchaseAmount * mockLoyaltyProgram.pointsPerReal);
      
      transactions.push({
        id: `trans-${customer.id}-earn-${i}`,
        customerId: customer.id,
        type: 'earn',
        points,
        description: `Compra no valor de R$ ${purchaseAmount.toFixed(2)}`,
        date,
        saleId: `sale-${faker.string.uuid()}`
      });
    }
    
    // Gerar algumas transações de resgate (com menor probabilidade)
    const redeemTransactions = faker.number.int({ min: 0, max: 3 });
    
    for (let i = 0; i < redeemTransactions; i++) {
      const date = faker.date.between({ 
        from: customer.createdAt, 
        to: customer.lastPurchase || new Date() 
      });
      const points = faker.number.int({ min: 50, max: 200 });
      
      transactions.push({
        id: `trans-${customer.id}-redeem-${i}`,
        customerId: customer.id,
        type: 'redeem',
        points,
        description: faker.helpers.arrayElement([
          'Desconto em compra',
          'Brinde especial',
          'Consulta veterinária gratuita',
          'Banho e tosa com desconto'
        ]),
        date
      });
    }
  });
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const mockCustomers = generateMockCustomers();

export const generateMockSales = (products: Product[]): Sale[] => {
  const sales: Sale[] = [];
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const salesPerDay = faker.number.int({ min: 0, max: 10 });

    for (let j = 0; j < salesPerDay; j++) {
      const itemsInSale = faker.number.int({ min: 1, max: 5 });
      const cartItems = [];
      let total = 0;

      for (let k = 0; k < itemsInSale; k++) {
        const product = faker.helpers.arrayElement(products);
        const maxQuantity = (product.minQuantity || 0.1) * 5;
        const minQuantity = product.minQuantity || 0.1;

        const quantity = product.allowFractional 
          ? faker.number.float({ 
              min: minQuantity,
              max: maxQuantity < minQuantity ? minQuantity * 2 : maxQuantity,
              precision: 0.1 
            })
          : faker.number.int({ min: 1, max: 3 });
        
        const item = { product, quantity };
        cartItems.push(item);
        total += product.price * quantity;
      }
      
      sales.push({
        id: faker.string.uuid(),
        items: cartItems,
        total,
        date,
        paymentMethod: faker.helpers.arrayElement(['dinheiro', 'cartao', 'pix']),
      });
    }
  }
  return sales;
};

const generateFinancialEntries = <T extends AccountPayable | AccountReceivable>(
  count: number,
  type: 'payable' | 'receivable',
  linkIds: string[]
): T[] => {
  const entries: T[] = [];
  const descriptions = type === 'payable' 
    ? ['Compra de Ração', 'Pagamento Aluguel', 'Conta de Luz', 'Compra de Acessórios']
    : ['Venda a Prazo', 'Serviço de Banho e Tosa', 'Consulta Veterinária'];

  for (let i = 0; i < count; i++) {
    const dueDate = faker.date.between({ from: new Date(new Date().setDate(new Date().getDate() - 30)), to: new Date(new Date().setDate(new Date().getDate() + 30)) });
    const status = faker.helpers.arrayElement(['pending', 'paid', 'pending', 'overdue']);
    
    const entry = {
      id: `fin-${type}-${i}`,
      description: faker.helpers.arrayElement(descriptions),
      amount: faker.number.float({ min: 50, max: 1500, precision: 0.01 }),
      dueDate,
      status,
      paidDate: status === 'paid' ? faker.date.past({ refDate: dueDate }) : undefined,
    };
    
    if (type === 'payable') {
      (entry as AccountPayable).supplierId = faker.helpers.arrayElement(linkIds);
    } else {
      (entry as AccountReceivable).customerId = faker.helpers.arrayElement(linkIds);
    }

    entries.push(entry as T);
  }
  return entries;
};

export const mockLoyaltyTransactions = generateMockLoyaltyTransactions(mockCustomers);

export const mockAccountsPayable = generateFinancialEntries<AccountPayable>(20, 'payable', mockSuppliers.map(s => s.id));
export const mockAccountsReceivable = generateFinancialEntries<AccountReceivable>(15, 'receivable', mockCustomers.map(c => c.id));

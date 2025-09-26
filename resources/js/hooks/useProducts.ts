import { useState, useCallback, useMemo } from 'react';
import { Product, Category } from '../types';
import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';

interface UseProductsOptions {
  initialProducts?: Product[];
  onProductAdded?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
  onProductDeleted?: (productId: string) => void;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const [products, setProducts] = useState<Product[]>(options.initialProducts || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from server using InertiaJS
  const fetchProducts = useCallback((page = 1, search = '', categoryId = '') => {
    setIsLoading(true);
    setError(null);

    const params: any = { page };
    if (search) params.search = search;
    if (categoryId) params.categoria = categoryId;

    router.get('/estoque', params, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: (page: any) => {
        // Os produtos já vêm formatados do EstoqueController
        if (page.props.products) {
          setProducts(page.props.products);
        }
        setIsLoading(false);
      },
      onError: (errors: any) => {
        setError('Erro ao carregar produtos');
        setIsLoading(false);
      }
    });
  }, []);

  // Add new product using InertiaJS
  const addProduct = useCallback((productData: Omit<Product, 'id'>) => {
    setIsLoading(true);
    setError(null);

    // Mapear dados do frontend para o backend
    const backendData = {
      nome: productData.name,
      codigo_barras: productData.barcode,
      codigo_interno: productData.internalCode,
      descricao: productData.description,
      preco_custo: productData.purchasePrice,
      preco_venda: productData.salePrice || productData.price,
      estoque_atual: productData.stock,
      estoque_minimo: productData.minStock,
      unidade: productData.unit,
      permite_fracao: productData.allowFractional,
      id_categoria: productData.categoryId,
      ativo: true,
    };

    router.post('/estoque', backendData, {
      onSuccess: (page: any) => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Produto cadastrado com sucesso.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        });
        
        // Recarregar produtos
        fetchProducts();
        setIsLoading(false);
        options.onProductAdded?.(productData as Product);
      },
      onError: (errors: any) => {
        setError('Erro ao cadastrar produto');
        Swal.fire({
          title: 'Erro!',
          text: 'Não foi possível cadastrar o produto.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        setIsLoading(false);
      }
    });
  }, [options, fetchProducts]);

  // Update product using InertiaJS
  const updateProduct = useCallback((productId: string | number, updates: Partial<Product>) => {
    setIsLoading(true);
    setError(null);

    // Mapear dados do frontend para o backend
    const backendData: any = {};
    if (updates.name) backendData.nome = updates.name;
    if (updates.barcode) backendData.codigo_barras = updates.barcode;
    if (updates.internalCode) backendData.codigo_interno = updates.internalCode;
    if (updates.description) backendData.descricao = updates.description;
    if (updates.purchasePrice) backendData.preco_custo = updates.purchasePrice;
    if (updates.salePrice || updates.price) backendData.preco_venda = updates.salePrice || updates.price;
    if (updates.stock !== undefined) backendData.estoque_atual = updates.stock;
    if (updates.minStock !== undefined) backendData.estoque_minimo = updates.minStock;
    if (updates.unit) backendData.unidade = updates.unit;
    if (updates.allowFractional !== undefined) backendData.permite_fracao = updates.allowFractional;
    if (updates.categoryId) backendData.id_categoria = updates.categoryId;

    router.put(`/estoque/${productId}`, backendData, {
      onSuccess: (page: any) => {
        Swal.fire({
          title: 'Sucesso!',
          text: 'Produto atualizado com sucesso.',
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        });
        
        // Recarregar produtos
        fetchProducts();
        setIsLoading(false);
        options.onProductUpdated?.(updates as Product);
      },
      onError: (errors: any) => {
        setError('Erro ao atualizar produto');
        Swal.fire({
          title: 'Erro!',
          text: 'Não foi possível atualizar o produto.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        setIsLoading(false);
      }
    });
  }, [options, fetchProducts]);

  // Delete product using InertiaJS
  const deleteProduct = useCallback(async (productId: string | number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const result = await Swal.fire({
      title: 'Confirmar Exclusão',
      text: `Tem certeza que deseja excluir o produto "${product.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setIsLoading(true);
    setError(null);

    router.delete(`/estoque/${productId}`, {
      onSuccess: (page: any) => {
        Swal.fire({
          title: 'Produto Excluído!',
          text: `Produto "${product.name}" excluído com sucesso!`,
          icon: 'success',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981'
        });
        
        // Recarregar produtos
        fetchProducts();
        setIsLoading(false);
        options.onProductDeleted?.(productId.toString());
      },
      onError: (errors: any) => {
        setError('Erro ao excluir produto');
        Swal.fire({
          title: 'Erro!',
          text: 'Não foi possível excluir o produto.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        setIsLoading(false);
      }
    });
  }, [products, options, fetchProducts]);

  // Get product by ID
  const getProductById = useCallback((productId: string | number) => {
    return products.find(p => p.id === productId);
  }, [products]);

  // Search products
  const searchProducts = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return products;

    const lowercasedTerm = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercasedTerm) ||
      product.barcode?.toLowerCase().includes(lowercasedTerm) ||
      product.internalCode?.toLowerCase().includes(lowercasedTerm) ||
      product.description?.toLowerCase().includes(lowercasedTerm) ||
      product.category.toLowerCase().includes(lowercasedTerm)
    );
  }, [products]);

  // Get products by category
  const getProductsByCategory = useCallback((categoryId: string | number) => {
    return products.filter(product => product.categoryId === categoryId);
  }, [products]);

  // Get low stock products
  const getLowStockProducts = useCallback(() => {
    return products.filter(product => 
      product.minStock && product.stock <= product.minStock
    );
  }, [products]);

  // Get active products only
  const getActiveProducts = useCallback(() => {
    return products; // Assumindo que só produtos ativos são retornados da API
  }, [products]);

  // Computed values
  const totalProducts = products.length;
  const lowStockCount = useMemo(() => 
    products.filter(p => p.minStock && p.stock <= p.minStock).length, 
    [products]
  );
  const totalStockValue = useMemo(() => 
    products.reduce((sum, p) => sum + (p.purchasePrice || p.price) * p.stock, 0), 
    [products]
  );

  return {
    products,
    isLoading,
    error,
    totalProducts,
    lowStockCount,
    totalStockValue,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    searchProducts,
    getProductsByCategory,
    getLowStockProducts,
    getActiveProducts,
    setProducts,
    clearError: () => setError(null)
  };
};

export default useProducts;
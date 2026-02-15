import React, { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import ImageUpload from '../components/ImageUpload';
import StripeConnect from '../components/store/StripeConnect';
import StoreRefunds from '../components/store/StoreRefunds';


interface Store {
  id: number;
  store_name: string;
  store_description: string;
  store_address: string;
  business_type: string;
  business_license?: string;
  categories: string[];
  status: 'pending' | 'approved' | 'suspended';
  created_at: string;
}

interface StoreOwner {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: 'store_owner' | 'customer' | 'admin';
  store?: Store;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
}

interface Sale {
  id: number;
  product_name: string;
  quantity: number;
  price_per_item: number;
  total_price: number;
  customer_name: string;
  sale_date: string;
  status: string;
}

interface StoreDashboardProps {
  storeOwner: StoreOwner;
  onLogout: () => void;
}

const StoreDashboard: React.FC<StoreDashboardProps> = ({ storeOwner: initialStoreOwner, onLogout }) => {
  const [storeOwner, setStoreOwner] = useState<StoreOwner>(initialStoreOwner);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'sales' | 'refunds' | 'analytics' | 'payments' | 'settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    stock_quantity: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sales filter state
  const [salesFilter, setSalesFilter] = useState<string>('all');
  const [salesSearch, setSalesSearch] = useState<string>('');

  const categories = [
    'Electronics',
    'Clothing & Fashion',
    'Home & Garden',
    'Sports & Fitness',
    'Books & Media',
    'Health & Beauty',
    'Toys & Games',
    'Automotive',
    'Food & Beverages',
    'Art & Crafts'
  ];

  // Fetch updated store data to check for status changes
  const fetchStoreData = useCallback(async () => {
    try {
      const response = await axios.get('/store/info');
      if (response.data.success && response.data.data) {
        const updatedStoreOwner = {
          ...storeOwner,
          store: response.data.data
        };
        setStoreOwner(updatedStoreOwner);
        // Update localStorage to persist the change
        localStorage.setItem('afrozy-market-user', JSON.stringify(updatedStoreOwner));
      }
    } catch (err: any) {
      console.error('Error fetching store data:', err);
    }
  }, [storeOwner]);

  useEffect(() => {
    // Fetch store data on mount
    fetchStoreData();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchStoreData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStoreData]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'sales') {
      fetchSales();
    }
  }, [activeTab]);

  // Safety check for store data
  if (!storeOwner.store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">No store data found. Please contact support.</p>
          <button 
            onClick={onLogout}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/store/products');
      
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (err: any) {
      setError('Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/store/sales');
      
      if (response.data.success) {
        setSales(response.data.data);
      }
    } catch (err: any) {
      setError('Failed to fetch sales');
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('afrozy-market-token');
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        stock_quantity: parseInt(productForm.stock_quantity)
      };

      let response;
      if (editingProduct) {
        response = await axios.put(`/store/products/${editingProduct.id}`, productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        response = await axios.post('/store/products', productData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (response.data.success) {
        await fetchProducts();
        resetProductForm();
      }
    } catch (err: any) {
      setError(editingProduct ? 'Failed to update product' : 'Failed to add product');
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      stock_quantity: ''
    });
    setEditingProduct(null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleImageUpload = (imageData: any) => {
    setProductForm({
      ...productForm,
      image_url: imageData.imageUrl || imageData.allUrls.large
    });
    setUploadSuccess('Image uploaded successfully!');
    setUploadError(null);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadSuccess(null);
  };

  const handleUploadStart = () => {
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity.toString()
    });
    setEditingProduct(product);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('afrozy-market-token');
      await axios.delete(`/store/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchProducts();
    } catch (err: any) {
      setError('Failed to delete product');
      console.error('Error deleting product:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
      case 'confirmed':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSales = () => {
    // Filter and search sales
    const filteredSales = sales.filter(sale => {
      const matchesFilter = salesFilter === 'all' || sale.status.toLowerCase() === salesFilter;
      const matchesSearch = salesSearch === '' ||
        sale.product_name.toLowerCase().includes(salesSearch.toLowerCase()) ||
        sale.customer_name.toLowerCase().includes(salesSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Sales & Orders</h2>
          <div className="text-xs sm:text-sm text-gray-600">
            Total Sales: <span className="font-bold">{sales.length}</span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Search by product or customer..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table/Cards */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-gray-500 mt-2">Loading sales...</p>
            </div>
          ) : filteredSales.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.sale_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{sale.product_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {sale.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ${parseFloat(sale.price_per_item?.toString() || '0').toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          ${parseFloat(sale.total_price.toString()).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(sale.status)}`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <div key={sale.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{sale.product_name}</h4>
                        <p className="text-sm text-gray-500">{sale.customer_name}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(sale.status)}`}>
                        {sale.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">{new Date(sale.sale_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Quantity:</span>
                        <p className="font-medium">{sale.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Unit Price:</span>
                        <p className="font-medium">${parseFloat(sale.price_per_item?.toString() || '0').toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <p className="font-medium text-purple-600">${parseFloat(sale.total_price.toString()).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {salesSearch || salesFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Your sales will appear here when customers purchase your products'}
              </p>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredSales.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{filteredSales.length}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500">Total Items Sold</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">
                  ${filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_price.toString()), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOverview = () => {
    const totalProducts = products.length;
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_price.toString()), 0);
    const lowStockProducts = products.filter(p => p.stock_quantity < 10);

    return (
      <div className="space-y-4 sm:space-y-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
            Welcome back, {storeOwner.full_name}!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Here's what's happening with {storeOwner.store!.store_name}</p>
        </div>

        {/* Store Status */}
        <div className={`p-3 sm:p-4 rounded-lg ${
          storeOwner.store!.status === 'approved'
            ? 'bg-green-50 border border-green-200'
            : storeOwner.store!.status === 'pending'
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Store Status</h3>
          <p className={`text-sm sm:text-base capitalize ${
            storeOwner.store!.status === 'approved' ? 'text-green-700' :
            storeOwner.store!.status === 'pending' ? 'text-yellow-700' : 'text-red-700'
          }`}>
            {storeOwner.store!.status}
            {storeOwner.store!.status === 'pending' && ' - Your store is under review'}
            {storeOwner.store!.status === 'approved' && ' - Your store is live and accepting orders'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Total Products</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{totalProducts}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Total Sales</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{totalSales}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Total Revenue</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">Low Stock</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{lowStockProducts.length}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Sales</h3>
          </div>
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            {sales.slice(0, 5).length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {sales.slice(0, 5).map(sale => (
                  <div key={sale.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-medium text-sm sm:text-base truncate">{sale.product_name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">Customer: {sale.customer_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-sm sm:text-base">${sale.total_price}</p>
                      <p className="text-xs sm:text-sm text-gray-500">{new Date(sale.sale_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No sales yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProducts = () => (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Product Management</h2>
        <button
          onClick={resetProductForm}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm sm:text-base w-full sm:w-auto"
        >
          Add New Product
        </button>
      </div>

      {/* Product Form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </h3>
        <form onSubmit={handleProductSubmit} className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
              <input
                type="number"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({...productForm, stock_quantity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
            <ImageUpload
              onImageUpload={handleImageUpload}
              onUploadStart={handleUploadStart}
              onUploadError={handleUploadError}
              uploadType="product"
              productId={editingProduct?.id.toString()}
              buttonText="Upload Product Image"
              className="mt-1"
            />
            {uploadError && (
              <div className="mt-2 text-sm text-red-600">
                {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-2 text-sm text-green-600">
                {uploadSuccess}
              </div>
            )}
            {productForm.image_url && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Image:</p>
                <div className="flex items-center space-x-3">
                  <img 
                    src={productForm.image_url} 
                    alt="Product preview" 
                    className="w-16 h-16 rounded-md object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {productForm.image_url}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductForm({...productForm, image_url: ''})}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 w-full sm:w-auto"
            >
              {loading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={resetProductForm}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 w-full sm:w-auto"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Your Products ({products.length})</h3>
        </div>
        {products.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {products.map(product => (
              <div key={product.id} className="px-4 sm:px-6 py-3 sm:py-4">
                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-medium">${product.price}</span>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start space-x-3 mb-3">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
                      <p className="text-lg font-bold text-purple-600 mt-1">${product.price}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 sm:px-6 py-6 sm:py-8 text-center text-sm sm:text-base text-gray-500">No products yet. Add your first product above!</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{storeOwner.store!.store_name}</h1>
              <p className="text-xs sm:text-sm text-gray-600">Store Dashboard</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-700 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Desktop */}
      <nav className="hidden lg:block bg-white border-b border-gray-200 sticky top-[73px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'products', label: 'Products' },
              { key: 'sales', label: 'Sales' },
              { key: 'refunds', label: 'Refunds' },
              { key: 'analytics', label: 'Analytics' },
              { key: 'payments', label: 'Payments' },
              { key: 'settings', label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-2 space-y-1">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'products', label: 'Products', icon: '📦' },
              { key: 'sales', label: 'Sales', icon: '💰' },
              { key: 'refunds', label: 'Refunds', icon: '↩️' },
              { key: 'analytics', label: 'Analytics', icon: '📈' },
              { key: 'payments', label: 'Payments', icon: '💳' },
              { key: 'settings', label: 'Settings', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm flex items-center space-x-3 ${
                  activeTab === tab.key
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm sm:text-base text-red-700">{error}</p>
          </div>
        )}

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'sales' && renderSales()}
        {activeTab === 'refunds' && <StoreRefunds />}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <p className="text-gray-500">Analytics dashboard coming soon...</p>
          </div>
        )}
        {activeTab === 'payments' && <StripeConnect />}
        {activeTab === 'settings' && (
          <div className="text-center py-12">
            <p className="text-gray-500">Store settings coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StoreDashboard;
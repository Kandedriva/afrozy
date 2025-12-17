import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import { useCart } from '../context/CartContext';


interface Store {
  id: number;
  store_name: string;
  store_description: string;
  store_address: string;
  business_type: string;
  business_license: string;
  categories: string[];
  status: string;
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

interface Product {
  id: number;
  store_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface StoreDetailData {
  store: {
    id: number;
    store_name: string;
    status: string;
  };
  products: Product[];
  pagination: Pagination;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: 'customer' | 'admin' | 'store_owner';
  store?: any;
}

interface StoreDetailProps {
  storeId: string;
  user?: User | null;
  onLogout?: () => void;
}

const StoreDetail: React.FC<StoreDetailProps> = ({ storeId, user, onLogout }) => {
  const { state } = useCart();
  
  const [store, setStore] = useState<Store | null>(null);
  const [storeData, setStoreData] = useState<StoreDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showContactModal, setShowContactModal] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const fetchStoreDetails = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/store/${storeId}`);
      if (response.data.success) {
        setStore(response.data.data);
      } else {
        setError('Failed to fetch store details');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error connecting to server');
      console.error('Error fetching store details:', err);
    }
  }, [storeId]);

  const fetchStoreProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchQuery,
        sort: sortBy,
        order: sortOrder,
      });

      const response = await axios.get(`/store/${storeId}/products?${params}`);
      if (response.data.success) {
        setStoreData(response.data.data);
        setError(null);
      } else {
        setError('Failed to fetch store products');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error connecting to server');
      console.error('Error fetching store products:', err);
    } finally {
      setLoading(false);
      setProductsLoading(false);
    }
  }, [storeId, currentPage, searchQuery, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStoreProducts();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchStoreDetails();
    fetchStoreProducts();
  }, [fetchStoreDetails, fetchStoreProducts]);

  const ContactModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Store</h3>
          <button
            onClick={() => setShowContactModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {store && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">{store.store_name}</h4>
              <p className="text-sm text-gray-600">{store.business_type}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Store Owner:</p>
              <p className="text-sm text-gray-600">{store.owner_name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700">Email:</p>
              <a 
                href={`mailto:${store.owner_email}`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {store.owner_email}
              </a>
            </div>
            
            {store.owner_phone && (
              <div>
                <p className="text-sm font-medium text-gray-700">Phone:</p>
                <a 
                  href={`tel:${store.owner_phone}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {store.owner_phone}
                </a>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-700">Address:</p>
              <p className="text-sm text-gray-600">{store.store_address}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading && !store) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={() => {
              window.history.pushState(null, '', '/stores');
              window.location.href = '/stores';
            }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Stores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/globe.png" 
              alt="World Globe" 
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold">Afrozy Market</h1>
              <p className="text-blue-100">{store?.store_name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center space-x-2 bg-blue-700 rounded-md px-3 py-2 hover:bg-blue-800 transition-colors relative"
            >
              <svg className="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
              </svg>
              {state.items.length > 0 ? (
                <>
                  <span className="text-yellow-300 font-medium">
                    {state.items.reduce((total, item) => total + item.quantity, 0)} items
                  </span>
                  <span className="text-white">
                    ${state.items.reduce((total, item) => total + (item.quantity * item.price), 0).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-white">Cart</span>
              )}
              {state.items.filter(item => item.store_id === parseInt(storeId)).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {state.items.filter(item => item.store_id === parseInt(storeId)).reduce((total, item) => total + item.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Contact Store</span>
            </button>
            
            <button
              onClick={() => {
              window.history.pushState(null, '', '/stores');
              window.location.href = '/stores';
            }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Stores</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Store Info */}
        {store && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <h2 className="text-3xl font-bold text-gray-900">{store.store_name}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    store.status === 'approved' 
                      ? 'bg-green-100 text-green-800'
                      : store.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {store.status.charAt(0).toUpperCase() + store.status.slice(1)}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{store.store_description}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Business Type:</p>
                    <p className="text-sm text-gray-600">{store.business_type}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Address:</p>
                    <p className="text-sm text-gray-600">{store.store_address}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Owner:</p>
                    <p className="text-sm text-gray-600">{store.owner_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Member Since:</p>
                    <p className="text-sm text-gray-600">{new Date(store.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {store.categories.map((category, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <form onSubmit={handleSearch} className="flex-1 md:mr-4">
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="stock_quantity">Sort by Stock</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DESC">Descending</option>
                <option value="ASC">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Store Cart Summary */}
        {storeData && state.items.filter(item => item.store_id === parseInt(storeId)).length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              🛒 Cart Items from {store?.store_name}
            </h3>
            <div className="space-y-2">
              {state.items
                .filter(item => item.store_id === parseInt(storeId))
                .map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-green-700">{item.name}</span>
                    <span className="text-green-600 font-medium">
                      {item.quantity} × ${item.price} = ${(item.quantity * item.price).toFixed(2)}
                    </span>
                  </div>
                ))
              }
              <div className="pt-2 border-t border-green-200">
                <div className="flex justify-between items-center font-bold text-green-800">
                  <span>Store Total:</span>
                  <span>
                    ${state.items
                      .filter(item => item.store_id === parseInt(storeId))
                      .reduce((total, item) => total + (item.quantity * item.price), 0)
                      .toFixed(2)
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Store Products {storeData && `(${storeData.pagination.totalProducts})`}
            </h3>
            {productsLoading && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </div>

          {storeData && storeData.products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {storeData.products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>

              {/* Pagination */}
              {storeData.pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!storeData.pagination.hasPreviousPage}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {[...Array(storeData.pagination.totalPages)].map((_, index) => {
                    const page = index + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium border ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!storeData.pagination.hasNextPage}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-xl font-medium text-gray-600 mb-2">No products found</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? 'No products match your search criteria.' 
                  : 'This store hasn\'t added any products yet.'
                }
              </p>
            </div>
          )}
        </div>
      </main>

      {showContactModal && <ContactModal />}
      
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)}
        user={user}
        storeId={storeId}
      />
    </div>
  );
};

export default StoreDetail;
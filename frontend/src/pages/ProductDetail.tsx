import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';

interface Product {
  id: number;
  store_id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
  store_name?: string;
  store_description?: string;
  store_address?: string;
}

interface ProductDetailProps {
  productId: string;
  user: any;
  onLogout?: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ productId, user, onLogout }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToCart, state } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/products/${productId}`);

        if (!response.ok) {
          throw new Error('Product not found');
        }

        const data = await response.json();
        if (data.success) {
          setProduct(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch product');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const getImageUrl = () => {
    if (!product?.image_url || imageError) {
      return '/api/placeholder/800/600';
    }

    let imageUrl = product.image_url;

    if (imageUrl.includes('/api/images/proxy/')) {
      const proxyMatch = imageUrl.match(/\/api\/images\/proxy\/(.+)$/);
      if (proxyMatch) {
        const isProduction = process.env.NODE_ENV === 'production';
        const currentOrigin = isProduction ?
          window.location.origin :
          window.location.origin.replace(':3000', ':3001');
        imageUrl = `${currentOrigin}/api/images/proxy/${proxyMatch[1]}`;
      }
    }

    if (imageUrl.startsWith('/')) {
      const isProduction = process.env.NODE_ENV === 'production';
      const currentOrigin = isProduction ?
        window.location.origin :
        window.location.origin.replace(':3000', ':3001');
      imageUrl = `${currentOrigin}${imageUrl}`;
    }

    return imageUrl;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAdding(true);
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    } finally {
      setTimeout(() => {
        setIsAdding(false);
      }, 500);
    }
  };

  const handleVisitStore = () => {
    if (product?.store_id) {
      window.history.pushState(null, '', `/store/${product.store_id}`);
      window.location.reload();
    }
  };

  const handleBackToProducts = () => {
    window.history.pushState(null, '', '/');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
          <button
            onClick={handleBackToProducts}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const cartItem = state.items.find(item => item.id === product.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToProducts}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to Products</span>
            </button>

            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {user.full_name}!</span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="text-sm bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative">
              <img
                src={getImageUrl()}
                alt={product.name}
                className="w-full h-full object-cover lg:h-[600px]"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              <span className="absolute top-4 right-4 text-sm bg-blue-600 text-white px-4 py-2 rounded-full font-medium shadow-lg">
                {product.category}
              </span>
            </div>

            {/* Product Information */}
            <div className="p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                <div className="flex items-center space-x-4 mb-6">
                  <span className="text-5xl font-bold text-green-600">
                    ${product.price}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      product.stock_quantity > 20 ? 'bg-green-500' :
                      product.stock_quantity > 5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600 font-medium">
                      {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>

                {/* Store Information */}
                {product.store_id && product.store_name && (
                  <div className="mb-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-500">Sold by</p>
                            <p className="text-sm font-bold text-gray-800">{product.store_name}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleVisitStore}
                          className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                        >
                          Visit Store
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Add to Cart Section */}
              <div>
                {isInCart && (
                  <div className="mb-4 text-center bg-green-50 py-3 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">
                      ✓ {cartQuantity} in cart
                    </span>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 ${
                    product.stock_quantity === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : cartQuantity >= product.stock_quantity
                      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-xl'
                      : isAdding
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                  disabled={product.stock_quantity === 0 || isAdding}
                >
                  {isAdding ? (
                    <>
                      <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Adding to Cart...</span>
                    </>
                  ) : product.stock_quantity === 0 ? (
                    <span>Out of Stock</span>
                  ) : cartQuantity >= product.stock_quantity ? (
                    <span>Maximum Quantity Reached</span>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
                      </svg>
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                {product.stock_quantity > 0 && cartQuantity < product.stock_quantity && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Free shipping on orders over $50
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

import React, { useState } from 'react';
import ImageModal from './ImageModal';
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

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToCart, state } = useCart();

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  // Get appropriate image URL or fallback
  const getImageUrl = () => {
    if (!product.image_url || imageError) {
      return '/api/placeholder/400/300';
    }
    
    let imageUrl = product.image_url;
    
    // If the image URL is from a proxy and we're in production, ensure it uses the correct domain
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
    
    // If the URL is relative, make it absolute
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
    setIsAdding(true);
    try {
      await addToCart(product);
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    } finally {
      // Add a small delay for visual feedback
      setTimeout(() => {
        setIsAdding(false);
      }, 500);
    }
  };

  const handleVisitStore = () => {
    if (product.store_id) {
      // Navigate to the specific store page
      window.history.pushState(null, '', `/store/${product.store_id}`);
      window.location.reload();
    }
  };

  const handleViewDetails = () => {
    // Navigate to product detail page
    window.history.pushState(null, '', `/product/${product.id}`);
    window.location.reload();
  };

  // Check if product is already in cart
  const cartItem = state.items.find(item => item.id === product.id);
  const isInCart = !!cartItem;
  const cartQuantity = cartItem?.quantity || 0;

  // Check if description is long enough to need "Read More"
  const needsReadMore = product.description && product.description.length > 100;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
      <div className="relative overflow-hidden cursor-pointer group">
        <img 
          src={getImageUrl()} 
          alt={product.name}
          className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110"
          onClick={handleImageClick}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
        <span className="absolute top-3 right-3 text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-medium">
          {product.category}
        </span>
      </div>
      
      <ImageModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        imageUrl={getImageUrl()}
        productName={product.name}
      />
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <h3
            className="text-xl font-bold text-gray-800 mb-2 leading-tight cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleViewDetails}
          >
            {product.name}
          </h3>
          <div>
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {product.description}
            </p>
            {needsReadMore && (
              <button
                onClick={handleViewDetails}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 transition-colors"
              >
                Read More
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-bold text-green-600">
              ${product.price}
            </span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                product.stock_quantity > 20 ? 'bg-green-500' : 
                product.stock_quantity > 5 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 font-medium">
                {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
              </span>
            </div>
          </div>
          
          {isInCart && (
            <div className="mb-3 text-center">
              <span className="text-sm text-green-600 font-medium">
                ✓ {cartQuantity} in cart
              </span>
            </div>
          )}

          {/* Store Information and Visit Store Button */}
          {product.store_id && product.store_name && (
            <div className="mb-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-xs text-gray-600 font-medium truncate">
                    {product.store_name}
                  </span>
                </div>
                <button
                  onClick={handleVisitStore}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors font-medium"
                >
                  Visit Store
                </button>
              </div>
            </div>
          )}
          
          <button 
            onClick={handleAddToCart}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
              product.stock_quantity === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : cartQuantity >= product.stock_quantity
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : isAdding
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transform hover:scale-105'
            }`}
            disabled={product.stock_quantity === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding...</span>
              </>
            ) : product.stock_quantity === 0 ? (
              'Out of Stock'
            ) : cartQuantity >= product.stock_quantity ? (
              'Max Quantity'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
                </svg>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
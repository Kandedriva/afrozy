import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: 'customer' | 'admin' | 'store_owner';
  store?: any;
}

interface FloatingBottomNavProps {
  user?: User | null;
  onLogout?: () => void;
}

const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({ user, onLogout }) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { toggleCart, getTotalItems } = useCart();

  return (
    <>
      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 backdrop-blur-sm bg-white/90">
        <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
          {/* Home */}
          <a
            href="/"
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs text-gray-600">Home</span>
          </a>

          {/* Browse Stores */}
          <a
            href="/stores"
            className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs text-gray-600">Stores</span>
          </a>

          {/* Cart */}
          <button
            onClick={toggleCart}
            className="relative flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <div className="relative">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 2.5M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6" />
              </svg>
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-600">Cart</span>
          </button>

          {/* User Account / Auth */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {(user.full_name || user.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-gray-600">Account</span>
              </button>
            ) : (
              <a
                href="/login"
                className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs text-blue-600 font-medium">Login</span>
              </a>
            )}
          </div>

          {/* Register (only when not logged in) */}
          {!user && (
            <a
              href="/register"
              className="flex flex-col items-center space-y-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-xs text-green-600 font-medium">Register</span>
            </a>
          )}
        </div>

        {/* Account Menu Dropdown (when logged in) */}
        {user && showAccountMenu && (
          <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 shadow-lg rounded-t-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.full_name || user.username}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
              <span className="inline-block px-2 py-1 mt-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {user.user_type === 'store_owner' ? 'Store Owner' : user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
              </span>
            </div>
            
            <div className="py-2">
              <a
                href="/account"
                onClick={() => setShowAccountMenu(false)}
                className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Account</span>
              </a>
              
              {user.user_type === 'store_owner' && (
                <a
                  href="/store/dashboard"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Store Dashboard</span>
                </a>
              )}
              
              {user.user_type === 'admin' && (
                <a
                  href="/admin"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Admin Dashboard</span>
                </a>
              )}
              
              <div className="border-t border-gray-200 mt-2 pt-2">
                {onLogout && (
                  <button
                    onClick={() => { onLogout(); setShowAccountMenu(false); }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom padding to prevent content from being hidden behind the floating nav */}
      <div className="h-20"></div>

      {/* Backdrop for account menu */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </>
  );
};

export default FloatingBottomNav;
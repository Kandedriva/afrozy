import React, { useState, useEffect } from 'react';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import AdminPage from './pages/AdminPage';
import UserAccount from './pages/UserAccount';
import DriverDashboard from './pages/DriverDashboard';
import StoreDashboard from './pages/StoreDashboard';
import StorePage from './pages/StorePage';
import AllStores from './pages/AllStores';
import StoreDetail from './pages/StoreDetail';
import AdminLogin from './components/admin/AdminLogin';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyEmail from './components/auth/VerifyEmail';
import StoreOwnerLogin from './components/store/StoreOwnerLogin';
import StoreOwnerRegister from './components/store/StoreOwnerRegister';
import { CartProvider, useCart } from './context/CartContext';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  user_type: 'customer' | 'admin' | 'store_owner';
  store?: any;
}

// Inner component that uses cart context
function AppContent() {
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isStoreOwnerAuthenticated, setIsStoreOwnerAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const { user, setUser } = useCart();

  // Check for existing authentication on app load
  useEffect(() => {
    const validateStoredAuth = async () => {
      const userData = localStorage.getItem('afrozy-market-user');
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          
          // Use session-based validation for all user types
          try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
            let validationEndpoint;

            // Choose appropriate validation endpoint based on user type
            if (parsedUser.user_type === 'store_owner') {
              validationEndpoint = `${apiUrl}/store/products`;
            } else if (parsedUser.user_type === 'admin') {
              validationEndpoint = `${apiUrl}/auth/profile`;
            } else {
              // For customers, just assume valid session if data exists
              setUser(parsedUser);
              return;
            }
            
            const response = await fetch(validationEndpoint, {
              credentials: 'include' // Include session cookies
            });
            
            if (response.ok) {
              // Session is valid
              setUser(parsedUser);
              
              if (parsedUser.user_type === 'admin') {
                setIsAdminAuthenticated(true);
              } else if (parsedUser.user_type === 'store_owner') {
                setIsStoreOwnerAuthenticated(true);
              }
            } else {
              // Session is invalid, clear stored data
              localStorage.removeItem('afrozy-market-user');
            }
          } catch (networkError) {
            // Network error, assume session might still be valid for now
            setUser(parsedUser);
            
            if (parsedUser.user_type === 'admin') {
              setIsAdminAuthenticated(true);
            } else if (parsedUser.user_type === 'store_owner') {
              setIsStoreOwnerAuthenticated(true);
            }
          }
        } catch (parseError) {
          // Invalid stored data, clear it
          localStorage.removeItem('afrozy-market-user');
        }
      }
    };

    validateStoredAuth().finally(() => setIsInitialized(true));
  }, [setUser]);

  // Simple routing system
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    
    // Store user data (no token needed for session auth)
    localStorage.setItem('afrozy-market-user', JSON.stringify(userData));
    
    // Route based on user type
    if (userData.user_type === 'admin') {
      setIsAdminAuthenticated(true);
      window.history.pushState(null, '', '/admin');
      setCurrentRoute('/admin');
    } else if (userData.user_type === 'store_owner') {
      setIsStoreOwnerAuthenticated(true);
      window.history.pushState(null, '', '/store/dashboard');
      setCurrentRoute('/store/dashboard');
    } else {
      // Regular customer goes to store
      window.history.pushState(null, '', '/');
      setCurrentRoute('/');
    }
  };

  const handleRegister = (userData: User, token: string) => {
    setUser(userData);
    
    // Store user data (no token needed for session auth)
    localStorage.setItem('afrozy-market-user', JSON.stringify(userData));
    
    // New users go to store
    window.history.pushState(null, '', '/');
    setCurrentRoute('/');
  };

  const handleAdminLogin = (userData: User, token: string) => {
    setUser(userData);
    
    // Store user data (no token needed for session auth)
    localStorage.setItem('afrozy-market-user', JSON.stringify(userData));
    
    // Set admin authentication
    setIsAdminAuthenticated(true);
    window.history.pushState(null, '', '/admin');
    setCurrentRoute('/admin');
  };

  const handleStoreOwnerLogin = (userData: User, token: string) => {
    setUser(userData);
    
    // Store user data (session handles authentication)
    localStorage.setItem('afrozy-market-user', JSON.stringify(userData));
    
    // Set store owner authentication
    setIsStoreOwnerAuthenticated(true);
    window.history.pushState(null, '', '/store/dashboard');
    setCurrentRoute('/store/dashboard');
  };

  const handleStoreOwnerRegister = (userData: User, token: string) => {
    setUser(userData);
    
    // Store user data (session handles authentication)
    localStorage.setItem('afrozy-market-user', JSON.stringify(userData));
    
    // Set store owner authentication
    setIsStoreOwnerAuthenticated(true);
    window.history.pushState(null, '', '/store/dashboard');
    setCurrentRoute('/store/dashboard');
  };

  const handleLogout = async () => {
    try {
      // Call logout API to destroy session
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      await fetch(`${apiUrl}/store/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear authentication state
      setUser(null);
      setIsAdminAuthenticated(false);
      setIsStoreOwnerAuthenticated(false);
      
      // Clear stored authentication data
      localStorage.removeItem('afrozy-market-user');
      
      // Navigate to home
      window.history.pushState(null, '', '/');
      setCurrentRoute('/');
    }
  };

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentRoute(path);
  };

  const handleNavigateToVerify = (email: string) => {
    setVerificationEmail(email);
    navigateTo('/verify-email');
  };

  const handleVerificationSuccess = () => {
    // After successful verification, redirect to login
    navigateTo('/login');
  };

  // Add global click handler for navigation
  React.useEffect(() => {
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.tagName === 'A' && target.href) {
        const url = new URL(target.href);
        if (url.pathname.startsWith('/admin')) {
          e.preventDefault();
          if (!isAdminAuthenticated && url.pathname !== '/admin/login') {
            window.history.pushState(null, '', '/admin/login');
            setCurrentRoute('/admin/login');
          } else if (isAdminAuthenticated) {
            window.history.pushState(null, '', url.pathname);
            setCurrentRoute(url.pathname);
          }
        } else if (url.pathname.startsWith('/store/')) {
          e.preventDefault();
          if (!isStoreOwnerAuthenticated && !url.pathname.includes('/login') && !url.pathname.includes('/register')) {
            window.history.pushState(null, '', '/store/login');
            setCurrentRoute('/store/login');
          } else {
            window.history.pushState(null, '', url.pathname);
            setCurrentRoute(url.pathname);
          }
        } else if (url.pathname === '/' || url.pathname === '/account' || url.pathname === '/driver' || url.pathname === '/sellers' || url.pathname === '/stores') {
          e.preventDefault();
          window.history.pushState(null, '', url.pathname);
          setCurrentRoute(url.pathname);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [isAdminAuthenticated, isStoreOwnerAuthenticated]);

  const renderPage = () => {
    // Show loading while initializing
    if (!isInitialized) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading Afrozy...</p>
          </div>
        </div>
      );
    }

    // Authentication routes
    if (currentRoute === '/login') {
      return (
        <Login
          onLoginSuccess={handleLogin}
          onNavigateToRegister={() => navigateTo('/register')}
          onNavigateToStore={() => navigateTo('/')}
          onNavigateToVerify={handleNavigateToVerify}
        />
      );
    }

    if (currentRoute === '/register') {
      return (
        <Register
          onRegisterSuccess={handleRegister}
          onNavigateToLogin={() => navigateTo('/login')}
          onNavigateToStore={() => navigateTo('/')}
          onNavigateToVerify={handleNavigateToVerify}
        />
      );
    }

    if (currentRoute === '/verify-email') {
      if (!verificationEmail) {
        // If no email set, redirect to register
        navigateTo('/register');
        return null;
      }
      return (
        <VerifyEmail
          email={verificationEmail}
          onVerificationSuccess={handleVerificationSuccess}
          onNavigateToLogin={() => navigateTo('/login')}
        />
      );
    }

    // Store owner routes  
    if (currentRoute.startsWith('/store/')) {
      if (currentRoute === '/store/register') {
        return (
          <StoreOwnerRegister
            onRegisterSuccess={handleStoreOwnerRegister}
            onNavigateToLogin={() => navigateTo('/store/login')}
            onNavigateHome={() => navigateTo('/')}
          />
        );
      }
      
      if (currentRoute === '/store/login') {
        return (
          <StoreOwnerLogin
            onLoginSuccess={handleStoreOwnerLogin}
            onNavigateToRegister={() => navigateTo('/store/register')}
            onNavigateHome={() => navigateTo('/')}
          />
        );
      }

      if (currentRoute === '/store/dashboard') {
        if (!isStoreOwnerAuthenticated) {
          return (
            <StoreOwnerLogin
              onLoginSuccess={handleStoreOwnerLogin}
              onNavigateToRegister={() => navigateTo('/store/register')}
              onNavigateHome={() => navigateTo('/')}
            />
          );
        }
        
        return <StoreDashboard storeOwner={user!} onLogout={handleLogout} />;
      }

      // Check if it's a store detail page (numeric ID)
      const storeId = currentRoute.split('/store/')[1];
      if (storeId && /^\d+$/.test(storeId)) {
        return <StoreDetail storeId={storeId} user={user} onLogout={user ? handleLogout : undefined} />;
      }
      
      // Default fallback for unmatched /store/ routes
      if (!isStoreOwnerAuthenticated) {
        return (
          <StoreOwnerLogin
            onLoginSuccess={handleStoreOwnerLogin}
            onNavigateToRegister={() => navigateTo('/store/register')}
            onNavigateHome={() => navigateTo('/')}
          />
        );
      }
      
      return <StoreDashboard storeOwner={user!} onLogout={handleLogout} />;
    }

    // Admin routes
    if (currentRoute.startsWith('/admin')) {
      if (!isAdminAuthenticated) {
        return <AdminLogin onLogin={handleAdminLogin} />;
      }
      return <AdminPage onLogout={handleLogout} />;
    }

    // User account route
    if (currentRoute === '/account') {
      return (
        <UserAccount 
          onLogout={handleLogout}
          onNavigateHome={() => navigateTo('/')}
        />
      );
    }

    // Driver dashboard route
    if (currentRoute === '/driver') {
      return (
        <DriverDashboard 
          onNavigateHome={() => navigateTo('/')}
        />
      );
    }

    // Store/Sellers information page
    if (currentRoute === '/sellers') {
      return <StorePage />;
    }

    // All stores listing page
    if (currentRoute === '/stores') {
      return <AllStores user={user} onLogout={user ? handleLogout : undefined} />;
    }

    // Product detail page (numeric ID)
    if (currentRoute.startsWith('/product/')) {
      const productId = currentRoute.split('/product/')[1];
      if (productId && /^\d+$/.test(productId)) {
        return <ProductDetail productId={productId} user={user} onLogout={user ? handleLogout : undefined} />;
      }
    }

    // Handle any other routes - redirect to home
    if (currentRoute !== '/') {
      window.history.replaceState(null, '', '/');
      setCurrentRoute('/');
      return null;
    }

    // Main store
    return (
      <div>
        <Products user={user} onLogout={user ? handleLogout : undefined} onNavigate={navigateTo} />
        
        {/* Authentication links */}
        <div className="fixed bottom-4 right-4 space-y-2">
          {user ? (
            <div className="bg-white rounded-lg shadow-lg p-3 border">
              <p className="text-sm text-gray-600">Welcome, {user.full_name}!</p>
              <div className="mt-2 space-x-2">
                <button
                  onClick={() => navigateTo('/account')}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  My Account
                </button>
                {user.user_type === 'admin' && (
                  <button
                    onClick={() => navigateTo('/admin')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => navigateTo('/login')}
                className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigateTo('/register')}
                className="block w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors shadow-lg"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return renderPage();
}

// Main App component with CartProvider
function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;

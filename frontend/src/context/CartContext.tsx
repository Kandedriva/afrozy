import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

interface Product {
  id: number;
  store_id?: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock_quantity: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

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

type CartAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

interface CartContextType {
  state: CartState;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  loadCart: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  setUser: (user: User | null) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  user: User | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: Math.min(item.quantity + 1, item.stock_quantity) }
              : item
          )
        };
      }
      
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }]
      };
    }
    
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    
    case 'UPDATE_QUANTITY': {
      const { id, quantity } = action.payload;
      
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.id !== id)
        };
      }
      
      return {
        ...state,
        items: state.items.map(item =>
          item.id === id
            ? { ...item, quantity: Math.min(quantity, item.stock_quantity) }
            : item
        )
      };
    }
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };
    
    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen
      };
    
    case 'OPEN_CART':
      return {
        ...state,
        isOpen: true
      };
    
    case 'CLOSE_CART':
      return {
        ...state,
        isOpen: false
      };
    
    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload,
        loading: false,
        error: null
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  isOpen: false,
  loading: false,
  error: null
};

// Generate or get session ID for guest users
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('afrozy_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('afrozy_session_id', sessionId);
  }
  return sessionId;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [user, setUser] = React.useState<User | null>(null);
  const userRef = React.useRef<User | null>(null);

  // Keep userRef in sync with user state
  React.useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadCart = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Get auth headers at call time using ref to avoid dependency issues
      const token = localStorage.getItem('afrozy-market-token');
      const currentUser = userRef.current;
      const headers = currentUser && token 
        ? { Authorization: `Bearer ${token}` }
        : { 'X-Session-Id': getSessionId() };

      const response = await axios.get(`${API_BASE_URL}/cart`, { headers });

      if (response.data.success) {
        // Convert backend cart items to frontend format
        const cartItems: CartItem[] = response.data.data.items.map((item: any) => ({
          id: item.product_id,
          name: item.name,
          description: '', // Backend doesn't return this, could be fetched separately
          price: parseFloat(item.price),
          category: '', // Backend doesn't return this
          image_url: item.image_url,
          stock_quantity: item.stock_quantity,
          quantity: item.quantity
        }));

        dispatch({ type: 'LOAD_CART', payload: cartItems });
      }
    } catch (error: any) {
      console.error('Error loading cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' });
      // Fallback to localStorage for offline functionality
      const savedCart = localStorage.getItem('afrozy-market-cart');
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          dispatch({ type: 'LOAD_CART', payload: cartItems });
        } catch (parseError: any) {
          console.error('Error parsing saved cart:', parseError);
        }
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load user from localStorage on component mount
  useEffect(() => {
    const loadInitialState = async () => {
      const savedUser = localStorage.getItem('afrozy-market-user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (error: any) {
          console.error('Error loading user from localStorage:', error);
        }
      }
      // Load cart once on mount
      await loadCart();
    };
    
    loadInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want this to run once on mount

  // Reload cart when user authentication state changes
  useEffect(() => {
    // Skip the initial render when user goes from undefined to null
    if (user !== null) {
      // Add small delay to ensure user state is fully updated
      setTimeout(() => loadCart(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user to avoid infinite loops

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('afrozy-market-token');
    const currentUser = userRef.current;
    if (currentUser && token) {
      return { Authorization: `Bearer ${token}` };
    }
    return { 'X-Session-Id': getSessionId() };
  };

  const addToCart = async (product: Product) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const headers = getAuthHeaders();

      const response = await axios.post(`${API_BASE_URL}/cart/add`, {
        productId: product.id,
        quantity: 1
      }, {
        headers
      });

      if (response.data.success) {
        // Reload cart to get updated data
        await loadCart();
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
      // Fallback to local state
      dispatch({ type: 'ADD_TO_CART', payload: product });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const removeFromCart = async (productId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await axios.delete(`${API_BASE_URL}/cart/remove/${productId}`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
      }
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove item from cart' });
      // Fallback to local state
      dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await axios.put(`${API_BASE_URL}/cart/update`, {
        productId,
        quantity
      }, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update quantity' });
      // Fallback to local state
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: productId, quantity } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await axios.delete(`${API_BASE_URL}/cart/clear`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        dispatch({ type: 'CLEAR_CART' });
      }
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear cart' });
      // Fallback to local state
      dispatch({ type: 'CLEAR_CART' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mergeGuestCart = useCallback(async () => {
    try {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const sessionId = getSessionId();
      
      const response = await axios.post(`${API_BASE_URL}/cart/merge`, {
        sessionId
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('afrozy-market-token')}` }
      });

      if (response.data.success) {
        // Clear local session ID and localStorage cart after successful merge
        localStorage.removeItem('afrozy_session_id');
        localStorage.removeItem('afrozy-market-cart');
        
        // Reload cart to get merged data
        await loadCart();
      }
    } catch (error: any) {
      console.error('Error merging cart:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove dependencies to avoid infinite loops

  // Save cart to localStorage as backup whenever it changes
  useEffect(() => {
    localStorage.setItem('afrozy-market-cart', JSON.stringify(state.items));
  }, [state.items]);

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const openCart = () => {
    dispatch({ type: 'OPEN_CART' });
  };

  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + (parseFloat(item.price.toString()) * item.quantity), 0);
  };

  const handleSetUser = useCallback((newUser: User | null) => {
    const previousUser = userRef.current;
    setUser(newUser);
    
    // Save user to localStorage
    if (newUser) {
      localStorage.setItem('afrozy-market-user', JSON.stringify(newUser));
      
      // If user just logged in and there was a guest cart, merge it
      if (!previousUser && state.items.length > 0) {
        setTimeout(() => mergeGuestCart(), 100); // Small delay to ensure user state is set
      }
    } else {
      localStorage.removeItem('afrozy-market-user');
      localStorage.removeItem('afrozy-market-token');
      // Clear cart when user logs out
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [state.items.length, mergeGuestCart]);

  const value: CartContextType = {
    state,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    loadCart,
    mergeGuestCart,
    setUser: handleSetUser,
    getTotalItems,
    getTotalPrice,
    user
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
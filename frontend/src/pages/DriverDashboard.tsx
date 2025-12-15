import React, { useState, useEffect } from 'react';
import DriverLogin from '../components/driver/DriverLogin';
import DriverOrders from '../components/driver/DriverOrders';
import DriverProfile from '../components/driver/DriverProfile';
import DriverStats from '../components/driver/DriverStats';

interface Driver {
  id: number;
  driverId: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  status: 'online' | 'offline' | 'busy' | 'inactive';
  isVerified: boolean;
  rating: number;
  totalDeliveries: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
}

interface DriverDashboardProps {
  onNavigateHome: () => void;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigateHome }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSection, setActiveSection] = useState<'orders' | 'stats' | 'profile'>('orders');
  const [loading, setLoading] = useState(true);

  // Check for existing authentication on component mount
  useEffect(() => {
    const validateStoredAuth = async () => {
      const driverData = localStorage.getItem('afrozy-driver-data');
      
      if (driverData) {
        try {
          const parsedDriver = JSON.parse(driverData);
          
          // Validate session by making a test request to driver profile
          try {
            const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';
            const response = await fetch(`${apiUrl}/drivers/profile`, {
              credentials: 'include' // Include session cookies
            });
            
            if (response.ok) {
              // Session is valid
              setDriver(parsedDriver);
              setIsAuthenticated(true);
            } else {
              // Session is invalid, clear stored data
              console.log('Driver session validation failed:', response.status);
              localStorage.removeItem('afrozy-driver-data');
            }
          } catch (networkError) {
            // Network error, assume session might still be valid for now but log the issue
            console.log('Network error validating driver session, assuming valid:', networkError);
            setDriver(parsedDriver);
            setIsAuthenticated(true);
          }
        } catch (parseError) {
          // Invalid stored data, clear it
          console.log('Invalid stored driver data:', parseError);
          localStorage.removeItem('afrozy-driver-data');
        }
      }
      
      setLoading(false);
    };

    validateStoredAuth();
  }, []);

  const handleLogin = (driverData: Driver, token: string) => {
    setDriver(driverData);
    setIsAuthenticated(true);
    
    // Store only driver data (session cookies are handled automatically)
    localStorage.setItem('afrozy-driver-data', JSON.stringify(driverData));
  };

  const handleLogout = async () => {
    try {
      // Call logout API to destroy session
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';
      await fetch(`${apiUrl}/drivers/logout`, {
        method: 'POST',
        credentials: 'include' // Include session cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('afrozy-driver-data');
      setDriver(null);
      setIsAuthenticated(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'busy':
        return '🟡';
      case 'offline':
        return '⚫';
      default:
        return '🔴';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <DriverLogin 
        onLogin={handleLogin}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  const navigationItems = [
    {
      id: 'orders' as const,
      label: 'Orders',
      icon: '📦',
      description: 'View and manage deliveries'
    },
    {
      id: 'stats' as const,
      label: 'Statistics',
      icon: '📊',
      description: 'View your performance'
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: '👤',
      description: 'Manage your account'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'orders':
        return <DriverOrders driver={driver!} />;
      case 'stats':
        return <DriverStats driver={driver!} />;
      case 'profile':
        return <DriverProfile driver={driver!} onUpdate={setDriver} />;
      default:
        return <DriverOrders driver={driver!} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onNavigateHome}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Store</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Driver Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Driver Status */}
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(driver?.status || 'offline')}`}>
                <span>{getStatusIcon(driver?.status || 'offline')}</span>
                <span className="capitalize">{driver?.status}</span>
              </div>

              {/* Driver Info */}
              <div className="text-sm">
                <span className="text-gray-600">Welcome, </span>
                <span className="font-medium text-gray-900">{driver?.fullName}</span>
              </div>

              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Driver Card */}
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-lg">
                    🚗
                  </span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{driver?.driverId}</h3>
                  <p className="text-sm text-gray-500">{driver?.vehicleType}</p>
                  <p className="text-xs text-gray-400">{driver?.vehiclePlate}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mb-6 pb-6 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{driver?.totalDeliveries}</div>
                    <div className="text-xs text-gray-500">Deliveries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{driver?.rating.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-start space-x-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      activeSection === item.id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
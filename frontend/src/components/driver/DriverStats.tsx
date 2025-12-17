import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axios';


interface Stats {
  totalDeliveries: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  averageRating: number;
  totalEarnings: number;
  earningsToday: number;
  earningsThisWeek: number;
  earningsThisMonth: number;
  deliveryStatusBreakdown: {
    delivered: number;
    in_transit: number;
    picked_up: number;
    assigned: number;
  };
  recentDeliveries: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    total: number;
    deliveredAt: string;
    rating?: number;
  }>;
}

interface Driver {
  id: number;
  driverId: string;
  fullName: string;
  rating: number;
  totalDeliveries: number;
}

interface DriverStatsProps {
  driver: Driver;
}

const DriverStats: React.FC<DriverStatsProps> = ({ driver }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(
        `/drivers/stats?range=${timeRange}`,
{}
      );

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch statistics';
      setError(errorMessage);
      
      // If it's a token-related error, clear stored auth data
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Driver authentication error, clearing stored data:', errorMessage);
        localStorage.removeItem('afrozy-driver-data');
        // Reload the page to trigger re-authentication
        window.location.reload();
        return;
      }
      
      // Set mock data for demonstration
      setStats({
        totalDeliveries: driver.totalDeliveries,
        completedToday: 3,
        completedThisWeek: 12,
        completedThisMonth: 45,
        averageRating: driver.rating,
        totalEarnings: 2340.50,
        earningsToday: 45.20,
        earningsThisWeek: 180.75,
        earningsThisMonth: 780.25,
        deliveryStatusBreakdown: {
          delivered: 42,
          in_transit: 2,
          picked_up: 1,
          assigned: 0
        },
        recentDeliveries: [
          {
            id: 1,
            orderNumber: 'AF12345',
            customerName: 'John Doe',
            total: 25.99,
            deliveredAt: new Date().toISOString(),
            rating: 5
          },
          {
            id: 2,
            orderNumber: 'AF12344',
            customerName: 'Jane Smith',
            total: 19.50,
            deliveredAt: new Date(Date.now() - 3600000).toISOString(),
            rating: 4
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange, driver.totalDeliveries, driver.rating]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getEarningsForRange = () => {
    if (!stats) return 0;
    
    switch (timeRange) {
      case 'today':
        return stats.earningsToday;
      case 'week':
        return stats.earningsThisWeek;
      case 'month':
        return stats.earningsThisMonth;
      case 'all':
        return stats.totalEarnings;
      default:
        return 0;
    }
  };

  const getDeliveriesForRange = () => {
    if (!stats) return 0;
    
    switch (timeRange) {
      case 'today':
        return stats.completedToday;
      case 'week':
        return stats.completedThisWeek;
      case 'month':
        return stats.completedThisMonth;
      case 'all':
        return stats.totalDeliveries;
      default:
        return 0;
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Statistics Unavailable</h3>
          <p className="text-gray-600">{error || 'Failed to load statistics'}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Performance Statistics</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-600">
            Note: Using demo data. {error}
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{getDeliveriesForRange()}</div>
          <div className="text-sm text-gray-500 capitalize">Deliveries {timeRange === 'all' ? 'Total' : timeRange}</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-green-600">${getEarningsForRange().toFixed(2)}</div>
          <div className="text-sm text-gray-500 capitalize">Earnings {timeRange === 'all' ? 'Total' : timeRange}</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className={`text-3xl font-bold ${getPerformanceColor(stats.averageRating)}`}>
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">Average Rating</div>
          <div className="flex justify-center mt-1">
            {renderStarRating(Math.round(stats.averageRating))}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {Math.round((getDeliveriesForRange() / (timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365)) * 10) / 10}
          </div>
          <div className="text-sm text-gray-500">Avg Per Day</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Delivery Status Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Delivery Status</h3>
          <div className="space-y-3">
            {Object.entries(stats.deliveryStatusBreakdown).map(([status, count]) => {
              const total = Object.values(stats.deliveryStatusBreakdown).reduce((sum, val) => sum + val, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              const statusColors = {
                delivered: 'bg-green-500',
                in_transit: 'bg-orange-500',
                picked_up: 'bg-yellow-500',
                assigned: 'bg-blue-500'
              };
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors]}`}></div>
                    <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{count}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${statusColors[status as keyof typeof statusColors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Deliveries</h3>
          <div className="space-y-4">
            {stats.recentDeliveries.length > 0 ? (
              stats.recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">#{delivery.orderNumber}</p>
                    <p className="text-sm text-gray-600">{delivery.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(delivery.deliveredAt).toLocaleDateString()} at {' '}
                      {new Date(delivery.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${delivery.total.toFixed(2)}</p>
                    {delivery.rating && (
                      <div className="flex items-center space-x-1">
                        {renderStarRating(delivery.rating)}
                        <span className="text-xs text-gray-500">({delivery.rating})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent deliveries found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">📈</div>
            <h4 className="font-medium text-gray-900">Productivity</h4>
            <p className="text-sm text-gray-600 mt-1">
              {getDeliveriesForRange() > 0 ? 'Great job on your deliveries!' : 'Ready to start delivering?'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">⭐</div>
            <h4 className="font-medium text-gray-900">Customer Satisfaction</h4>
            <p className="text-sm text-gray-600 mt-1">
              {stats.averageRating >= 4.5 
                ? 'Excellent customer feedback!' 
                : stats.averageRating >= 4.0 
                ? 'Good customer ratings' 
                : 'Room for improvement'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">💰</div>
            <h4 className="font-medium text-gray-900">Earnings</h4>
            <p className="text-sm text-gray-600 mt-1">
              {getEarningsForRange() > 0 
                ? `$${getEarningsForRange().toFixed(2)} earned ${timeRange === 'all' ? 'total' : timeRange}` 
                : 'Start delivering to earn!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverStats;
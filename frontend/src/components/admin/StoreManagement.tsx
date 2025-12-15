import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

interface Store {
  id: number;
  store_name: string;
  store_description: string;
  store_address: string;
  business_type: string;
  business_license: string;
  categories: string[];
  status: 'pending' | 'approved' | 'suspended';
  created_at: string;
  updated_at: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
}

const StoreManagement: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'suspended'>('all');

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/stores`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setStores(response.data.data);
      } else {
        setError('Failed to fetch stores');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching stores');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStoreStatus = async (storeId: number, newStatus: 'approved' | 'pending' | 'suspended') => {
    try {
      setUpdating(storeId);
      const response = await axios.put(
        `${API_BASE_URL}/admin/stores/${storeId}/status`, 
        { status: newStatus },
        {
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        // Update local state
        setStores(stores.map(store => 
          store.id === storeId 
            ? { ...store, status: newStatus, updated_at: new Date().toISOString() }
            : store
        ));
        setSelectedStore(null);
      } else {
        setError('Failed to update store status');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating store status');
      console.error('Error updating store status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'pending':
        return '🟡';
      case 'suspended':
        return '❌';
      default:
        return '⚪';
    }
  };

  const filteredStores = filter === 'all' ? stores : stores.filter(store => store.status === filter);

  const statusCounts = {
    all: stores.length,
    pending: stores.filter(s => s.status === 'pending').length,
    approved: stores.filter(s => s.status === 'approved').length,
    suspended: stores.filter(s => s.status === 'suspended').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading stores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Store Management</h2>
        <button 
          onClick={fetchStores}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All Stores', count: statusCounts.all },
              { key: 'pending', label: 'Pending', count: statusCounts.pending },
              { key: 'approved', label: 'Approved', count: statusCounts.approved },
              { key: 'suspended', label: 'Suspended', count: statusCounts.suspended },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🏪</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'No stores have been registered yet.' : `No ${filter} stores found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{store.store_name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{store.store_description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{store.owner_name}</div>
                        <div className="text-sm text-gray-500">{store.owner_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {store.business_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(store.status)}`}>
                        {getStatusIcon(store.status)} {store.status.charAt(0).toUpperCase() + store.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(store.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedStore(store)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {store.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStoreStatus(store.id, 'approved')}
                            disabled={updating === store.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {updating === store.id ? 'Updating...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => updateStoreStatus(store.id, 'suspended')}
                            disabled={updating === store.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {updating === store.id ? 'Updating...' : 'Reject'}
                          </button>
                        </>
                      )}
                      {store.status === 'approved' && (
                        <button
                          onClick={() => updateStoreStatus(store.id, 'suspended')}
                          disabled={updating === store.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {updating === store.id ? 'Updating...' : 'Suspend'}
                        </button>
                      )}
                      {store.status === 'suspended' && (
                        <button
                          onClick={() => updateStoreStatus(store.id, 'approved')}
                          disabled={updating === store.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {updating === store.id ? 'Updating...' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Store Details Modal */}
      {selectedStore && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Store Details</h3>
              <button
                onClick={() => setSelectedStore(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedStore.store_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedStore.store_description}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedStore.store_address}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categories</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedStore.categories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner Information</label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-900">Name: {selectedStore.owner_name}</p>
                    <p className="text-sm text-gray-900">Email: {selectedStore.owner_email}</p>
                    {selectedStore.owner_phone && (
                      <p className="text-sm text-gray-900">Phone: {selectedStore.owner_phone}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Details</label>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-900">Type: {selectedStore.business_type}</p>
                    {selectedStore.business_license && (
                      <p className="text-sm text-gray-900">License: {selectedStore.business_license}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedStore.status)}`}>
                    {getStatusIcon(selectedStore.status)} {selectedStore.status.charAt(0).toUpperCase() + selectedStore.status.slice(1)}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedStore.created_at).toLocaleString()}</p>
                </div>
                
                {selectedStore.updated_at !== selectedStore.created_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedStore.updated_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons in modal */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedStore(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              
              {selectedStore.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      updateStoreStatus(selectedStore.id, 'approved');
                    }}
                    disabled={updating === selectedStore.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {updating === selectedStore.id ? 'Updating...' : 'Approve Store'}
                  </button>
                  <button
                    onClick={() => {
                      updateStoreStatus(selectedStore.id, 'suspended');
                    }}
                    disabled={updating === selectedStore.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {updating === selectedStore.id ? 'Updating...' : 'Reject Store'}
                  </button>
                </>
              )}
              
              {selectedStore.status === 'approved' && (
                <button
                  onClick={() => {
                    updateStoreStatus(selectedStore.id, 'suspended');
                  }}
                  disabled={updating === selectedStore.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {updating === selectedStore.id ? 'Updating...' : 'Suspend Store'}
                </button>
              )}
              
              {selectedStore.status === 'suspended' && (
                <button
                  onClick={() => {
                    updateStoreStatus(selectedStore.id, 'approved');
                  }}
                  disabled={updating === selectedStore.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {updating === selectedStore.id ? 'Updating...' : 'Reactivate Store'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagement;
import React, { useState } from 'react';
import axios from '../../utils/axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://localhost:3001/api';

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

interface DriverProfileProps {
  driver: Driver;
  onUpdate: (driver: Driver) => void;
}

const DriverProfile: React.FC<DriverProfileProps> = ({ driver, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: driver.fullName,
    email: driver.email,
    phone: driver.phone,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate
  });

  const vehicleTypes = [
    'Motorcycle',
    'Car',
    'Van',
    'Bicycle',
    'Scooter'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.put(
        `${API_BASE_URL}/drivers/profile`,
        formData,
{}
      );

      if (response.data.success) {
        const updatedDriver = { ...driver, ...formData };
        onUpdate(updatedDriver);
        localStorage.setItem('afrozy-driver-data', JSON.stringify(updatedDriver));
        setSuccess('Profile updated successfully');
        setEditing(false);
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      
      // If it's a token-related error, clear stored auth data
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Driver authentication error, clearing stored data:', errorMessage);
        localStorage.removeItem('afrozy-driver-data');
        // Reload the page to trigger re-authentication
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setLoading(true);
      
      const response = await axios.put(
        `${API_BASE_URL}/drivers/status`,
        { status: newStatus },
{}
      );

      if (response.data.success) {
        const updatedDriver = { ...driver, status: newStatus as any };
        onUpdate(updatedDriver);
        localStorage.setItem('afrozy-driver-data', JSON.stringify(updatedDriver));
        setSuccess('Status updated successfully');
      } else {
        setError(response.data.message || 'Failed to update status');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update status';
      setError(errorMessage);
      
      // If it's a token-related error, clear stored auth data
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Driver authentication error, clearing stored data:', errorMessage);
        localStorage.removeItem('afrozy-driver-data');
        // Reload the page to trigger re-authentication
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          setLoading(true);
              
          const response = await axios.put(
            `${API_BASE_URL}/drivers/location`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          );

          if (response.data.success) {
            const updatedDriver = {
              ...driver,
              currentLocation: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }
            };
            onUpdate(updatedDriver);
            localStorage.setItem('afrozy-driver-data', JSON.stringify(updatedDriver));
            setSuccess('Location updated successfully');
          } else {
            setError(response.data.message || 'Failed to update location');
          }
        } catch (err: any) {
          const errorMessage = err.response?.data?.message || 'Failed to update location';
          setError(errorMessage);
          
          // If it's a token-related error, clear stored auth data
          if (err.response?.status === 401 || err.response?.status === 403) {
            console.log('Driver authentication error, clearing stored data:', errorMessage);
                localStorage.removeItem('afrozy-driver-data');
            // Reload the page to trigger re-authentication
            window.location.reload();
          }
        } finally {
          setLoading(false);
        }
      }, (error) => {
        setError('Failed to get your location. Please enable location services.');
      });
    } else {
      setError('Geolocation is not supported by this browser.');
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

  const getVerificationBadge = () => {
    if (driver.isVerified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          ✓ Verified
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          ⏳ Pending Verification
        </span>
      );
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Driver Profile</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Driver Status Card */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Status</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Status
              </label>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(driver.status)}`}>
                  {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                </span>
                {driver.status !== 'busy' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate('online')}
                      disabled={loading || driver.status === 'online'}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Go Online
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('offline')}
                      disabled={loading || driver.status === 'offline'}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Go Offline
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Status
              </label>
              <div>
                {getVerificationBadge()}
              </div>
            </div>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
          <div className="flex items-center justify-between">
            <div>
              {driver.currentLocation ? (
                <p className="text-sm text-gray-600">
                  Last location: {driver.currentLocation.latitude.toFixed(6)}, {driver.currentLocation.longitude.toFixed(6)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">No location data available</p>
              )}
            </div>
            <button
              onClick={updateLocation}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Location'}
            </button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  >
                    {vehicleTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Plate
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      fullName: driver.fullName,
                      email: driver.email,
                      phone: driver.phone,
                      vehicleType: driver.vehicleType,
                      vehiclePlate: driver.vehiclePlate
                    });
                    setError('');
                    setSuccess('');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Personal Details</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="text-gray-500">Driver ID:</span> {driver.driverId}</p>
                    <p><span className="text-gray-500">Full Name:</span> {driver.fullName}</p>
                    <p><span className="text-gray-500">Email:</span> {driver.email}</p>
                    <p><span className="text-gray-500">Phone:</span> {driver.phone}</p>
                    <p><span className="text-gray-500">License:</span> {driver.licenseNumber}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Vehicle Details</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="text-gray-500">Type:</span> {driver.vehicleType}</p>
                    <p><span className="text-gray-500">Plate:</span> {driver.vehiclePlate}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{driver.totalDeliveries}</div>
              <div className="text-sm text-gray-500">Total Deliveries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{driver.rating.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Date(driver.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">Joined Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface StripeConnectAccount {
  connected: boolean;
  accountId?: string;
  status: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirements?: any;
  capabilities?: any;
  message?: string;
}

interface Balance {
  available: Array<{
    amount: number;
    currency: string;
  }>;
  pending: Array<{
    amount: number;
    currency: string;
  }>;
}

const StripeConnect: React.FC = () => {
  const [account, setAccount] = useState<StripeConnectAccount | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/stripe-connect/balance`);
      
      if (response.data.success) {
        setBalance(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching balance:', err);
    }
  }, [setBalance]);

  const fetchAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/stripe-connect/account-status`);
      
      if (response.data.success) {
        setAccount(response.data.data);
        
        // If connected, also fetch balance
        if (response.data.data.connected && response.data.data.status === 'connected') {
          fetchBalance();
        }
      }
    } catch (err: any) {
      console.error('Error fetching account status:', err);
      setError('Failed to fetch account status');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setAccount, setError, fetchBalance]);

  useEffect(() => {
    fetchAccountStatus();
  }, [fetchAccountStatus]);

  const createStripeAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await axios.post(`${API_BASE_URL}/stripe-connect/create-account`, {});
      
      if (response.data.success) {
        setSuccess('Stripe account created successfully! You will be redirected to complete setup.');
        // Redirect to onboarding
        window.location.href = response.data.data.onboardingUrl;
      }
    } catch (err: any) {
      console.error('Error creating Stripe account:', err);
      
      // Handle specific Connect signup required error
      if (err.response?.data?.connectSignupRequired) {
        setError('Stripe Connect is not enabled for this account. Please visit https://dashboard.stripe.com/connect/accounts/overview to enable Stripe Connect, then try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to create Stripe account');
      }
    } finally {
      setLoading(false);
    }
  };

  const createOnboardingLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/stripe-connect/create-onboarding-link`, {});
      
      if (response.data.success) {
        window.location.href = response.data.data.onboardingUrl;
      }
    } catch (err: any) {
      console.error('Error creating onboarding link:', err);
      setError(err.response?.data?.message || 'Failed to create onboarding link');
    } finally {
      setLoading(false);
    }
  };

  const createDashboardLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/stripe-connect/create-login-link`, {});
      
      if (response.data.success) {
        window.open(response.data.data.loginUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Error creating dashboard link:', err);
      setError(err.response?.data?.message || 'Failed to create dashboard link');
    } finally {
      setLoading(false);
    }
  };

  const disconnectAccount = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Stripe account? This will stop payment processing for your store.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await axios.delete(`${API_BASE_URL}/stripe-connect/disconnect`);
      
      if (response.data.success) {
        setSuccess('Stripe account disconnected successfully');
        setAccount(null);
        setBalance(null);
      }
    } catch (err: any) {
      console.error('Error disconnecting account:', err);
      setError(err.response?.data?.message || 'Failed to disconnect account');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'not_connected': return 'text-gray-600 bg-gray-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected & Ready';
      case 'pending': return 'Setup Incomplete';
      case 'not_connected': return 'Not Connected';
      default: return 'Unknown Status';
    }
  };

  if (loading && !account) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stripe Connect</h2>
        <p className="text-gray-600">Manage your payment processing and receive payments from customers.</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Account Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
          <button
            onClick={fetchAccountStatus}
            disabled={loading}
            className="text-purple-600 hover:text-purple-700 text-sm"
          >
            Refresh
          </button>
        </div>

        {account ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(account.status)}`}>
                {getStatusText(account.status)}
              </span>
              {account.accountId && (
                <span className="text-sm text-gray-500">
                  Account ID: {account.accountId}
                </span>
              )}
            </div>

            {account.connected && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`font-medium ${account.detailsSubmitted ? 'text-green-600' : 'text-red-600'}`}>
                    {account.detailsSubmitted ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-gray-600">Details Submitted</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`font-medium ${account.chargesEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {account.chargesEnabled ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-gray-600">Charges Enabled</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`font-medium ${account.payoutsEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {account.payoutsEnabled ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-gray-600">Payouts Enabled</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-blue-600">
                    {account.status === 'connected' ? '100%' : '50%'}
                  </div>
                  <div className="text-xs text-gray-600">Setup Complete</div>
                </div>
              </div>
            )}

            {account.requirements && account.requirements.currently_due && account.requirements.currently_due.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Setup Required</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Please complete the following requirements to start receiving payments:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {account.requirements.currently_due.slice(0, 3).map((req: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mr-2"></span>
                      {req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  ))}
                  {account.requirements.currently_due.length > 3 && (
                    <li className="text-xs">...and {account.requirements.currently_due.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Stripe Account Connected</h3>
            <p className="text-gray-600 mb-4">Connect your Stripe account to start receiving payments from customers.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6">
          {!account?.connected ? (
            <button
              onClick={createStripeAccount}
              disabled={loading}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>Connect with Stripe</span>
            </button>
          ) : (
            <>
              {account.status !== 'connected' && (
                <button
                  onClick={createOnboardingLink}
                  disabled={loading}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  Complete Setup
                </button>
              )}
              
              {account.status === 'connected' && (
                <button
                  onClick={createDashboardLink}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Open Stripe Dashboard
                </button>
              )}
              
              <button
                onClick={disconnectAccount}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Disconnect Account
              </button>
            </>
          )}
        </div>
      </div>

      {/* Balance Card */}
      {account?.status === 'connected' && balance && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Balance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Balance</h4>
              {balance.available.length > 0 ? (
                <div className="space-y-2">
                  {balance.available.map((bal, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(bal.amount, bal.currency)}
                      </span>
                      <span className="text-sm text-gray-500 uppercase">{bal.currency}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No available balance</p>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Balance</h4>
              {balance.pending.length > 0 ? (
                <div className="space-y-2">
                  {balance.pending.map((bal, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-2xl font-bold text-yellow-600">
                        {formatCurrency(bal.amount, bal.currency)}
                      </span>
                      <span className="text-sm text-gray-500 uppercase">{bal.currency}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No pending balance</p>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Available:</strong> Funds ready for payout to your bank account.
              <br />
              <strong>Pending:</strong> Funds from recent sales being processed.
            </p>
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start">
            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</span>
            Connect your Stripe account to enable payment processing
          </li>
          <li className="flex items-start">
            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</span>
            Complete the onboarding process to verify your identity
          </li>
          <li className="flex items-start">
            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</span>
            Customers can purchase from your store using credit/debit cards
          </li>
          <li className="flex items-start">
            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">4</span>
            Payments are automatically deposited to your bank account
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StripeConnect;
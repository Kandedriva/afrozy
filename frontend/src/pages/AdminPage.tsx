import React, { useState } from 'react';
import AdminLayout from '../components/admin/AdminLayout';
import Dashboard from '../components/admin/Dashboard';
import ProductManagement from '../components/admin/ProductManagement';
import StoreManagement from '../components/admin/StoreManagement';
import UserManagement from '../components/admin/UserManagement';
import OrderManagement from '../components/admin/OrderManagement';
import Analytics from '../components/admin/Analytics';
import Settings from '../components/admin/Settings';

interface AdminPageProps {
  onLogout?: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onLogout }) => {
  const getInitialPage = () => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/')) {
      const page = path.split('/admin/')[1];
      return page || 'dashboard';
    }
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());

  const handleNavigation = (page: string) => {
    if (page === 'products-add') {
      setCurrentPage('products');
      window.history.pushState(null, '', '/admin/products');
      // Trigger add product form after a short delay to ensure the component is mounted
      setTimeout(() => {
        const addButton = document.querySelector('[data-action="add-product"]') as HTMLButtonElement;
        if (addButton) {
          addButton.click();
        }
      }, 100);
    } else {
      setCurrentPage(page);
      window.history.pushState(null, '', `/admin/${page}`);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'products':
        return <ProductManagement />;
      case 'stores':
        return <StoreManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'users':
        return <UserManagement />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  // Simple navigation handler for navbar links (in a real app, you'd use React Router)
  const handlePageNavigation = (page: string) => {
    setCurrentPage(page);
    window.history.pushState(null, '', `/admin/${page}`);
  };

  // Listen for browser navigation events (back/forward buttons)
  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Override navigation clicks
  React.useEffect(() => {
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement;
      if (target.href && target.href.includes('/admin')) {
        e.preventDefault();
        const page = target.href.split('/admin/')[1] || 'dashboard';
        handlePageNavigation(page);
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  return (
    <AdminLayout currentPage={currentPage} onLogout={onLogout}>
      {renderCurrentPage()}
    </AdminLayout>
  );
};

export default AdminPage;
import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import DashboardStats from './components/DashboardStats';
import InventoryTable from './components/InventoryTable';
import TransactionModal from './components/TransactionModal';
import TransactionHistory from './components/TransactionHistory';
import UserManagement from './components/UserManagement';
import ServiceList from './components/ServiceList';
import ServiceModal from './components/ServiceModal';
import ServiceDetail from './components/ServiceDetail';
import ServiceInvoice from './components/ServiceInvoice';

const API_Base = '/api';

function AppContent() {
    const { user, token, logout, loading } = useAuth();
    const [items, setItems] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('IN');
    const [selectedItem, setSelectedItem] = useState(null);
    const [currentView, setCurrentView] = useState('inventory'); // 'inventory' | 'history' | 'users' | 'service'
    const [serviceModalOpen, setServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [serviceDetailOpen, setServiceDetailOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [invoiceServiceId, setInvoiceServiceId] = useState(null);

    const fetchInventory = async () => {
        if (!token) return;

        try {
            const res = await fetch(`${API_Base}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setItems(data.data);
        } catch (err) {
            console.error("Failed to fetch inventory:", err);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchInventory();
        }
    }, [user, currentView]);

    const handleInteract = (item, type) => {
        setSelectedItem(item);
        setModalType(type);
        setModalOpen(true);
    };

    const handleAddNew = () => {
        setSelectedItem(null);
        setModalType('IN');
        setModalOpen(true);
    };

    const handleTransactionSubmit = async (formData, isFormData = false) => {
        const endpoint = modalType === 'IN' ? '/inventory/in' : '/inventory/out';

        try {
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: isFormData ? formData : JSON.stringify(formData)
            };

            if (!isFormData) {
                options.headers['Content-Type'] = 'application/json';
            }

            const res = await fetch(`${API_Base}${endpoint}`, options);
            const result = await res.json();

            if (res.ok) {
                setModalOpen(false);
                fetchInventory();
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            alert("Network Error: " + err.message);
        }
    };

    const handleDelete = async (itemId) => {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;

        try {
            const res = await fetch(`${API_Base}/inventory/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await res.json();

            if (res.ok) {
                fetchInventory();
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            alert("Network Error: " + err.message);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="container">
            <header className="flex justify-between items-center mb-4" style={{ marginTop: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Inventory Control</h1>
                    <p className="text-muted">
                        Welcome, <strong>{user.full_name || user.username}</strong>
                        {user.role === 'admin' && <span className="badge" style={{ marginLeft: '0.5rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)' }}>Admin</span>}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        className={`btn ${currentView === 'inventory' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ backgroundColor: currentView === 'inventory' ? 'var(--bg-input)' : 'transparent' }}
                        onClick={() => setCurrentView('inventory')}
                    >
                        Inventory
                    </button>
                    <button
                        className={`btn ${currentView === 'history' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ backgroundColor: currentView === 'history' ? 'var(--bg-input)' : 'transparent' }}
                        onClick={() => setCurrentView('history')}
                    >
                        History
                    </button>
                    <button
                        className={`btn ${currentView === 'service' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ backgroundColor: currentView === 'service' ? 'var(--bg-input)' : 'transparent' }}
                        onClick={() => setCurrentView('service')}
                    >
                        Service
                    </button>
                    {user.role === 'admin' && (
                        <button
                            className={`btn ${currentView === 'users' ? 'btn-secondary' : 'btn-ghost'}`}
                            style={{ backgroundColor: currentView === 'users' ? 'var(--bg-input)' : 'transparent' }}
                            onClick={() => setCurrentView('users')}
                        >
                            Users
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={handleAddNew}>
                        + New Component
                    </button>
                    <button className="btn btn-secondary" onClick={logout}>
                        Logout
                    </button>
                </div>
            </header>

            {currentView === 'inventory' ? (
                dataLoading ? (
                    <div className="text-muted">Loading inventory...</div>
                ) : (
                    <>
                        <DashboardStats items={items} />
                        <InventoryTable items={items} onInteract={handleInteract} onDelete={handleDelete} />
                    </>
                )
            ) : currentView === 'history' ? (
                <TransactionHistory />
            ) : currentView === 'service' ? (
                <ServiceList
                    onOpenModal={(service) => {
                        setSelectedService(service);
                        setServiceModalOpen(true);
                    }}
                    onOpenDetail={(service) => {
                        setSelectedServiceId(service.id);
                        setServiceDetailOpen(true);
                    }}
                    onOpenInvoice={(serviceId) => {
                        setInvoiceServiceId(serviceId);
                        setInvoiceOpen(true);
                    }}
                />
            ) : (
                <UserManagement />
            )}

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
                item={selectedItem}
                onSubmit={handleTransactionSubmit}
                existingCategories={[...new Set(items.map(i => i.category).filter(Boolean))].sort()}
            />

            <ServiceModal
                isOpen={serviceModalOpen}
                onClose={() => {
                    setServiceModalOpen(false);
                    setSelectedService(null);
                }}
                service={selectedService}
                onSuccess={() => {
                    // Refresh service list if on service view
                    if (currentView === 'service') {
                        setCurrentView('inventory');
                        setTimeout(() => setCurrentView('service'), 10);
                    }
                }}
            />

            <ServiceDetail
                isOpen={serviceDetailOpen}
                onClose={() => {
                    setServiceDetailOpen(false);
                    setSelectedServiceId(null);
                }}
                serviceId={selectedServiceId}
                onRefresh={() => {
                    // Refresh service list
                    if (currentView === 'service') {
                        setCurrentView('inventory');
                        setTimeout(() => setCurrentView('service'), 10);
                    }
                }}
            />

            <ServiceInvoice
                isOpen={invoiceOpen}
                onClose={() => {
                    setInvoiceOpen(false);
                    setInvoiceServiceId(null);
                }}
                serviceId={invoiceServiceId}
            />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;

import React from 'react';

export default function DashboardStats({ items }) {
    const totalItems = items.length;
    const lowStockItems = items.filter(i => i.total_qty < 5).length;
    const totalStockCount = items.reduce((acc, curr) => acc + curr.total_qty, 0);

    return (
        <div className="dashboard-grid">
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Number of Items</span>
                </div>
                <div className="card-value">{totalItems}</div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Total of Items</span>
                </div>
                <div className="card-value">{totalStockCount}</div>
            </div>

            <div className="card" style={{ borderColor: lowStockItems > 0 ? 'var(--warning)' : 'var(--border)' }}>
                <div className="card-header">
                    <span className="card-title" style={{ color: lowStockItems > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                        Low Stock Alerts
                    </span>
                </div>
                <div className="card-value">{lowStockItems}</div>
            </div>
        </div>
    );
}

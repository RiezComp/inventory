import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_Base = 'http://localhost:3000/api';

const STATUS_COLORS = {
    pending: { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' },
    in_progress: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    waiting_parts: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
    testing: { bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' },
    completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' },
    delivered: { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }
};

export default function ServiceDetail({ isOpen, onClose, serviceId, onRefresh }) {
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddParts, setShowAddParts] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState(1);
    const { token } = useAuth();

    useEffect(() => {
        if (isOpen && serviceId) {
            fetchServiceDetail();
            fetchInventory();
        }
    }, [isOpen, serviceId]);

    const fetchServiceDetail = async () => {
        try {
            const res = await fetch(`${API_Base}/service/${serviceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setService(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await fetch(`${API_Base}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setInventory(data.data.filter(i => i.total_qty > 0));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddParts = async (e) => {
        e.preventDefault();

        if (!selectedItem || qty < 1) {
            alert('Please select item and quantity');
            return;
        }

        try {
            const res = await fetch(`${API_Base}/service/${serviceId}/parts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ item_id: selectedItem, qty })
            });

            const data = await res.json();

            if (res.ok) {
                setShowAddParts(false);
                setSelectedItem('');
                setQty(1);
                fetchServiceDetail();
                fetchInventory();
                onRefresh();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    };

    if (!isOpen) return null;
    if (loading) return <div className="text-muted">Loading...</div>;
    if (!service) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('id-ID');
    };

    const isOverdue = service.due_date &&
        new Date(service.due_date) < new Date() &&
        service.status !== 'completed' &&
        service.status !== 'delivered';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                        Service Order #{service.id}
                    </h2>
                    <button className="btn btn-secondary" onClick={onClose}>✕</button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Status & Priority */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <span
                            className="badge"
                            style={{
                                backgroundColor: STATUS_COLORS[service.status]?.bg,
                                color: STATUS_COLORS[service.status]?.color,
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            {service.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span
                            className="badge"
                            style={{
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Priority: {service.priority.toUpperCase()}
                        </span>
                        {isOverdue && (
                            <span
                                className="badge"
                                style={{
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: 'var(--error)',
                                    fontSize: '0.875rem',
                                    padding: '0.5rem 1rem'
                                }}
                            >
                                OVERDUE
                            </span>
                        )}
                    </div>

                    {/* Item & Customer Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ITEM INFORMATION</h4>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <strong>{service.item_name}</strong>
                            </div>
                            {service.serial_number && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    SN: {service.serial_number}
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CUSTOMER</h4>
                            <div style={{ marginBottom: '0.5rem' }}>
                                <strong>{service.customer_name}</strong>
                            </div>
                            {service.customer_contact && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {service.customer_contact}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Received</div>
                            <div style={{ fontSize: '0.875rem' }}>{formatDate(service.date_received)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date</div>
                            <div style={{ fontSize: '0.875rem', color: isOverdue ? 'var(--error)' : 'inherit' }}>
                                {formatDate(service.due_date)}
                            </div>
                        </div>
                        {service.completed_date && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</div>
                                <div style={{ fontSize: '0.875rem' }}>{formatDate(service.completed_date)}</div>
                            </div>
                        )}
                    </div>

                    {/* Complaint & Diagnosis */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>COMPLAINT</h4>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius)' }}>
                            {service.complaint}
                        </div>
                    </div>

                    {service.diagnosis && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>DIAGNOSIS</h4>
                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius)' }}>
                                {service.diagnosis}
                            </div>
                        </div>
                    )}

                    {service.actions_taken && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ACTIONS TAKEN</h4>
                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius)' }}>
                                {service.actions_taken}
                            </div>
                        </div>
                    )}

                    {/* Parts Used */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>PARTS USED</h4>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                                onClick={() => setShowAddParts(!showAddParts)}
                            >
                                + Add Parts
                            </button>
                        </div>

                        {showAddParts && (
                            <form onSubmit={handleAddParts} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius)' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                        <label className="label">Select Item</label>
                                        <select
                                            className="select"
                                            value={selectedItem}
                                            onChange={e => setSelectedItem(e.target.value)}
                                            required
                                        >
                                            <option value="">Choose item...</option>
                                            {inventory.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} (Stock: {item.total_qty})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="label">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input"
                                            value={qty}
                                            onChange={e => setQty(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary">Add</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddParts(false)}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {service.parts_used && service.parts_used.length > 0 ? (
                            <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Item</th>
                                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Part Number</th>
                                        <th style={{ textAlign: 'right', padding: '0.5rem' }}>Qty</th>
                                        <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {service.parts_used.map(part => (
                                        <tr key={part.id}>
                                            <td style={{ padding: '0.5rem' }}>{part.item_name}</td>
                                            <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{part.part_number || '-'}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>{part.qty}</td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {formatDate(part.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No parts used yet
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Technician</div>
                            <div style={{ fontSize: '0.875rem' }}>{service.technician_name || 'Unassigned'}</div>
                        </div>
                        {service.cost_estimate && (
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost Estimate</div>
                                <div style={{ fontSize: '0.875rem' }}>Rp {parseFloat(service.cost_estimate).toLocaleString('id-ID')}</div>
                            </div>
                        )}
                    </div>

                    {service.notes && (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Notes</div>
                            <div style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>{service.notes}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

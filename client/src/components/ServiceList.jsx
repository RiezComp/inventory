import React, { useState, useEffect, useMemo } from 'react';
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

const PRIORITY_COLORS = {
    low: { bg: 'rgba(156, 163, 175, 0.2)', color: '#9ca3af' },
    medium: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' },
    high: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
    urgent: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }
};

export default function ServiceList({ onOpenModal, onOpenDetail, onOpenInvoice }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [search, setSearch] = useState('');
    const { token } = useAuth();

    const fetchServices = async () => {
        try {
            let url = `${API_Base}/service?`;
            if (statusFilter) url += `status=${statusFilter}&`;
            if (priorityFilter) url += `priority=${priorityFilter}&`;
            if (overdueOnly) url += `overdue=true&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setServices(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, [statusFilter, priorityFilter, overdueOnly]);

    const filteredServices = useMemo(() => {
        return services.filter(s => {
            const matchesSearch =
                s.item_name.toLowerCase().includes(search.toLowerCase()) ||
                s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                s.serial_number?.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [services, search]);

    const isOverdue = (dueDate, status) => {
        if (!dueDate || status === 'completed' || status === 'delivered') return false;
        return new Date(dueDate) < new Date();
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) return <div className="text-muted">Loading services...</div>;

    return (
        <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h3 className="card-title" style={{ color: 'var(--text-primary)', marginRight: 'auto' }}>
                    Service Orders
                </h3>

                <select
                    className="select"
                    style={{ width: '150px' }}
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_parts">Waiting Parts</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered</option>
                </select>

                <select
                    className="select"
                    style={{ width: '130px' }}
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                >
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={overdueOnly}
                        onChange={e => setOverdueOnly(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Overdue Only</span>
                </label>

                <input
                    type="text"
                    placeholder="Search..."
                    className="input"
                    style={{ width: '200px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <button className="btn btn-primary" onClick={() => onOpenModal(null)}>
                    + New Service Order
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Item</th>
                            <th>Customer</th>
                            <th>Complaint</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Due Date</th>
                            <th>Technician</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredServices.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No service orders found.
                                </td>
                            </tr>
                        ) : (
                            filteredServices.map(service => {
                                const overdue = isOverdue(service.due_date, service.status);
                                return (
                                    <tr key={service.id} style={{ backgroundColor: overdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                        <td style={{ fontWeight: 600 }}>#{service.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{service.item_name}</div>
                                            {service.serial_number && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    SN: {service.serial_number}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div>{service.customer_name}</div>
                                            {service.customer_contact && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {service.customer_contact}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {service.complaint}
                                        </td>
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    backgroundColor: STATUS_COLORS[service.status]?.bg || 'var(--bg-input)',
                                                    color: STATUS_COLORS[service.status]?.color || 'inherit'
                                                }}
                                            >
                                                {service.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    backgroundColor: PRIORITY_COLORS[service.priority]?.bg || 'var(--bg-input)',
                                                    color: PRIORITY_COLORS[service.priority]?.color || 'inherit'
                                                }}
                                            >
                                                {service.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ color: overdue ? 'var(--error)' : 'inherit' }}>
                                                {formatDate(service.due_date)}
                                            </div>
                                            {overdue && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 600 }}>
                                                    OVERDUE
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {service.technician_name || 'Unassigned'}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => onOpenDetail(service)}
                                                >
                                                    View
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => onOpenModal(service)}
                                                >
                                                    Edit
                                                </button>
                                                {(service.status === 'completed' || service.status === 'delivered') && (
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                            color: '#10b981'
                                                        }}
                                                        onClick={() => onOpenInvoice(service.id)}
                                                    >
                                                        📄 Invoice
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

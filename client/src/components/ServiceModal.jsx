import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_Base = '/api';

export default function ServiceModal({ isOpen, onClose, service, onSuccess }) {
    const [formData, setFormData] = useState({
        item_name: '',
        serial_number: '',
        customer_name: '',
        customer_contact: '',
        complaint: '',
        diagnosis: '',
        actions_taken: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        technician_id: '',
        cost_estimate: '',
        notes: ''
    });
    const [users, setUsers] = useState([]);
    const { token, user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            // Fetch users for technician assignment
            fetch(`${API_Base}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.data) setUsers(data.data.filter(u => u.is_active));
                })
                .catch(console.error);

            // Load service data if editing
            if (service) {
                setFormData({
                    item_name: service.item_name || '',
                    serial_number: service.serial_number || '',
                    customer_name: service.customer_name || '',
                    customer_contact: service.customer_contact || '',
                    complaint: service.complaint || '',
                    diagnosis: service.diagnosis || '',
                    actions_taken: service.actions_taken || '',
                    status: service.status || 'pending',
                    priority: service.priority || 'medium',
                    due_date: service.due_date ? service.due_date.split('T')[0] : '',
                    technician_id: service.technician_id || '',
                    cost_estimate: service.cost_estimate || '',
                    notes: service.notes || ''
                });
            } else {
                // Reset for new service
                setFormData({
                    item_name: '',
                    serial_number: '',
                    customer_name: '',
                    customer_contact: '',
                    complaint: '',
                    diagnosis: '',
                    actions_taken: '',
                    status: 'pending',
                    priority: 'medium',
                    due_date: '',
                    technician_id: '',
                    cost_estimate: '',
                    notes: ''
                });
            }
        }
    }, [isOpen, service, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = service
            ? `${API_Base}/service/${service.id}`
            : `${API_Base}/service`;

        const method = service ? 'PUT' : 'POST';

        const payload = { ...formData };
        if (service && formData.status === 'completed' && !service.completed_date) {
            payload.completed_date = new Date().toISOString();
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                        {service ? 'Edit Service Order' : 'New Service Order'}
                    </h2>
                    <button className="btn btn-secondary" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex gap-4">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="label">Item Name *</label>
                            <input
                                required
                                className="input"
                                value={formData.item_name}
                                onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                                placeholder="e.g. Product Name"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Serial Number</label>
                            <input
                                className="input"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Customer Name *</label>
                            <input
                                required
                                className="input"
                                value={formData.customer_name}
                                onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Contact</label>
                            <input
                                className="input"
                                value={formData.customer_contact}
                                onChange={e => setFormData({ ...formData, customer_contact: e.target.value })}
                                placeholder="Phone/Email"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Complaint / Issue *</label>
                        <textarea
                            required
                            className="textarea"
                            rows="2"
                            value={formData.complaint}
                            onChange={e => setFormData({ ...formData, complaint: e.target.value })}
                            placeholder="Describe the problem..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Diagnosis</label>
                        <textarea
                            className="textarea"
                            rows="2"
                            value={formData.diagnosis}
                            onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                            placeholder="Technical findings..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Actions Taken</label>
                        <textarea
                            className="textarea"
                            rows="2"
                            value={formData.actions_taken}
                            onChange={e => setFormData({ ...formData, actions_taken: e.target.value })}
                            placeholder="What has been done..."
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Status</label>
                            <select
                                className="select"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="waiting_parts">Waiting Parts</option>
                                <option value="testing">Testing</option>
                                <option value="completed">Completed</option>
                                <option value="delivered">Delivered</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Priority</label>
                            <select
                                className="select"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Due Date</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Technician</label>
                            <select
                                className="select"
                                value={formData.technician_id}
                                onChange={e => setFormData({ ...formData, technician_id: e.target.value })}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Cost Estimate</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.cost_estimate}
                                onChange={e => setFormData({ ...formData, cost_estimate: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Notes</label>
                        <textarea
                            className="textarea"
                            rows="2"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-between mt-4">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {service ? 'Update Service Order' : 'Create Service Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

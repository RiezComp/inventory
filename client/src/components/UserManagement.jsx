import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'user',
        is_active: true
    });
    const { token } = useAuth();

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setUsers(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = editingUser
            ? `http://localhost:3000/api/users/${editingUser.id}`
            : 'http://localhost:3000/api/users';

        const method = editingUser ? 'PUT' : 'POST';

        const body = editingUser
            ? { full_name: formData.full_name, role: formData.role, is_active: formData.is_active, password: formData.password || undefined }
            : formData;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                setModalOpen(false);
                fetchUsers();
                resetForm();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`http://localhost:3000/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Network error: ' + err.message);
        }
    };

    const openAddModal = () => {
        resetForm();
        setEditingUser(null);
        setModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            full_name: user.full_name || '',
            role: user.role,
            is_active: user.is_active === 1
        });
        setModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            full_name: '',
            role: 'user',
            is_active: true
        });
    };

    if (loading) return <div className="text-muted">Loading users...</div>;

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>User Management</h3>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        + Add User
                    </button>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 500 }}>{user.username}</td>
                                    <td>{user.full_name || '-'}</td>
                                    <td>
                                        <span className={`badge ${user.role === 'admin' ? 'badge-in' : ''}`} style={{ backgroundColor: user.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-app)', border: '1px solid var(--border)', color: user.role === 'admin' ? 'var(--primary)' : 'inherit' }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${user.is_active ? 'badge-in' : 'badge-out'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                onClick={() => openEditModal(user)}
                                            >
                                                Edit
                                            </button>
                                            {user.id !== 1 && (
                                                <button
                                                    className="btn"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)' }}
                                                    onClick={() => handleDelete(user.id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="card-header">
                            <h2 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h2>
                            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {!editingUser && (
                                <div className="form-group">
                                    <label className="label">Username</label>
                                    <input
                                        required
                                        className="input"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="label">{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    className="input"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingUser ? 'Leave blank to keep current' : ''}
                                />
                            </div>

                            <div className="form-group">
                                <label className="label">Full Name</label>
                                <input
                                    className="input"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="label">Role</label>
                                    <select
                                        className="select"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                {editingUser && (
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="label">Status</label>
                                        <select
                                            className="select"
                                            value={formData.is_active ? '1' : '0'}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.value === '1' })}
                                        >
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

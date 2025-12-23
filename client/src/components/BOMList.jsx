import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function BOMList({ onCreate, onSelect }) {
    const [boms, setBoms] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    const fetchBOMs = async () => {
        try {
            const res = await fetch('/api/boms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setBoms(data.data);
        } catch (err) {
            console.error("Failed to fetch BOMs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBOMs();
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this BOM Template?')) return;

        try {
            const res = await fetch(`/api/boms/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchBOMs();
            } else {
                alert('Failed to delete BOM');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="text-muted">Loading BOMs...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>Bill of Materials (Recipes)</h3>
                <button className="btn btn-primary" onClick={onCreate}>
                    + New BOM
                </button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>BOM Name</th>
                            <th>Description</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {boms.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No BOM templates found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            boms.map(bom => (
                                <tr key={bom.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(bom)}>
                                    <td style={{ fontWeight: 500, color: 'var(--primary-light)' }}>
                                        {bom.name}
                                    </td>
                                    <td>{bom.description || '-'}</td>
                                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                                        {new Date(bom.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <button
                                            className="btn"
                                            style={{
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                color: 'var(--error)',
                                                border: '1px solid var(--error)'
                                            }}
                                            onClick={(e) => handleDelete(e, bom.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

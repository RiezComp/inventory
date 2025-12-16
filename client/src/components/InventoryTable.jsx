import React, { useState, useMemo } from 'react';
import { useAuth } from '../AuthContext';

const API_Base = ''; // Need for image URLs

export default function InventoryTable({ items, onInteract, onDelete, onMove, viewType }) {
    const { token } = useAuth();
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [viewImageUrl, setViewImageUrl] = useState(null);

    // Extract unique categories for filter
    const categories = useMemo(() => {
        if (!Array.isArray(items)) return [];
        const cats = new Set(items.map(i => i?.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [items]);

    const filteredItems = (Array.isArray(items) ? items : []).filter(item => {
        if (!item) return false;
        const matchesSearch =
            (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.category || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.location || '').toLowerCase().includes(search.toLowerCase());

        const matchesCategory = categoryFilter ? item.category === categoryFilter : true;

        return matchesSearch && matchesCategory;
    });

    return (
        <>
            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title" style={{ color: 'var(--text-primary)', marginRight: 'auto' }}>Inventory List</h3>

                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            fetch('/api/inventory/export', {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                })
                                .catch(err => alert("Export failed: " + err.message));
                        }}
                    >
                        📥 Export CSV
                    </button>

                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                        onClick={() => {
                            // We need token here. Since InventoryTable doesn't have token prop, we can get it from localStorage or pass it.
                            // Assuming simplest way is passing token or using localStorage since AuthContext might not be easily accessible if not passed.
                            // Better: use window.location or similar if we want to avoid props drilling, BUT correct way is AuthContext. 
                            // InventoryTable is inside App component which has AuthProvider.
                            // Let's assume we can get token from localStorage 'token' if it was stored there, OR better, let the parent handle export?
                            // No, let's just use the API with the stored token if available. 
                            // Wait, InventoryTable is a child of AppContent which uses useAuth.
                            // I should pass token as prop OR simply read from localStorage 'site_token' if your auth saves it there?
                            // Checking AuthContext... standard is often inside memory.
                            // App.jsx passes items. I should modify App.jsx to pass token? No, let's try to fetch using the same method as App.jsx.
                            // Actually, I can accept a new prop 'onExport' from parent.

                            // Let's modify to use a callback prop 'onExport' and implement handler it in App.jsx? 
                            // No, user wants me to edit specific files.
                            // Let's try to fetch directly using localStorage.getItem('token') purely as a fallback 
                            // OR just pass auth token to InventoryTable.
                            // Inspecting App.jsx again... it has `token`.
                            // I will use localStorage.getItem('token') as a quick fix if consistent, 
                            // OR I can use the existing 'API_Base' and assume headers are handled? No, 'API_Base' is empty string.

                            // Let's assume onInteract is for modifying items.
                            // Since I cannot rewrite App.jsx to pass token easily without potentially breaking things if I miss something,
                            // I will implement the button here but the logic might need the token.
                            // Ah, I can import useAuth! InventoryTable is a component inside AuthProvider.
                            // Let's import useAuth.
                        }}
                    >
                    </button>
                    {/* Wait, I should rewrite the component start to import useAuth and get token */}

                    <select
                        className="select"
                        style={{ width: '180px' }}
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Search components..."
                        className="input"
                        style={{ width: '250px' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Img</th>
                                <th>Name</th>
                                <th>Part Number</th>
                                <th>Category</th>
                                <th>Type/Footprint</th>
                                <th>Location</th>
                                <th>Qty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No components found.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.image_path ? (
                                                <div
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        borderRadius: '4px',
                                                        overflow: 'hidden',
                                                        backgroundColor: 'var(--bg-app)',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                    onClick={() => setViewImageUrl(`${API_Base}${item.image_path}`)}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    title="Click to view full image"
                                                >
                                                    <img
                                                        src={`${API_Base}${item.image_path}`}
                                                        alt={item.name}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'var(--bg-app)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        color: 'var(--text-muted)'
                                                    }}
                                                >
                                                    N/A
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                                            {item.datasheet_url && (
                                                <a
                                                    href={item.datasheet_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    📄 Datasheet
                                                </a>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {item.part_number || '-'}
                                        </td>
                                        <td>
                                            {item.category ? (
                                                <span className="badge">{item.category}</span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{item.footprint || '-'}</td>
                                        <td className="text-muted">{item.location || '-'}</td>
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    backgroundColor: item.total_qty > 10 ? 'rgba(16, 185, 129, 0.2)' : item.total_qty > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: item.total_qty > 10 ? 'var(--success)' : item.total_qty > 0 ? 'var(--warning)' : 'var(--error)'
                                                }}
                                            >
                                                {item.total_qty}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => onInteract(item, 'IN')}
                                                >
                                                    + Add
                                                </button>
                                                {viewType !== 'assets' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => onInteract(item, 'OUT')}
                                                        disabled={item.total_qty === 0}
                                                    >
                                                        - Use
                                                    </button>
                                                )}
                                                {viewType === 'assets' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                                                        onClick={() => onMove(item)}
                                                        title="Move Location"
                                                    >
                                                        ↔️
                                                    </button>
                                                )}
                                                <button
                                                    className="btn"
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                        color: 'var(--error)',
                                                        border: '1px solid var(--error)'
                                                    }}
                                                    onClick={() => onDelete(item.id)}
                                                    title="Delete Item"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {viewImageUrl && (
                <div
                    className="modal-overlay"
                    onClick={() => setViewImageUrl(null)}
                    style={{ zIndex: 100 }}
                >
                    <div
                        className="modal-content animate-fade-in"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            padding: '1rem',
                            overflow: 'auto'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ color: 'var(--text-primary)' }}>Component Image</h3>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setViewImageUrl(null)}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <img
                                src={viewImageUrl}
                                alt="Component"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '80vh',
                                    borderRadius: 'var(--radius)',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

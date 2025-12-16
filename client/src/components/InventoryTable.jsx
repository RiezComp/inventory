import React, { useState, useMemo } from 'react';

const API_Base = ''; // Need for image URLs

export default function InventoryTable({ items, onInteract }) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [viewImageUrl, setViewImageUrl] = useState(null);

    // Extract unique categories for filter
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category).filter(Boolean));
        return Array.from(cats).sort();
    }, [items]);

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.category?.toLowerCase().includes(search.toLowerCase()) ||
            item.location?.toLowerCase().includes(search.toLowerCase());

        const matchesCategory = categoryFilter ? item.category === categoryFilter : true;

        return matchesSearch && matchesCategory;
    });

    return (
        <>
            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title" style={{ color: 'var(--text-primary)', marginRight: 'auto' }}>Inventory List</h3>

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
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    onClick={() => onInteract(item, 'OUT')}
                                                    disabled={item.total_qty === 0}
                                                >
                                                    - Use
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function BOMList({ onCreate, onSelect, onEdit }) {
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

    const handlePrint = async (e, bomId) => {
        e.stopPropagation();
        try {
            // Need detailed items for printing
            const res = await fetch(`/api/boms/${bomId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (!data.data) return alert("Failed to load data for printing");
            const bom = data.data;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print BOM - ${bom.name}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                        th { background-color: #f0f0f0; }
                    </style>
                </head>
                <body>
                    <h1>Bill of Materials: ${bom.name}</h1>
                    <p><strong>Description:</strong> ${bom.description || '-'}</p>
                    <p><strong>Created:</strong> ${new Date(bom.created_at).toLocaleDateString()}</p>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Part Number</th>
                                <th>Qty</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bom.items.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.part_number || '-'}</td>
                                    <td>${item.qty}</td>
                                    <td>${item.category || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
             `);
            printWindow.document.close();
        } catch (err) {
            alert("Print Error: " + err.message);
        }
    };

    const handleExport = async (e, bomId) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/boms/${bomId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (!data.data) return alert("Failed to load data for export");
            const bom = data.data;

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Item Name,Part Number,Category,Quantity\n";
            bom.items.forEach(item => {
                csvContent += `"${item.name}","${item.part_number || ''}","${item.category || ''}","${item.qty}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `BOM_${bom.name.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link); // Required for FF
            link.click();
            link.remove();
        } catch (err) {
            alert("Export Error: " + err.message);
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
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                onClick={(e) => { e.stopPropagation(); onEdit(bom); }}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                onClick={(e) => handlePrint(e, bom.id)}
                                                title="Print"
                                            >
                                                🖨️
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                onClick={(e) => handleExport(e, bom.id)}
                                                title="Export CSV"
                                            >
                                                ⬇️
                                            </button>
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
                                                title="Delete"
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
    );
}

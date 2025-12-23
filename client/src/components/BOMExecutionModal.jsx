import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function BOMExecutionModal({ bom, onClose, onSuccess }) {
    const { token } = useAuth();
    const [bomDetails, setBomDetails] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);

    useEffect(() => {
        if (!bom) return;
        // Fetch full details (items)
        fetch(`/api/boms/${bom.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                if (data.data) setBomDetails(data.data);
                setLoading(false);
            })
            .catch(err => {
                alert("Failed to load BOM details: " + err.message);
                onClose();
            });
    }, [bom, token, onClose]);

    const handleExecute = async () => {
        if (!projectName) return alert("Project Name is required");
        if (multiplier < 1) return alert("Multiplier must be at least 1");

        setExecuting(true);
        try {
            const res = await fetch(`/api/boms/${bom.id}/execute`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ project_name: projectName, multiplier: parseInt(multiplier) })
            });
            const result = await res.json();

            if (res.ok) {
                alert("Success: Inventory deducted for project " + projectName);
                onSuccess();
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            alert("Network Error: " + err.message);
        } finally {
            setExecuting(false);
        }
    };

    if (!bom) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">Execute BOM: {bom.name}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="p-4 text-center">Loading BOM details...</div>
                ) : (
                    <div className="p-4">
                        <div className="text-muted mb-4">{bom.description}</div>

                        <div className="grid grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="label">Project Name / Reference</label>
                                <input
                                    className="input"
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                    placeholder="e.g. Client Installation #44"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Multiplier (Quantity)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="input"
                                    value={multiplier}
                                    onChange={e => setMultiplier(e.target.value)}
                                />
                            </div>
                        </div>

                        <h4 className="mb-2">Material Requirements Projection</h4>
                        <div className="table-container mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Component</th>
                                        <th>Base Qty</th>
                                        <th>Total Needed</th>
                                        <th>Current Stock</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bomDetails && bomDetails.items.map(item => {
                                        const needed = item.qty * multiplier;
                                        const hasStock = item.current_stock >= needed;
                                        return (
                                            <tr key={item.id} style={{ backgroundColor: !hasStock ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                                                <td>{item.name}</td>
                                                <td>{item.qty}</td>
                                                <td style={{ fontWeight: 'bold' }}>{needed}</td>
                                                <td>{item.current_stock}</td>
                                                <td>
                                                    {hasStock ?
                                                        <span className="text-success">OK</span> :
                                                        <span className="text-error" style={{ fontWeight: 'bold' }}>Short ({item.current_stock - needed})</span>
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleExecute}
                                disabled={executing || (bomDetails && bomDetails.items.some(i => i.current_stock < i.qty * multiplier))}
                            >
                                {executing ? 'Processing...' : 'Execute Transaction'}
                            </button>
                        </div>
                        {bomDetails && bomDetails.items.some(i => i.current_stock < i.qty * multiplier) && (
                            <div className="text-error text-sm mt-2 text-right">
                                Cannot execute: Insufficient stock for some items.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

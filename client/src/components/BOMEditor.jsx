import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';

export default function BOMEditor({ onCancel, onSuccess, initialData = null }) {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [bomItems, setBomItems] = useState([]); // Array of { item_id, qty, temp_id, name, part_number }

    // Inventory selection state
    const [inventory, setInventory] = useState([]);
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState(1);
    const [search, setSearch] = useState('');

    useEffect(() => {
        // Fetch inventory items for dropdown
        fetch('/api/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) setInventory(data.data);
            })
            .catch(console.error);
    }, [token]);

    // Load initial data for editing
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');

            // If items are already populated (joined)
            if (initialData.items) {
                setBomItems(initialData.items.map(i => ({
                    item_id: i.item_id,
                    qty: i.qty,
                    name: i.name,
                    part_number: i.part_number,
                    temp_id: Date.now() + Math.random()
                })));
            } else {
                // Fetch items if needed
                fetch(`/api/boms/${initialData.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                    .then(res => res.json())
                    .then(data => {
                        if (data.data && data.data.items) {
                            setBomItems(data.data.items.map(i => ({
                                item_id: i.item_id,
                                qty: i.qty,
                                name: i.name,
                                part_number: i.part_number,
                                temp_id: Date.now() + Math.random()
                            })));
                        }
                    });
            }
        }
    }, [initialData, token]);

    const filteredInventory = useMemo(() => {
        if (!search) return inventory.slice(0, 50);
        return inventory.filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            (i.part_number && i.part_number.toLowerCase().includes(search.toLowerCase()))
        ).slice(0, 50);
    }, [inventory, search]);

    const handleAddItem = () => {
        if (!selectedItem) return;
        const itemObj = inventory.find(i => i.id == selectedItem);
        if (!itemObj) return;

        // Check if already added
        if (bomItems.some(bi => bi.item_id === itemObj.id)) {
            alert('Item already in BOM');
            return;
        }

        setBomItems([...bomItems, {
            item_id: itemObj.id,
            qty: parseInt(qty),
            name: itemObj.name,
            part_number: itemObj.part_number,
            temp_id: Date.now()
        }]);

        // Reset selection
        setSelectedItem('');
        setQty(1);
        setSearch('');
    };

    const handleRemoveItem = (temp_id) => {
        setBomItems(bomItems.filter(bi => bi.temp_id !== temp_id));
    };

    const handleSave = async () => {
        if (!name) return alert("BOM Name is required");
        if (bomItems.length === 0) return alert("Add at least one item");

        try {
            const url = initialData ? `/api/boms/${initialData.id}` : '/api/boms';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    items: bomItems.map(bi => ({ item_id: bi.item_id, qty: bi.qty }))
                })
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess();
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            alert("Network Error: " + err.message);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>
                    {initialData ? 'Edit BOM Template' : 'Create New BOM Template'}
                </h3>
            </div>

            <div className="form-group">
                <label className="label">BOM Name</label>
                <input
                    className="input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Solar Control Box V1"
                />
            </div>
            <div className="form-group">
                <label className="label">Description</label>
                <input
                    className="input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of this assembly"
                />
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '1.5rem 0' }} />

            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Add Components</h4>

            <div className="flex gap-2 items-end mb-4" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="label">Search Component</label>
                    <input
                        className="input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Type to search..."
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label className="label">Select Item</label>
                    <select
                        className="select"
                        value={selectedItem}
                        onChange={e => setSelectedItem(e.target.value)}
                    >
                        <option value="">-- Select Item --</option>
                        {filteredInventory.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} {item.part_number ? `(${item.part_number})` : ''} - Stock: {item.total_qty}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ width: '100px' }}>
                    <label className="label">Qty</label>
                    <input
                        type="number"
                        className="input"
                        min="1"
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary" onClick={handleAddItem}>+ Add</button>
            </div>

            <div className="table-container mb-4">
                <table>
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th>P/N</th>
                            <th>Qty Required</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bomItems.map(bi => (
                            <tr key={bi.temp_id}>
                                <td>{bi.name}</td>
                                <td>{bi.part_number || '-'}</td>
                                <td>{bi.qty}</td>
                                <td>
                                    <button
                                        className="btn"
                                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--error)' }}
                                        onClick={() => handleRemoveItem(bi.temp_id)}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {bomItems.length === 0 && (
                            <tr><td colSpan="4" className="text-muted text-center pt-4 pb-4">No items added to this BOM yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4">
                <button className="btn btn-primary" onClick={handleSave}>
                    {initialData ? 'Update BOM' : 'Save BOM Template'}
                </button>
                <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

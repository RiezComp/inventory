import React, { useState, useEffect } from 'react';

export default function TransactionModal({ isOpen, onClose, type, item, onSubmit, existingCategories = [] }) {
    const [formData, setFormData] = useState({
        qty: 1,
        project_ref: '',
        notes: '',
        location: '',
        name: '',
        part_number: '',
        category: '',
        footprint: '',
        datasheet_url: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData(prev => ({
                ...prev,
                name: item.name,
                part_number: item.part_number || '',
                category: item.category || '',
                footprint: item.footprint || '',
                location: item.location || '',
                datasheet_url: item.datasheet_url || '',
                qty: 1,
                project_ref: '',
                notes: ''
            }));
        } else {
            // Reset for new item add
            setFormData({
                qty: 1,
                project_ref: '',
                notes: '',
                location: '',
                name: '',
                part_number: '',
                category: '',
                footprint: '',
                datasheet_url: ''
            });
        }
        setImageFile(null); // Reset image
        setShowCategoryDropdown(false);
    }, [item, isOpen, type]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (type === 'IN') {
            // Use FormData for file upload
            const data = new FormData();
            data.append('name', formData.name);
            data.append('part_number', formData.part_number);
            data.append('category', formData.category);
            data.append('footprint', formData.footprint);
            data.append('qty', formData.qty);
            data.append('location', formData.location);
            data.append('project_ref', formData.project_ref);
            data.append('notes', formData.notes);
            data.append('datasheet_url', formData.datasheet_url);
            if (item) data.append('item_id', item.id);
            if (imageFile) {
                data.append('image', imageFile);
            }

            onSubmit(data, true); // true indicates isFormData
        } else {
            // Standard JSON for OUT
            onSubmit({ ...formData, item_id: item?.id }, false);
        }
    };

    const isNewItem = !item && type === 'IN';

    // Filter categories based on input
    const filteredCategories = existingCategories.filter(cat =>
        cat.toLowerCase().includes(formData.category.toLowerCase())
    );

    const handleCategorySelect = (category) => {
        setFormData({ ...formData, category });
        setShowCategoryDropdown(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="card-header">
                    <h2 className="card-title" style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                        {type === 'IN' ? (isNewItem ? 'New Component Entry' : 'Restock Component') : 'Check Out Component'}
                    </h2>
                    <button className="btn btn-secondary" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {isNewItem && (
                        <div className="form-group">
                            <label className="label">Component Name</label>
                            <input
                                required
                                className="input"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. ESP32 DevKit V1"
                            />
                        </div>
                    )}

                    {isNewItem && (
                        <div className="flex gap-4">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Part Number</label>
                                <input
                                    className="input"
                                    value={formData.part_number}
                                    onChange={e => setFormData({ ...formData, part_number: e.target.value })}
                                    placeholder="e.g. ESP32-WROOM-32"
                                />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Type/Footprint</label>
                                <input
                                    className="input"
                                    value={formData.footprint}
                                    onChange={e => setFormData({ ...formData, footprint: e.target.value })}
                                    placeholder="e.g. SMD, DIP-16, 0805"
                                />
                            </div>
                        </div>
                    )}

                    {(isNewItem || type === 'IN') && (
                        <div className="form-group">
                            <label className="label">Datasheet URL (Optional)</label>
                            <input
                                type="url"
                                className="input"
                                value={formData.datasheet_url}
                                onChange={e => setFormData({ ...formData, datasheet_url: e.target.value })}
                                placeholder="https://example.com/datasheet.pdf"
                            />
                        </div>
                    )}

                    {(isNewItem || type === 'IN') && (
                        <div className="form-group">
                            <label className="label">Component Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="input"
                                onChange={e => setImageFile(e.target.files[0])}
                            />
                        </div>
                    )}

                    {isNewItem && (
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="label">Category</label>
                            <input
                                className="input"
                                value={formData.category}
                                onChange={e => {
                                    setFormData({ ...formData, category: e.target.value });
                                    setShowCategoryDropdown(true);
                                }}
                                onFocus={() => setShowCategoryDropdown(true)}
                                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                                placeholder="e.g. Microcontrollers"
                                autoComplete="off"
                            />
                            {showCategoryDropdown && filteredCategories.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    zIndex: 100,
                                    boxShadow: 'var(--shadow-lg)'
                                }}>
                                    {filteredCategories.map((cat, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: idx < filteredCategories.length - 1 ? '1px solid var(--border)' : 'none'
                                            }}
                                            onMouseDown={() => handleCategorySelect(cat)}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="label">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                required
                                className="input"
                                value={formData.qty}
                                onChange={e => setFormData({ ...formData, qty: e.target.value })}
                            />
                        </div>

                        {type === 'IN' && (
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="label">Location</label>
                                <input
                                    className="input"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Drawer 3A"
                                />
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="label">
                            {type === 'IN' ? 'Source / Project (Optional)' : 'Project / Usage Reason'}
                        </label>
                        <input
                            required={type === 'OUT'}
                            className="input"
                            value={formData.project_ref}
                            onChange={e => setFormData({ ...formData, project_ref: e.target.value })}
                            placeholder={type === 'IN' ? "e.g. Mouser Order #123" : "e.g. Smart Home Project"}
                        />
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
                        <button type="submit" className={`btn ${type === 'IN' ? 'btn-primary' : 'badge-out'}`} style={{ border: 'none', cursor: 'pointer' }}>
                            Confirm {type === 'IN' ? 'Entry' : 'Usage'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


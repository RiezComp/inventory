import React, { useState, useEffect } from 'react';

export default function MoveModal({ isOpen, onClose, item, onSubmit }) {
    const [newLocation, setNewLocation] = useState('');
    const [projectRef, setProjectRef] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && item) {
            setNewLocation(item.location || '');
            setProjectRef('');
            setNotes('');
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newLocation.trim()) {
            alert('New location is required');
            return;
        }

        if (newLocation === item.location) {
            alert('New location must be different from current location');
            return;
        }

        setLoading(true);
        await onSubmit({
            item_id: item.id,
            new_location: newLocation,
            project_ref: projectRef,
            notes: notes
        });
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-fade-in">
                <div className="modal-header">
                    <h3 className="modal-title">Move Component</h3>
                    <button className="btn btn-ghost" onClick={onClose}>✕</button>
                </div>

                <div className="mb-4">
                    <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{item.name}</div>
                    <div className="text-muted text-sm">{item.category} | P/N: {item.part_number || '-'}</div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Current Location</label>
                        <input
                            type="text"
                            className="input"
                            value={item.location || 'Unknown'}
                            disabled
                            style={{ backgroundColor: 'var(--bg-input)', opacity: 0.7 }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">New Location (Destination) *</label>
                        <input
                            type="text"
                            className="input"
                            value={newLocation}
                            onChange={e => setNewLocation(e.target.value)}
                            placeholder="e.g. Deployment Site A, Shelf 3, Technician Bag"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Project / Purpose</label>
                        <input
                            type="text"
                            className="input"
                            value={projectRef}
                            onChange={e => setProjectRef(e.target.value)}
                            placeholder="e.g. Project Alpha Installation"
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Notes / Validator</label>
                        <textarea
                            className="textarea"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Reason for movement, condition of item, etc."
                            rows="3"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Moving...' : 'Confirm Move'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

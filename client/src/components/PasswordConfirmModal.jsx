import React, { useState } from 'react';

export default function PasswordConfirmModal({ isOpen, onClose, onConfirm, title = "Confirm Action", message = "Please enter your password to confirm." }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onConfirm(password);
        setLoading(false);
        setPassword('');
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <p className="text-muted" style={{ marginBottom: '1rem' }}>{message}</p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="label">Password</label>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoFocus
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
                                style={{ backgroundColor: 'var(--error)', borderColor: 'var(--error)' }}
                                disabled={loading || !password}
                            >
                                {loading ? 'Verifying...' : 'Confirm'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

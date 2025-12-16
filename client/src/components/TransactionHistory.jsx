import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        if (!token) return;

        fetch('/api/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) setTransactions(data.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [token]);

    if (loading) return <div className="text-muted">Loading history...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--text-primary)' }}>Transaction History</h3>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Component</th>
                            <th>Qty</th>
                            <th>User</th>
                            <th>Project / Ref</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No history found.</td>
                            </tr>
                        ) : (
                            transactions.map(t => (
                                <tr key={t.id}>
                                    <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        {new Date(t.timestamp).toLocaleString()}
                                    </td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor:
                                                    t.type === 'IN' ? 'rgba(16, 185, 129, 0.2)' :
                                                        t.type === 'OUT' ? 'rgba(239, 68, 68, 0.2)' :
                                                            'rgba(59, 130, 246, 0.2)',
                                                color:
                                                    t.type === 'IN' ? 'var(--success)' :
                                                        t.type === 'OUT' ? 'var(--error)' :
                                                            '#60a5fa'
                                            }}
                                        >
                                            {t.type === 'IN' ? 'IN' : t.type === 'OUT' ? 'OUT' : 'MOVE'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{t.item_name}</td>
                                    <td>
                                        {t.type === 'MOVE' ? '-' : t.qty}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {t.username || 'Unknown'}
                                    </td>
                                    <td>{t.project_ref || '-'}</td>
                                    <td className="text-muted" style={{ fontStyle: 'italic' }}>{t.notes || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

const API_Base = 'http://localhost:3000/api';

export default function ServiceInvoice({ isOpen, onClose, serviceId }) {
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useAuth();

    useEffect(() => {
        if (isOpen && serviceId) {
            fetchServiceDetail();
        }
    }, [isOpen, serviceId]);

    const fetchServiceDetail = async () => {
        try {
            const res = await fetch(`${API_Base}/service/${serviceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.data) setService(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;
    if (loading) return <div className="text-muted">Loading...</div>;
    if (!service) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const calculateTotal = () => {
        return parseFloat(service.cost_estimate || 0);
    };

    return (
        <>
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-print, .invoice-print * {
            visibility: visible;
          }
          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-print {
            background: white !important;
            color: black !important;
          }
          .invoice-header {
            border-bottom: 2px solid #000 !important;
          }
          .invoice-section {
            border: 1px solid #ddd !important;
          }
        }
      `}</style>


            <div className="modal-overlay no-print" onClick={onClose}>
                <div
                    className="modal-content animate-fade-in invoice-print"
                    onClick={e => e.stopPropagation()}
                    style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', backgroundColor: 'white', color: '#000' }}
                >
                    {/* Header - No Print */}
                    <div className="card-header no-print" style={{ borderBottom: '1px solid #ddd', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#000' }}>Service Invoice</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                🖨️ Print
                            </button>
                            <button className="btn btn-secondary" onClick={onClose}>✕</button>
                        </div>
                    </div>

                    {/* Invoice Content */}
                    <div style={{ padding: '2rem', color: '#000' }}>
                        {/* Company Header */}
                        <div className="invoice-header" style={{ borderBottom: '2px solid #333', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#000', marginBottom: '0.25rem' }}>
                                SERVICE INVOICE
                            </h1>
                            <div style={{ fontSize: '0.875rem', color: '#666' }}>
                                <div>Your Company Name</div>
                                <div>Address Line 1, City, Postal Code</div>
                                <div>Phone: +62 xxx-xxxx-xxxx | Email: info@company.com</div>
                            </div>
                        </div>

                        {/* Invoice Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                                    CUSTOMER INFORMATION
                                </h3>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{service.customer_name}</div>
                                    {service.customer_contact && <div>{service.customer_contact}</div>}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                    <strong>Invoice #:</strong> SO-{String(service.id).padStart(5, '0')}
                                </div>
                                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                    <strong>Date Received:</strong> {formatDate(service.date_received)}
                                </div>
                                <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                    <strong>Date Completed:</strong> {formatDate(service.completed_date)}
                                </div>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <strong>Status:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>COMPLETED</span>
                                </div>
                            </div>
                        </div>

                        {/* Item Details */}
                        <div className="invoice-section" style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.75rem' }}>
                                ITEM SERVICED
                            </h3>
                            <div style={{ fontSize: '0.9rem' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{service.item_name}</div>
                                {service.serial_number && (
                                    <div style={{ color: '#666', fontSize: '0.85rem' }}>Serial Number: {service.serial_number}</div>
                                )}
                            </div>
                        </div>

                        {/* Complaint & Work Done */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                                    REPORTED ISSUE
                                </h3>
                                <div style={{ fontSize: '0.875rem', padding: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                                    {service.complaint}
                                </div>
                            </div>

                            {service.diagnosis && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                                        DIAGNOSIS
                                    </h3>
                                    <div style={{ fontSize: '0.875rem', padding: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                                        {service.diagnosis}
                                    </div>
                                </div>
                            )}

                            {service.actions_taken && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                                        WORK PERFORMED
                                    </h3>
                                    <div style={{ fontSize: '0.875rem', padding: '0.75rem', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                                        {service.actions_taken}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Parts Used */}
                        {service.parts_used && service.parts_used.length > 0 ? (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem' }}>
                                    PARTS USED
                                </h3>
                                <table style={{ width: '100%', fontSize: '0.85rem', border: '1px solid #000', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #000' }}>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #ddd' }}>Item</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderRight: '1px solid #ddd' }}>Part Number</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {service.parts_used.map((part, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                                <td style={{ padding: '0.5rem', borderRight: '1px solid #ddd' }}>{part.item_name}</td>
                                                <td style={{ padding: '0.5rem', color: '#666', borderRight: '1px solid #ddd' }}>{part.part_number || '-'}</td>
                                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{part.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        {/* Cost Summary */}
                        {service.cost_estimate && (
                            <div style={{ borderTop: '2px solid #333', paddingTop: '1rem', marginTop: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 'bold' }}>
                                    <span>TOTAL COST:</span>
                                    <span>Rp {parseFloat(service.cost_estimate).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #ddd' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>Technician</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{service.technician_name || 'N/A'}</div>
                                    <div style={{ marginTop: '2rem', borderTop: '1px solid #000', paddingTop: '0.25rem', fontSize: '0.75rem' }}>
                                        Signature
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>Customer Acknowledgment</div>
                                    <div style={{ marginTop: '2.5rem', borderTop: '1px solid #000', paddingTop: '0.25rem', fontSize: '0.75rem' }}>
                                        Signature & Date
                                    </div>
                                </div>
                            </div>

                            {service.notes && (
                                <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                                    <strong>Notes:</strong> {service.notes}
                                </div>
                            )}

                            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#999' }}>
                                Thank you for your business!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

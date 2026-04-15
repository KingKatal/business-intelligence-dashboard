// Sales page JavaScript

// Global variables
let allSales = [];
let filteredSales = [];

// Load sales data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSalesData();
});

// Load sales data from the server
function loadSalesData() {
    fetch('/api/sales-list')
        .then(response => response.json())
        .then(data => {
            allSales = data.sales;
            filteredSales = [...allSales];
            renderSalesTable(filteredSales);
            updateSummaryCards(data.summary);
        })
        .catch(error => {
            console.error('Error loading sales data:', error);
            showError('Failed to load sales data');
        });
}

// Filter sales based on criteria
function filterSales() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const customerId = document.getElementById('customerFilter').value;

    filteredSales = allSales.filter(sale => {
        // Date filtering
        if (dateFrom && sale.sale_date < dateFrom) return false;
        if (dateTo && sale.sale_date > dateTo) return false;

        // Customer filtering
        if (customerId && sale.customer_id != customerId) return false;

        return true;
    });

    renderSalesTable(filteredSales);
}

// Render sales table
function renderSalesTable(sales) {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = '';

    if (sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No sales found matching the criteria</td></tr>';
        return;
    }

    sales.forEach(sale => {
        const row = document.createElement('tr');

        const customerName = sale.customer ? sale.customer.name : 'Walk-in';
        const saleDate = new Date(sale.sale_date).toLocaleDateString();

        row.innerHTML = `
            <td>${sale.invoice_number}</td>
            <td>${saleDate}</td>
            <td>${customerName}</td>
            <td>MWK ${numberWithCommas(sale.total_amount.toFixed(2))}</td>
            <td><span class="badge bg-secondary">${sale.payment_method}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewSale(${sale.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="printInvoice(${sale.id})" title="Print Invoice">
                        <i class="bi bi-printer"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Update summary cards
function updateSummaryCards(summary) {
    document.getElementById('totalSales').textContent = `MWK ${numberWithCommas(summary.total_sales.toFixed(2))}`;
    document.getElementById('todaySales').textContent = `MWK ${numberWithCommas(summary.today_total.toFixed(2))}`;
    document.getElementById('totalTransactions').textContent = summary.total_transactions;
    document.getElementById('avgTransaction').textContent = `MWK ${numberWithCommas(summary.avg_transaction.toFixed(2))}`;
}

// View sale details
function viewSale(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    const customerName = sale.customer ? sale.customer.name : 'Walk-in';
    const saleDate = new Date(sale.sale_date).toLocaleString();

    const details = `
Sale Details:
Invoice: ${sale.invoice_number}
Date: ${saleDate}
Customer: ${customerName}
Amount: MWK ${numberWithCommas(sale.total_amount.toFixed(2))}
Payment: ${sale.payment_method}
Notes: ${sale.notes || 'None'}
    `.trim();

    // Create modal for sale details
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Sale Details - ${sale.invoice_number}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-sm-6"><strong>Date:</strong></div>
                        <div class="col-sm-6">${saleDate}</div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6"><strong>Customer:</strong></div>
                        <div class="col-sm-6">${customerName}</div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6"><strong>Amount:</strong></div>
                        <div class="col-sm-6">MWK ${numberWithCommas(sale.total_amount.toFixed(2))}</div>
                    </div>
                    <div class="row">
                        <div class="col-sm-6"><strong>Payment Method:</strong></div>
                        <div class="col-sm-6">${sale.payment_method}</div>
                    </div>
                    ${sale.notes ? `<div class="row"><div class="col-sm-6"><strong>Notes:</strong></div><div class="col-sm-6">${sale.notes}</div></div>` : ''}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="printInvoice(${sale.id})">Print Invoice</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Remove modal from DOM after it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// Print invoice
function printInvoice(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    // Create printable invoice
    const printWindow = window.open('', '_blank');
    const customerName = sale.customer ? sale.customer.name : 'Walk-in';
    const saleDate = new Date(sale.sale_date).toLocaleString();

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${sale.invoice_number}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f8f9fc;
                    color: #333;
                    line-height: 1.6;
                    padding: 20px;
                }

                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
                    overflow: hidden;
                }

                .invoice-header {
                    background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
                    color: white;
                    padding: 2rem;
                    text-align: center;
                    position: relative;
                }

                .invoice-header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                    opacity: 0.1;
                }

                .invoice-header h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    position: relative;
                    z-index: 1;
                }

                .invoice-header .subtitle {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    position: relative;
                    z-index: 1;
                }

                .invoice-header .invoice-number {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-size: 1.2rem;
                    font-weight: 600;
                    display: inline-block;
                    margin-top: 1rem;
                    backdrop-filter: blur(10px);
                }

                .invoice-body {
                    padding: 2rem;
                }

                .invoice-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .detail-section {
                    background: #f8f9fc;
                    padding: 1.5rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid #4e73df;
                }

                .detail-section h3 {
                    color: #4e73df;
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    display: flex;
                    align-items: center;
                }

                .detail-section h3::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    background: #4e73df;
                    border-radius: 50%;
                    margin-right: 0.5rem;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #e3e6f0;
                }

                .detail-row:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                    padding-bottom: 0;
                }

                .detail-label {
                    font-weight: 600;
                    color: #5a5c69;
                }

                .detail-value {
                    color: #333;
                    font-weight: 500;
                }

                .invoice-total {
                    background: linear-gradient(135deg, #1cc88a 0%, #17a673 100%);
                    color: white;
                    padding: 2rem;
                    border-radius: 0.5rem;
                    text-align: center;
                    margin-top: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .invoice-total::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: pulse 3s ease-in-out infinite;
                }

                .invoice-total h2 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    position: relative;
                    z-index: 1;
                }

                .invoice-total .amount {
                    font-size: 3rem;
                    font-weight: 800;
                    position: relative;
                    z-index: 1;
                }

                .invoice-footer {
                    background: #f8f9fc;
                    padding: 1.5rem 2rem;
                    border-top: 1px solid #e3e6f0;
                    text-align: center;
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .invoice-footer p {
                    margin: 0.25rem 0;
                }

                .payment-badge {
                    display: inline-block;
                    background: #4e73df;
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }

                @media print {
                    body {
                        background: white !important;
                        padding: 0 !important;
                    }

                    .invoice-container {
                        box-shadow: none !important;
                        margin: 0 !important;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .invoice-header {
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }

                    .invoice-total {
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }

                @page {
                    margin: 0.5in;
                    size: A4;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <h1><i class="bi bi-receipt" style="margin-right: 0.5rem;"></i>Business Intelligence Dashboard</h1>
                    <div class="subtitle">Professional Invoice</div>
                    <div class="invoice-number">Invoice #${sale.invoice_number}</div>
                </div>

                <div class="invoice-body">
                    <div class="invoice-details">
                        <div class="detail-section">
                            <h3><i class="bi bi-person-circle" style="margin-right: 0.5rem;"></i>Customer Information</h3>
                            <div class="detail-row">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${customerName}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${saleDate}</span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h3><i class="bi bi-credit-card" style="margin-right: 0.5rem;"></i>Payment Details</h3>
                            <div class="detail-row">
                                <span class="detail-label">Method:</span>
                                <span class="detail-value"><span class="payment-badge">${sale.payment_method}</span></span>
                            </div>
                            ${sale.notes ? `<div class="detail-row">
                                <span class="detail-label">Notes:</span>
                                <span class="detail-value">${sale.notes}</span>
                            </div>` : ''}
                        </div>
                    </div>

                    <div class="invoice-total">
                        <h2>Total Amount Due</h2>
                        <div class="amount">MWK ${numberWithCommas(sale.total_amount.toFixed(2))}</div>
                    </div>
                </div>

                <div class="invoice-footer">
                    <p><strong>Business Intelligence Dashboard</strong></p>
                    <p>Generated on ${new Date().toLocaleString()} | Invoice #${sale.invoice_number}</p>
                    <p>Thank you for your business!</p>
                </div>
            </div>

            <div class="no-print" style="text-align: center; margin: 20px; padding: 20px;">
                <button onclick="window.print()" style="background: #4e73df; color: white; border: none; padding: 12px 24px; border-radius: 0.35rem; font-weight: 500; margin-right: 10px; cursor: pointer;">
                    <i class="bi bi-printer" style="margin-right: 0.5rem;"></i>Print Invoice
                </button>
                <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 0.35rem; font-weight: 500; cursor: pointer;">
                    <i class="bi bi-x-circle" style="margin-right: 0.5rem;"></i>Close
                </button>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
}

// Utility function for number formatting
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Error display function
function showError(message) {
    // Create a simple error alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}
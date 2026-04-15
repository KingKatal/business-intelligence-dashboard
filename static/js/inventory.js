// Inventory page JavaScript

// Global variables
let allProducts = [];
let filteredProducts = [];

// Load inventory data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadInventoryData();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchProducts').addEventListener('input', filterInventory);
    document.getElementById('categoryFilter').addEventListener('change', filterInventory);
    document.getElementById('stockFilter').addEventListener('change', filterInventory);
}

// Load inventory data from the server
function loadInventoryData() {
    fetch('/api/inventory-data')
        .then(response => response.json())
        .then(data => {
            allProducts = data.products;
            filteredProducts = [...allProducts];
            renderInventoryTable(filteredProducts);
            updateSummaryCards(data.summary);
        })
        .catch(error => {
            console.error('Error loading inventory data:', error);
            showError('Failed to load inventory data');
        });
}

// Filter inventory based on criteria
function filterInventory() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const stockStatus = document.getElementById('stockFilter').value;

    filteredProducts = allProducts.filter(product => {
        // Search filter
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm) &&
            !product.description.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Category filter
        if (category && product.category !== category) {
            return false;
        }

        // Stock status filter
        if (stockStatus) {
            if (stockStatus === 'low' && !product.needs_restock) return false;
            if (stockStatus === 'out' && product.stock_quantity !== 0) return false;
            if (stockStatus === 'good' && (product.needs_restock || product.stock_quantity === 0)) return false;
        }

        return true;
    });

    renderInventoryTable(filteredProducts);
}

// Render inventory table
function renderInventoryTable(products) {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No products found matching the criteria</td></tr>';
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        const stockClass = product.stock_quantity === 0 ? 'stock-out' :
                          product.needs_restock ? 'stock-low' : 'stock-good';
        const statusBadge = product.stock_quantity === 0 ? '<span class="badge bg-danger">Out of Stock</span>' :
                           product.needs_restock ? '<span class="badge bg-warning text-dark">Low Stock</span>' :
                           '<span class="badge bg-success">In Stock</span>';
        const marginClass = product.profit_margin > 50 ? 'bg-success' :
                           product.profit_margin > 20 ? 'bg-primary' : 'bg-warning';

        row.className = stockClass;
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="me-3 bg-light rounded p-2">
                        <i class="bi bi-box-seam" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <strong>${product.name}</strong><br>
                        <small class="text-muted">${product.description ? product.description.substring(0, 50) + '...' : 'No description'}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge bg-secondary">${product.category || 'Uncategorized'}</span>
            </td>
            <td>MWK ${numberWithCommas(product.cost_price.toFixed(2))}</td>
            <td>
                <strong>MWK ${numberWithCommas(product.selling_price.toFixed(2))}</strong>
            </td>
            <td>
                <h5 class="mb-0">${product.stock_quantity}</h5>
            </td>
            <td>${product.min_stock_level}</td>
            <td>
                <span class="badge ${marginClass}">
                    ${product.profit_margin.toFixed(1)}%
                </span>
            </td>
            <td>${statusBadge}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editProduct(${product.id})" title="Edit Product">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="restockProduct(${product.id})" title="Restock">
                        <i class="bi bi-plus-circle"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewProduct(${product.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProduct(${product.id})" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Update summary cards
function updateSummaryCards(summary) {
    document.getElementById('totalProducts').textContent = summary.total_products;
    document.getElementById('totalStockValue').textContent = `MWK ${numberWithCommas(summary.total_stock_value.toFixed(2))}`;
    document.getElementById('lowStockCount').textContent = summary.low_stock_count;
    document.getElementById('outOfStockCount').textContent = summary.out_of_stock_count;
}

// Add new product
function addProduct() {
    const formData = new FormData(document.getElementById('addProductForm'));
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        category: formData.get('category'),
        stock_quantity: parseInt(formData.get('stock_quantity')) || 0,
        cost_price: parseFloat(formData.get('cost_price')),
        selling_price: parseFloat(formData.get('selling_price')),
        min_stock_level: parseInt(formData.get('min_stock_level')) || 10
    };

    fetch('/api/inventory-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Product added successfully!');
            loadInventoryData();
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            document.getElementById('addProductForm').reset();
        } else {
            showError(data.message || 'Failed to add product');
        }
    })
    .catch(error => {
        console.error('Error adding product:', error);
        showError('Failed to add product');
    });
}

// Edit product
function editProduct(productId) {
    // Fetch fresh product data
    fetch(`/api/inventory-data/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                // Populate edit modal
                document.getElementById('editProductId').value = product.id;
                document.getElementById('editProductName').value = product.name;
                document.getElementById('editProductDescription').value = product.description || '';
                document.getElementById('editProductCategory').value = product.category || '';
                document.getElementById('editProductPrice').value = product.selling_price;
                document.getElementById('editProductCost').value = product.cost_price;
                document.getElementById('editProductStock').value = product.stock_quantity;
                document.getElementById('editProductMinStock').value = product.min_stock_level;

                // Show edit modal
                new bootstrap.Modal(document.getElementById('editProductModal')).show();
            } else {
                showError('Failed to load product data');
            }
        })
        .catch(error => {
            console.error('Error loading product data:', error);
            showError('Failed to load product data');
        });
}

// Update product
function updateProduct() {
    const formData = new FormData(document.getElementById('editProductForm'));
    const productId = document.getElementById('editProductId').value;
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        category: formData.get('category'),
        cost_price: parseFloat(formData.get('cost_price')),
        selling_price: parseFloat(formData.get('selling_price')),
        min_stock_level: parseInt(formData.get('min_stock_level'))
    };

    fetch(`/api/inventory-data/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Product updated successfully!');
            loadInventoryData();
            bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
        } else {
            showError(data.message || 'Failed to update product');
        }
    })
    .catch(error => {
        console.error('Error updating product:', error);
        showError('Failed to update product');
    });
}

// Restock product
function restockProduct(productId) {
    // Fetch fresh product data
    fetch(`/api/inventory-data/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                document.getElementById('restockProductId').value = product.id;
                document.getElementById('restockProductName').textContent = product.name;
                document.getElementById('restockCurrentStock').textContent = product.stock_quantity;
                document.getElementById('restockQuantity').value = '';

                new bootstrap.Modal(document.getElementById('restockModal')).show();
            } else {
                showError('Failed to load product data');
            }
        })
        .catch(error => {
            console.error('Error loading product data:', error);
            showError('Failed to load product data');
        });
}

// Process restock
function processRestock() {
    const productId = document.getElementById('restockProductId').value;
    const quantity = parseInt(document.getElementById('restockQuantity').value);

    if (!quantity || quantity <= 0) {
        showError('Please enter a valid quantity');
        return;
    }

    fetch(`/api/inventory-data/${productId}/restock`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: quantity })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(`Restocked ${quantity} units successfully!`);
            loadInventoryData();
            bootstrap.Modal.getInstance(document.getElementById('restockModal')).hide();
        } else {
            showError(data.message || 'Failed to restock product');
        }
    })
    .catch(error => {
        console.error('Error restocking product:', error);
        showError('Failed to restock product');
    });
}

// View product details
function viewProduct(productId) {
    // Fetch fresh product data
    fetch(`/api/inventory-data/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                document.getElementById('viewProductId').textContent = product.id;
                document.getElementById('viewProductName').textContent = product.name;
                document.getElementById('viewProductDescription').textContent = product.description || 'No description';
                document.getElementById('viewProductCategory').textContent = product.category || 'No category';
                document.getElementById('viewProductStock').textContent = product.stock_quantity;
                document.getElementById('viewProductCost').textContent = `MWK ${product.cost_price.toFixed(2)}`;
                document.getElementById('viewProductSelling').textContent = `MWK ${product.selling_price.toFixed(2)}`;
                document.getElementById('viewProductMinStock').textContent = product.min_stock_level;

                new bootstrap.Modal(document.getElementById('viewProductModal')).show();
            } else {
                showError('Failed to load product details');
            }
        })
        .catch(error => {
            console.error('Error loading product details:', error);
            showError('Failed to load product details');
        });
}

// Delete product
function deleteProduct(productId) {
    // Fetch fresh product data for confirmation
    fetch(`/api/inventory-data/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.product;
                if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
                    return;
                }

                fetch(`/api/inventory-data/${productId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccess('Product deleted successfully!');
                        loadInventoryData();
                    } else {
                        showError(data.message || 'Failed to delete product');
                    }
                })
                .catch(error => {
                    console.error('Error deleting product:', error);
                    showError('Failed to delete product');
                });
            } else {
                showError('Failed to load product data');
            }
        })
        .catch(error => {
            console.error('Error loading product data:', error);
            showError('Failed to load product data');
        });
}

// Export inventory
function exportInventory() {
    const csvContent = generateCSV(filteredProducts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Generate CSV content
function generateCSV(products) {
    const headers = ['Name', 'Description', 'Category', 'Price', 'Cost', 'Stock', 'Min Stock', 'Profit Margin', 'Status'];
    let csv = headers.join(',') + '\n';

    products.forEach(product => {
        const status = product.stock_quantity === 0 ? 'Out of Stock' :
                      product.needs_restock ? 'Low Stock' : 'In Stock';
        const row = [
            `"${product.name}"`,
            `"${product.description || ''}"`,
            `"${product.category || ''}"`,
            product.selling_price,
            product.cost_price,
            product.stock_quantity,
            product.min_stock_level,
            product.profit_margin.toFixed(1),
            `"${status}"`
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

// Utility function for number formatting
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Success message
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 3000);
}

// Error display function
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}
from flask import Blueprint, render_template, jsonify, request, flash, redirect, url_for
from flask_login import login_required, current_user
from app import db
from app.models import Sale, Product, Customer, Expense
from datetime import datetime, timedelta
import pandas as pd
import json

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('login.html')

@main_bp.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard page"""
    # Get recent sales
    recent_sales = Sale.query.order_by(Sale.sale_date.desc()).limit(10).all()
    
    # Get low stock products
    low_stock = Product.query.filter(Product.stock_quantity < Product.min_stock).all()
    
    # Calculate today's sales
    today = datetime.now().date()
    today_sales = Sale.query.filter(db.func.date(Sale.sale_date) == today).all()
    today_total = sum(sale.total_amount for sale in today_sales)
    
    # Get monthly sales for chart
    monthly_data = get_monthly_sales_data()
    
    return render_template('dashboard.html',
                         recent_sales=recent_sales,
                         low_stock=low_stock,
                         today_total=today_total,
                         monthly_data=monthly_data)

@main_bp.route('/sales')
@login_required
def sales():
    """Sales page"""
    sales_list = Sale.query.order_by(Sale.sale_date.desc()).all()

    # Calculate summary statistics
    total_sales = sum(sale.total_amount for sale in sales_list) if sales_list else 0

    # Today's sales
    from datetime import date
    today = date.today()
    today_sales = [sale for sale in sales_list if sale.sale_date.date() == today]
    today_total = sum(sale.total_amount for sale in today_sales) if today_sales else 0

    # Average transaction
    avg_transaction = total_sales / len(sales_list) if sales_list else 0

    return render_template('sales.html',
                         sales=sales_list,
                         total_sales=total_sales,
                         today_total=today_total,
                         today_date=today.strftime('%B %d, %Y'),
                         avg_transaction=avg_transaction)

@main_bp.route('/inventory')
@login_required
def inventory():
    """Inventory management page"""
    products = Product.query.order_by(Product.name).all()

    # Summary values for the inventory dashboard
    total_stock_value = sum((p.stock_quantity or 0) * (p.cost or 0) for p in products)
    low_stock_count = sum(1 for p in products if (p.stock_quantity or 0) < (p.min_stock or 0))
    out_of_stock_count = sum(1 for p in products if (p.stock_quantity or 0) == 0)

    return render_template('inventory.html',
                           products=products,
                           total_stock_value=total_stock_value,
                           low_stock_count=low_stock_count,
                           out_of_stock_count=out_of_stock_count)

@main_bp.route('/customers')
@login_required
def customers():
    """Customers page"""
    customers_list = Customer.query.order_by(Customer.name).all()
    
    # Add customer analytics to each customer object
    for customer in customers_list:
        # Calculate total spent
        customer.total_spent = db.session.query(db.func.sum(Sale.total_amount)).filter(Sale.customer_id == customer.id).scalar() or 0
        
        # Get last purchase date
        customer.last_purchase = db.session.query(db.func.max(Sale.sale_date)).filter(Sale.customer_id == customer.id).scalar()
        
        # Get order count
        customer.order_count = db.session.query(db.func.count(Sale.id)).filter(Sale.customer_id == customer.id).scalar() or 0
    
    return render_template('customers.html', customers=customers_list)

@main_bp.route('/reports')
@login_required
def reports():
    """Reports page"""
    return render_template('reports.html')

@main_bp.route('/api/sales-data')
@login_required
def sales_data():
    """API endpoint for sales chart data"""
    data = get_monthly_sales_data()
    return jsonify(data)

@main_bp.route('/api/sales-list')
@login_required
def sales_list():
    """API endpoint for sales list with summary data"""
    sales_list = Sale.query.order_by(Sale.sale_date.desc()).all()

    # Calculate summary statistics
    total_sales = sum(sale.total_amount for sale in sales_list) if sales_list else 0

    # Today's sales
    from datetime import date
    today = date.today()
    today_sales = [sale for sale in sales_list if sale.sale_date.date() == today]
    today_total = sum(sale.total_amount for sale in today_sales) if today_sales else 0

    # Average transaction
    avg_transaction = total_sales / len(sales_list) if sales_list else 0

    # Format sales data for JSON
    sales_data = []
    for sale in sales_list:
        sales_data.append({
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'sale_date': sale.sale_date.isoformat(),
            'customer_id': sale.customer_id,
            'customer': {
                'id': sale.customer.id,
                'name': sale.customer.name
            } if sale.customer else None,
            'total_amount': float(sale.total_amount),
            'payment_method': sale.payment_method,
            'notes': sale.notes
        })

    return jsonify({
        'sales': sales_data,
        'summary': {
            'total_sales': total_sales,
            'today_total': today_total,
            'total_transactions': len(sales_list),
            'avg_transaction': avg_transaction
        }
    })

@main_bp.route('/api/dashboard-stats')
@login_required
def dashboard_stats():
    """API endpoint for dashboard statistics"""
    # Get the date range of our sample data
    sample_date_range = db.session.query(
        db.func.min(Sale.sale_date).label('min_date'),
        db.func.max(Sale.sale_date).label('max_date')
    ).first()
    
    if sample_date_range.min_date:
        # Use the sample data period
        sample_start = sample_date_range.min_date.date()
        sample_end = sample_date_range.max_date.date()
        
        # Calculate statistics for the sample data period
        all_sales = Sale.query.filter(
            db.func.date(Sale.sale_date) >= sample_start,
            db.func.date(Sale.sale_date) <= sample_end
        ).all()
        
        # Get "today" as the most recent sale date in sample data
        today = sample_end
        today_sales = [sale for sale in all_sales if sale.sale_date.date() == today]
        today_total = sum(sale.total_amount for sale in today_sales)
        
        # "Yesterday" as the day before the most recent sale
        yesterday = today - timedelta(days=1)
        yesterday_sales = [sale for sale in all_sales if sale.sale_date.date() == yesterday]
        yesterday_total = sum(sale.total_amount for sale in yesterday_sales)
        
        # "This month" as all sales in the sample data
        month_total = sum(sale.total_amount for sale in all_sales)
    else:
        # Fallback if no data
        today_total = 0
        yesterday_total = 0
        month_total = 0
    
    # Low stock count
    low_stock_count = Product.query.filter(Product.stock_quantity < Product.min_stock).count()
    
    # Total customers
    total_customers = Customer.query.count()
    
    stats = {
        'today_sales': today_total,
        'yesterday_sales': yesterday_total,
        'month_sales': month_total,
        'low_stock_count': low_stock_count,
        'total_customers': total_customers,
        'sales_change': calculate_percentage_change(today_total, yesterday_total)
    }
    
    return jsonify(stats)

def get_monthly_sales_data():
    """Get sales data for the sample data period"""
    # Get the date range of our sample data
    sample_date_range = db.session.query(
        db.func.min(Sale.sale_date).label('min_date'),
        db.func.max(Sale.sale_date).label('max_date')
    ).first()
    
    if sample_date_range.min_date:
        # Use sample data period
        start_date = sample_date_range.min_date
        end_date = sample_date_range.max_date
    else:
        # Fallback to last 6 months
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
    
    # Query sales grouped by month (DB-agnostic)
    dialect_name = db.engine.dialect.name
    if dialect_name == 'sqlite':
        month_expr = db.func.strftime('%Y-%m', Sale.sale_date).label('month')
    elif dialect_name == 'postgresql':
        month_expr = db.func.to_char(Sale.sale_date, 'YYYY-MM').label('month')
    else:
        month_expr = db.func.date_format(Sale.sale_date, '%Y-%m').label('month')

    sales_by_month = db.session.query(
        month_expr,
        db.func.sum(Sale.total_amount).label('total')
    ).filter(
        Sale.sale_date >= start_date,
        Sale.sale_date <= end_date
    ).group_by(month_expr).order_by(month_expr).all()
    
    # Format data for chart
    months = []
    totals = []
    
    for row in sales_by_month:
        months.append(row.month)
        totals.append(float(row.total) if row.total else 0)
    
    return {
        'months': months,
        'totals': totals
    }

def calculate_percentage_change(current, previous):
    """Calculate percentage change"""
    if previous == 0:
        return 100 if current > 0 else 0
    return round(((current - previous) / previous) * 100, 2)

# ==================== INVENTORY API ENDPOINTS ====================

@main_bp.route('/api/inventory-data')
@login_required
def inventory_data():
    """API endpoint for inventory data with summary"""
    products = Product.query.order_by(Product.name).all()

    # Calculate summary statistics
    total_stock_value = sum((p.stock_quantity or 0) * (p.cost or 0) for p in products)
    low_stock_count = sum(1 for p in products if (p.stock_quantity or 0) < (p.min_stock or 0))
    out_of_stock_count = sum(1 for p in products if (p.stock_quantity or 0) == 0)

    # Format products for JSON
    products_data = []
    for product in products:
        products_data.append({
            'id': product.id,
            'name': product.name,
            'description': product.description,
            'category': product.category,
            'cost_price': float(product.cost or 0),
            'selling_price': float(product.price),
            'stock_quantity': product.stock_quantity,
            'min_stock_level': product.min_stock,
            'profit_margin': product.profit_margin(),
            'needs_restock': product.needs_restock()
        })

    return jsonify({
        'products': products_data,
        'summary': {
            'total_products': len(products),
            'total_stock_value': total_stock_value,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count
        }
    })

@main_bp.route('/api/inventory-data', methods=['POST'])
@login_required
def create_inventory_product():
    """Create a new product via inventory API"""
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        category = data.get('category')
        stock_quantity = int(data.get('stock_quantity', 0))
        cost_price = float(data.get('cost_price', 0))
        selling_price = float(data.get('selling_price', 0))
        min_stock_level = int(data.get('min_stock_level', 10))

        if not name or selling_price <= 0:
            return jsonify({'success': False, 'message': 'Name and valid selling price are required'}), 400

        product = Product(
            name=name,
            description=description,
            category=category,
            price=selling_price,
            cost=cost_price,
            stock_quantity=stock_quantity,
            min_stock=min_stock_level
        )

        db.session.add(product)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Product created successfully', 'product_id': product.id})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@main_bp.route('/api/inventory-data/<int:product_id>', methods=['GET'])
@login_required
def get_inventory_product(product_id):
    """Get a specific product"""
    try:
        product = Product.query.get_or_404(product_id)

        return jsonify({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'category': product.category,
                'cost_price': float(product.cost or 0),
                'selling_price': float(product.price),
                'stock_quantity': product.stock_quantity,
                'min_stock_level': product.min_stock
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@main_bp.route('/api/inventory-data/<int:product_id>', methods=['PUT'])
@login_required
def update_inventory_product(product_id):
    """Update a product via inventory API"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()

        product.name = data.get('name', product.name)
        product.description = data.get('description', product.description)
        product.category = data.get('category', product.category)
        product.cost = float(data.get('cost_price', product.cost))
        product.price = float(data.get('selling_price', product.price))
        product.min_stock = int(data.get('min_stock_level', product.min_stock))

        db.session.commit()

        return jsonify({'success': True, 'message': 'Product updated successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@main_bp.route('/api/inventory-data/<int:product_id>', methods=['DELETE'])
@login_required
def delete_inventory_product(product_id):
    """Delete a product via inventory API"""
    try:
        product = Product.query.get_or_404(product_id)

        db.session.delete(product)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Product deleted successfully'})

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@main_bp.route('/api/inventory-data/<int:product_id>/restock', methods=['PATCH'])
@login_required
def restock_inventory_product(product_id):
    """Restock a product via inventory API"""
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()

        quantity = int(data.get('quantity', 0))
        if quantity <= 0:
            return jsonify({'success': False, 'message': 'Invalid quantity'}), 400

        product.stock_quantity += quantity
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Product restocked with {quantity} units',
            'new_stock': product.stock_quantity
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
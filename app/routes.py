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
    return render_template('sales.html', sales=sales_list)

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
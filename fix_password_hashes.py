#!/usr/bin/env python3
"""
Script to fix password hashes in the database by regenerating them with the correct format
"""

import os
import sys
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

# Create application instance
app = create_app()

def fix_password_hashes():
    """Regenerate all password hashes with the correct method"""
    with app.app_context():
        users = User.query.all()
        
        if not users:
            print("No users found in database")
            return
        
        # Default passwords for resetting
        default_passwords = {
            'admin': 'admin123',
            'manager1': 'manager123',
            'staff1': 'staff123',
            'Gomez': 'gomez123',
        }
        
        fixed_count = 0
        for user in users:
            # Use default password if available, otherwise skip
            if user.username in default_passwords:
                password = default_passwords[user.username]
                user.set_password(password)
                db.session.add(user)
                fixed_count += 1
                print(f"✓ Fixed password hash for user: {user.username}")
            else:
                print(f"⚠ Skipping user {user.username} - no default password defined")
        
        if fixed_count > 0:
            db.session.commit()
            print(f"\n✓ Successfully fixed {fixed_count} password hash(es)")
        else:
            print("No passwords were updated")

if __name__ == '__main__':
    fix_password_hashes()

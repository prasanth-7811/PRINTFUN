import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.extensions import db
from app.models import User
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Check connection
    result = db.session.execute(text("SELECT current_schema(), current_user")).fetchone()
    print(f"Schema: {result[0]} | User: {result[1]}")

    # List existing tables
    tables = db.session.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    ).fetchall()
    print(f"Existing tables: {[t[0] for t in tables]}")

    # Create all tables
    db.create_all()
    print("db.create_all() done")

    # Verify
    tables = db.session.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    ).fetchall()
    print(f"Tables after create_all: {[t[0] for t in tables]}")

    # Create admin
    existing = User.query.filter_by(email='admin@printheaven.co.in').first()
    if existing:
        print(f"Admin exists: {existing.email} | role={existing.role}")
    else:
        admin = User(
            name='Admin',
            email='admin@printheaven.co.in',
            phone='+919600650612',
            password_hash=User.hash_password('Printheaven@12345'),
            role='admin',
            is_active=True,
            email_verified=True,
        )
        db.session.add(admin)
        db.session.commit()
        print(f"Admin created: {admin.email}")

    print("\nDone! Admin credentials:")
    print("  Email   : admin@printheaven.co.in")
    print("  Password: Printheaven@12345")
    print("  Login at: https://www.printheaven.co.in/admin/login")

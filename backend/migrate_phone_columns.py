"""Idempotent schema migration for the phone-verification columns.

Adds the new columns to existing SQLite/Postgres databases without touching
catalog data. Safe to run repeatedly.
"""
from app import create_app
from app.extensions import db
from sqlalchemy import inspect, text

app = create_app()

ADD = {
    'users': [
        ('phone_verified', 'BOOLEAN'),
    ],
    'auth_tokens': [
        ('phone', 'VARCHAR(20)'),
        ('phone_otp_hash', 'VARCHAR(256)'),
        ('phone_otp_attempts', 'INTEGER'),
        ('phone_otp_last_sent_at', 'DATETIME'),
        ('last_otp_at', 'DATETIME'),
        ('otp_attempts', 'INTEGER'),
    ],
}

with app.app_context():
    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())
    for table, columns in ADD.items():
        if table not in tables:
            print(f'skip {table}: table missing')
            continue
        present = {c['name'] for c in inspector.get_columns(table)}
        for name, ddl in columns:
            if name not in present:
                db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))
                db.session.commit()
                print(f'{table}.{name} added')

    if 'users' in tables:
        # A number verified before this column existed is as good as verified now.
        db.session.execute(text(
            'UPDATE users SET phone_verified = email_verified WHERE phone_verified IS NULL'))
        db.session.commit()
        db.session.execute(text(
            'UPDATE auth_tokens SET phone_otp_attempts = 0, otp_attempts = 0 '
            'WHERE phone_otp_attempts IS NULL AND otp_attempts IS NULL'))
        db.session.commit()
    print('done')

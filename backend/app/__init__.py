import os
from flask import Flask, jsonify
from .extensions import jwt, cors, limiter
import pymongo
from .config.settings import config
import app.extensions as _ext


def create_app(config_name=None):
    app = Flask(__name__)
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config.get(config_name, config['default']))

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # --- MongoDB connection ---------------------------------------------------
    _ext.mongo_client = pymongo.MongoClient(app.config['MONGO_URI'])
    _ext.mongo_db = _ext.mongo_client[app.config['MONGO_DB_NAME']]

    # Create indexes for performance & uniqueness
    with app.app_context():
        _create_indexes(_ext.mongo_db)

    # --- Flask extensions ----------------------------------------------------
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})
    limiter.storage_uri = app.config.get('RATELIMIT_STORAGE_URI', 'memory://')
    limiter.enabled = bool(app.config.get('RATELIMIT_ENABLED', True))
    limiter.init_app(app)

    # --- Blueprints ----------------------------------------------------------
    from .routes.auth import auth_bp
    from .routes.phone import phone_bp
    from .routes.products import products_bp
    from .routes.cart import cart_bp
    from .routes.orders import orders_bp
    from .routes.designs import designs_bp
    from .routes.coupons import coupons_bp
    from .routes.reviews import reviews_bp
    from .routes.enquiries import enquiries_bp
    from .routes.admin import admin_bp
    from .routes.wishlist import wishlist_bp
    from .routes.notifications import notifications_bp
    from .routes.addresses import addresses_bp
    from .routes.users import users_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(phone_bp, url_prefix='/api/phone')
    app.register_blueprint(products_bp, url_prefix='/api/products')
    app.register_blueprint(cart_bp, url_prefix='/api/cart')
    app.register_blueprint(orders_bp, url_prefix='/api/orders')
    app.register_blueprint(designs_bp, url_prefix='/api/designs')
    app.register_blueprint(coupons_bp, url_prefix='/api/coupons')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(enquiries_bp, url_prefix='/api/enquiries')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(wishlist_bp, url_prefix='/api/wishlist')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(addresses_bp, url_prefix='/api/addresses')
    app.register_blueprint(users_bp, url_prefix='/api/users')

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'message': 'Resource not found'}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'message': 'Bad request'}), 400

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'message': 'Internal server error'}), 500

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'printheaven-api'})

    return app


def _create_indexes(mdb):
    """Create MongoDB indexes for all collections."""
    mdb.users.create_index('email', unique=True)
    mdb.users.create_index('email_verified')
    mdb.users.create_index('phone_verified')

    mdb.auth_tokens.create_index('token_hash', unique=True)
    mdb.auth_tokens.create_index('user_id')
    mdb.auth_tokens.create_index('purpose')
    mdb.auth_tokens.create_index('expires_at')

    mdb.products.create_index('slug', unique=True)
    mdb.products.create_index('is_active')
    mdb.products.create_index('is_featured')

    mdb.product_variants.create_index('product_id')
    mdb.product_variants.create_index('audience')

    mdb.orders.create_index('order_number', unique=True)
    mdb.orders.create_index('user_id')

    mdb.cart_items.create_index('user_id')
    mdb.wishlist_items.create_index('user_id')
    mdb.reviews.create_index('product_id')
    mdb.reviews.create_index('user_id')
    mdb.addresses.create_index('user_id')
    mdb.notifications.create_index('user_id')
    mdb.coupons.create_index('code', unique=True)
    mdb.designs.create_index('is_active')
    mdb.inventory.create_index([('product_id', 1), ('variant_id', 1), ('colour', 1), ('size', 1)])

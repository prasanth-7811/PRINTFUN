import os
from flask import Flask, jsonify
from .extensions import db, jwt, migrate, cors
from .config.settings import config


def create_app(config_name=None):
    app = Flask(__name__)
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config.get(config_name, config['default']))

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})

    from .routes.auth import auth_bp
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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
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
        return jsonify({'status': 'ok', 'service': 'teezo-api'})

    return app

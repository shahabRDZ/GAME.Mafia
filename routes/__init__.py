"""Register all route blueprints with the Flask app."""


def register_blueprints(app):
    """Import and register every blueprint."""
    from routes.pages import bp as pages_bp
    from routes.auth import bp as auth_bp
    from routes.profile import bp as profile_bp
    from routes.friends import bp as friends_bp
    from routes.dm import bp as dm_bp
    from routes.games import bp as games_bp
    from routes.chaos import bp as chaos_bp
    from routes.lab import bp as lab_bp
    from routes.events import bp as events_bp
    from routes.admin import bp as admin_bp
    from routes.digital import bp as digital_bp
    from routes.nearby import bp as nearby_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(friends_bp)
    app.register_blueprint(dm_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(chaos_bp)
    app.register_blueprint(lab_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(digital_bp)
    app.register_blueprint(nearby_bp)

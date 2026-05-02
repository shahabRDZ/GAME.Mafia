"""SEO landing pages — scenario & role guides (server-rendered HTML for Google)."""
import os
from flask import Blueprint, send_from_directory

bp = Blueprint("seo", __name__)

SEO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "seo")

SCENARIO_FILES = {
    "takavor": "takavor.html",
    "namayandeh": "namayandeh.html",
    "bazpors": "bazpors.html",
    "mozakereh": "mozakereh.html",
    "jayezeh": "jayezeh.html",
}


@bp.route("/scenarios")
def scenarios_index():
    return send_from_directory(SEO_DIR, "roles.html")


@bp.route("/scenarios/<name>")
def scenario_page(name):
    filename = SCENARIO_FILES.get(name)
    if not filename:
        return "", 404
    return send_from_directory(SEO_DIR, filename)


@bp.route("/roles")
def roles_page():
    return send_from_directory(SEO_DIR, "roles.html")

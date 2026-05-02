"""Static page routes and basic API endpoints."""
from flask import Blueprint, jsonify, current_app, make_response
from extensions import db
from models import SiteStats

bp = Blueprint("pages", __name__)

SITE_URL = "https://showshung.com"


# ── Sitemap ──

@bp.route("/sitemap.xml")
def sitemap():
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{SITE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{SITE_URL}/mafia-events</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>{SITE_URL}/roles</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{SITE_URL}/scenarios/takavor</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{SITE_URL}/scenarios/namayandeh</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{SITE_URL}/scenarios/bazpors</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{SITE_URL}/scenarios/mozakereh</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>{SITE_URL}/scenarios/jayezeh</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>"""
    resp = make_response(xml)
    resp.headers["Content-Type"] = "application/xml"
    return resp


@bp.route("/")
def index():
    return current_app.send_static_file("mafia.html")


@bp.route("/panel")
def admin_panel():
    return current_app.send_static_file("admin.html")


@bp.route("/mafia-events")
def events_page():
    return current_app.send_static_file("ev.html")


# ── SEO landing pages (URLs referenced by sitemap.xml) ──

@bp.route("/roles")
def seo_roles():
    return current_app.send_static_file("seo/roles.html")


@bp.route("/scenarios/takavor")
def seo_takavor():
    return current_app.send_static_file("seo/takavor.html")


@bp.route("/scenarios/namayandeh")
def seo_namayandeh():
    return current_app.send_static_file("seo/namayandeh.html")


@bp.route("/scenarios/bazpors")
def seo_bazpors():
    return current_app.send_static_file("seo/bazpors.html")


@bp.route("/scenarios/mozakereh")
def seo_mozakereh():
    return current_app.send_static_file("seo/mozakereh.html")


@bp.route("/scenarios/jayezeh")
def seo_jayezeh():
    return current_app.send_static_file("seo/jayezeh.html")


# ── Visit Counter ──

@bp.route("/api/visit", methods=["POST"])
def track_visit():
    stat = SiteStats.query.filter_by(key="visits").first()
    if not stat:
        stat = SiteStats(key="visits", value=0)
        db.session.add(stat)
    stat.value += 1
    db.session.commit()
    return jsonify({"visits": stat.value}), 200


@bp.route("/api/version", methods=["GET"])
def get_version():
    return jsonify({"v": "2.0"}), 200


@bp.route("/api/visit", methods=["GET"])
def get_visits():
    stat = SiteStats.query.filter_by(key="visits").first()
    return jsonify({"visits": stat.value if stat else 0}), 200

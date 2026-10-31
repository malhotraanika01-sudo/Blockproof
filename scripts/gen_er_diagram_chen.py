"""
Generates docs/er-diagram-chen.png — classic Chen-notation ER diagram:
entities as rectangles, attributes as ovals radiating around each entity
(primary keys underlined), relationships as labeled diamonds with 1/N
cardinality. A sibling of docs/er-diagram.png (which uses crow's-foot /
IE notation instead) — same 17 entities, same relationships, different style.

Run: python scripts/gen_er_diagram_chen.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

FONT_DIR = "C:/Windows/Fonts"
def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)

F_ENTITY = font("arialbd.ttf", 17)
F_ATTR = font("arial.ttf", 13)
F_TAG = font("arial.ttf", 10)
F_REL = font("arialbd.ttf", 12)
F_CARD = font("arialbd.ttf", 13)
F_TITLE = font("arialbd.ttf", 36)
F_SUB = font("arial.ttf", 16)

INK = (25, 28, 36)
MUTED = (110, 114, 126)
BG = (252, 252, 253)

# ---- entity colors (cycled) ----
PALETTE = [
    {"fill": (223, 234, 252), "border": (56, 97, 191)},   # blue
    {"fill": (221, 242, 233), "border": (32, 132, 99)},   # green
    {"fill": (252, 236, 213), "border": (191, 120, 36)},  # amber
    {"fill": (247, 224, 235), "border": (173, 51, 110)},  # pink
    {"fill": (235, 227, 250), "border": (108, 66, 171)},  # purple
    {"fill": (213, 242, 247), "border": (29, 134, 150)},  # teal
]

# (name, [(attr, PK, FK, UK), ...])
ENTITIES = [
    ("ROLES", [("role_id", 1, 0, 0), ("name", 0, 0, 1), ("description", 0, 0, 0)]),
    ("PERMISSIONS", [("permission_id", 1, 0, 0), ("code", 0, 0, 1), ("description", 0, 0, 0)]),
    ("ROLE_PERMISSIONS", [("role_id", 1, 1, 0), ("permission_id", 1, 1, 0)]),
    ("USERS", [("user_id", 1, 0, 0), ("role_id", 0, 1, 0), ("email", 0, 0, 1), ("password_hash", 0, 0, 0),
               ("full_name", 0, 0, 0), ("phone", 0, 0, 0), ("badge_number", 0, 0, 1), ("is_active", 0, 0, 0),
               ("created_at", 0, 0, 0), ("updated_at", 0, 0, 0)]),
    ("REFRESH_TOKENS", [("token_id", 1, 0, 0), ("user_id", 0, 1, 0), ("token_hash", 0, 0, 1),
                         ("expires_at", 0, 0, 0), ("created_at", 0, 0, 0), ("revoked_at", 0, 0, 0),
                         ("replaced_by_token_id", 0, 1, 0), ("user_agent", 0, 0, 0), ("ip", 0, 0, 0)]),
    ("AUDIT_LOGS", [("audit_id", 1, 0, 0), ("actor_id", 0, 1, 0), ("action", 0, 0, 0), ("entity_type", 0, 0, 0),
                     ("entity_id", 0, 0, 0), ("detail", 0, 0, 0), ("ip_address", 0, 0, 0), ("created_at", 0, 0, 0)]),
    ("CRIME_REPORTS", [("report_id", 1, 0, 0), ("tracking_code", 0, 0, 1), ("reporter_id", 0, 1, 0),
                        ("crime_type", 0, 0, 0), ("title", 0, 0, 0), ("description", 0, 0, 0),
                        ("incident_at", 0, 0, 0), ("incident_location", 0, 0, 0), ("status", 0, 0, 0),
                        ("created_at", 0, 0, 0), ("updated_at", 0, 0, 0)]),
    ("CASES", [("case_id", 1, 0, 0), ("case_number", 0, 0, 1), ("report_id", 0, 1, 0), ("lead_head_id", 0, 1, 0),
               ("title", 0, 0, 0), ("priority", 0, 0, 0), ("status", 0, 0, 0), ("opened_at", 0, 0, 0),
               ("closed_at", 0, 0, 0), ("created_at", 0, 0, 0), ("updated_at", 0, 0, 0)]),
    ("CASE_ASSIGNMENTS", [("assignment_id", 1, 0, 0), ("case_id", 0, 1, 0), ("investigator_id", 0, 1, 0),
                           ("assigned_by", 0, 1, 0), ("is_active", 0, 0, 0), ("assigned_at", 0, 0, 0),
                           ("unassigned_at", 0, 0, 0)]),
    ("EVIDENCE_TYPES", [("evidence_type_id", 1, 0, 0), ("name", 0, 0, 1), ("description", 0, 0, 0)]),
    ("EVIDENCE", [("evidence_id", 1, 0, 0), ("evidence_code", 0, 0, 1), ("report_id", 0, 1, 0),
                  ("case_id", 0, 1, 0), ("evidence_type_id", 0, 1, 0), ("submitted_by", 0, 1, 0),
                  ("original_filename", 0, 0, 0), ("mime_type", 0, 0, 0), ("size_bytes", 0, 0, 0),
                  ("sha256_hash", 0, 0, 0), ("storage_key", 0, 0, 0), ("enc_iv", 0, 0, 0),
                  ("enc_auth_tag", 0, 0, 0), ("integrity_status", 0, 0, 0), ("last_verified_at", 0, 0, 0),
                  ("created_at", 0, 0, 0), ("updated_at", 0, 0, 0)]),
    ("EVIDENCE_LOCATIONS", [("location_id", 1, 0, 0), ("name", 0, 0, 1), ("kind", 0, 0, 0),
                             ("address", 0, 0, 0), ("custodian_id", 0, 1, 0)]),
    ("EVIDENCE_TRANSFERS", [("transfer_id", 1, 0, 0), ("evidence_id", 0, 1, 0), ("from_location_id", 0, 1, 0),
                             ("to_location_id", 0, 1, 0), ("transferred_by", 0, 1, 0), ("received_by", 0, 1, 0),
                             ("reason", 0, 0, 0), ("status", 0, 0, 0), ("blockchain_tx_id", 0, 0, 0),
                             ("initiated_at", 0, 0, 0), ("completed_at", 0, 0, 0)]),
    ("INVESTIGATION_UPDATES", [("update_id", 1, 0, 0), ("case_id", 0, 1, 0), ("author_id", 0, 1, 0),
                                ("update_type", 0, 0, 0), ("body", 0, 0, 0), ("created_at", 0, 0, 0)]),
    ("FORENSIC_ANALYSIS", [("analysis_id", 1, 0, 0), ("evidence_id", 0, 1, 0), ("analyst_id", 0, 1, 0),
                            ("method", 0, 0, 0), ("summary", 0, 0, 0), ("result", 0, 0, 0),
                            ("started_at", 0, 0, 0), ("completed_at", 0, 0, 0)]),
    ("COURT_SUBMISSIONS", [("submission_id", 1, 0, 0), ("case_id", 0, 1, 0), ("evidence_id", 0, 1, 0),
                            ("submitted_by", 0, 1, 0), ("court_reference", 0, 0, 0), ("status", 0, 0, 0),
                            ("submitted_at", 0, 0, 0)]),
    ("BLOCKCHAIN_TRANSACTIONS", [("tx_id", 1, 0, 0), ("evidence_id", 0, 1, 0), ("event_type", 0, 0, 0),
                                  ("fabric_tx_id", 0, 0, 0), ("block_reference", 0, 0, 0),
                                  ("recorded_hash", 0, 0, 0), ("payload", 0, 0, 0), ("recorded_at", 0, 0, 0)]),
]

# (entityA, entityB, cardA, cardB, label)
RELATIONSHIPS = [
    ("ROLES", "USERS", "1", "N", "assigned to"),
    ("ROLES", "ROLE_PERMISSIONS", "1", "N", "has"),
    ("PERMISSIONS", "ROLE_PERMISSIONS", "1", "N", "granted by"),
    ("USERS", "CRIME_REPORTS", "1", "N", "files"),
    ("USERS", "CASES", "1", "N", "leads (head)"),
    ("USERS", "CASE_ASSIGNMENTS", "1", "N", "assigned as investigator"),
    ("USERS", "INVESTIGATION_UPDATES", "1", "N", "writes"),
    ("USERS", "EVIDENCE_TRANSFERS", "1", "N", "initiates"),
    ("USERS", "FORENSIC_ANALYSIS", "1", "N", "performs"),
    ("USERS", "AUDIT_LOGS", "1", "N", "acts in"),
    ("USERS", "REFRESH_TOKENS", "1", "N", "has sessions"),
    ("CRIME_REPORTS", "CASES", "1", "1", "escalated into"),
    ("CRIME_REPORTS", "EVIDENCE", "1", "N", "submitted with"),
    ("CASES", "CASE_ASSIGNMENTS", "1", "N", "has"),
    ("CASES", "EVIDENCE", "1", "N", "contains"),
    ("CASES", "INVESTIGATION_UPDATES", "1", "N", "has"),
    ("CASES", "COURT_SUBMISSIONS", "1", "N", "produces"),
    ("EVIDENCE_TYPES", "EVIDENCE", "1", "N", "classifies"),
    ("EVIDENCE", "EVIDENCE_TRANSFERS", "1", "N", "moves via"),
    ("EVIDENCE", "FORENSIC_ANALYSIS", "1", "N", "examined in"),
    ("EVIDENCE", "COURT_SUBMISSIONS", "1", "N", "included in"),
    ("EVIDENCE", "BLOCKCHAIN_TRANSACTIONS", "1", "N", "anchored by"),
    ("EVIDENCE_LOCATIONS", "EVIDENCE_TRANSFERS", "1", "N", "source/destination"),
]

OVAL_W, OVAL_H = 118, 42
RECT_PAD_X, RECT_PAD_Y = 22, 16
GAP = 70        # gap between an entity's rectangle edge and its attribute ring
ROW_GAP = 90
COL_GAP = 70
CANVAS_W = 4600


def entity_rect_size(name):
    bbox = F_ENTITY_dummy_bbox(name)
    w = bbox[2] - bbox[0] + RECT_PAD_X * 2
    h = bbox[3] - bbox[1] + RECT_PAD_Y * 2
    return max(w, 150), max(h, 50)


_dummy_img = Image.new("RGB", (10, 10))
_dummy_draw = ImageDraw.Draw(_dummy_img)
def F_ENTITY_dummy_bbox(s):
    return _dummy_draw.textbbox((0, 0), s, font=F_ENTITY)
def text_w(s, fnt):
    b = _dummy_draw.textbbox((0, 0), s, font=fnt)
    return b[2] - b[0]
def text_h(s, fnt):
    b = _dummy_draw.textbbox((0, 0), s, font=fnt)
    return b[3] - b[1]


def ring_radius(n_attrs):
    # enough circumference that n ovals (each OVAL_W wide) don't overlap
    circumference_needed = n_attrs * (OVAL_W + 14)
    r = circumference_needed / (2 * math.pi)
    return max(r, 95)


def entity_halo_radius(name, attrs):
    rw, rh = entity_rect_size(name)
    rect_half_diag = math.hypot(rw, rh) / 2
    r = ring_radius(len(attrs))
    return rect_half_diag + GAP + r + max(OVAL_W, OVAL_H) / 2 + 10


# ---------- layout: simple flow, row by row ----------
layout = {}  # name -> (cx, cy, rect_w, rect_h, ring_r)
x_cursor = 0
y_cursor = 0
row_max_h = 0
PADDING = 90
x_cursor = PADDING
y_cursor = PADDING

for name, attrs in ENTITIES:
    halo = entity_halo_radius(name, attrs)
    diam = halo * 2
    if x_cursor + diam > CANVAS_W - PADDING and x_cursor > PADDING:
        x_cursor = PADDING
        y_cursor += row_max_h + ROW_GAP
        row_max_h = 0
    cx = x_cursor + halo
    cy = y_cursor + halo
    rw, rh = entity_rect_size(name)
    layout[name] = (cx, cy, rw, rh, ring_radius(len(attrs)))
    x_cursor += diam + COL_GAP
    row_max_h = max(row_max_h, diam)

# shift every entity down to leave room for the title block, then size the
# canvas to exactly fit the title + legend + content
Y_TOP_OFFSET = 120
for k in layout:
    cx, cy, rw, rh, rr = layout[k]
    layout[k] = (cx, cy + Y_TOP_OFFSET, rw, rh, rr)
CANVAS_H = int(y_cursor + row_max_h + PADDING + 140) + Y_TOP_OFFSET

img = Image.new("RGB", (CANVAS_W, CANVAS_H), BG)
d = ImageDraw.Draw(img)


def text_centered(xy, s, fnt, fill=INK, underline=False):
    b = d.textbbox((0, 0), s, font=fnt)
    w, h = b[2] - b[0], b[3] - b[1]
    x0 = xy[0] - w / 2
    y0 = xy[1] - h / 2 - b[1]
    d.text((x0, y0), s, font=fnt, fill=fill)
    if underline:
        d.line([(x0, y0 + h + 3), (x0 + w, y0 + h + 3)], fill=fill, width=2)


# ---------- title ----------
text_centered((CANVAS_W / 2, 50), "BlockProof \u2014 Entity-Relationship Diagram (Chen notation)", F_TITLE)
text_centered((CANVAS_W / 2, 92), "17 entities \u00b7 attributes shown as ovals around each entity \u00b7 primary keys underlined", F_SUB, MUTED)


def rect_edge_point(cx, cy, rw, rh, toward_x, toward_y):
    """Point on the rectangle boundary centered at (cx,cy) closest to the direction of (toward_x,toward_y)."""
    dx, dy = toward_x - cx, toward_y - cy
    if dx == 0 and dy == 0:
        return cx, cy
    hw, hh = rw / 2, rh / 2
    tx = hw / abs(dx) if dx != 0 else float("inf")
    ty = hh / abs(dy) if dy != 0 else float("inf")
    t = min(tx, ty)
    return cx + dx * t, cy + dy * t


# ---------- relationships (drawn first, under entities) ----------
for a, b, ca, cb, label in RELATIONSHIPS:
    axc, ayc, arw, arh, _ = layout[a]
    bxc, byc, brw, brh, _ = layout[b]
    p1 = rect_edge_point(axc, ayc, arw, arh, bxc, byc)
    p2 = rect_edge_point(bxc, byc, brw, brh, axc, ayc)
    mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
    line_color = (150, 155, 165)
    d.line([p1, (mx, my)], fill=line_color, width=2)
    d.line([(mx, my), p2], fill=line_color, width=2)

    # diamond
    dia_w, dia_h = min(150, 26 + text_w(label, F_REL)), 46
    dpts = [(mx, my - dia_h / 2), (mx + dia_w / 2, my), (mx, my + dia_h / 2), (mx - dia_w / 2, my)]
    d.polygon(dpts, fill=(255, 248, 225), outline=(150, 110, 10), width=2)
    text_centered((mx, my), label, F_REL, (110, 80, 5))

    # cardinalities near each end
    def pos_along(p_from, p_to, frac):
        return (p_from[0] + (p_to[0] - p_from[0]) * frac, p_from[1] + (p_to[1] - p_from[1]) * frac)
    c1 = pos_along(p1, (mx, my), 0.22)
    c2 = pos_along(p2, (mx, my), 0.22)
    text_centered(c1, ca, F_CARD, (40, 70, 140))
    text_centered(c2, cb, F_CARD, (40, 70, 140))

# ---------- entities + attribute ovals ----------
for idx, (name, attrs) in enumerate(ENTITIES):
    cx, cy, rw, rh, rr = layout[name]
    pal = PALETTE[idx % len(PALETTE)]

    n = len(attrs)
    for i, (attr, is_pk, is_fk, is_uk) in enumerate(attrs):
        angle = (2 * math.pi * i / n) - math.pi / 2
        ax = cx + rr * math.cos(angle)
        ay = cy + rr * math.sin(angle)
        # connecting line from entity edge to oval
        edge = rect_edge_point(cx, cy, rw, rh, ax, ay)
        d.line([edge, (ax, ay)], fill=(170, 174, 184), width=2)
        # oval
        ow, oh = OVAL_W, OVAL_H
        if is_pk:
            ofill, oborder = (255, 250, 230), (191, 140, 10)
        elif is_fk:
            ofill, oborder = (235, 240, 250), (90, 110, 160)
        else:
            ofill, oborder = (255, 255, 255), (150, 154, 164)
        d.ellipse((ax - ow / 2, ay - oh / 2, ax + ow / 2, ay + oh / 2), fill=ofill, outline=oborder, width=2)
        label = attr
        tag = ""
        if is_pk:
            tag = "PK"
        elif is_fk and is_uk:
            tag = "FK"
        elif is_fk:
            tag = "FK"
        elif is_uk:
            tag = "UK"
        if tag:
            b = d.textbbox((0, 0), label, font=F_ATTR)
            lh = b[3] - b[1]
            text_centered((ax, ay - 7), label, F_ATTR, INK, underline=bool(is_pk))
            text_centered((ax, ay + 10), f"({tag})", F_TAG, MUTED)
        else:
            text_centered((ax, ay), label, F_ATTR, INK, underline=bool(is_pk))

    # entity rectangle (drawn after its ovals' connector lines so it sits on top cleanly)
    rect = (cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2)
    d.rectangle(rect, fill=pal["fill"], outline=pal["border"], width=3)
    text_centered((cx, cy), name, F_ENTITY, pal["border"])

# ---------- legend ----------
lx, ly = 60, CANVAS_H - 70
d.ellipse((lx, ly, lx + 26, ly + 20), fill=(255, 250, 230), outline=(191, 140, 10), width=2)
d.text((lx + 36, ly), "underlined = primary key", font=F_SUB, fill=MUTED)
d.ellipse((lx + 330, ly, lx + 356, ly + 20), fill=(235, 240, 250), outline=(90, 110, 160), width=2)
d.text((lx + 366, ly), "(FK) = foreign key", font=F_SUB, fill=MUTED)
d.polygon([(lx + 620, ly - 6), (lx + 640, ly + 10), (lx + 620, ly + 26), (lx + 600, ly + 10)],
          fill=(255, 248, 225), outline=(150, 110, 10), width=2)
d.text((lx + 650, ly), "diamond = relationship, with 1 / N cardinality", font=F_SUB, fill=MUTED)

out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs", "er-diagram-chen.png"))
img.save(out_path)
print("Saved", out_path, img.size)

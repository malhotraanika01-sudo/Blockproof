"""
Generates docs/system-architecture.png — a simple 3-tier block diagram of
BlockProof's architecture (presentation / application / data layers).

Run: python scripts/gen_architecture_diagram.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1500, 1020
BG = (250, 250, 252)
INK = (30, 34, 44)
MUTED = (100, 106, 120)

# Layer palette (soft fills, solid borders)
PRESENTATION = {"fill": (223, 234, 252), "border": (56, 97, 191)}
ROUTE_BOX = {"fill": (241, 246, 255), "border": (99, 132, 206)}
APPLICATION = {"fill": (221, 242, 233), "border": (32, 132, 99)}
DATA = {"fill": (252, 236, 213), "border": (191, 120, 36)}
STORAGE = {"fill": (241, 229, 247), "border": (121, 72, 166)}

FONT_DIR = "C:/Windows/Fonts"
def font(name, size):
    return ImageFont.truetype(os.path.join(FONT_DIR, name), size)

f_title   = font("arialbd.ttf", 34)
f_layer   = font("arialbd.ttf", 22)
f_box     = font("arialbd.ttf", 19)
f_sub     = font("arial.ttf", 15)
f_small   = font("arial.ttf", 13)
f_tag     = font("arialbd.ttf", 13)

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

def rounded(xy, fill, outline, radius=14, width=2):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def text_centered(xy_center, s, fnt, fill=INK):
    bbox = d.textbbox((0, 0), s, font=fnt)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((xy_center[0] - w / 2, xy_center[1] - h / 2 - bbox[1]), s, font=fnt, fill=fill)

def text_left(xy, s, fnt, fill=INK):
    d.text(xy, s, font=fnt, fill=fill)

def arrow(x, y1, y2, label_left=None, label_right=None, color=(60, 64, 76)):
    d.line([(x, y1), (x, y2)], fill=color, width=3)
    # arrowhead at y2
    ah = 9
    d.polygon([(x - ah, y2 - ah), (x + ah, y2 - ah), (x, y2)], fill=color)
    # arrowhead at y1 (bidirectional look)
    d.polygon([(x - ah, y1 + ah), (x + ah, y1 + ah), (x, y1)], fill=color)
    if label_left:
        d.text((x - 170, (y1 + y2) / 2 - 10), label_left, font=f_small, fill=MUTED)
    if label_right:
        d.text((x + 18, (y1 + y2) / 2 - 10), label_right, font=f_small, fill=MUTED)

# ---------- Title ----------
text_centered((W / 2, 46), "BlockProof \u2014 System Architecture", f_title)
text_centered((W / 2, 82), "Three-tier design: presentation \u2194 application \u2194 data", f_sub, MUTED)

# ================= PRESENTATION LAYER =================
pres_xy = (90, 120, W - 90, 330)
rounded(pres_xy, PRESENTATION["fill"], PRESENTATION["border"], radius=18, width=3)
text_left((pres_xy[0] + 24, pres_xy[1] + 14), "PRESENTATION LAYER", f_layer, PRESENTATION["border"])
text_left((pres_xy[0] + 24, pres_xy[1] + 44), "One React + Vite application \u2014 route-isolated, not three separate apps", f_sub, MUTED)

routes = [
    ("/  (Common User)", "Report a crime, track status", "civic / public"),
    ("/investigator/*", "Assigned cases, verify evidence", "forensic workspace"),
    ("/head/*", "Assign cases, analytics, blockchain history, audit", "command center"),
]
route_w = (pres_xy[2] - pres_xy[0] - 24 * 2 - 24 * 2) / 3
rx = pres_xy[0] + 24
ry0, ry1 = pres_xy[1] + 76, pres_xy[3] - 20
for label, desc, tag in routes:
    box = (rx, ry0, rx + route_w, ry1)
    rounded(box, ROUTE_BOX["fill"], ROUTE_BOX["border"], radius=12, width=2)
    text_centered(((box[0] + box[2]) / 2, box[1] + 30), label, f_box, ROUTE_BOX["border"])
    text_centered(((box[0] + box[2]) / 2, box[1] + 58), desc, f_small, MUTED)
    tagw = d.textbbox((0, 0), tag.upper(), font=f_tag)[2]
    tx0 = (box[0] + box[2]) / 2 - tagw / 2 - 8
    d.rounded_rectangle((tx0, box[3] - 32, tx0 + tagw + 16, box[3] - 10), radius=8,
                         fill=(255, 255, 255), outline=ROUTE_BOX["border"], width=1)
    text_centered(((box[0] + box[2]) / 2, box[3] - 21), tag.upper(), f_tag, ROUTE_BOX["border"])
    rx += route_w + 24

text_centered((W / 2 - 180, pres_xy[3] + 16), "own layout \u00b7 own routing \u00b7 own design tokens", f_small, MUTED)

# ---------- arrow presentation -> application ----------
arrow_x = pres_xy[2] - 130
arrow(arrow_x, 330, 388)
text_left((arrow_x + 18, 342), "HTTPS + Bearer access token", f_small, MUTED)
text_left((arrow_x + 18, 362), "(+ httpOnly refresh cookie)", f_small, MUTED)

# ================= APPLICATION LAYER =================
app_xy = (90, 400, W - 90, 540)
rounded(app_xy, APPLICATION["fill"], APPLICATION["border"], radius=18, width=3)
text_left((app_xy[0] + 24, app_xy[1] + 14), "APPLICATION LAYER", f_layer, APPLICATION["border"])
text_centered((W / 2, app_xy[1] + 72), "Express REST API  \u2014  stateless", f_box, INK)
text_centered((W / 2, app_xy[1] + 100), "Auth (JWT + Argon2id)  \u2192  RBAC middleware  \u2192  controllers", f_sub, MUTED)
text_centered((W / 2, app_xy[3] - 20),
              "The ONLY layer holding credentials for the database, encrypted storage, and the ledger \u2014 the frontend never touches any of them directly",
              f_small, (150, 60, 20))

# ---------- arrows application -> data/storage ----------
left_x = 90 + (W - 180) * 0.15
mid_x = W / 2
right_x = 90 + (W - 180) * 0.85
arrow(left_x, 540, 615)
arrow(mid_x, 540, 615)
arrow(right_x, 540, 615)

text_left((left_x + 14, 566), "Prisma ORM +", f_small, MUTED)
text_left((left_x + 14, 586), "reviewed raw SQL", f_small, MUTED)
text_left((mid_x + 14, 566), "crypto service", f_small, MUTED)
text_left((mid_x + 14, 586), "(SHA-256 + AES-256-GCM)", f_small, MUTED)
text_left((right_x + 14, 566), "LedgerService", f_small, MUTED)
text_left((right_x + 14, 586), "abstraction", f_small, MUTED)

# ================= DATA LAYER =================
data_label_y = 620
text_left((90, data_label_y), "DATA LAYER", f_layer, DATA["border"])
text_left((90, data_label_y + 28), "Two independent components \u2014 relational store and append-only ledger", f_sub, MUTED)

row_y0, row_y1 = 680, 920
gap = 30
col_w = (W - 180 - gap) / 2

# ---- PostgreSQL box ----
pg_xy = (90, row_y0, 90 + col_w, row_y1)
rounded(pg_xy, DATA["fill"], DATA["border"], radius=16, width=3)
text_centered(((pg_xy[0]+pg_xy[2])/2, pg_xy[1] + 32), "PostgreSQL 16", f_box, DATA["border"])
text_centered(((pg_xy[0]+pg_xy[2])/2, pg_xy[1] + 58), "Relational system of record", f_sub, MUTED)
pg_items = [
    "17 normalized tables (3NF+)",
    "PK / FK / CHECK / UNIQUE / DEFAULT",
    "Views, stored functions, triggers",
    "Accessed only via Prisma or the",
    "reviewed prisma/sql/*.sql artifacts",
]
yy = pg_xy[1] + 96
for it in pg_items:
    d.ellipse((pg_xy[0]+30, yy+6, pg_xy[0]+36, yy+12), fill=DATA["border"])
    text_left((pg_xy[0] + 48, yy), it, f_sub, INK)
    yy += 28

# ---- Ledger box ----
lg_xy = (90 + col_w + gap, row_y0, 90 + col_w + gap + col_w, row_y1)
rounded(lg_xy, DATA["fill"], DATA["border"], radius=16, width=3)
text_centered(((lg_xy[0]+lg_xy[2])/2, lg_xy[1] + 32), "Append-Only Custody Ledger", f_box, DATA["border"])
text_centered(((lg_xy[0]+lg_xy[2])/2, lg_xy[1] + 58), "Accessed only via LedgerService", f_sub, MUTED)

# inner swap box
inner_xy = (lg_xy[0] + 24, lg_xy[1] + 84, lg_xy[2] - 24, lg_xy[3] - 20)
rounded(inner_xy, (255, 255, 255), DATA["border"], radius=12, width=2)
half = (inner_xy[2] - inner_xy[0] - 20) / 2
hyp_xy = (inner_xy[0] + 10, inner_xy[1] + 14, inner_xy[0] + 10 + half, inner_xy[3] - 14)
mock_xy = (hyp_xy[2] + 20, inner_xy[1] + 14, inner_xy[2] - 10, inner_xy[3] - 14)
rounded(hyp_xy, (221, 242, 233), (32, 132, 99), radius=10, width=2)
rounded(mock_xy, (241, 246, 255), (99, 132, 206), radius=10, width=2)
text_centered(((hyp_xy[0]+hyp_xy[2])/2, hyp_xy[1] + 24), "Hyperledger Fabric", f_sub, (32, 132, 99))
text_centered(((hyp_xy[0]+hyp_xy[2])/2, hyp_xy[1] + 46), "real network", f_small, MUTED)
text_centered(((hyp_xy[0]+hyp_xy[2])/2, hyp_xy[1] + 72), "(JS chaincode:", f_small, MUTED)
text_centered(((hyp_xy[0]+hyp_xy[2])/2, hyp_xy[1] + 88), "EvidenceContract)", f_small, MUTED)

text_centered(((mock_xy[0]+mock_xy[2])/2, mock_xy[1] + 24), "Deterministic Mock", f_sub, (56, 97, 191))
text_centered(((mock_xy[0]+mock_xy[2])/2, mock_xy[1] + 46), "in-process", f_small, MUTED)
text_centered(((mock_xy[0]+mock_xy[2])/2, mock_xy[1] + 72), "(mirrors the", f_small, MUTED)
text_centered(((mock_xy[0]+mock_xy[2])/2, mock_xy[1] + 88), "chaincode 1:1)", f_small, MUTED)

# swap arrow between them
sw_y = (hyp_xy[1] + hyp_xy[3]) / 2
d.line([(hyp_xy[2]+4, sw_y), (mock_xy[0]-4, sw_y)], fill=(130, 90, 10), width=2)
d.polygon([(hyp_xy[2]+4, sw_y-5), (hyp_xy[2]+4, sw_y+5), (hyp_xy[2]-4, sw_y)], fill=(130, 90, 10))
d.polygon([(mock_xy[0]-4, sw_y-5), (mock_xy[0]-4, sw_y+5), (mock_xy[0]+4, sw_y)], fill=(130, 90, 10))
text_centered(((hyp_xy[2]+mock_xy[0])/2, sw_y - 22), "LEDGER_DRIVER", f_small, (130, 90, 10))

# ---------- Encrypted storage note (not a "data layer" component, attached to App layer) ----------
store_xy = (W/2 - 230, 620, W/2 + 230, 672)
rounded(store_xy, STORAGE["fill"], STORAGE["border"], radius=14, width=2)
text_centered(((store_xy[0]+store_xy[2])/2, store_xy[1]+18), "Encrypted Evidence Storage (filesystem)", f_tag, STORAGE["border"])
text_centered(((store_xy[0]+store_xy[2])/2, store_xy[1]+38), "AES-256-GCM ciphertext blobs \u2014 written by the app layer, never the plaintext", f_small, MUTED)
# connector from mid arrow area up to app layer already drawn; draw a short connector down from app to this box
d.line([(mid_x, 540), (mid_x, 615)], fill=(121,72,166), width=0)  # no-op kept for clarity

# footer
text_centered((W / 2, H - 40), "BlockProof \u2014 Blockchain-Based Digital Crime Reporting, Evidence Integrity & Investigation Management System", f_small, MUTED)
text_centered((W / 2, H - 20), "3rd-year B.Tech CSE \u00b7 DBMS Project", f_small, MUTED)

out_path = os.path.join(os.path.dirname(__file__), "..", "docs", "system-architecture.png")
out_path = os.path.abspath(out_path)
img.save(out_path)
print("Saved", out_path)

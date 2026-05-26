# fix_and_restore.py
import re, json, requests, sys

SQL_FILE   = "database.sql"
CLEAN_SQL  = "database_clean.sql"
PHOTOS_JSON = "photos_backup.json"

BASE_URL   = "https://bus-rollcall-backend.s211009.workers.dev"
AUTH_TOKEN = "your_admin_jwt_token"   # log in via /api/login first

# ── Step 1: Parse SQL and strip photo column ──────────────────────────────────
print("Reading SQL...")
with open(SQL_FILE, "r", encoding="utf-8") as f:
    sql = f.read()

photos = []  # [{uid, badge, name, className, photo}]

def strip_photos_from_insert(match):
    """Replace photo values with NULL, save them to photos[]"""
    full_stmt = match.group(0)
    
    # Find column order from the INSERT header
    header = re.search(r'INSERT.*?INTO\s+students\s*\(([^)]+)\)', full_stmt, re.IGNORECASE)
    if not header:
        return full_stmt
    cols = [c.strip() for c in header.group(1).split(',')]
    
    if 'photo' not in cols:
        return full_stmt
    
    photo_idx = cols.index('photo')
    uid_idx   = cols.index('uid')   if 'uid'   in cols else -1
    badge_idx = cols.index('badge') if 'badge' in cols else -1
    name_idx  = cols.index('name')  if 'name'  in cols else -1
    class_idx = cols.index('class') if 'class' in cols else -1

    def replace_row(row_match):
        raw = row_match.group(1)
        # Simple split on commas outside quotes
        vals = re.split(r",(?=(?:[^']*'[^']*')*[^']*$)", raw)
        if len(vals) <= photo_idx:
            return row_match.group(0)
        
        photo_val = vals[photo_idx].strip().strip("'")
        if photo_val and photo_val.lower() != 'null':
            photos.append({
                "uid":       vals[uid_idx].strip().strip("'")   if uid_idx   >= 0 else "",
                "badge":     vals[badge_idx].strip().strip("'") if badge_idx >= 0 else "",
                "name":      vals[name_idx].strip().strip("'")  if name_idx  >= 0 else "",
                "className": vals[class_idx].strip().strip("'") if class_idx >= 0 else "",
                "photo":     photo_val
            })
            vals[photo_idx] = "NULL"
        return f"({','.join(vals)})"
    
    cleaned = re.sub(r'\(([^)]+)\)', replace_row, full_stmt)
    return cleaned

# Apply to all INSERT INTO students statements
clean_sql = re.sub(
    r"INSERT\s+(?:OR\s+\w+\s+)?INTO\s+students\b[^;]+;",
    strip_photos_from_insert,
    sql,
    flags=re.IGNORECASE | re.DOTALL
)

# Also handle placeholder_photo in config table
placeholder_match = re.search(r"'placeholder_photo'\s*,\s*'(data:[^']+)'", clean_sql)
placeholder_photo = None
if placeholder_match:
    placeholder_photo = placeholder_match.group(1)
    clean_sql = clean_sql.replace(placeholder_match.group(0), "'placeholder_photo', NULL")
    print(f"  Found placeholder photo, stripped.")

with open(CLEAN_SQL, "w", encoding="utf-8") as f:
    f.write(clean_sql)
with open(PHOTOS_JSON, "w", encoding="utf-8") as f:
    json.dump({"students": photos, "placeholder": placeholder_photo}, f)

print(f"✅ Saved {CLEAN_SQL} ({len(photos)} photos extracted → {PHOTOS_JSON})")
print()
print("Now run:")
print(f"  npx wrangler d1 execute bus-rollcall-db --file={CLEAN_SQL} --remote")
print()
input("Press Enter after wrangler upload is done to restore photos via API...")

# ── Step 2: Restore photos via your API ──────────────────────────────────────
headers = {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}

# Restore student photos
print(f"\nRestoring {len(photos)} student photos...")
ok, fail = 0, 0
for p in photos:
    try:
        r = requests.post(f"{BASE_URL}/api/admin/student/photo", headers=headers, json={
            "uid":       p["uid"],
            "badge":     p["badge"],
            "name":      p["name"],
            "className": p["className"],
            "photo":     p["photo"]
        })
        if r.ok: ok += 1
        else:    fail += 1; print(f"  ❌ {p['uid']}: {r.text}")
    except Exception as e:
        fail += 1; print(f"  ❌ {p['uid']}: {e}")

print(f"  ✅ {ok} restored, ❌ {fail} failed")

# Restore placeholder
if placeholder_photo:
    r = requests.post(f"{BASE_URL}/api/admin/config/placeholder", headers=headers,
                      json={"photo": placeholder_photo})
    print(f"  Placeholder: {'✅' if r.ok else '❌'}")

print("\n🎉 Done!")
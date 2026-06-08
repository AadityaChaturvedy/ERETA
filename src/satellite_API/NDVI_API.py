import requests
import os
import sys
from oauthlib.oauth2 import BackendApplicationClient
from requests_oauthlib import OAuth2Session
from supabase import create_client
from collections import Counter
from datetime import date, datetime

# --- CONFIG (env vars override the defaults) ---
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

CLIENT_ID = os.getenv('CLIENT_ID', '')
CLIENT_SECRET = os.getenv('CLIENT_SECRET', '')

TABLE_NAME = "node_data"
TOKEN_URL = "https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token"
STATISTICS_URL = "https://services.sentinel-hub.com/api/v1/statistics"

evalscript = """//VERSION=3
function setup() {
  return {
    input: [{ bands: [ "B04", "B08", "SCL", "dataMask" ] }],
    output: [
      { id: "data", bands: 1 },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(samples) {
  let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  var validNDVIMask = 1;
  if (samples.B08 + samples.B04 == 0) validNDVIMask = 0;
  var noWaterMask = 1;
  if (samples.SCL == 6) noWaterMask = 0;
  return {
    data: [ndvi],
    dataMask: [samples.dataMask * validNDVIMask * noWaterMask]
  };
}
"""

def _first_day_of_month(source_date: date) -> date:
    return date(source_date.year, source_date.month, 1)


def _shift_months(source_date: date, months: int) -> date:
    year = source_date.year + (source_date.month - 1 + months) // 12
    month = (source_date.month - 1 + months) % 12 + 1
    return date(year, month, min(source_date.day, 28))


def _first_day_next_month(source_date: date) -> date:
    base = _first_day_of_month(source_date)
    return _shift_months(base, 1).replace(day=1)


def build_stats_request_last_12_months() -> dict:
    today = date.today()
    # last 12 complete months including current month; use first day of current month - 11 months
    start_month = _shift_months(_first_day_of_month(today), -11)
    end_exclusive = _first_day_next_month(today)
    start_iso = f"{start_month.isoformat()}T00:00:00Z"
    end_iso = f"{end_exclusive.isoformat()}T00:00:00Z"

    return {
        "input": {
            "bounds": {
                "bbox": [
                    80.03910744412505,
                    12.819084444125044,
                    80.04809055587495,
                    12.828067555874954
                ],
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"mosaickingOrder": "leastCC"}
                }
            ]
        },
        "aggregation": {
            "timeRange": {"from": start_iso, "to": end_iso},
            "aggregationInterval": {"of": "P1M"},
            "evalscript": evalscript,
            "resx": 10,
            "resy": 10
        }
    }

def validate_configuration():
    missing = []
    placeholder_used = []

    if not SUPABASE_URL:
        missing.append('SUPABASE_URL')
    if not SUPABASE_KEY:
        missing.append('SUPABASE_KEY')
    if not CLIENT_ID:
        missing.append('CLIENT_ID')
    if not CLIENT_SECRET:
        missing.append('CLIENT_SECRET')

    if SUPABASE_KEY == 'your_supabase_key_here':
        placeholder_used.append('SUPABASE_KEY')
    if CLIENT_ID == 'your_client_id_here':
        placeholder_used.append('CLIENT_ID')
    if CLIENT_SECRET == 'your_client_secret_here':
        placeholder_used.append('CLIENT_SECRET')

    if missing or placeholder_used:
        if missing:
            print(f"Missing required configuration: {', '.join(missing)}")
        if placeholder_used:
            print(f"Replace placeholder values for: {', '.join(placeholder_used)}")
        print("Set environment variables or edit the file with real credentials.")
        print("Expected env vars: SUPABASE_URL, SUPABASE_KEY, CLIENT_ID, CLIENT_SECRET")
        sys.exit(1)

validate_configuration()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_access_token():
    client = BackendApplicationClient(client_id=CLIENT_ID)
    oauth = OAuth2Session(client=client)
    try:
        token = oauth.fetch_token(
            token_url=TOKEN_URL,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET
        )
        return token['access_token']
    except Exception as exc:
        print("OAuth token fetch failed. Check CLIENT_ID/CLIENT_SECRET and TOKEN_URL.")
        print(f"Error: {exc}")
        sys.exit(1)

def fetch_and_store_ndvi(node_name):
    access_token = get_access_token()
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {access_token}',
    }
    stats_request = build_stats_request_last_12_months()
    response = requests.post(STATISTICS_URL, headers=headers, json=stats_request)
    response.raise_for_status()
    result = response.json()

    records = []
    for entry in result.get('data', []):
        stats = entry['outputs']['data']['bands']['B0']['stats']
        interval = entry['interval']['from'][:10]  # 'YYYY-MM-DD'
        record = {
            "node_name": node_name,
            "interval_from": interval,
            "ndvi_mean": stats['mean'],
            "ndvi_min": stats['min'],
            "ndvi_max": stats['max']
        }
        records.append(record)

    # Deduplicate records
    unique_records = {}
    for rec in records:
        key = (rec["node_name"], rec["interval_from"])
        unique_records[key] = rec
    deduped_records = list(unique_records.values())

    # Debug print duplicates check
    pairs = [(r['node_name'], r['interval_from']) for r in deduped_records]
    counted = Counter(pairs)
    dups = [k for k, v in counted.items() if v > 1]
    print("Duplicate keys in records:", dups)

    # Try bulk upsert first
    try:
        if deduped_records:
            # Preferred: upsert with unique key on (node_name, interval_from)
            supabase.table(TABLE_NAME).upsert(
                deduped_records,
                on_conflict="node_name,interval_from"
            ).execute()
            print(f"Upserted {len(deduped_records)} records successfully.")
        else:
            print("No NDVI data fetched to insert.")
    except Exception as e:
        message = str(e)
        if "no unique or exclusion constraint" in message or "42P10" in message:
            print("No unique constraint for on_conflict. Falling back to plain insert (duplicates on re-runs).")
            try:
                supabase.table(TABLE_NAME).insert(deduped_records).execute()
                print(f"Inserted {len(deduped_records)} records successfully.")
            except Exception as insert_e:
                print("Bulk insert failed:", insert_e)
        else:
            print("Bulk upsert failed, trying single record writes:", e)
            for record in deduped_records:
                try:
                    supabase.table(TABLE_NAME).insert(record).execute()
                except Exception as single_e:
                    print(f"Error inserting record {record}: {single_e}")

    # Retention: keep only latest 12 rows per node_name
    try:
        # Fetch all records for node ordered by date desc
        resp = supabase.table(TABLE_NAME).select("interval_from").eq("node_name", node_name).order("interval_from", desc=True).execute()
        rows = getattr(resp, 'data', resp)
        if rows and isinstance(rows, list) and len(rows) > 12:
            cutoff = rows[11]["interval_from"]
            # Delete older than cutoff
            supabase.table(TABLE_NAME).delete().eq("node_name", node_name).lt("interval_from", cutoff).execute()
            print(f"Retention applied: kept latest 12 rows for {node_name}.")
    except Exception as retention_exc:
        print("Retention step failed (non-fatal):", retention_exc)

# Usage example
fetch_and_store_ndvi("Node1")


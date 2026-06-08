import math
from supabase import create_client, Client

import os
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
TABLE_NAME = 'location_table'

def projection_square_bbox(center_lat, center_lon, area_hectare):
    area_km2 = area_hectare * 0.01
    side_km = math.sqrt(area_km2)
    delta_deg = side_km / 111.32
    half_delta = delta_deg / 2

    min_lat = center_lat - half_delta
    max_lat = center_lat + half_delta
    min_lon = center_lon - half_delta
    max_lon = center_lon + half_delta
    return min_lat, max_lat, min_lon, max_lon

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
rows = supabase.table(TABLE_NAME).select("*").execute().data

for row in rows:
    center_lat = row['latitude']
    center_lon = row['longitude']
    area_hectare = row['area']
    min_lat, max_lat, min_lon, max_lon = projection_square_bbox(center_lat, center_lon, area_hectare)

    result = supabase.table(TABLE_NAME).update({
        'min_lat': min_lat,
        'max_lat': max_lat,
        'min_lon': min_lon,
        'max_lon': max_lon
    }).eq('node_name', row['node_name']).execute()
    print(f"Updated node_name={row['node_name']} with bbox: [{min_lat}, {max_lat}, {min_lon}, {max_lon}]")
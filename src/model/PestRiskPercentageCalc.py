import rasterio
import numpy as np
from supabase import create_client, Client

# Supabase credentials (updated)
import os
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY", "")

def calculate_pest_risk_percentage(risk_map_path):
    with rasterio.open(risk_map_path) as src:
        risk_data = src.read(1)
        valid_mask = risk_data != src.nodata if src.nodata is not None else np.ones_like(risk_data, dtype=bool)

        total_valid_pixels = np.sum(valid_mask)
        risk_pixels = np.sum(risk_data[valid_mask] == 1)

        pest_risk_percent = (risk_pixels / total_valid_pixels) * 100
        return pest_risk_percent

def upload_risk_to_supabase(risk_percent, supabase_url, supabase_key):
    supabase: Client = create_client(supabase_url, supabase_key)
    # Insert pest_risk value into the 'node_processed_value' table
    data = { "pest_risk": risk_percent }
    response = supabase.table("node_processed_value").insert(data).execute()
    if hasattr(response, "error") and response.error is not None:
        raise Exception(f"Insert failed: {response.error.message}")
    else:
        print("Insert successful:", response)

# Usage example
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import PEST_PREDICTED_MAP_PATH

risk_image_path = str(PEST_PREDICTED_MAP_PATH)

percent_risk = calculate_pest_risk_percentage(risk_image_path)
print(f"Pest Risk Percentage: {percent_risk:.2f}%")

upload_risk_to_supabase(percent_risk, SUPABASE_URL, SUPABASE_API_KEY)

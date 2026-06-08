import rasterio
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
raw_data = os.path.join(BASE_DIR, "data/raw/")
output_dir = os.path.join(BASE_DIR, "data/processed/")

os.makedirs(output_dir, exist_ok=True)

for filenmae in os.listdir(raw_data):
    file_path = os.path.join(raw_data, filenmae)
    if os.path.isfile(file_path):
        with rasterio.open(file_path) as src:
            nir_band = src.read(8)
            red_band = src.read(4)
            ndvi = (nir_band - red_band) / (nir_band + red_band)
            profile = src.profile
            profile.update(dtype=rasterio.float32, count=1)
            output_path = os.path.join(output_dir, filenmae.replace('.tif', '_ndvi.tif'))
            with rasterio.open(output_path, 'w', **profile) as dst:
                dst.write(ndvi, 1)

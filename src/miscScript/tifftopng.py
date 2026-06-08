import tifffile
import numpy as np
from PIL import Image
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config.settings import RAW_DATA_DIR

# Read TIFF as numpy array
image_array = tifffile.imread(RAW_DATA_DIR / 'satellite' / 'tanjavur' / 'tanjavur_2023-01-05.tiff')

# Scale/clip the band if floating-point or outside 0–255 range
band = image_array[..., 0]  # choose band, e.g., first band

# Normalize float data if max > 1.0, then convert to uint8
if band.dtype in [np.float32, np.float64]:
    # Option 1: If data is [0.0, 1.86], rescale to [0,255]:
    band = band / band.max()  # scale to [0,1]
    band = (band * 255).clip(0,255).astype(np.uint8)
else:
    band = np.clip(band, 0, 255).astype(np.uint8)

# Save as PNG
Image.fromarray(band).save('tanjavur_2023-01-05.png')

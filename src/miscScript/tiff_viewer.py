import rasterio
import matplotlib.pyplot as plt
import numpy as np

def view_sentinel2_tiff(filepath):
    """Optimized viewer for 9-band Sentinel-2 TIFF files"""
    with rasterio.open(filepath) as src:
        data = src.read()
        print(f"Bands: {src.count}, Shape: {data.shape}")
        
        # Sentinel-2 band mapping (your bands): B02,B03,B04,B05,B06,B07,B08,B11,B12
        # For true color: B04(Red), B03(Green), B02(Blue) = bands 3,2,1 in your data
        
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        
        # Show individual bands
        band_names = ['B02(Blue)', 'B03(Green)', 'B04(Red)', 'B05(RedEdge)', 'B06(RedEdge)', 'B07(RedEdge)']
        for i in range(6):
            if i < len(band_names):
                band_data = data[i]
                # Handle zeros and improve contrast
                valid_data = band_data[band_data > 0]
                if len(valid_data) > 0:
                    vmin, vmax = np.percentile(valid_data, [2, 98])
                    im = axes[i//3, i%3].imshow(band_data, cmap='gray', vmin=vmin, vmax=vmax)
                else:
                    im = axes[i//3, i%3].imshow(band_data, cmap='gray')
                axes[i//3, i%3].set_title(band_names[i])
                axes[i//3, i%3].axis('off')
                plt.colorbar(im, ax=axes[i//3, i%3], shrink=0.6)
        
        plt.tight_layout()
        plt.show()
        
        # Separate RGB composite
        rgb_bands = [2, 1, 0]  # B04, B03, B02 (Red, Green, Blue)
        rgb_data = np.stack([data[i] for i in rgb_bands], axis=-1)
        
        # Better normalization
        rgb_valid = rgb_data[rgb_data > 0]
        if len(rgb_valid) > 0:
            p1, p99 = np.percentile(rgb_valid, [1, 99])
            rgb_norm = np.clip((rgb_data - p1) / (p99 - p1), 0, 1)
        else:
            rgb_norm = rgb_data
            
        plt.figure(figsize=(10, 10))
        plt.imshow(rgb_norm)
        plt.title('True Color RGB (B04-B03-B02)')
        plt.axis('off')
        plt.show()

def quick_view_tiff(filepath):
    """Simple quick viewer for any TIFF file"""
    with rasterio.open(filepath) as src:
        data = src.read()
        print(f"Shape: {data.shape}, Bands: {src.count}, Type: {data.dtype}")
        
        if src.count == 1:
            # Single band
            plt.figure(figsize=(10, 8))
            band_data = data[0]
            valid_data = band_data[band_data > 0]
            if len(valid_data) > 0:
                vmin, vmax = np.percentile(valid_data, [2, 98])
                plt.imshow(band_data, cmap='gray', vmin=vmin, vmax=vmax)
            else:
                plt.imshow(band_data, cmap='gray')
            plt.colorbar()
            plt.title('Single Band TIFF')
            plt.show()
            
        elif src.count >= 3:
            # Multi-band - show first 3 as RGB
            rgb_data = np.stack([data[2], data[1], data[0]], axis=-1)
            
            # Safe normalization
            rgb_valid = rgb_data[rgb_data > 0]
            if len(rgb_valid) > 0:
                p1, p99 = np.percentile(rgb_valid, [1, 99])
                if p99 > p1:
                    rgb_norm = np.clip((rgb_data - p1) / (p99 - p1), 0, 1)
                else:
                    rgb_norm = np.clip(rgb_data, 0, 1)
            else:
                rgb_norm = rgb_data
            
            plt.figure(figsize=(10, 8))
            plt.imshow(rgb_norm)
            plt.title('RGB Composite')
            plt.axis('off')
            plt.show()

# Example usage:
if __name__ == "__main__":
    # Replace with your actual file path
    filepath = "/Users/aadityachaturvedy/Developer/your_folder_path/tanjavur_2025-08-20.tiff"
    
    # For Sentinel-2 9-band data (recommended)
    #view_sentinel2_tiff(filepath)
    
    # Or use the simple viewer
    quick_view_tiff(filepath)

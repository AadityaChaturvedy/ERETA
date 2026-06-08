import sys
import os
import numpy as np
import time
from datetime import datetime
import warnings
from tqdm import tqdm
import rasterio
from rasterio.transform import from_bounds
from sentinelhub import (
    BBox, CRS, SHConfig, SentinelHubRequest, MimeType,
    DataCollection, SentinelHubCatalog
)

# --- SENTINELHUB CONFIG ---
config = SHConfig()
config.instance_id = os.getenv("SH_INSTANCE_ID", "")
config.sh_client_id = os.getenv("SH_CLIENT_ID", "")
config.sh_client_secret = os.getenv("SH_CLIENT_SECRET", "")

# --- REGION, SIZE, TIME RANGE ---
bbox_coords = [79, 10.57, 79.047, 10.617]
bbox = BBox(bbox=bbox_coords, crs=CRS.WGS84)
size = (2023, 2058)
time_range = ("2020-05-01", "2025-09-05")

# --- OUTPUT FOLDER PATH ---
drive_folder = os.path.expanduser("/Volumes/SSD/Terra/data/raw")
os.makedirs(drive_folder, exist_ok=True)
print(f"Using folder: {drive_folder}")

evalscript = """
//VERSION=3
function setup() {
    return {
        input: ["B02","B03","B04","B05","B06","B07","B08","B11","B12"],
        output: { bands: 9, sampleType: "FLOAT32" }
    };
}
function evaluatePixel(sample) {
    return [
        2.5 * sample.B02, 2.5 * sample.B03, 2.5 * sample.B04,
        2.5 * sample.B05, 2.5 * sample.B06, 2.5 * sample.B07,
        2.5 * sample.B08, 2.5 * sample.B11, 2.5 * sample.B12
    ];
}
"""

# --- UTILITY FUNCTIONS ---
def log_with_timestamp(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def is_image_complete(filepath, black_pixel_threshold=0.05, min_valid_threshold=0.90):
    try:
        with rasterio.open(filepath) as src:
            data = src.read()
            total_pixels = data.size
            zero_pixels = np.count_nonzero(data == 0)
            valid_pixels = total_pixels - zero_pixels
            black_percentage = zero_pixels / total_pixels
            valid_percentage = valid_pixels / total_pixels
            is_complete = (black_percentage < black_pixel_threshold and valid_percentage > min_valid_threshold)
            print(
                f"Image stats - Valid: {valid_percentage:.1%}, "
                f"Black: {black_percentage:.1%}, Complete: {is_complete}"
            )
            return is_complete
    except Exception as e:
        print(f"Error checking image completeness: {e}")
        return False

def has_sufficient_coverage(filepath, coverage_threshold=0.95):
    try:
        with rasterio.open(filepath) as src:
            data = src.read()
            band_coverages = []
            for i in range(data.shape[0]):
                band_data = data[i]
                total_pixels = band_data.size
                valid_pixels = np.count_nonzero(band_data > 0)
                coverage = valid_pixels / total_pixels
                band_coverages.append(coverage)
            avg_coverage = np.mean(band_coverages)
            min_coverage = np.min(band_coverages)
            sufficient = min_coverage > coverage_threshold
            print(
                f"Coverage - Avg: {avg_coverage:.1%}, "
                f"Min: {min_coverage:.1%}, Sufficient: {sufficient}"
            )
            return sufficient
    except Exception as e:
        print(f"Error checking coverage: {e}")
        return False

def get_file_size_mb(filepath):
    try:
        size_bytes = os.path.getsize(filepath)
        return size_bytes / (1024 * 1024)
    except Exception:
        return 0

def download_all_images():
    log_with_timestamp("Starting Sentinel-2 download process")
    try:
        catalog = SentinelHubCatalog(config=config)
        log_with_timestamp("Searching for images in catalog...")
        search_iterator = catalog.search(
            DataCollection.SENTINEL2_L2A,
            bbox=bbox,
            time=time_range,
            filter="eo:cloud_cover < 1"
        )
        all_items = list(search_iterator)
        all_timestamps = [
            datetime.fromisoformat(item["properties"]["datetime"])
            for item in all_items
        ]
        log_with_timestamp(f"Found {len(all_timestamps)} images with <1% cloud cover")
        print(f"Date range: {time_range[0]} to {time_range[1]}")
        print(f"Bounding box: {bbox_coords}")
        print(f"Image size: {size}")

        transform = from_bounds(
            bbox.min_x, bbox.min_y, bbox.max_x, bbox.max_y, size[0], size[1]
        )

        downloaded_complete = 0
        skipped_incomplete = 0
        skipped_existing = 0
        failed_downloads = 0
        total_size_mb = 0

        for idx, timestamp in enumerate(
            tqdm(all_timestamps, desc="Processing images", ncols=70)
        ):
            date_str = timestamp.strftime("%Y-%m-%d")
            filename = os.path.join(drive_folder, f"tanjavur_{date_str}.tiff")

            print("\n" + "=" * 60)
            log_with_timestamp(f"[{idx + 1}/{len(all_timestamps)}] Processing {date_str}")

            if os.path.exists(filename):
                file_size = get_file_size_mb(filename)
                print(f"File exists ({file_size:.1f} MB). Checking completeness...")
                if is_image_complete(filename) and has_sufficient_coverage(filename):
                    log_with_timestamp(
                        f"Skipping {os.path.basename(filename)}, already complete"
                    )
                    skipped_existing += 1
                    total_size_mb += file_size
                    continue
                else:
                    log_with_timestamp(
                        f"Re-downloading {os.path.basename(filename)}, incomplete image"
                    )
                    os.remove(filename)

            log_with_timestamp(f"Downloading data for {date_str}...")
            request = SentinelHubRequest(
                evalscript=evalscript,
                input_data=[
                    SentinelHubRequest.input_data(
                        data_collection=DataCollection.SENTINEL2_L2A,
                        time_interval=(date_str, date_str),
                    )
                ],
                responses=[SentinelHubRequest.output_response("default", MimeType.TIFF)],
                bbox=bbox,
                size=size,
                config=config,
            )

            downloaded = False
            retry_count = 0
            max_retries = 3

            while not downloaded and retry_count < max_retries:
                try:
                    download_start = time.time()
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        data = request.get_data()[0]

                    data = np.squeeze(data)

                    with rasterio.open(
                        filename,
                        "w",
                        driver="GTiff",
                        height=data.shape[0],
                        width=data.shape[1],
                        count=data.shape[2] if len(data.shape) > 2 else 1,
                        dtype=data.dtype,
                        crs="EPSG:4326",
                        transform=transform,
                    ) as dst:
                        if len(data.shape) > 2:
                            for i in range(data.shape[2]):
                                dst.write(data[:, :, i], i + 1)
                        else:
                            dst.write(data, 1)

                    download_time = time.time() - download_start
                    file_size = get_file_size_mb(filename)
                    total_size_mb += file_size
                    downloaded = True

                    log_with_timestamp(
                        f"Downloaded {os.path.basename(filename)} "
                        f"({file_size:.1f} MB in {download_time:.1f}s)"
                    )

                    print("Verifying image quality...")
                    if is_image_complete(filename) and has_sufficient_coverage(filename):
                        log_with_timestamp(
                            "Image is complete and has good coverage"
                        )
                        downloaded_complete += 1
                    else:
                        log_with_timestamp(
                            "Image is incomplete or has low coverage, but keeping for now"
                        )
                        skipped_incomplete += 1

                    print("Waiting 2 seconds for rate limiting...")
                    time.sleep(2)

                except Exception as e:
                    retry_count += 1
                    log_with_timestamp(
                        f"Error downloading {date_str} "
                        f"(attempt {retry_count}/{max_retries}): {str(e)}"
                    )
                    if retry_count < max_retries:
                        print("Retrying in 5 seconds...")
                        time.sleep(5)
                    else:
                        log_with_timestamp(
                            f"Failed to download {date_str} after {max_retries} attempts"
                        )
                        failed_downloads += 1

        print("\n" + "=" * 60)
        log_with_timestamp("DOWNLOAD SUMMARY")
        print(f"Complete images: {downloaded_complete}")
        print(f"Already existing (skipped): {skipped_existing}")
        print(f"Incomplete/low coverage: {skipped_incomplete}")
        print(f"Failed downloads: {failed_downloads}")
        print(f"Total processed: {len(all_timestamps)}")
        print(
            f"Total data size: {total_size_mb:.1f} MB "
            f"({total_size_mb / 1024:.2f} GB)"
        )
        print(f"Saved to: {drive_folder}")
        success_rate = (
            ((downloaded_complete + skipped_existing) / len(all_timestamps)) * 100
            if all_timestamps
            else 0
        )
        print(f"Success rate: {success_rate:.1f}%")
        log_with_timestamp("Download process completed")
    except Exception as e:
        log_with_timestamp(f"CRITICAL ERROR: {str(e)}")
        import traceback

        print(f"Full traceback:\n{traceback.format_exc()}")
    finally:
        end_time = datetime.now()
        log_with_timestamp(f"Process ended at {end_time}")

if __name__ == "__main__":
    download_all_images()
import os
import pandas as pd
import glob
from datetime import date
from tqdm import tqdm
import numpy as np

# --- Configuration ---
DATA_DIR = '../sickle_dev/data'
SATELLITE = 'S2'
CSV_PATH = os.path.join(DATA_DIR, 'sickle_dataset_tabular.csv')
CLEANED_CSV_PATH = os.path.join(DATA_DIR, 'sickle_dataset_tabular_cleaned.csv')

mon_to_int = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
}

def get_data_index(file_path, start_date):
    """Calculates the day index of an image file based on its name."""
    try:
        base_name = os.path.basename(file_path)
        if SATELLITE == "S2":
            if base_name[0] == "T": date_str = base_name.split("_")[1][:8]
            else: date_str = base_name.split("_")[0][:8]
        elif SATELLITE == "S1": date_str = base_name.split("_")[4][:8]
        else: date_str = base_name.split("_")[2][:8]
        index_date = date(int(date_str[:4]), int(date_str[4:6]), int(date_str[6:]))
        return (index_date - start_date).days + 1
    except Exception:
        return -1

def check_uid_is_valid(uid, df_row):
    """
    Checks if a given UID has at least one valid image file, including a quality check.
    """
    season = df_row["STANDARD_SEASON"].values[0]
    year = df_row["YEAR"].values[0]
    start_date = date(int(year), mon_to_int[season.split("-")[0]], 1)
    sowing_day = df_row["SOWING_DAY"].values[0]
    harvesting_day = df_row["HARVESTING_DAY"].values[0]

    path = f"{DATA_DIR}/images/{SATELLITE}/npy/{uid}/*.npz"
    files = glob.glob(path)
    if not files: return False

    valid_image_count = 0
    for file in files:
        index = get_data_index(file, start_date)
        if sowing_day <= index <= harvesting_day:
            try:
                with np.load(file) as data_file:
                    # Check the first band for its percentage of zero pixels
                    first_band = data_file[data_file.files[0]]
                    zero_percentage = np.count_nonzero(first_band == 0) / first_band.size
                    if zero_percentage < 0.25:
                        valid_image_count += 1
                        break 
            except Exception:
                continue # Skip corrupted files

    return valid_image_count > 0

def main():
    """Main function to run the dataset check."""
    print(f"Loading dataset definition from: {CSV_PATH}")
    try:
        df = pd.read_csv(CSV_PATH)
    except FileNotFoundError:
        print(f"Error: The file '{CSV_PATH}' was not found.")
        print("Please make sure the DATA_DIR variable is correct.")
        return

    df.dropna(subset=['UNIQUE_ID'], inplace=True)
    df['UNIQUE_ID'] = df['UNIQUE_ID'].astype(int)

    all_uids = df['UNIQUE_ID'].tolist()
    bad_uids = []

    print(f"Checking {len(all_uids)} samples for data validity (with quality check)...")
    for uid in tqdm(all_uids):
        df_row = df[df.UNIQUE_ID == uid]
        if not check_uid_is_valid(uid, df_row):
            bad_uids.append(uid)

    if not bad_uids:
        print("\nAll UIDs are valid. Dataset is clean!")
        df.to_csv(CLEANED_CSV_PATH, index=False)
        print(f"Created a clean copy at: {CLEANED_CSV_PATH}")
        return

    print(f"\nFound {len(bad_uids)} problematic UIDs that have no valid images.")
    print("These UIDs will be removed:")
    print(bad_uids)

    cleaned_df = df[~df['UNIQUE_ID'].isin(bad_uids)]
    cleaned_df.to_csv(CLEANED_CSV_PATH, index=False)
    print(f"\nSuccessfully created a cleaned data file at: {CLEANED_CSV_PATH}")

if __name__ == "__main__":
    main()
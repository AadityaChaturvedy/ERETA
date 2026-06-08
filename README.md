# ERETA

A comprehensive system for satellite data processing, predictive pest risk analysis, hardware integration, and an interactive web dashboard.

*Note: The core development of this project was conducted between August 2025 and November 2025.*

## Project Structure

The repository is organized into distinct modules:

- **`datasetPreProcessing/`** - Data preparation scripts including georeferencing, masking anomalies, and label generation.
- **`hardware/`** - Ground station and sensor module code for ESP-32 and Arduino UNO.
- **`miscScript/`** - Miscellaneous utility scripts for visualizations, converting datasets to NDVI, and time-series generation.
- **`model/`** - Deep learning models (LSTM) and evaluation scripts for calculating and forecasting predictive pest risk.
- **`satellite_API/`** - Scripts for fetching and interacting with satellite APIs (NDVI, Lat/Lon).
- **`website/`** - Next.js frontend web application for the interactive dashboard and reporting interfaces. Includes Tailwind CSS and Shadcn UI components.

## System Overview & Visuals

Here is a visual overview of how ERETA integrates remote sensing, ML models, and hardware infrastructure.

### Remote Sensing & Spatial Data
Satellite API data is processed into mapped grids and 3D visual representations.
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="docs/assets/Satellite_Grid.jpeg" alt="Satellite Grid" width="45%" >
  <img src="docs/assets/NDVI_Anomaly_gRID.jpeg" alt="NDVI Anomaly Grid" width="45%" >
  <img src="docs/assets/NDWI_Grid_Info.jpeg" alt="NDWI Grid" width="45%" >
  <img src="docs/assets/3D_NDVI.png" alt="3D NDVI Visualization" width="45%" >
</div>

<br />

### Predictive Pest Modeling
Using LSTM models, we forecast pest risk indexes based on historical sequence data.
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="docs/assets/NDVI_LSTM_Pest.png" alt="NDVI LSTM Pest Predictions" width="45%" >
  <img src="docs/assets/Pest_Risk.png" alt="Pest Risk Analysis" width="45%" >
</div>

<br />

### Hardware Ground Nodes
Custom ESP-32 & Arduino-based ground modules validate the satellite models with in-situ data.
<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="docs/assets/Ground_Node_Prototype_3D.png" alt="3D Prototype" width="30%" >
  <img src="docs/assets/Ground_Node_2D_Schematic.png" alt="2D Schematic" width="30%" >
  <img src="docs/assets/Ground_Module.jpeg" alt="Ground Module" width="30%" >
</div>

*Detailed schematic and manufacturing files for the Ground Station:* [📝 PCB Ground Module Diagram (PDF)](docs/assets/PCB_PCB_Ground_Module_2025-09-07.pdf)

## Getting Started

### Prerequisites

- **Python 3.8+** (for models and data processing)
- **Node.js 18+ & pnpm** (for the web application)
- **Arduino IDE / PlatformIO** (for hardware scripts)

### Setup

**1. Environment Variables**
Create a `.env` file in the root directory (for Python scripts) and another `.env.local` inside the `website/` directory (for Next.js) with the necessary API keys. Do not commit these files.

**Root `.env` example:**
```env
SH_INSTANCE_ID=your_sentinel_hub_instance_id
SH_CLIENT_ID=your_sentinel_hub_client_id
SH_CLIENT_SECRET=your_sentinel_hub_client_secret
CLIENT_ID=your_oauth_client_id
CLIENT_SECRET=your_oauth_client_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_API_KEY=your_supabase_api_key
```

**`website/.env.local` example:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**2. Data Processing & Machine Learning Models (Python)**

It is recommended to use a virtual environment:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**3. Web Dashboard (Next.js)**

Navigate to the `website` directory and run the frontend:
```bash
cd website
pnpm install
pnpm run dev
```
The website will be available at `http://localhost:3000`.

## Contributing
Make sure to not commit large dataset `.tiff` or local `.env` files. Ensure you run formatters before submitting a PR.

## Acknowledgements

This project would not have been possible without the immense dedication, expertise, and collaborative spirit of a brilliant team. I am deeply grateful to the following individuals for their incredible contributions:

- **Anusheel Singh** – For his exceptional engineering work on the ERETA Ground Module, the intricate PCB design, and the architecture of the ERETA Offline module. Your hardware expertise truly brought the physical aspect of this project to life.
- **Arnav Bharadwaj** – For his fantastic work building out the ERETA website platform. Your focus on creating a seamless and interactive front-end dashboard made our complex data elegant and accessible.
- **Swaroop Bhattacharya** – For his meticulous work on the grid-based satellite calculations and his critical role in further advancing the predictive pest risk development. Your analytical precision was an absolute game-changer.
- **Rishabh Sanghai** – For his multifaceted contributions across the board, from driving the satellite-based calculations to being instrumental in the development of both the web platform and the core Machine Learning models.
- **Sanskruti Pravin** – For her foundational work in compiling the initial datasets and her invaluable guidance with the Satellite API integrations. Your early efforts in data gathering were essential in kickstarting the entire project.

Thank you all for the long hours, brilliant ideas, and relentless problem-solving. True innovation is a team effort!

## Awards & Recognition 🏆

- **3rd Place at Code Merge Hackathon** *(organized by Taiwan-India Big Data Analytics Lab & SRMIST)*
  Recognized for tackling AI-powered crop health monitoring by fusing satellite multispectral imagery, low-cost sensors, and weather data into unified ML pipelines (LSTM) with real-time stress/pest alerts.
  
- **3rd Place at Hack and Beyond 2025** *(organized by Department of Electronics and Communication Engineering & SRMIST)*
  Recognized for building our IoT-based Smart Greenhouse hardware that monitors soil, climate, and nutrients in real-time while automating irrigation controls.

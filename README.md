# Weight & Blood Pressure Recorder

A simple, responsive web application to record daily weight and blood pressure measurements. Designed to run on a local home server (Windows PC) and be accessed via mobile devices on the same Wi-Fi network.

## Features

- **Smart Input**:
  - Automatically fetches the latest entry.
  - Suggests new values:
    - Weight: ±1.0kg range in 0.2kg steps.
    - Blood Pressure: ±10 range in 2-step increments.
- **History Visualization**:
  - Interactive line chart showing trends for Weight, Systolic, and Diastolic BP.
  - Filter by Last 7, 30, or 90 days.
- **Mobile Friendly**:
  - Responsive layout optimized for phone screens.

## Requirements

- Python 3.9+
- Windows (for the provided batch script)

## Installation

1.  Clone or download this repository.
2.  Run the setup command (first time only):
    ```bash
    python -m venv venv
    venv\Scripts\pip install -r backend/requirements.txt
    ```

## How to Run

1.  Double-click **`run_app.bat`**.
2.  The application will start at `http://0.0.0.0:8082`.
3.  **Access from PC**: Open [http://localhost:8082](http://localhost:8082)
4.  **Access from Mobile**:
    - Connect your phone to the same Wi-Fi.
    - Find your PC's local IP address (e.g., `192.168.1.15`).
    - Open `http://192.168.1.15:8082` in your phone's browser.

> **Note**: You may need to allow the port (8082) through your Windows Firewall if you cannot connect from other devices.

## Tech Stack

- **Backend**: FastAPI (Python), SQLite
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Libraries**: Chart.js (Charts), Google Fonts (Inter)

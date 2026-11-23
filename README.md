# 🌍 ThermoScope – Urban Climate Intelligence

### Understanding the Relationship Between El Niño, Urban Temperature, and Electricity Consumption Using Machine Learning

ThermoScope is a machine learning-based web application designed to analyse the relationship between El Niño–Southern Oscillation (ENSO) climate patterns, urban temperature, and electricity consumption.

The platform uses data analysis, machine learning algorithms, and interactive visualisations to identify climate patterns, discover clusters, classify cooling-demand levels, and present meaningful insights through an interactive dashboard.

---

## 📌 Project Overview

Climate patterns such as El Niño and La Niña influence global weather conditions and can be associated with changes in regional temperature and energy demand.

ThermoScope aims to explore these relationships using historical climate and electricity consumption data from multiple cities.

The application integrates three machine learning algorithms:

- **K-Means Clustering:** Groups observations based on similarities in their features.
- **DBSCAN Clustering:** Identifies density-based clusters and unusual observations.
- **C4.5 Decision Tree:** Classifies observations into cooling-demand categories and helps interpret the factors influencing those classifications.

The results are presented through a web-based dashboard containing visualisations, model comparisons, maps, and prediction features.

## 🎯 Objectives

- Analyse the relationship between ENSO indicators and urban temperature.
- Study patterns in electricity consumption across different cities.
- Identify similarities and differences in climate observations.
- Discover unusual patterns using density-based clustering.
- Classify cooling-demand levels using a decision tree.
- Compare machine learning models through an interactive dashboard.
- Present climate-related insights using charts and visualisations.

## ✨ Key Features

- **Interactive Dashboard:** Displays important climate and electricity consumption information.
- **Climate Data Analysis:** Explores temperature, electricity consumption, and ENSO indicators.
- **K-Means Clustering:** Groups similar climate observations.
- **DBSCAN Clustering:** Detects dense groups and noise observations.
- **C4.5 Classification:** Classifies cooling-demand levels.
- **Model Comparison:** Provides a platform to compare the implemented machine learning models.
- **Prediction Module:** Allows users to explore model predictions using input features.
- **Data Visualisation:** Displays patterns through charts, graphs, and maps.
- **Backend API:** Connects the frontend with data-processing and machine learning functionality.

## 🤖 Machine Learning Algorithms

### 1. K-Means Clustering

K-Means is an unsupervised machine learning algorithm that divides data into a predefined number of clusters.

In ThermoScope, it is used to group climate observations based on similarities in selected features.

### 2. DBSCAN Clustering

DBSCAN stands for Density-Based Spatial Clustering of Applications with Noise.

It identifies clusters based on the density of data points and can mark observations that do not belong to any sufficiently dense cluster as noise.

In ThermoScope, it is used to discover density-based patterns and unusual observations.

### 3. C4.5 Decision Tree

C4.5 is a supervised machine learning classification algorithm based on decision trees.

It uses gain ratio to select splitting attributes and supports continuous and categorical features.

In ThermoScope, it is used to classify observations into cooling-demand categories and understand the decision-making process through tree-based rules.

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Backend | Python, FastAPI |
| Machine Learning | Scikit-learn, Custom C4.5 implementation |
| Data Processing | Pandas, NumPy |
| Data Visualisation | Plotly, Matplotlib |
| API Communication | REST API |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Version Control | Git, GitHub |

## 🏗️ System Architecture

ThermoScope follows a frontend-backend architecture.

```text
              USER
                |
                v
       REACT FRONTEND
        (TypeScript)
                |
                v
          FASTAPI
           BACKEND
                |
        +-------+-------+
        |       |       |
        v       v       v
      K-MEANS  DBSCAN  C4.5
        |       |       |
        +-------+-------+
                |
                v
       DATA PROCESSING
        AND ANALYSIS
                |
                v
       RESULTS AND API
           RESPONSE
                |
                v
       INTERACTIVE
         DASHBOARD
```

## 📂 Project Structure

```text
thermoscope_full_project/
│
├── backend/
│   ├── app/
│   │   └── classification/
│   │       └── c45.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
└── README.md
```

*Note: This is a simplified representation. Additional files and folders may be present in the project.*

## ⚙️ Installation and Setup

Follow these steps to run ThermoScope locally.

### Prerequisites

Install the following:

- Python 3.10 or compatible version
- Node.js and npm
- Visual Studio Code
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/siddhus-droid/el-nino-cooling.git
```

Navigate into the project:

```bash
cd el-nino-cooling
```

### 2. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Backend URL:

`http://127.0.0.1:8001`

API documentation:

`http://127.0.0.1:8001/docs`

### 3. Frontend Setup

Open a second terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Open the application:

`http://127.0.0.1:5174`

**Important:** Keep both backend and frontend terminals running while using the application. Ensure the frontend API configuration points to the local backend URL when running locally.

## 📊 Dataset and Analysis

The project uses climate and electricity consumption data containing features such as:

- Date
- City
- Latitude and Longitude
- Temperature
- State Electricity Consumption
- Oceanic Niño Index (ONI)

Additional features such as Month, Year, ENSO Phase, and Cooling Demand Level are used in the analysis and modelling.

The dataset is processed before applying machine learning algorithms. Data preprocessing and exploratory data analysis help identify patterns, relationships, and variations in the observations.

*Note: ONI is an indicator of ENSO conditions. Its relationship with local temperature and electricity consumption is analysed rather than assumed to establish direct causation.*

## 🌐 Deployment

The application uses separate deployment services for its frontend and backend.

| Component | Platform | Link |
|---|---|---|
| Frontend | Vercel | el-nino-cooling.vercel.app |
| Backend | Render | https://el-nino-cooling.onrender.com/ |
| Source Code | GitHub | https://github.com/siddhus-droid/el-nino-cooling |

## 🔮 Future Scope

- Integrate real-time climate and weather data.
- Include a larger dataset covering more cities and years.
- Improve model performance through feature engineering and hyperparameter tuning.
- Explore time-series forecasting for temperature and electricity demand.
- Add more interactive climate visualisations.
- Develop advanced climate-risk analysis features.
- Integrate additional machine learning models for comparison.

## ⚠️ Limitations

- The quality of analysis depends on dataset coverage and accuracy.
- Historical relationships do not guarantee future climate behaviour.
- ENSO indicators alone cannot explain all local temperature variations.
- Electricity consumption is influenced by several factors beyond temperature.
- Clustering and classification results depend on feature selection and model parameters.

## 👨‍💻 Project Information

**Project Name:** ThermoScope – Urban Climate Intelligence

**Domain:** Artificial Intelligence and Data Science

**Project Type:** Machine Learning and Web Application

**Algorithms:** K-Means, DBSCAN, C4.5 Decision Tree

**Frontend:** React and TypeScript

**Backend:** Python and FastAPI

## 📜 Disclaimer

ThermoScope is an academic machine learning project developed for educational and analytical purposes. The results represent patterns identified in the available dataset and should not be interpreted as definitive scientific proof that El Niño causes specific changes in local temperature or electricity consumption.

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub!

---

**ThermoScope – Turning Climate Data into Urban Intelligence.** 🌍

# Livestock Epidemic Tracker

## Project Overview

The Livestock Epidemic Tracker is a full-stack web application designed to help the public and stakeholders understand the spread of livestock diseases across the United States. The application provides a centralized platform for visualizing outbreak data, managing user accounts, and supporting future real-time disease reporting integrations.

### Vision
To be the best tool for the public to understand the spread of livestock epidemics.

### Mission
To enable a world where the United States food supply is secure from epidemics, allowing farmers to safely provide food for all Americans.

---

## Technology Stack

### Frontend
- React – Component-based user interface framework
- Axios – HTTP client for frontend-to-backend communication
- Leaflet / React-Leaflet – Interactive map visualization
- Recharts – Data visualization and charting
- JavaScript, HTML, CSS

Frontend source code is located in:
/frontend

---

### Backend
- PHP – Server-side logic and API endpoints
- REST-style API architecture
- PHP mail() – Email functionality for account workflows

Backend source code is located in:
/backend/src

Key backend files:
- api.php – API routing and request handling
- auth.php – Authentication logic
- create-account.php – User registration
- profile.php – User profile management
- send_mail.php – Email handling
- db.php – Database connection
- config.php – Application configuration
- response.php – Standardized API responses

---

### Database
- MySQL
- SQL schema provided for database setup

Database schema file:
/database/schema.sql

---

## Overall System Architecture

The application follows a client–server architecture:

[ React Frontend ]
|
|  HTTP / JSON (Axios)
v
[ PHP Backend API ]
|
|  SQL Queries
v
[ MySQL Database ]

---

### Architecture Breakdown

1. Frontend (React)
    - Handles user interaction and UI rendering
    - Displays maps, charts, and epidemic data
    - Sends requests to the backend using Axios

2. Backend (PHP API)
    - Processes frontend requests
    - Handles authentication and business logic
    - Communicates with the database
    - Returns standardized JSON responses

3. Database (MySQL)
    - Stores user accounts and application data
    - Designed for future expansion of epidemic data sources

---

## How the Application Works

1. User Interaction
    - Users access the application through the React frontend.
    - UI components render pages, maps, and charts.

2. API Communication
    - Frontend actions trigger Axios requests.
    - Requests are sent to PHP API endpoints.

3. Backend Processing
    - Requests are validated and processed.
    - Authentication and authorization checks are performed.
    - Database queries are executed as needed.

4. Data Storage
    - User and application data are stored in MySQL.
    - Schema definitions ensure structured and consistent storage.

5. Data Visualization
    - Epidemic data is displayed using interactive maps and charts.
    - Geographic spread and trends are visually represented.

---

## Project Structure

s26-jnswl-corp/
│
├── backend/
│   ├── public/
│   ├── sql/
│   └── src/
│
├── frontend/
│   ├── public/
│   └── src/
│
├── database/
│   └── schema.sql
│
├── package.json
└── README.md

---

## Installation & Setup (High-Level)

1. Database Setup
    - Import database/schema.sql into a MySQL database.

2. Backend Setup
    - Deploy the PHP backend to a web server (e.g., Apache).
    - Configure database credentials in config.php.

3. Frontend Setup
    - Install dependencies:
      npm install
    - Run the development server:
      npm start

---

## Future Enhancements

- Integration with real-time livestock diseases (e.g., USDA, WOAH)
- Role-based access control
- Admin dashboards for outbreak management
- Advanced analytics and forecasting
- Enhanced map filtering and regional overlays

---

## Authors / Team

Developed as part of a software engineering project focused on public health, agriculture, and data transparency.
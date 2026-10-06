SenseGen – One Photo. Automatic Action.
See it. Snap it. Solved.

SenseGen is an AI-powered civic reporting platform that helps citizens report public issues using a photo or video.

The system uses YOLO11 to identify civic issues, captures the user's location, determines priority, routes the report to the appropriate department, and allows authorities to manage and resolve the issue.

AICW 2.0 Project
Artificial Intelligence Career for Women Program
Team
- P Naga Jyothi
- K Hima Sri
- B Sai Mani Deepthi
Guide
Abdul Aziz Md

Institution
Kakinada Institute of Engineering and Technology for Women (KIET-W)
Department
B.Tech – CSE (Artificial Intelligence & Data Science)
Problem Statement
Civic issues such as garbage overflow, water leakage, road damage and streetlight failures are often reported manually.

Common problems include:
- Delayed reporting
- Incorrect department routing
- Lack of location information
- Difficulty tracking complaints
- Lack of clear resolution evidence
SenseGen aims to simplify this process using AI-based image detection and automated civic issue management.

Proposed Solution
SenseGen follows a simple workflow:
Citizen → Photo/Video → YOLO11 Detection → Location → Priority → Department Routing → Authority → Admin Action → Resolution Proof → User Notification → Track
A citizen can submit an image or video of a civic issue. The system identifies the issue, collects location information, assigns priority and routes the report to the relevant department.

Supported Civic Issues
SenseGen currently supports six civic issue categories:
1. Water Leakage
2. Garbage Overflow
3. Fire Accident
4. Fallen Tree
5. Road Damage
6. Streetlight Failure

Key Features
Citizen Reporting
- Upload or capture issue evidence
- Category-based reporting
- AI Auto-Detect option
- GPS and location capture
- Duplicate report detection
- Category-image validation
AI Detection
- YOLO11-based civic issue detection
- Confidence score
- Automatic category identification
- Six supported issue classes
Priority & Routing
- Priority classification
- Automatic department assignment
- Authority notification
- Location-based report information
Admin Management
- Admin authentication
- View reported incidents
- Priority filtering
- Inspect incidents
- Accept reports
- Start work
- Upload resolution proof
- AI-based resolution verification
- Mark problems as solved
User Tracking
- View submitted reports
- Track report status
- Receive notifications
- View report timeline
- View submitted evidence
- View resolution proof after the issue is solved
Email Notification
Authority emails include:
- Incident ID
- Issue category
- Priority
- Location
- GPS coordinates
- Report details
- Original citizen evidence image


System Architecture
                CITIZEN
                   |
            Photo / Video
                   |
                   v
          React Frontend
                   |
                   v
        Node.js / Express API
                   |
          +--------+--------+
          |                 |
          v                 v
       YOLO11          GPS / Location
          |                 |
          +--------+--------+
                   |
                   v
          Issue + Priority
                   |
                   v
        Department Routing
                   |
          +--------+--------+
          |                 |
          v                 v
      Authority          Database
       Email
          |
          v
    Admin Dashboard
          |
   Accept / Start Work
          |
          v
   Resolution Evidence
          |
          v
    AI Verification
          |
          v
    Problem Solved
          |
          v
     User Notification
          |
          v
       Track Report


Technology Stack
Frontend
- React
- HTML
- CSS
- JavaScript
Backend
- Node.js
- Express.js
- REST APIs
AI Service
- Python
- Flask
- YOLO11
- Ultralytics
- Computer Vision
Database
- SQLite
Communication
- Resend Email API
Location Services
- GPS
- Reverse Geocoding
- OpenStreetMap / Nominatim


YOLO11 Model
SenseGen uses a custom-trained YOLO11n model for detecting six civic issue categories.
Model Configuration
- Model: YOLO11n
- Image Size: 320 × 320
- Batch Size: 16
- Training Epochs: 15
- Device: CPU
Dataset
- Total Images: 4,218
- Training Images: 3,071
- Validation Images: 662
- Test Images: 485
Supported Classes
0 → Water Leakage
1 → Garbage Overflow
2 → Fire Accident
3 → Fallen Tree
4 → Road Damage
5 → Streetlight Failure
Test Results
Metric	Result
Precision	65.0%
Recall	59.8%
mAP@50	64.1%
mAP@50–95	28.6%


These results are from the held-out test set.
Report Workflow
1. Citizen selects an issue or uses AI Auto-Detect
                     ↓
2. Uploads photo/video
                     ↓
3. YOLO11 detects the civic issue
                     ↓
4. GPS and location are captured
                     ↓
5. Priority is determined
                     ↓
6. Department is assigned
                     ↓
7. Authority receives email
                     ↓
8. Admin inspects the report
                     ↓
9. Admin accepts the report
                     ↓
10. Work starts
                     ↓
11. Admin uploads resolution proof
                     ↓
12. AI verifies the resolution
                     ↓
13. Problem is marked as solved
                     ↓
14. User receives notification
                     ↓
15. User tracks the complete report
Category Validation
When a user manually selects a category, the uploaded image is validated using the existing YOLO11 model.
For example:
Selected Category: Garbage Overflow
              ↓
       Upload Image
              ↓
          YOLO11
              ↓
     Detected Category
              ↓
     Garbage Overflow
              ↓
       Report Accepted
If the detected category does not match the selected category, the image is rejected and the user can upload another image.
With AI Auto-Detect, the user does not need to select a category manually. YOLO11 identifies the supported civic issue automatically.
Duplicate Detection
SenseGen checks newly submitted citizen evidence against existing reports to reduce repeated submissions.
New Image Upload
       ↓
Duplicate Check
       ↓
   +---+---+
   |       |
Duplicate  New Image
   |       |
   ↓       ↓
Reject   Continue
Report   Submission
If the same image has already been submitted:
- No new incident is created
- No duplicate authority email is sent
- The existing report remains unchanged
- The user is informed that the image is already reported
The duplicate check is based on the submitted evidence image rather than only the filename.
Priority & Department Routing
SenseGen assigns a priority level to incidents and routes them to the appropriate department.

Example departments include:
- Municipal Sanitation Department
- Water Supply Department
- Fire & Emergency Services
- Municipal / Parks & Horticulture Department
- Roads / Municipal Engineering Department
- Streetlight / Electrical Department
The assigned priority and department are stored with the incident and used throughout the report lifecycle.

Location Processing
When a report is submitted, SenseGen uses the available GPS/location information to associate the incident with a real-world location.
The system can provide:
- Latitude
- Longitude
- Address
- Location on map
Location information is included in the authority notification and incident tracking flow.
Authority Email
After a valid report is created, the relevant authority receives an email containing the important incident information.


The email can include:
- Incident ID
- Detected category
- Confidence
- Priority
- Severity
- Address
- Latitude
- Longitude
- Department
- Report details
- Original citizen-submitted evidence image
The original evidence image is kept associated with the specific incident.


Admin Workflow
New Report
    ↓
Inspect Incident
    ↓
Accept Report
    ↓
Start Work
    ↓
Upload Resolution Proof
    ↓
Add Resolution Description
    ↓
AI Verification
    ↓
Problem Solved
Accepting a report does not mean the problem is solved.
Starting work does not mean the problem is solved.
The report is marked as Problem Solved only after the required resolution proof and description are submitted and verified through the existing workflow.
User Tracking
Users can track their submitted incidents from the User Dashboard.
The tracking view provides information such as:
- Incident ID
- Category
- Location
- Department
- Current status
- Timeline
- Submitted evidence
- Resolution description
- Resolution proof
- AI verification result


Admin Dashboard
The Admin Dashboard allows authorized administrators to manage civic reports.
Main functions include:
- View incidents
- Priority filtering
- Inspect incident
- View evidence
- Accept report
- Start work
- Upload resolution proof
- Verify resolution
- Mark problem solved
Priority Filter
The Admin Dashboard supports filtering reports by priority:
ALL | P1 | P2 | P3 | P4
Selecting a priority displays reports belonging to that priority level.
Notifications
SenseGen provides status notifications during the report lifecycle.
Examples include:
Your report SG-XXXX has been accepted.

Work has started on your reported issue (SG-XXXX).

Your problem SG-XXXX has been solved.
Users can view their notifications from the User Dashboard.
Project Structure
```
SENSEGEN/
│
├── frontend/                     # React + Vite frontend web client
│   ├── src/                      # Dashboard, reporting & tracking components
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js
│
├── backend/                      # Node.js + Express backend server
│   ├── database/                 # SQLite database initialization (db.js)
│   ├── uploads/                  # Incident evidence uploads folder
│   ├── server.js                 # API server, email notification & routing logic
│   ├── package.json              # Backend dependencies
│   └── .env.example              # Environment variables template
│
├── ai_service/                   # Python Flask AI detection service
│   ├── model_weights/
│   │   └── best.pt               # Trained YOLO11n model weights (5.18 MB)
│   ├── server_ai.py              # Flask server for YOLO detection & verification
│   └── requirements.txt          # Python dependencies
│
├── runs/                         # YOLO11 model training runs
│   └── sensegen_v3/
│       └── yolo11n_v3/
│           └── weights/
│               └── best.pt       # Trained YOLO11 model weights & training metrics
│
├── SenseGen_Final_Dataset_v3/
│   └── data.yaml                 # YOLO dataset class configuration metadata
│
├── .env.example                  # Root environment variables template
├── .gitignore                    # Git ignore file for secrets & dependencies
└── README.md                     # Documentation
```

Dataset & Trained Model Availability
- **Trained Model Location**: The primary YOLO11 model weights are located at `ai_service/model_weights/best.pt` and `runs/sensegen_v3/yolo11n_v3/weights/best.pt` (approx. 5.18 MB each).
- **Dataset Information**: The raw training images (~8,000 files) are excluded from the repository to keep git lightweight. The dataset configuration file `SenseGen_Final_Dataset_v3/data.yaml` and `data.yaml` are included for reproducibility.

How to Run
1. Start the Backend
```bash
cd backend
npm install
cp .env.example .env     # Update environment values if needed
npm run dev
```
Backend API runs at: http://localhost:5000

2. Start the AI Service
```bash
cd ai_service
pip install -r requirements.txt
python server_ai.py
```
AI Service runs at: http://localhost:5001

3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the local URL displayed by Vite (http://localhost:3000).

Environment Variables
Copy `.env.example` to `.env` in the `backend` directory before running:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
AI_SERVICE_URL=http://127.0.0.1:5001
RESEND_API_KEY=your_resend_api_key_here
NOTIFICATION_EMAIL=your_notification_email@example.com
FRONTEND_URL=http://localhost:3000
```
> **Security Notice**: Do not upload real API keys, passwords, or secrets to GitHub. Make sure `.env` is listed in `.gitignore`.
Security
- Authentication is used for protected dashboards.
- Passwords should be stored securely using the existing authentication implementation.
- API keys and credentials must be stored in environment variables.
- Sensitive configuration files should not be committed to GitHub.
Project Status
Status: Local College Project
SenseGen is currently developed and demonstrated as a local academic project.
The system is intended as a prototype demonstrating AI-based civic issue detection, reporting, routing, authority management and resolution tracking.
Limitations
- Detection performance depends on image quality and dataset coverage.
- GPS/location availability depends on the user's device and browser permissions.
- Some civic issues may require clearer images for reliable detection.
- The current model supports six civic issue categories.
- The current system is developed as a local academic prototype.


Future Scope
- Mobile application
- More civic issue categories
- Larger and more diverse datasets
- Improved detection performance
- Advanced duplicate detection
- Real-time authority alerts
- Authority analytics and dashboards
- Improved location intelligence
- City-wide deployment
- Integration with additional civic services


References
- Ultralytics YOLO11 Documentation
- Ultralytics YOLO Architecture Guide
- Roboflow Universe Datasets
- OpenStreetMap / Nominatim
- Resend API Documentation


Team
P Naga Jyothi
B.Tech – CSE (Artificial Intelligence & Data Science)
K Hima Sri
B.Tech – CSE (Artificial Intelligence & Data Science)
B Sai Mani Deepthi
B.Tech – CSE (Artificial Intelligence & Data Science)


Guide
Abdul Aziz Md
Institution
Kakinada Institute of Engineering and Technology for Women (KIET-W)


SenseGen
One Photo. Automatic Action.
See it. Snap it. Solved.

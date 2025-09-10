# Campus Event Portal - Webknot Technologies

A comprehensive campus event management platform with real user authentication, built with React.js frontend and Node.js backend.

🌐 **Live Demo:** [Frontend](https://campus-event-portal.vercel.app) | [Backend API](https://campus-event-portal-api.vercel.app)

## Features

- **Event Management**: Admin can create events (Workshop/Fest/Seminar)
- **Student Registration**: Students can register for events
- **Attendance Tracking**: Mark student attendance for events
- **Feedback System**: Students can rate events (1-5) with optional comments
- **Comprehensive Reports**: 
  - Event popularity (sorted by registrations)
  - Student participation tracking
  - Attendance percentage per event
  - Average feedback per event
- **Bonus Features**:
  - Top 3 most active students
  - Filter events by type

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite
- **Scale**: Supports ~50 colleges × 500 students × 20 events/semester

## Project Structure

```
webknot-campus-platform/
├── backend/
│   ├── server.js              # Main Express application
│   ├── package.json           # Dependencies and scripts
│   ├── sql/
│   │   ├── schema.sql         # Database schema
│   │   └── seed.sql           # Sample data
│   ├── utils/
│   │   ├── database.js        # Database utility functions
│   │   └── initDatabase.js    # Database initialization script
│   └── campus_drive.db        # SQLite database (auto-generated)
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm

### Quick Start

1. **Clone/Extract the project**
   ```bash
   cd webknot-campus-platform/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Start the server**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

### Alternative Commands

- **Development mode** (with auto-restart): `npm run dev`
- **Manual database initialization**: `node utils/initDatabase.js`

## API Endpoints

### Core Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/colleges` | Create a college |
| POST | `/students` | Register a student |
| POST | `/events` | Create an event (Admin) |
| POST | `/register` | Student registration for event |
| POST | `/attendance` | Mark attendance |
| POST | `/feedback` | Submit feedback (rating 1-5) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/event-popularity` | Events sorted by registrations |
| GET | `/reports/event-popularity?type=Workshop` | Filter by event type |
| GET | `/reports/attendance` | Attendance percentage per event |
| GET | `/reports/student-participation` | Events attended per student |
| GET | `/reports/feedback` | Average feedback per event |
| GET | `/reports/top-students` | Top 3 most active students |

## Sample API Usage

### 1. Create a College
```bash
curl -X POST http://localhost:3000/colleges \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IIT Bombay",
    "location": "Mumbai, Maharashtra",
    "contact_email": "admin@iitb.ac.in"
  }'
```

### 2. Register a Student
```bash
curl -X POST http://localhost:3000/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@iitb.ac.in",
    "phone": "9876543213",
    "college_id": 1,
    "course": "Computer Science",
    "year": 3
  }'
```

### 3. Create an Event
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI/ML Workshop",
    "description": "Hands-on workshop on Machine Learning basics",
    "event_type": "Workshop",
    "date": "2024-03-15",
    "start_time": "10:00:00",
    "end_time": "16:00:00",
    "venue": "Computer Lab 2",
    "max_capacity": 75,
    "college_id": 1,
    "created_by": "Dr. Smith"
  }'
```

### 4. Register Student for Event
```bash
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "event_id": 1
  }'
```

### 5. Mark Attendance
```bash
curl -X POST http://localhost:3000/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "event_id": 1,
    "status": "present",
    "marked_by": "Admin"
  }'
```

### 6. Submit Feedback
```bash
curl -X POST http://localhost:3000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "event_id": 1,
    "rating": 5,
    "comment": "Excellent workshop with practical examples!"
  }'
```

### 7. Get Event Popularity Report
```bash
curl http://localhost:3000/reports/event-popularity
```

### 8. Get Event Popularity by Type
```bash
curl "http://localhost:3000/reports/event-popularity?type=Workshop"
```

### 9. Get Attendance Report
```bash
curl http://localhost:3000/reports/attendance
```

### 10. Get Student Participation Report
```bash
curl http://localhost:3000/reports/student-participation
```

### 11. Get Feedback Report
```bash
curl http://localhost:3000/reports/feedback
```

### 12. Get Top Students Report
```bash
curl http://localhost:3000/reports/top-students
```

## Sample Data

The system comes pre-loaded with sample data:
- 1 College: Tech University Mumbai
- 3 Students: Rahul Sharma, Priya Patel, Arjun Singh
- 2 Events: Full Stack Development Workshop, Annual Tech Fest 2024
- Sample registrations, attendance, and feedback records

## Database Schema

The SQLite database includes the following tables:
- `colleges` - College information
- `students` - Student profiles
- `events` - Event details with type constraints
- `registrations` - Student event registrations
- `attendance` - Attendance records
- `feedback` - Student feedback with ratings (1-5)

## Error Handling

The API includes comprehensive error handling:
- Input validation for all endpoints
- Duplicate registration prevention
- Capacity enforcement for events
- Unique constraint handling
- Proper HTTP status codes

## Testing

Use the provided curl commands to test all functionality. The server includes:
- Health check endpoint: `GET /health`
- Comprehensive logging
- SQLite database with ACID compliance
- Foreign key constraints enabled

## Development Notes

- Database is automatically created on first run
- Sample data is seeded if database is empty
- All endpoints return JSON responses
- CORS enabled for cross-origin requests
- Proper SQL injection prevention using parameterized queries

---

**Built for Webknot Technologies Campus Drive Assignment**

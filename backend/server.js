// Campus Drive Assignment - Backend API
// Technologies: Node.js, Express, SQLite

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const database = require('./utils/database');
const initDatabase = require('./utils/initDatabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    message: 'Campus Drive API - Webknot Technologies',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      core: [
        'POST /colleges',
        'POST /students', 
        'POST /events',
        'POST /register',
        'POST /attendance',
        'POST /feedback'
      ],
      reports: [
        'GET /reports/event-popularity',
        'GET /reports/attendance',
        'GET /reports/student-participation', 
        'GET /reports/feedback',
        'GET /reports/top-students'
      ],
      utility: [
        'GET /health'
      ]
    },
    documentation: 'See README.md for sample curl commands'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize DB before starting server
async function startServer() {
  try {
    await database.connect();
    await database.initializeSchema();
    const hasData = await database.hasData();
    if (!hasData) {
      await database.seedData();
    }

    // Routes

    // Get colleges endpoint for signup
    app.get('/colleges', async (req, res) => {
      try {
        const colleges = await database.all('SELECT id, name, location FROM colleges ORDER BY name ASC');
        res.json(colleges);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch colleges' });
      }
    });

    // Authentication endpoints

    // Admin Signup
    app.post('/auth/signup-admin', async (req, res) => {
      try {
        const { name, email, password, college_id } = req.body;
        
        if (!name || !email || !password || !college_id) {
          return res.status(400).json({ error: 'Name, email, password, and college are required' });
        }
        
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Check if email already exists
        const existingAdmin = await database.get('SELECT id FROM admin_users WHERE email = ?', [email]);
        if (existingAdmin) {
          return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Check if college exists
        const college = await database.get('SELECT id, name FROM colleges WHERE id = ?', [college_id]);
        if (!college) {
          return res.status(400).json({ error: 'Invalid college selected' });
        }
        
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // Create admin user
        const result = await database.run(
          'INSERT INTO admin_users (name, email, password_hash, college_id) VALUES (?, ?, ?, ?)',
          [name, email, password_hash, college_id]
        );
        
        res.status(201).json({ 
          success: true, 
          message: 'Admin account created successfully',
          user: {
            id: result.id,
            name,
            email,
            role: 'admin',
            college_id,
            college_name: college.name
          }
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create admin account' });
      }
    });

    // Student Signup
    app.post('/auth/signup-student', async (req, res) => {
      try {
        const { name, email, password, phone, college_id, course, year } = req.body;
        
        if (!name || !email || !password || !college_id) {
          return res.status(400).json({ error: 'Name, email, password, and college are required' });
        }
        
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Check if email already exists in students or student_users
        const existingStudent = await database.get('SELECT id FROM students WHERE email = ?', [email]);
        const existingUser = await database.get('SELECT id FROM student_users WHERE email = ?', [email]);
        if (existingStudent || existingUser) {
          return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Check if college exists
        const college = await database.get('SELECT id, name FROM colleges WHERE id = ?', [college_id]);
        if (!college) {
          return res.status(400).json({ error: 'Invalid college selected' });
        }
        
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // Create student record first
        const studentResult = await database.run(
          'INSERT INTO students (name, email, phone, college_id, course, year) VALUES (?, ?, ?, ?, ?, ?)',
          [name, email, phone || null, college_id, course || null, year || null]
        );
        
        // Create student user record
        await database.run(
          'INSERT INTO student_users (student_id, email, password_hash) VALUES (?, ?, ?)',
          [studentResult.id, email, password_hash]
        );
        
        res.status(201).json({ 
          success: true, 
          message: 'Student account created successfully',
          user: {
            id: studentResult.id,
            name,
            email,
            role: 'student',
            college_id,
            college_name: college.name,
            course,
            year
          }
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create student account' });
      }
    });

    // Login endpoint
    app.post('/auth/login', async (req, res) => {
      try {
        const { email, password, role } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        let user = null;

        if (role === 'admin') {
          // Check admin users
          const adminUser = await database.get(`
            SELECT au.*, c.name as college_name 
            FROM admin_users au 
            LEFT JOIN colleges c ON au.college_id = c.id 
            WHERE au.email = ? AND au.is_active = 1
          `, [email]);
          
          if (adminUser && await bcrypt.compare(password, adminUser.password_hash)) {
            user = {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.email,
              role: 'admin',
              college_id: adminUser.college_id,
              college_name: adminUser.college_name
            };
          }
        } else if (role === 'student') {
          // Check student users
          const studentUser = await database.get(`
            SELECT su.*, s.name, s.phone, s.course, s.year, c.name as college_name
            FROM student_users su
            JOIN students s ON su.student_id = s.id
            LEFT JOIN colleges c ON s.college_id = c.id
            WHERE su.email = ? AND su.is_active = 1
          `, [email]);
          
          if (studentUser && await bcrypt.compare(password, studentUser.password_hash)) {
            user = {
              id: studentUser.student_id,
              name: studentUser.name,
              email: studentUser.email,
              role: 'student',
              college_id: studentUser.college_id,
              college_name: studentUser.college_name,
              course: studentUser.course,
              year: studentUser.year
            };
          }
        }

        if (user) {
          res.json({ success: true, user });
        } else {
          res.status(401).json({ error: 'Invalid credentials' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    app.post('/auth/logout', (req, res) => {
      res.json({ success: true, message: 'Logged out successfully' });
    });

    // GET endpoints for data retrieval
    app.get('/events', async (req, res) => {
      try {
        const events = await database.all('SELECT * FROM events ORDER BY date DESC');
        res.json(events);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch events' });
      }
    });

    app.get('/students', async (req, res) => {
      try {
        const students = await database.all(`
          SELECT s.*, c.name as college_name 
          FROM students s 
          LEFT JOIN colleges c ON s.college_id = c.id 
          ORDER BY s.name ASC
        `);
        res.json(students);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch students' });
      }
    });

    app.get('/registrations', async (req, res) => {
      try {
        const registrations = await database.all(`
          SELECT r.*, s.name as student_name, s.email, e.title as event_title, e.date
          FROM registrations r
          JOIN students s ON r.student_id = s.id
          JOIN events e ON r.event_id = e.id
          WHERE r.status = 'registered'
          ORDER BY e.date DESC, s.name ASC
        `);
        res.json(registrations);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
      }
    });

    // POST /colleges - Create a college
    app.post('/colleges', async (req, res) => {
      try {
        const { name, location, contact_email } = req.body;
        if (!name || !location) {
          return res.status(400).json({ error: 'name and location are required' });
        }
        const result = await database.run(
          `INSERT INTO colleges (name, location, contact_email) VALUES (?, ?, ?)`,
          [name, location, contact_email || null]
        );
        const college = await database.get(`SELECT * FROM colleges WHERE id = ?`, [result.id]);
        res.status(201).json(college);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create college' });
      }
    });

    // POST /students - Register a student
    app.post('/students', async (req, res) => {
      try {
        const { name, email, phone, college_id, course, year } = req.body;
        if (!name || !email || !college_id) {
          return res.status(400).json({ error: 'name, email, college_id are required' });
        }
        const result = await database.run(
          `INSERT INTO students (name, email, phone, college_id, course, year) VALUES (?, ?, ?, ?, ?, ?)`,
          [name, email, phone || null, college_id, course || null, year || null]
        );
        const student = await database.get(`SELECT * FROM students WHERE id = ?`, [result.id]);
        res.status(201).json(student);
      } catch (err) {
        if (err && /UNIQUE constraint failed: students.email/.test(err.message)) {
          return res.status(409).json({ error: 'Email already registered' });
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to create student' });
      }
    });

    // POST /events - Create an event (Admin)
    app.post('/events', async (req, res) => {
      try {
        const {
          title,
          description,
          event_type,
          date,
          start_time,
          end_time,
          venue,
          max_capacity,
          college_id,
          created_by,
        } = req.body;
        if (!title || !event_type || !date || !start_time || !end_time || !venue || !college_id) {
          return res.status(400).json({ error: 'title, event_type, date, start_time, end_time, venue, college_id are required' });
        }
        const result = await database.run(
          `INSERT INTO events (title, description, event_type, date, start_time, end_time, venue, max_capacity, college_id, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [title, description || null, event_type, date, start_time, end_time, venue, max_capacity || 100, college_id, created_by || 'Admin']
        );
        const event = await database.get(`SELECT * FROM events WHERE id = ?`, [result.id]);
        res.status(201).json(event);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event' });
      }
    });

    // POST /register - Student registration for event
    app.post('/register', async (req, res) => {
      try {
        const { student_id, event_id } = req.body;
        if (!student_id || !event_id) {
          return res.status(400).json({ error: 'student_id and event_id are required' });
        }

        // Optional: enforce capacity
        const event = await database.get(`SELECT id, max_capacity FROM events WHERE id = ?`, [event_id]);
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }
        const count = await database.get(`SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'registered'`, [event_id]);
        if (event.max_capacity && count.c >= event.max_capacity) {
          return res.status(409).json({ error: 'Event capacity reached' });
        }

        const result = await database.run(
          `INSERT INTO registrations (student_id, event_id, status) VALUES (?, ?, 'registered')`,
          [student_id, event_id]
        );
        const reg = await database.get(`SELECT * FROM registrations WHERE id = ?`, [result.id]);
        res.status(201).json(reg);
      } catch (err) {
        if (err && /UNIQUE constraint failed: registrations\.student_id, registrations\.event_id/.test(err.message)) {
          return res.status(409).json({ error: 'Student already registered for this event' });
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to register student' });
      }
    });

    // POST /attendance - Mark attendance
    app.post('/attendance', async (req, res) => {
      try {
        const { student_id, event_id, status, marked_by } = req.body;
        if (!student_id || !event_id) {
          return res.status(400).json({ error: 'student_id and event_id are required' });
        }
        const attStatus = status && (status === 'present' || status === 'absent') ? status : 'present';
        // Try to insert, or update if exists
        try {
          const row = await database.run(
            `INSERT INTO attendance (student_id, event_id, status, marked_by)
             VALUES (?, ?, ?, ?)`,
            [student_id, event_id, attStatus, marked_by || 'Admin']
          );
        } catch (insertErr) {
          // If constraint failed, update instead
          if (insertErr.message.includes('UNIQUE constraint failed')) {
            await database.run(
              `UPDATE attendance SET status = ?, marked_at = CURRENT_TIMESTAMP, marked_by = ?
               WHERE student_id = ? AND event_id = ?`,
              [attStatus, marked_by || 'Admin', student_id, event_id]
            );
          } else {
            throw insertErr;
          }
        }
        const att = await database.get(`SELECT * FROM attendance WHERE student_id = ? AND event_id = ?`, [student_id, event_id]);
        res.status(201).json(att);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to mark attendance' });
      }
    });

    // POST /feedback - Submit feedback (rating 1-5 + optional comment)
    app.post('/feedback', async (req, res) => {
      try {
        const { student_id, event_id, rating, comment } = req.body;
        if (!student_id || !event_id || typeof rating !== 'number') {
          return res.status(400).json({ error: 'student_id, event_id, rating are required' });
        }
        if (rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'rating must be between 1 and 5' });
        }
        // Try to insert, or update if exists
        try {
          await database.run(
            `INSERT INTO feedback (student_id, event_id, rating, comment)
             VALUES (?, ?, ?, ?)`,
            [student_id, event_id, rating, comment || null]
          );
        } catch (insertErr) {
          // If constraint failed, update instead
          if (insertErr.message.includes('UNIQUE constraint failed')) {
            await database.run(
              `UPDATE feedback SET rating = ?, comment = ?, submitted_at = CURRENT_TIMESTAMP
               WHERE student_id = ? AND event_id = ?`,
              [rating, comment || null, student_id, event_id]
            );
          } else {
            throw insertErr;
          }
        }
        const fb = await database.get(`SELECT * FROM feedback WHERE student_id = ? AND event_id = ?`, [student_id, event_id]);
        res.status(201).json(fb);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit feedback' });
      }
    });

    // REPORTS

    // GET /reports/event-popularity[?type=Workshop]
    app.get('/reports/event-popularity', async (req, res) => {
      try {
        const { type } = req.query;
        const params = [];
        let where = '';
        if (type) {
          where = 'WHERE e.event_type = ?';
          params.push(type);
        }
        const rows = await database.all(
          `SELECT e.id, e.title, e.event_type, e.date, e.venue,
                  COUNT(r.id) AS registrations
           FROM events e
           LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
           ${where}
           GROUP BY e.id
           ORDER BY registrations DESC, e.date ASC`,
          params
        );
        res.json(rows);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch event popularity report' });
      }
    });

    // GET /reports/attendance - attendance percentage per event
    app.get('/reports/attendance', async (req, res) => {
      try {
        const rows = await database.all(
          `WITH reg AS (
              SELECT e.id AS event_id, COUNT(r.id) AS registrations
              FROM events e
              LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
              GROUP BY e.id
           ), present AS (
              SELECT event_id, COUNT(*) AS presents
              FROM attendance
              WHERE status = 'present'
              GROUP BY event_id
           )
           SELECT e.id, e.title, e.date,
                  COALESCE(reg.registrations, 0) AS registrations,
                  COALESCE(present.presents, 0) AS presents,
                  CASE WHEN COALESCE(reg.registrations,0) = 0 THEN 0
                       ELSE ROUND(100.0 * COALESCE(present.presents,0) / reg.registrations, 2) END AS attendance_percentage
           FROM events e
           LEFT JOIN reg ON e.id = reg.event_id
           LEFT JOIN present ON e.id = present.event_id
           ORDER BY attendance_percentage DESC, e.date ASC`
        );
        res.json(rows);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch attendance report' });
      }
    });

    // GET /reports/student-participation - how many events attended per student
    app.get('/reports/student-participation', async (req, res) => {
      try {
        const rows = await database.all(
          `SELECT s.id AS student_id, s.name, s.email, s.college_id,
                  COUNT(a.id) FILTER (WHERE a.status = 'present') AS events_attended
           FROM students s
           LEFT JOIN attendance a ON s.id = a.student_id AND a.status = 'present'
           GROUP BY s.id
           ORDER BY events_attended DESC, s.name ASC`
        );
        res.json(rows);
      } catch (err) {
        // SQLite may not support FILTER; use SUM(CASE...)
        try {
          const rows2 = await database.all(
            `SELECT s.id AS student_id, s.name, s.email, s.college_id,
                    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS events_attended
             FROM students s
             LEFT JOIN attendance a ON s.id = a.student_id
             GROUP BY s.id
             ORDER BY events_attended DESC, s.name ASC`
          );
          res.json(rows2);
        } catch (e2) {
          console.error(e2);
          res.status(500).json({ error: 'Failed to fetch student participation report' });
        }
      }
    });

    // GET /reports/feedback - average feedback per event
    app.get('/reports/feedback', async (req, res) => {
      try {
        const rows = await database.all(
          `SELECT e.id, e.title, e.event_type, e.date,
                  ROUND(AVG(f.rating), 2) AS avg_rating,
                  COUNT(f.id) AS feedback_count
           FROM events e
           LEFT JOIN feedback f ON e.id = f.event_id
           GROUP BY e.id
           ORDER BY avg_rating DESC NULLS LAST, feedback_count DESC`
        );
        res.json(rows);
      } catch (err) {
        // SQLite does not support NULLS LAST; emulate ordering
        try {
          const rows2 = await database.all(
            `SELECT e.id, e.title, e.event_type, e.date,
                    ROUND(AVG(f.rating), 2) AS avg_rating,
                    COUNT(f.id) AS feedback_count
             FROM events e
             LEFT JOIN feedback f ON e.id = f.event_id
             GROUP BY e.id
             ORDER BY (avg_rating IS NULL) ASC, avg_rating DESC, feedback_count DESC`
          );
          res.json(rows2);
        } catch (e2) {
          console.error(e2);
          res.status(500).json({ error: 'Failed to fetch feedback report' });
        }
      }
    });

    // BONUS: GET /reports/top-students - Top 3 most active students
    app.get('/reports/top-students', async (req, res) => {
      try {
        const rows = await database.all(
          `SELECT s.id AS student_id, s.name, s.email,
                  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS events_attended
           FROM students s
           LEFT JOIN attendance a ON s.id = a.student_id
           GROUP BY s.id
           ORDER BY events_attended DESC, s.name ASC
           LIMIT 3`
        );
        res.json(rows);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch top students report' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Campus Drive API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();


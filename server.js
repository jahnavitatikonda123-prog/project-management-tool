const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = 3000;

const SECRET = "project_management_secret";

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database("./database.db");

// Create tables
db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            owner_id INTEGER
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            assigned_to INTEGER,
            status TEXT DEFAULT 'todo'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notofications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            message TEXT,
            is_read INTEGER DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            user_id INTEGER,
            comment TEXT NOT NULL
        )
    `);
});

// Authentication middleware
function authenticate(req, res, next) {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {

        const decoded = jwt.verify(token, SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        res.status(401).json({
            message: "Invalid token"
        });
    }
}

// REGISTER
app.post("/api/register", async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
    `;

    db.run(
        sql,
        [name, email, hashedPassword],
        function (err) {

            if (err) {

                return res.status(400).json({
                    message: "Email already exists"
                });

            }

            res.json({
                message: "Registration successful"
            });

        }
    );
});

// LOGIN
app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, user) => {

            if (err || !user) {

                return res.status(401).json({
                    message: "Invalid email or password"
                });

            }

            const validPassword =
                await bcrypt.compare(password, user.password);

            if (!validPassword) {

                return res.status(401).json({
                    message: "Invalid email or password"
                });

            }

            const token = jwt.sign(
                {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                SECRET,
                {
                    expiresIn: "1d"
                }
            );

            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });

        }
    );
});

// GET USERS
app.get("/api/users", authenticate, (req, res) => {

    db.all(
        "SELECT id, name, email FROM users",
        [],
        (err, users) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json(users);
        }
    );
});

// CREATE PROJECT
app.post("/api/projects", authenticate, (req, res) => {

    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({
            message: "Project name is required"
        });
    }

    db.run(
        `INSERT INTO projects
        (name, description, owner_id)
        VALUES (?, ?, ?)`,
        [name, description, req.user.id],
        function (err) {

            if (err) {
                return res.status(500).json({
                    message: "Could not create project"
                });
            }

            res.json({
                message: "Project created",
                id: this.lastID
            });
        }
    );
});

// GET PROJECTS
app.get("/api/projects",(req, res) => {

    db.all(
        "SELECT * FROM projects ORDER BY id DESC",
        [],
        (err, projects) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error"
                });
            }

            res.json(projects);
        }
    );
});

// CREATE TASK
app.post("/api/tasks", authenticate, (req, res) => {

    const {
        project_id,
        title,
        description,
        assigned_to
    } = req.body;

    if (!project_id || !title) {

        return res.status(400).json({
            message: "Project and task title are required"
        });

    }

    db.run(
        `INSERT INTO tasks
        (project_id, title, description, assigned_to)
        VALUES (?, ?, ?, ?)`,
        [
            project_id,
            title,
            description || "",
            assigned_to || null
        ],
        function (err) {

            if (err) {

                return res.status(500).json({
                    message: "Could not create task"
                });

            }

            if (assigned_to) {
    console.log("CREATING NOTIFICATION FOR USER:", assigned_to);

    db.run(
        `INSERT INTO notifications (user_id, message)
         VALUES (?, ?)`,
        [
            assigned_to,
            `New task assigned: ${title}`
        ]
    );
}

            

            res.json({
                message: "Task created",
                id: this.lastID
            });

        }
    );
});

// GET TASKS
app.get("/api/projects/:id/tasks", authenticate, (req, res) => {

    const projectId = req.params.id;

    const sql = `
        SELECT
            tasks.*,
            users.name AS assigned_name
        FROM tasks
        LEFT JOIN users
        ON tasks.assigned_to = users.id
        WHERE tasks.project_id = ?
        ORDER BY tasks.id DESC
    `;

    db.all(sql, [projectId], (err, tasks) => {

        if (err) {

            return res.status(500).json({
                message: "Database error"
            });

        }

        res.json(tasks);

    });
});

// UPDATE TASK STATUS
app.put("/api/tasks/:id", authenticate, (req, res) => {

    const { status } = req.body;

    db.run(
        "UPDATE tasks SET status = ? WHERE id = ?",
        [status, req.params.id],
        function (err) {

            if (err) {

                return res.status(500).json({
                    message: "Could not update task"
                });

            }

            res.json({
                message: "Task updated"
            });

        }
    );
});

// ADD COMMENT
app.post("/api/tasks/:id/comments", authenticate, (req, res) => {

    const { comment } = req.body;

    if (!comment) {

        return res.status(400).json({
            message: "Comment cannot be empty"
        });

    }

    db.run(
        `INSERT INTO comments
        (task_id, user_id, comment)
        VALUES (?, ?, ?)`,
        [
            req.params.id,
            req.user.id,
            comment
        ],
        function (err) {

            if (err) {

                return res.status(500).json({
                    message: "Could not add comment"
                });

            }

            res.json({
                message: "Comment added"
            });

        }
    );
});

// GET COMMENTS
app.get("/api/tasks/:id/comments", authenticate, (req, res) => {

    const sql = `
        SELECT
            comments.*,
            users.name
        FROM comments
        JOIN users
        ON comments.user_id = users.id
        WHERE task_id = ?
        ORDER BY comments.id ASC
    `;

    db.all(
        sql,
        [req.params.id],
        (err, comments) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error"
                });

            }

            res.json(comments);

        }
    );
});

// GET NOTIFICATIONS
app.get("/api/notifications", authenticate, (req, res) => {
    db.all(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC",
        [req.user.id],
        (err, notifications) => {
            if (err) {
                console.log("NOTIFICATION ERROR:", err);
                 return res.status(500).json({
                    message: "Could not load notifications",
                    error: err.message
                });
            }

            res.json(notifications);
        }
    );
});



// Start server
app.listen(PORT, () => {

    console.log(`
====================================
 Project Management Tool
====================================

Server running at:

http://localhost:${PORT}

====================================
`);

});
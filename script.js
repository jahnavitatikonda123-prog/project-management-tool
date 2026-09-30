let token = localStorage.getItem("token");

let currentProject = null;


// =========================
// SHOW LOGIN / REGISTER
// =========================

function showLogin() {

    document.getElementById("registerBox").style.display = "none";

    document.getElementById("loginBox").style.display = "block";
}


function showRegister() {

    document.getElementById("registerBox").style.display = "block";

    document.getElementById("loginBox").style.display = "none";
}


// =========================
// REGISTER
// =========================

async function register() {

    const name =
        document.getElementById("registerName").value;

    const email =
        document.getElementById("registerEmail").value;

    const password =
        document.getElementById("registerPassword").value;


    const response = await fetch("/api/register", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name,
            email,
            password
        })

    });


    const data = await response.json();

    alert(data.message);


    if (response.ok) {
        showLogin();
    }
}


// =========================
// LOGIN
// =========================

async function login() {

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;


    const response = await fetch("/api/login", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email,
            password
        })

    });


    const data = await response.json();


    if (!response.ok) {

        alert(data.message);

        return;
    }


    localStorage.setItem(
        "token",
        data.token
    );

    localStorage.setItem(
        "user",
        JSON.stringify(data.user)
    );


    startApplication();
}


// =========================
// START APP
// =========================

function startApplication() {

    token = localStorage.getItem("token");

    if (!token) {
        return;
    }


    document.getElementById(
        "authSection"
    ).style.display = "none";


    document.getElementById(
        "appSection"
    ).style.display = "block";


    const user =
        JSON.parse(localStorage.getItem("user"));


    document.getElementById(
        "welcomeUser"
    ).textContent =
        "Hello, " + user.name;


    loadProjects();

    loadUsers();

    loadNotifications();
}


// =========================
// LOGOUT
// =========================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    location.reload();
}


// =========================
// CREATE PROJECT
// =========================

async function createProject() {

    const name =
        document.getElementById("projectName").value;

    const description =
        document.getElementById("projectDescription").value;


    if (!name) {

        alert("Enter project name");

        return;
    }


    const response = await fetch(
        "/api/projects",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    token

            },

            body: JSON.stringify({
                name,
                description
            })

        }
    );


    const data = await response.json();

    alert(data.message);


    document.getElementById(
        "projectName"
    ).value = "";

    document.getElementById(
        "projectDescription"
    ).value = "";


    loadProjects();
}


// =========================
// LOAD PROJECTS
// =========================

async function loadProjects() {

    const response = await fetch(
        "/api/projects",
        {

            headers: {
                "Authorization": token
            }

        }
    );


    const projects = await response.json();


    const container =
        document.getElementById("projects");


    container.innerHTML = "";


    projects.forEach(project => {

        const card =
            document.createElement("div");

        card.className = "project-card";


        card.innerHTML = `

            <h3>${project.name}</h3>

            <p>
                ${project.description || "No description"}
            </p>

            <button
                onclick="openProject(${project.id})">
                Open Project
            </button>

        `;


        container.appendChild(card);

    });
}


// =========================
// LOAD USERS
// =========================

async function loadUsers() {

    const response = await fetch(
        "/api/users",
        {

            headers: {
                "Authorization": token
            }

        }
    );


    const users = await response.json();


    const select =
        document.getElementById("assignedUser");


    users.forEach(user => {

        const option =
            document.createElement("option");

        option.value = user.id;

        option.textContent = user.name;

        select.appendChild(option);

    });
}


// =========================
// OPEN PROJECT
// =========================

async function openProject(id) {

    currentProject = id;


    const response = await fetch(
        "/api/projects"
    );


    const projects = await response.json();


    const project =
        projects.find(p => p.id === id);


    document.getElementById(
        "projectArea"
    ).style.display = "block";


    document.getElementById(
        "selectedProjectName"
    ).textContent = project.name;


    document.getElementById(
        "selectedProjectDescription"
    ).textContent =
        project.description || "";


    loadTasks();
}


// =========================
// CREATE TASK
// =========================

async function createTask() {

    const title =
        document.getElementById("taskTitle").value;

    const description =
        document.getElementById("taskDescription").value;

    const assigned_to =
        document.getElementById("assignedUser").value;


    if (!title) {

        alert("Enter task title");

        return;
    }


    const response = await fetch(
        "/api/tasks",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    token

            },

            body: JSON.stringify({

                project_id:
                    currentProject,

                title,

                description,

                assigned_to:assigned_to || null
            })
        }
    );


    const data = await response.json();


    alert(data.message);


    document.getElementById(
        "taskTitle"
    ).value = "";

    document.getElementById(
        "taskDescription"
    ).value = "";


    loadTasks();
}


// =========================
// LOAD TASKS
// =========================

async function loadTasks() {

    const response = await fetch(
        `/api/projects/${currentProject}/tasks`,
        {

            headers: {
                "Authorization": token
            }

        }
    );


    const tasks = await response.json();


    document.getElementById("todo").innerHTML = "";

    document.getElementById("progress").innerHTML = "";

    document.getElementById("completed").innerHTML = "";


    tasks.forEach(task => {

        const card =
            document.createElement("div");

        card.className = "task-card";


        card.innerHTML = `

            <h4>${task.title}</h4>

            <p>
                ${task.description || ""}
            </p>

            <p>
                Assigned to:
                <b>
                    ${task.assigned_name || "Nobody"}
                </b>
            </p>

            <select
                onchange="updateTask(
                    ${task.id},
                    this.value
                )">

                <option value="todo"
                    ${task.status === "todo" ? "selected" : ""}>
                    To Do
                </option>

                <option value="progress"
                    ${task.status === "progress" ? "selected" : ""}>
                    In Progress
                </option>

                <option value="completed"
                    ${task.status === "completed" ? "selected" : ""}>
                    Completed
                </option>

            </select>

            <div class="comment-box">

                <input
                    id="comment-${task.id}"
                    placeholder="Write a comment">

                <button
                    onclick="addComment(${task.id})">
                    Comment
                </button>

            </div>

            <div
                id="comments-${task.id}"
                class="comments">
            </div>

        `;


        if (task.status === "todo") {

            document
                .getElementById("todo")
                .appendChild(card);

        } else if (task.status === "progress") {

            document
                .getElementById("progress")
                .appendChild(card);

        } else {

            document
                .getElementById("completed")
                .appendChild(card);

        }


        loadComments(task.id);

    });
}


// =========================
// UPDATE TASK
// =========================

async function updateTask(id, status) {

    await fetch(
        `/api/tasks/${id}`,
        {

            method: "PUT",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    token

            },

            body: JSON.stringify({
                status
            })

        }
    );


    loadTasks();
}


// =========================
// ADD COMMENT
// =========================

async function addComment(taskId) {

    const input =
        document.getElementById(
            `comment-${taskId}`
        );


    const comment =
        input.value;


    if (!comment) {

        alert("Write a comment");

        return;
    }


    const response = await fetch(
        `/api/tasks/${taskId}/comments`,
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Authorization":
                    token

            },

            body: JSON.stringify({
                comment
            })

        }
    );


    const data = await response.json();


    alert(data.message);


    input.value = "";


    loadComments(taskId);
}


// =========================
// LOAD COMMENTS
// =========================

async function loadComments(taskId) {

    const response = await fetch(
        `/api/tasks/${taskId}/comments`,
        {

            headers: {
                "Authorization": token
            }

        }
    );


    const comments =
        await response.json();


    const container =
        document.getElementById(
            `comments-${taskId}`
        );


    container.innerHTML = "";


    comments.forEach(comment => {

        const div =
            document.createElement("div");


        div.innerHTML = `
            <b>${comment.name}:</b>
            ${comment.comment}
        `;


        container.appendChild(div);

    });
}


// =========================
// AUTO LOGIN
// =========================

if (token) {

    startApplication();

}

async function loadNotifications() {
    const response = await fetch("/api/notifications", {
        headers: {
            "Authorization": token
        }
    });

    if (!response.ok) {
        return;
    }

    const notifications = await response.json();

    const box = document.getElementById("notifications");

    if (notifications.length === 0) {
        box.innerHTML = "No notifications";
        return;
    }

    box.innerHTML = notifications.map(n => `
        <div class="notification">
            🔔 ${n.message}
        </div>
    `).join("");
}


async function addComment(taskId) {
    const comment = prompt("Enter your comment:");

    if (!comment || comment.trim() === "") {
        return;
    }

    const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token
        },
        body: JSON.stringify({
            comment: comment
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.message || "Could not add comment");
        return;
    }

    alert("Comment added successfully!");
}
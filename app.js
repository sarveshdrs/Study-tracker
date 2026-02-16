console.log("app.js loaded!");

// ---------- Firebase CDN imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyAQeXbhluRxEPLoimjqpEuy8bmIiHZGsdw",
  authDomain: "study-sprint1-14-20.firebaseapp.com",
  projectId: "study-sprint1-14-20",
  storageBucket: "study-sprint1-14-20.firebasestorage.app",
  messagingSenderId: "202999867091",
  appId: "1:202999867091:web:c20c72b4abbcd991231626",
  measurementId: "G-YWD9TRWCN8"
};

// ---------- Initialize Firebase ----------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- DOM Elements ----------
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");
const registerBtn = document.getElementById("register");
const logoutBtn = document.getElementById("logout");
const tasksSection = document.getElementById("tasks-section");
const authSection = document.getElementById("auth-section");
const addTaskBtn = document.getElementById("add-task");
const taskTextInput = document.getElementById("task-text");

// ---------- Auth Functions ----------
registerBtn.addEventListener("click", async () => {
  try {
    const userCredential = await createUserWithEmailAndEmail(auth, emailInput.value, passwordInput.value);
    alert("Registration successful!");
    console.log("Registered:", userCredential.user);
  } catch (error) {
    alert(error.message);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Login successful!");
    console.log("Logged in:", userCredential.user);
  } catch (error) {
    alert(error.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
});

// ---------- Task Functions ----------
addTaskBtn.addEventListener("click", async (event) => {
  event.preventDefault();

  if (!auth.currentUser) {
    alert("Please login first!");
    return;
  }

  const text = taskTextInput.value.trim();
  if (!text) {
    alert("Please enter a task!");
    return;
  }

  const status = document.getElementById("task-status").value;

  try {
    await addDoc(collection(db, "tasks"), {
      text,
      status,
      userId: auth.currentUser.uid,
      createdAt: new Date()
    });

    taskTextInput.value = "";
    document.getElementById("task-status").value = "todo";
  } catch (error) {
    console.error("Error adding task:", error);
    alert("Failed to add task!");
  }
});

// ---------- Show Tasks for Logged-in User ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.style.display = "none";
    tasksSection.style.display = "block";

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "asc")
    );

    onSnapshot(q, (snapshot) => {
      // Clear all columns
      document.getElementById("todo-list").innerHTML = "";
      document.getElementById("in-progress-list").innerHTML = "";
      document.getElementById("done-list").innerHTML = "";

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const li = document.createElement("li");
        li.textContent = data.text;

        // create action buttons
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = () => deleteTask(docSnap.id);

        const moveTodoBtn = document.createElement("button");
        moveTodoBtn.textContent = "To Do";
        moveTodoBtn.onclick = () => updateTaskStatus(docSnap.id, "todo");

        const moveInProgressBtn = document.createElement("button");
        moveInProgressBtn.textContent = "In Progress";
        moveInProgressBtn.onclick = () => updateTaskStatus(docSnap.id, "in-progress");

        const moveDoneBtn = document.createElement("button");
        moveDoneBtn.textContent = "Done";
        moveDoneBtn.onclick = () => updateTaskStatus(docSnap.id, "done");

        li.appendChild(deleteBtn);
        li.appendChild(moveTodoBtn);
        li.appendChild(moveInProgressBtn);
        li.appendChild(moveDoneBtn);

        // place in correct column
        if (data.status === "in-progress") {
          document.getElementById("in-progress-list").appendChild(li);
        } else if (data.status === "done") {
          document.getElementById("done-list").appendChild(li);
        } else {
          document.getElementById("todo-list").appendChild(li);
        }
      });
    });

  } else {
    authSection.style.display = "block";
    tasksSection.style.display = "none";
  }
});

// ---------- Firestore Update/Delete Helpers ----------

// Update only the status field on a task
async function updateTaskStatus(taskId, newStatus) {
  const taskRef = doc(db, "tasks", taskId);
  await updateDoc(taskRef, { status: newStatus });
}

// Delete a task document
async function deleteTask(taskId) {
  await deleteDoc(doc(db, "tasks", taskId));
}

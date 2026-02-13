// --- Firebase (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs,
  serverTimestamp, onSnapshot, query, orderBy, where, updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/** =========================
 *  1) Firebase Config
 *  Copy from Firebase Console → Project Settings → Your apps → Web app
 *  ========================= */
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
аріКеу: "AIzaSyAQeXbhluRxEPLoimjqpEuy8bmIiHZGsdw"
authDomain: "study-sprint1-14-20.firebaseapp.com"
projectId: "study-sprint1-14-20", storageBucket: "study-sprint1-14-20.firebasestorage. app", messagingsenderId: "202999867091",
appId: "1:202999867091: web: c20c72b4abbcd991231626", measurementId: "G-YWD9TRWCN8"
｝；

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "study-tracker.firebaseapp.com",
  projectId: "study-tracker",
  // Optional if you add Storage/Messaging/AppId:
  // storageBucket: "study-tracker.appspot.com",
  // messagingSenderId: "XXXX",
  // appId: "XXXX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- DOM elements ---
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const boardNameEl = document.getElementById("boardName");
const createBoardBtn = document.getElementById("createBoardBtn");
const boardSelect = document.getElementById("boardSelect");
const loadBoardBtn = document.getElementById("loadBoardBtn");
const boardArea = document.getElementById("boardArea");
const boardContainer = document.getElementById("board");
const columnSelect = document.getElementById("columnSelect");
const cardTitleEl = document.getElementById("cardTitle");
const addCardBtn = document.getElementById("addCardBtn");
const boardMeta = document.getElementById("boardMeta");

// --- State ---
let currentUser = null;
let currentBoardId = null;
let unsubscribeBoard = null;
let unsubscribeColumns = null;
let unsubscribeCards = null;
let columns = []; // [{id,title,position}]
let cards = [];   // [{id,title,columnId,position}]

// --- Auth handlers ---
loginBtn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

logoutBtn.onclick = async () => {
  await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    loginBtn.classList.add("hidden");
    userInfo.classList.remove("hidden");
    userName.textContent = user.displayName || user.email || "User";
    boardArea.classList.add("hidden");
    await loadUserBoards();
  } else {
    loginBtn.classList.remove("hidden");
    userInfo.classList.add("hidden");
    boardArea.classList.add("hidden");
    boardSelect.innerHTML = "";
  }
});

// --- Boards ---
async function loadUserBoards() {
  // Simple filter: user is owner (can expand with /members later)
  const qBoards = query(
    collection(db, "boards"),
    where("ownerId", "==", currentUser.uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qBoards);
  boardSelect.innerHTML = "";
  snap.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.data().name || d.id;
    boardSelect.appendChild(opt);
  });
}

createBoardBtn.onclick = async () => {
  if (!currentUser) return alert("Please sign in first.");
  const name = (boardNameEl.value || "").trim() || "My Study Board";

  // 1) Create board doc
  const ref = await addDoc(collection(db, "boards"), {
    name,
    ownerId: currentUser.uid,
    createdAt: serverTimestamp(),
  });

  // 2) Default columns with positions
  const titles = ["Backlog", "In Progress", "Review", "Done"];
  for (let i = 0; i < titles.length; i++) {
    await addDoc(collection(db, "boards", ref.id, "columns"), {
      title: titles[i],
      position: (i + 1) * 100
    });
  }

  // 3) Add owner as member (optional, good for future roles)
  await setDoc(doc(db, "boards", ref.id, "members", currentUser.uid), {
    role: "owner",
    addedAt: serverTimestamp(),
  });

  // Refresh and open
  await loadUserBoards();
  boardSelect.value = ref.id;
  openBoard(ref.id);
};

loadBoardBtn.onclick = () => {
  const id = boardSelect.value;
  if (!id) return alert("Pick a board");
  openBoard(id);
};

async function openBoard(boardId) {
  cleanupListeners();
  currentBoardId = boardId;
  boardArea.classList.remove("hidden");
  boardContainer.innerHTML = "";
  columns = [];
  cards = [];
  columnSelect.innerHTML = "";
  boardMeta.textContent = `Board ID: ${boardId}`;

  // Listen columns
  const colRef = collection(db, "boards", boardId, "columns");
  unsubscribeColumns = onSnapshot(
    query(colRef, orderBy("position", "asc")),
    (snap) => {
      columns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderBoard();
      renderColumnPicker();
    }
  );

  // Listen cards
  const cardRef = collection(db, "boards", boardId, "cards");
  unsubscribeCards = onSnapshot(
    query(cardRef, orderBy("position", "asc")),
    (snap) => {
      cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderBoard();
    }
  );
}

function cleanupListeners() {
  if (unsubscribeBoard) unsubscribeBoard();
  if (unsubscribeColumns) unsubscribeColumns();
  if (unsubscribeCards) unsubscribeCards();
  unsubscribeBoard = unsubscribeColumns = unsubscribeCards = null;
}

function renderColumnPicker() {
  columnSelect.innerHTML = "";
  for (const c of columns) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title;
    columnSelect.appendChild(opt);
  }
}

// --- Cards ---
addCardBtn.onclick = async () => {
  if (!currentBoardId) return;
  const title = (cardTitleEl.value || "").trim();
  if (!title) return alert("Enter a card title");
  const colId = columnSelect.value || columns[0]?.id;
  const colCards = cards.filter((c) => c.columnId === colId);
  const lastPos = colCards.length ? colCards[colCards.length - 1].position : 0;

  await addDoc(collection(db, "boards", currentBoardId, "cards"), {
    title,
    columnId: colId,
    position: lastPos + 100,
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid,
  });
  cardTitleEl.value = "";
};

// --- Drag & drop (HTML5) ---
function renderBoard() {
  // Build columns
  boardContainer.innerHTML = "";
  for (const col of columns) {
    const colDiv = document.createElement("div");
    colDiv.className = "column";
    colDiv.dataset.columnId = col.id;

    const header = document.createElement("div");
    header.className = "column-header";
    header.innerHTML = `<span>${col.title}</span><span class="muted">#${col.position}</span>`;
    colDiv.appendChild(header);

    const list = document.createElement("div");
    list.className = "card-list";
    list.dataset.columnId = col.id;

    // Drag targets
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      list.classList.add("drag-over");
    });
    list.addEventListener("dragleave", () => list.classList.remove("drag-over"));
    list.addEventListener("drop", async (e) => {
      e.preventDefault();
      list.classList.remove("drag-over");
      const cardId = e.dataTransfer.getData("text/plain");
      const destColumnId = list.dataset.columnId;
      await moveCard(cardId, destColumnId);
    });

    // Cards for this column
    const colCards = cards.filter((c) => c.columnId === col.id).sort((a, b) => a.position - b.position);
    for (let i = 0; i < colCards.length; i++) {
      const card = colCards[i];
      const cardDiv = document.createElement("div");
      cardDiv.className = "card";
      cardDiv.draggable = true;
      cardDiv.textContent = card.title;
      cardDiv.dataset.cardId = card.id;

      // Drag source
      cardDiv.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.id);
      });

      list.appendChild(cardDiv);
    }

    colDiv.appendChild(list);
    boardContainer.appendChild(colDiv);
  }
}

async function moveCard(cardId, destColumnId) {
  if (!currentBoardId) return;
  // Compute new position in destination: place at end
  const destCards = cards
    .filter((c) => c.columnId === destColumnId)
    .sort((a, b) => a.position - b.position);
  const lastPos = destCards.length ? destCards[destCards.length - 1].position : 0;
  const newPos = lastPos + 100;

  await updateDoc(doc(db, "boards", currentBoardId, "cards", cardId), {
    columnId: destColumnId,
    position: newPos,
    movedAt: serverTimestamp(),
  });
}

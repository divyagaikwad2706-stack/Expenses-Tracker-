const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("expenses.db");
const SECRET = "secret123";

// Tables
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  title TEXT,
  amount REAL,
  category TEXT,
  date TEXT
)`);

// Auth middleware
function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).send("No token");

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).send("Invalid token");
  }
}

// Auth APIs
app.post("/register", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [req.body.username, hash],
    (err) => (err ? res.send("User exists") : res.send("Registered")),
  );
});

app.post("/login", (req, res) => {
  db.get(
    "SELECT * FROM users WHERE username=?",
    [req.body.username],
    async (err, user) => {
      if (!user) return res.send("User not found");
      const valid = await bcrypt.compare(req.body.password, user.password);
      if (!valid) return res.send("Wrong password");

      const token = jwt.sign({ id: user.id }, SECRET);
      res.json({ token });
    },
  );
});

// Expense APIs
app.post("/add", auth, (req, res) => {
  const { title, amount, category, date } = req.body;

  db.run(
    "INSERT INTO expenses (user_id, title, amount, category, date) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, title, amount, category, date],
    function (err) {
      if (err) return res.send(err);
      res.send({ id: this.lastID });
    },
  );
});

app.get("/expenses", auth, (req, res) => {
  db.all("SELECT * FROM expenses WHERE user_id=?", [req.user.id], (err, rows) =>
    res.json(rows),
  );
});

app.get("/filter", auth, (req, res) => {
  const { category, start, end } = req.query;

  db.all(
    `SELECT * FROM expenses 
     WHERE user_id=? AND category=? AND date BETWEEN ? AND ?`,
    [req.user.id, category, start, end],
    (err, rows) => res.json(rows),
  );
});

app.delete("/delete/:id", auth, (req, res) => {
  db.run(
    "DELETE FROM expenses WHERE id=? AND user_id=?",
    [req.params.id, req.user.id],
    () => res.send("Deleted"),
  );
});

app.get("/export", auth, (req, res) => {
  db.all(
    "SELECT * FROM expenses WHERE user_id=?",
    [req.user.id],
    (err, rows) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");

      XLSX.writeFile(wb, "expenses.xlsx");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=expenses.xlsx",
      );
      res.download("expenses.xlsx");
    },
  );
});

app.listen(3000, () => console.log("http://localhost:3000/login.html"));

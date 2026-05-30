const API = "http://localhost:3000";
const token = localStorage.getItem("token");

if (
  !token &&
  !location.pathname.includes("login") &&
  !location.pathname.includes("register")
) {
  location.href = "login.html";
}

// AUTH
function register() {
  fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  })
    .then((res) => res.text())
    .then(alert);
}

function login() {
  fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      localStorage.setItem("token", data.token);
      location.href = "index.html";
    });
}

// EXPENSES
let currentData = [];

function loadExpenses() {
  fetch(API + "/expenses", { headers: { Authorization: token } })
    .then((res) => res.json())
    .then((data) => {
      currentData = data;
      showData(data);
      loadChart(data);
      loadPieChart(data);
      updateCards(data);
    });
}

function addExpense() {
  fetch(API + "/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      title: title.value,
      amount: amount.value,
      category: categoryInput.value,
      date: date.value,
    }),
  }).then(loadExpenses);
}

function deleteExpense(id) {
  fetch(API + "/delete/" + id, {
    method: "DELETE",
    headers: { Authorization: token },
  }).then(loadExpenses);
}

// FILTER
function filterExpenses() {
  fetch(
    `${API}/filter?category=${filterCategory.value}&start=${start.value}&end=${end.value}`,
    { headers: { Authorization: token } },
  )
    .then((res) => res.json())
    .then((data) => {
      currentData = data;
      showData(data);
      loadChart(data);
      loadPieChart(data);
      updateCards(data);
    });
}

function resetFilters() {
  filterCategory.value = "";
  start.value = "";
  end.value = "";
  loadExpenses();
}

// DISPLAY
function showData(data) {
  list.innerHTML = "";
  data.forEach((e) => {
    list.innerHTML += `<li>${e.title} - ₹${e.amount}
    <button onclick="deleteExpense(${e.id})">❌</button></li>`;
  });
}
function updateCards(data) {
  let total = 0;
  const categories = {};

  data.forEach((e) => {
    total += Number(e.amount);

    categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
  });

  // Total Expense
  document.getElementById("totalExpense").innerText = "₹" + total;

  // Total Entries
  document.getElementById("totalEntries").innerText = data.length;

  // Top Category
  let topCat = "-";
  let max = 0;

  for (let cat in categories) {
    if (categories[cat] > max) {
      max = categories[cat];
      topCat = cat;
    }
  }

  document.getElementById("topCategory").innerText = topCat;
}

// CHART
let myChart;

function loadChart(data) {
  const m = {};

  data.forEach((e) => {
    if (!e.date) return; // safety check
    const d = e.date.slice(0, 7);
    m[d] = (m[d] || 0) + Number(e.amount);
  });

  const ctx = document.getElementById("chart");
  if (!ctx) return console.error("Bar chart canvas not found");

  if (myChart) myChart.destroy();

  myChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: Object.keys(m),
      datasets: [
        {
          label: "Expenses",
          data: Object.values(m),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

// PIE CHART
let pieChart;

function loadPieChart(data) {
  const categories = {};

  data.forEach((e) => {
    if (!e.category) return; // safety check
    categories[e.category] = (categories[e.category] || 0) + Number(e.amount);
  });

  const pieCtx = document.getElementById("pieChart");
  if (!pieCtx) return console.error("Pie chart canvas not found");

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(pieCtx.getContext("2d"), {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [
        {
          data: Object.values(categories),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}
// AI
function predictFromUI() {
  if (!currentData.length) return alert("No data");

  // 1. Separate "Big One-Time" vs "Daily Habits"
  // Usually, transactions > 15% of total or specific categories are fixed
  const fixedCosts = currentData
    .filter((e) => Number(e.amount) > 2000) // Adjust threshold as needed
    .reduce((s, e) => s + Number(e.amount), 0);

  const variableCosts = currentData
    .filter((e) => Number(e.amount) <= 2000)
    .reduce((s, e) => s + Number(e.amount), 0);

  const today = new Date().getDate();
  const daysInMonth = 30;

  // 2. Project only the daily habits, then add the fixed costs back
  const dailyAvg = variableCosts / today;
  const predictedVariable = dailyAvg * daysInMonth;

  const finalPrediction = fixedCosts + predictedVariable;

  alert(`📊 Predicted: ₹${finalPrediction.toFixed(2)}`);
}

// EXPORT
function exportExcel() {
  fetch(API + "/export", {
    headers: { Authorization: token },
  })
    .then((res) => res.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.xlsx";
      a.click();
    });
}

// DARK MODE
function toggleDark() {
  document.body.classList.toggle("dark");
}

if (location.pathname.includes("index")) loadExpenses();

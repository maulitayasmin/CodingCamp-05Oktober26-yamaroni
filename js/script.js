/* Life Dashboard - vanilla JavaScript, data saved in Local Storage */
(function () {
  "use strict";

  /* ---------- Storage helpers ---------- */
  var KEYS = {
    tasks: "lifeDashboard.tasks",
    links: "lifeDashboard.links",
    name: "lifeDashboard.name",
    theme: "lifeDashboard.theme",
    minutes: "lifeDashboard.minutes",
  };

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* Storage unavailable (private mode or full): the app keeps working for this session. */
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Greeting, date and time ---------- */
  var greetingText = $("greeting-text");
  var nameWrap = $("name-wrap");
  var nameBtn = $("name-btn");
  var nameForm = $("name-form");
  var nameInput = $("name-input");
  var clockEl = $("clock");
  var dateEl = $("date");

  var userName = load(KEYS.name, "");

  function greetingFor(hour) {
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    if (hour >= 18 && hour < 22) return "Good evening";
    return "Good night";
  }

  function renderName() {
    if (userName) {
      nameWrap.hidden = false;
      nameBtn.textContent = userName;
    } else {
      nameWrap.hidden = false;
      nameBtn.textContent = "add your name";
    }
  }

  function updateClock() {
    var now = new Date();
    greetingText.textContent = greetingFor(now.getHours());
    clockEl.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dateEl.textContent = now.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  nameBtn.addEventListener("click", function () {
    nameForm.hidden = false;
    nameInput.value = userName;
    nameInput.focus();
    nameInput.select();
  });

  nameForm.addEventListener("submit", function (e) {
    e.preventDefault();
    userName = nameInput.value.trim();
    save(KEYS.name, userName);
    nameForm.hidden = true;
    renderName();
    nameBtn.focus();
  });

  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      nameForm.hidden = true;
      nameBtn.focus();
    }
  });

  /* ---------- Light / dark mode ---------- */
  var themeBtn = $("theme-btn");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
  }

  var savedTheme = load(KEYS.theme, null);
  if (!savedTheme) {
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    savedTheme = prefersDark ? "dark" : "light";
  }
  applyTheme(savedTheme);

  themeBtn.addEventListener("click", function () {
    var next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    applyTheme(next);
    save(KEYS.theme, next);
  });

  /* ---------- Focus timer ---------- */
  var timerDisplay = $("timer-display");
  var timerStatus = $("timer-status");
  var timerProgress = $("timer-progress");
  var startBtn = $("timer-start");
  var stopBtn = $("timer-stop");
  var resetBtn = $("timer-reset");
  var timerForm = $("timer-form");
  var minutesInput = $("timer-minutes");

  var minutes = Number(load(KEYS.minutes, 25));
  if (!(minutes >= 1 && minutes <= 180)) minutes = 25;

  var remaining = minutes * 60; /* seconds */
  var endAt = 0;
  var tickId = null;

  function formatTime(totalSeconds) {
    var m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    var s = String(totalSeconds % 60).padStart(2, "0");
    return m + ":" + s;
  }

  function renderTimer() {
    timerDisplay.textContent = formatTime(remaining);
    var total = minutes * 60;
    timerProgress.style.width =
      Math.min(100, ((total - remaining) / total) * 100) + "%";
    document.title = tickId
      ? formatTime(remaining) + " - Focus"
      : "Life Dashboard";
  }

  function stopTimer() {
    if (tickId) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function tick() {
    remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    if (remaining === 0) {
      stopTimer();
      timerStatus.textContent = "Time is up. Take a short break.";
    }
    renderTimer();
  }

  startBtn.addEventListener("click", function () {
    if (tickId) return;
    if (remaining === 0) remaining = minutes * 60;
    endAt = Date.now() + remaining * 1000;
    tickId = setInterval(tick, 250);
    timerStatus.textContent = "Focusing...";
    renderTimer();
  });

  stopBtn.addEventListener("click", function () {
    if (!tickId) return;
    tick();
    stopTimer();
    timerStatus.textContent = "Paused";
    renderTimer();
  });

  resetBtn.addEventListener("click", function () {
    stopTimer();
    remaining = minutes * 60;
    timerStatus.textContent = "Ready to focus";
    renderTimer();
  });

  timerForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = Math.round(Number(minutesInput.value));
    if (!(value >= 1 && value <= 180)) {
      timerStatus.textContent = "Choose between 1 and 180 minutes.";
      return;
    }
    minutes = value;
    minutesInput.value = value;
    save(KEYS.minutes, minutes);
    stopTimer();
    remaining = minutes * 60;
    timerStatus.textContent = "Ready to focus";
    renderTimer();
  });

  /* ---------- To-do list ---------- */
  var taskForm = $("task-form");
  var taskInput = $("task-input");
  var taskList = $("task-list");
  var taskEmpty = $("task-empty");
  var taskCount = $("task-count");

  var tasks = load(KEYS.tasks, []);
  var editingId = null;

  function saveTasks() {
    save(KEYS.tasks, tasks);
  }

  function makeButton(label, className, handler) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  function renderTasks() {
    taskList.innerHTML = "";

    tasks.forEach(function (task) {
      var li = document.createElement("li");
      li.className = "task" + (task.done ? " done" : "");

      var check = document.createElement("input");
      check.type = "checkbox";
      check.checked = task.done;
      check.setAttribute("aria-label", "Mark as done: " + task.text);
      check.addEventListener("change", function () {
        task.done = check.checked;
        saveTasks();
        renderTasks();
      });
      li.appendChild(check);

      if (editingId === task.id) {
        var editInput = document.createElement("input");
        editInput.type = "text";
        editInput.maxLength = 120;
        editInput.value = task.text;
        editInput.setAttribute("aria-label", "Edit task");

        var finished = false;
        var commit = function (apply) {
          if (finished) return;
          finished = true;
          var value = editInput.value.trim();
          if (apply && value) {
            task.text = value;
            saveTasks();
          }
          editingId = null;
          renderTasks();
        };

        editInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") commit(true);
          if (e.key === "Escape") commit(false);
        });
        editInput.addEventListener("blur", function () {
          commit(true);
        });

        li.appendChild(editInput);
        taskList.appendChild(li);
        editInput.focus();
        editInput.setSelectionRange(
          editInput.value.length,
          editInput.value.length,
        );
        return;
      }

      var text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      li.appendChild(text);

      var actions = document.createElement("div");
      actions.className = "task-actions";
      actions.appendChild(
        makeButton("Edit", "icon-btn", function () {
          editingId = task.id;
          renderTasks();
        }),
      );
      actions.appendChild(
        makeButton("Delete", "icon-btn danger", function () {
          tasks = tasks.filter(function (t) {
            return t.id !== task.id;
          });
          saveTasks();
          renderTasks();
        }),
      );
      li.appendChild(actions);
      taskList.appendChild(li);
    });

    var doneCount = tasks.filter(function (t) {
      return t.done;
    }).length;
    taskCount.textContent = tasks.length
      ? doneCount + " of " + tasks.length + " done"
      : "";
    taskEmpty.hidden = tasks.length > 0;
  }

  taskForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = taskInput.value.trim();
    if (!value) return;
    tasks.push({ id: newId(), text: value, done: false });
    saveTasks();
    taskInput.value = "";
    renderTasks();
    taskInput.focus();
  });

  /* ---------- Quick links ---------- */
  var linkForm = $("link-form");
  var linkName = $("link-name");
  var linkUrl = $("link-url");
  var linkList = $("link-list");
  var linkEmpty = $("link-empty");
  var linkError = $("link-error");

  var defaultLinks = [
    { id: newId(), name: "Google", url: "https://www.google.com" },
    { id: newId(), name: "GitHub", url: "https://github.com" },
    { id: newId(), name: "YouTube", url: "https://www.youtube.com" },
  ];
  var links = load(KEYS.links, defaultLinks);

  function saveLinks() {
    save(KEYS.links, links);
  }

  function normalizeUrl(input) {
    var value = input.trim();
    if (!/^https?:\/\//i.test(value)) value = "https://" + value;
    try {
      var parsed = new URL(value);
      return parsed.hostname.indexOf(".") > 0 ? parsed.href : null;
    } catch (err) {
      return null;
    }
  }

  function renderLinks() {
    linkList.innerHTML = "";

    links.forEach(function (link) {
      var li = document.createElement("li");
      li.className = "link-item";

      var a = document.createElement("a");
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.name;
      li.appendChild(a);

      var remove = makeButton("\u00D7", "link-remove", function () {
        links = links.filter(function (l) {
          return l.id !== link.id;
        });
        saveLinks();
        renderLinks();
      });
      remove.setAttribute("aria-label", "Remove " + link.name);
      li.appendChild(remove);

      linkList.appendChild(li);
    });

    linkEmpty.hidden = links.length > 0;
  }

  linkForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = linkName.value.trim();
    var url = normalizeUrl(linkUrl.value);
    if (!name) return;
    if (!url) {
      linkError.textContent =
        "That address doesn't look right. Try something like example.com.";
      linkError.hidden = false;
      return;
    }
    linkError.hidden = true;
    links.push({ id: newId(), name: name, url: url });
    saveLinks();
    linkName.value = "";
    linkUrl.value = "";
    renderLinks();
    linkName.focus();
  });

  /* ---------- Start up ---------- */
  minutesInput.value = minutes;
  renderName();
  updateClock();
  setInterval(updateClock, 1000);
  renderTimer();
  renderTasks();
  renderLinks();
})();

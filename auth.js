const USERS_KEY = "falooers-users";
const SESSION_KEY = "falooers-session";
const ADMIN_ACCOUNT = {
  name: "Super Admin",
  email: "admin@falooers.local",
  password: "Admin123!",
  role: "admin"
};

const loginTabButton = document.getElementById("loginTabButton");
const signupTabButton = document.getElementById("signupTabButton");
const authLoginForm = document.getElementById("authLoginForm");
const authEmailInput = document.getElementById("authEmailInput");
const authPasswordInput = document.getElementById("authPasswordInput");
const signupForm = document.getElementById("signupForm");
const signupNameInput = document.getElementById("signupNameInput");
const signupEmailInput = document.getElementById("signupEmailInput");
const signupPasswordInput = document.getElementById("signupPasswordInput");
const authStatus = document.getElementById("authStatus");
const toast = document.getElementById("toast");

function readUsers() {
  const savedUsers = localStorage.getItem(USERS_KEY);
  if (savedUsers) {
    return JSON.parse(savedUsers);
  }

  const defaultUsers = [
    {
      name: "عضو تجريبي",
      email: "user@falooers.local",
      password: "User123!",
      role: "member"
    }
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function setAuthMode(mode) {
  const loginMode = mode === "login";
  loginTabButton.classList.toggle("is-active", loginMode);
  signupTabButton.classList.toggle("is-active", !loginMode);
  authLoginForm.classList.toggle("is-hidden", !loginMode);
  signupForm.classList.toggle("is-hidden", loginMode);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function completeLogin(session) {
  saveSession(session);
  authStatus.innerHTML = `<strong>الحالة الحالية:</strong><span>${session.name}</span>`;
  showToast(`تم تسجيل الدخول باسم ${session.name}.`);

  window.setTimeout(() => {
    const target = session.role === "admin" ? "index.html#admin-panel" : "index.html";
    window.location.href = target;
  }, 650);
}

loginTabButton.addEventListener("click", () => {
  setAuthMode("login");
});

signupTabButton.addEventListener("click", () => {
  setAuthMode("signup");
});

authLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = authEmailInput.value.trim().toLowerCase();
  const password = authPasswordInput.value;

  if (email === ADMIN_ACCOUNT.email && password === ADMIN_ACCOUNT.password) {
    completeLogin({
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      role: ADMIN_ACCOUNT.role
    });
    return;
  }

  const users = readUsers();
  const matchedUser = users.find((user) => {
    return user.email.toLowerCase() === email && user.password === password;
  });

  if (!matchedUser) {
    showToast("بيانات الدخول غير صحيحة.");
    return;
  }

  completeLogin({
    name: matchedUser.name,
    email: matchedUser.email,
    role: "member"
  });
});

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim().toLowerCase();
  const password = signupPasswordInput.value;
  const users = readUsers();

  if (!name || !email || !password) {
    showToast("أكمل بيانات إنشاء الحساب.");
    return;
  }

  if (password.length < 8) {
    showToast("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    return;
  }

  const userExists = users.some((user) => user.email.toLowerCase() === email);
  if (userExists || email === ADMIN_ACCOUNT.email) {
    showToast("هذا البريد مستخدم بالفعل.");
    return;
  }

  const newUser = {
    name,
    email,
    password,
    role: "member"
  };

  users.unshift(newUser);
  saveUsers(users);
  completeLogin({
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  });
});

readUsers();
setAuthMode("login");

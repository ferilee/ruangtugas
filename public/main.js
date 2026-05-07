const state = {
  user: null,
  selectedSubmissionId: null,
  currentView: "dashboard",
  teacherAssignments: [],
  studentAssignments: [],
  studentSubmissions: [],
  currentTrackerData: [],
  adminUsersData: []
};

const el = (id) => document.getElementById(id);

const CLASS_LIST = [
  "X DPIB", "X DTF", "X TKR A", "X TKR B", "X RPL", "X TKJ A", "X TKJ B", "X DKV A", "X DKV B", "X KKKR", "X AKL A", "X AKL B", "X BD A", "X BD B", "X PSPT",
  "XI DPIB", "XI DTF", "XI TKR A", "XI TKR B", "XI RPL", "XI TKJ A", "XI TKJ B", "XI DKV A", "XI DKV B", "XI KKKR", "XI AKL A", "XI AKL B", "XI BD A", "XI BD B", "XI PSPT"
];

function initClassSelectors() {
  const selects = ["aTargetClass", "adminSearchClass", "mClassName", "psClassStudent"];
  selects.forEach(id => {
    const select = el(id);
    if (!select) return;
    CLASS_LIST.forEach(cls => {
      const opt = document.createElement("option");
      opt.value = cls;
      opt.textContent = cls;
      select.appendChild(opt);
    });
  });

  const teacherContainer = el("psClassTeacherContainer");
  if (teacherContainer) {
    CLASS_LIST.forEach(cls => {
      const label = document.createElement("label");
      label.className = "checkbox-item";
      label.innerHTML = `<input type="checkbox" name="teacherClass" value="${cls}"> <span>${cls}</span>`;
      teacherContainer.appendChild(label);
    });
  }
}

const fmt = (value) => (value ? new Date(value).toLocaleString("id-ID") : "-");
const isTeacher = () => state.user?.role === "teacher" || state.user?.role === "admin";

const statusPill = (status, deadline, submittedAt) => {
  const now = Date.now();
  if (status === "graded") return `<span class="pill ok">Graded</span>`;
  if (status === "submitted") return `<span class="pill ok">Submitted</span>`;
  if (deadline && now > new Date(deadline).getTime() && !submittedAt) return `<span class="pill danger">Late</span>`;
  return `<span class="pill warn">Draft</span>`;
};

async function api(path, options) {
  const res = await fetch(`/api${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request gagal");
  return data;
}

async function uploadFile(file) {
  if (!file) return undefined;
  const fd = new FormData();
  fd.append("file", file);
  const result = await api("/upload", { method: "POST", body: fd });
  return result.url;
}

function setLandingVisibility(isLoggedIn) {
  const method = isLoggedIn ? "add" : "remove";
  const inverse = isLoggedIn ? "remove" : "add";
  el("heroSection").classList[method]("hidden");

  el("siteFooter").classList[method]("hidden");
  el("bottomNav").classList[inverse]("hidden");
  if (!isLoggedIn) {
    el("profileSetupView").classList.add("hidden");
  }
}

function switchView(viewId) {
  state.currentView = viewId;
  document.querySelectorAll(".app-page").forEach((p) => p.classList.add("hidden"));
  el(`view-${viewId}`).classList.remove("hidden");

  document.querySelectorAll(".app-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-view") === viewId);
  });
  document.querySelectorAll(".bottom-nav-item").forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === viewId);
  });
  refreshRoleData();
}

async function renderDashboardStats() {
  if (!state.user) return;
  try {
    const stats = await api("/stats/summary");
    el("stat1Label").textContent = "Total Guru";
    el("stat1Value").textContent = String(stats.teachers);
    el("stat2Label").textContent = "Total Murid";
    el("stat2Value").textContent = String(stats.students);
    el("stat3Label").textContent = "Total Tugas";
    el("stat3Value").textContent = String(stats.assignments);
  } catch (e) {
    console.error("Gagal memuat statistik:", e);
  }
}

function showApp(user) {
  state.user = user;
  el("appView").classList.remove("hidden");
  el("profileSetupView").classList.add("hidden");
  setLandingVisibility(true);
  localStorage.setItem("savedUser", JSON.stringify(user));

  const roleLabel = user.role === "teacher" ? "Guru" : user.role === "admin" ? "Admin" : "Murid";
  el("pName").value = user.name;
  el("pEmail").value = user.email;
  el("pRole").value = roleLabel;

  el("teacherTugas").classList.toggle("hidden", !isTeacher());
  el("teacherLaporan").classList.toggle("hidden", !isTeacher());
  el("studentTugas").classList.toggle("hidden", isTeacher());
  el("studentLaporan").classList.toggle("hidden", isTeacher());

  const isAdmin = user.role === "admin";
  el("adminTab").classList.toggle("hidden", !isAdmin);
  el("adminBottomNavItem").classList.toggle("hidden", !isAdmin);

  if (user.pictureUrl) {
    el("navAvatar").src = user.pictureUrl;
    el("navAvatar").classList.remove("hidden");
    el("pAvatar").src = user.pictureUrl;
  } else {
    el("navAvatar").classList.add("hidden");
    el("pAvatar").src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name);
  }

  switchView("dashboard");
  refreshRoleData();
}

function showAuth() {
  state.user = null;
  state.selectedSubmissionId = null;
  state.teacherAssignments = [];
  state.studentAssignments = [];
  state.studentSubmissions = [];
  el("appView").classList.add("hidden");
  setLandingVisibility(false);
  localStorage.removeItem("savedUser");
}

function showProfileSetup(user) {
  state.user = user;
  el("appView").classList.add("hidden");
  setLandingVisibility(true);
  el("profileSetupView").classList.remove("hidden");
  el("psName").value = user.name || "";

  const teacher = isTeacher();
  if (teacher) {
    const selectedClasses = (user.className || "").split(",");
    document.querySelectorAll('input[name="teacherClass"]').forEach(cb => {
      cb.checked = selectedClasses.includes(cb.value);
    });
  } else {
    el("psClassStudent").value = user.className || "";
  }

  el("profileTeacherFields").classList.toggle("hidden", !teacher);
  el("profileStudentFields").classList.toggle("hidden", teacher);
  el("profileSetupDesc").textContent = teacher
    ? "Isi profil guru: nama lengkap, mapel yang diampu, dan pilih kelas yang diampu."
    : "Isi profil murid: nama lengkap, jurusan, dan kelas.";
}

async function onGoogleCredential(response) {
  try {
    const role = el("loginRole").value;
    const data = await api("/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential, role })
    });
    if (data.needsProfile) {
      showProfileSetup(data.user);
      return;
    }
    showApp(data.user);
  } catch (e) {
    alert(e.message);
  }
}

function setGoogleStatus(message) {
  el("googleStatus").textContent = message;
}

function renderGoogleButton(clientId) {
  if (!window.google?.accounts?.id) {
    setGoogleStatus("Google script belum siap.");
    return;
  }
  window.google.accounts.id.initialize({ client_id: clientId, callback: onGoogleCredential });
  const wrap = el("googleBtnWrap");
  wrap.innerHTML = "";
  window.google.accounts.id.renderButton(wrap, {
    theme: "outline",
    size: "large",
    type: "standard",
    text: "signin_with",
    shape: "rectangular"
  });
  setGoogleStatus("Klik tombol Google untuk masuk.");
}

function openGoogleLoginPopup() {
  const wrap = el("googleBtnWrap");
  const googleButton = wrap?.querySelector('div[role="button"], iframe, [aria-labelledby]');
  if (googleButton) {
    googleButton.click();
    return;
  }
  setGoogleStatus("Tombol Google belum siap, tunggu sebentar lalu coba lagi.");
}

async function initGoogleSignIn() {
  try {
    const config = await api("/config");
    if (!config.googleClientId) {
      setGoogleStatus("GOOGLE_CLIENT_ID belum diset di backend.");
      return;
    }
    if (window.google?.accounts?.id) {
      renderGoogleButton(config.googleClientId);
      return;
    }
    const waitForGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(waitForGoogle);
        renderGoogleButton(config.googleClientId);
      }
    }, 250);
  } catch (e) {
    setGoogleStatus(e.message);
  }
}

async function loadTeacherData() {
  const rows = await api(`/assignments?role=teacher&userId=${state.user.id}`);
  state.teacherAssignments = rows;
  el("teacherAssignmentsTable").innerHTML = `
    <thead><tr><th>Judul</th><th>Deadline</th><th>Submission</th><th>Aksi</th></tr></thead>
    <tbody>
      ${
        rows
          .map(
            (r) => `<tr>
          <td>${r.title}</td>
          <td>${fmt(r.deadline)}</td>
          <td>${r.submittedCount}/${r.totalStudents || 0}</td>
          <td><button class="btn-ghost" onclick="openTracker(${r.id}, '${r.title.replaceAll("'", "\\'")}')">Lihat Tracker</button></td>
        </tr>`
          )
          .join("") || '<tr><td colspan="4" class="muted">Belum ada tugas</td></tr>'
      }
    </tbody>`;
}

window.openTracker = async (assignmentId, title) => {
  const rows = await api(`/assignments/${assignmentId}/tracker`);
  state.currentTrackerData = rows;
  el("trackerCard").classList.remove("hidden");
  el("trackerTitle").textContent = title;
  renderTrackerTable();
};

function renderTrackerTable() {
  const nameFilter = el("trackerSearchName").value.toLowerCase();
  const classFilter = el("trackerSearchClass").value.toLowerCase();

  const filtered = state.currentTrackerData.filter(r => 
    (r.studentName || "").toLowerCase().includes(nameFilter) &&
    (r.studentClass || "").toLowerCase().includes(classFilter)
  );

  el("trackerTable").innerHTML = `
    <thead><tr><th>Murid</th><th>Kelas</th><th>Status</th><th>Update</th><th>Nilai</th><th>Aksi</th></tr></thead>
    <tbody>
      ${filtered
        .map((r) => {
          const isSubmitted = r.status === "submitted" || r.status === "graded";
          const gradeBtn = isSubmitted
              ? `<button class="btn btn-primary btn-sm" onclick="gradeSubmission(${r.submissionId}, ${r.score ?? "null"}, '${(r.feedback || "").replaceAll("'", "\\'")}')">Nilai</button>`
              : "";
          const viewBtn = isSubmitted
              ? `<button class="btn btn-ghost btn-sm" onclick="viewSubmission(${r.submissionId})">View</button>`
              : "";
          
          return `<tr>
            <td>${r.studentName}</td>
            <td>${r.studentClass || "-"}</td>
            <td>${statusPill(r.status, null, r.submittedAt)}</td>
            <td>${fmt(r.updatedAt)}</td>
            <td>${r.score ?? "-"}</td>
            <td>
              <div class="action-buttons">
                ${viewBtn}
                ${gradeBtn}
              </div>
            </td>
          </tr>`;
        })
        .join("") || '<tr><td colspan="6" class="muted" style="text-align:center">Tidak ada data ditemukan</td></tr>'}
    </tbody>`;
}

window.viewSubmission = (submissionId) => {
  const sub = state.currentTrackerData.find(s => s.submissionId === submissionId);
  if (!sub) return;

  el("submissionModal").classList.remove("hidden");
  el("subStudentName").textContent = sub.studentName;
  el("subAnswerText").textContent = sub.answerText || "Tidak ada jawaban teks.";
  
  if (sub.answerFileUrl) {
    el("subAnswerFile").innerHTML = `<a href="${sub.answerFileUrl}" target="_blank" class="btn btn-ghost btn-sm" style="width:100%">Buka Lampiran Siswa</a>`;
  } else if (sub.answerLinkUrl) {
    el("subAnswerFile").innerHTML = `<a href="${sub.answerLinkUrl}" target="_blank" class="btn btn-ghost btn-sm" style="width:100%">Buka Link Jawaban</a>`;
  } else {
    el("subAnswerFile").textContent = "Tidak ada lampiran.";
  }
};

window.gradeSubmission = async (submissionId, currentScore, currentFeedback) => {
  const score = prompt("Nilai (0-100)", Number.isFinite(currentScore) ? currentScore : "");
  if (score === null) return;
  const feedback = prompt("Feedback", currentFeedback || "");
  if (feedback === null) return;
  await api(`/submissions/${submissionId}/grade`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score: Number(score), feedback })
  });
  await refreshRoleData();
  alert("Penilaian tersimpan.");
};

async function loadStudentData() {
  const assignments = await api(`/assignments?role=student&userId=${state.user.id}`);
  const subRows = await api(`/student/${state.user.id}/submissions`);
  state.studentAssignments = assignments;
  state.studentSubmissions = subRows;

  if (!state.selectedSubmissionId) {
    el("sTask").value = "";
    el("sInstruction").textContent = "Pilih tugas dari timeline untuk melihat instruksi.";
    el("sAttachment").textContent = "Tidak ada lampiran.";
    el("sAnswer").value = "";
    el("sAnswerLink").value = "";
  }

  renderStudentAssignmentsTable();

  el("gradebookTable").innerHTML = `
    <thead><tr><th>Tugas</th><th>Status</th><th>Nilai</th><th>Feedback</th></tr></thead>
    <tbody>
      ${subRows
        .map(
          (s) => `<tr>
        <td>${s.title}</td>
        <td>${statusPill(s.status, s.deadline, s.submittedAt)}</td>
        <td>${s.score ?? "-"}</td>
        <td>${s.feedback ?? "-"}</td>
      </tr>`
        )
        .join("")}
    </tbody>`;
}

function renderStudentAssignmentsTable() {
  const teacherFilter = el("studentSearchTeacher").value.toLowerCase();
  const filtered = state.studentAssignments.filter(a => 
    (a.teacherName || "").toLowerCase().includes(teacherFilter)
  );

  el("studentAssignmentsTable").innerHTML = `
    <thead><tr><th>Tugas</th><th>Guru</th><th>Deadline</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>
      ${filtered
        .map((a) => {
          const sub = state.studentSubmissions.find((s) => s.assignmentId === a.id);
          const submissionId = sub?.submissionId ?? "null";
          
          const seenAssignments = JSON.parse(localStorage.getItem("seenAssignments") || "[]");
          const isNew = !seenAssignments.includes(a.id);
          const titleHtml = isNew ? `<span style="display:inline-block; width:8px; height:8px; background:#ff4757; border-radius:50%; margin-right:5px;"></span>${a.title}` : a.title;

          return `<tr>
            <td>${titleHtml}</td>
            <td>${a.teacherName}</td>
            <td>${fmt(a.deadline)}</td>
            <td>${statusPill(sub?.status || "draft", a.deadline, sub?.submittedAt)}</td>
            <td><button class="btn-ghost" onclick="selectSubmission(${submissionId}, ${a.id})">Kerjakan</button></td>
          </tr>`;
        })
        .join("") || '<tr><td colspan="5" class="muted" style="text-align:center">Tugas tidak ditemukan</td></tr>'}
    </tbody>`;

  const seenAssignments = JSON.parse(localStorage.getItem("seenAssignments") || "[]");
  const hasNew = state.studentAssignments.some(a => !seenAssignments.includes(a.id));
  el("tugasBadge").classList.toggle("hidden", !hasNew);
}

window.selectSubmission = (submissionId, assignmentId) => {
  state.selectedSubmissionId = submissionId;
  const assignment = state.studentAssignments.find((a) => a.id === assignmentId);
  const submission = state.studentSubmissions.find((s) => s.assignmentId === assignmentId);

  el("sTask").value = assignment?.title || "-";
  el("sAnswer").value = submission?.answerText || "";
  el("sAnswerLink").value = submission?.answerLinkUrl || "";
  el("sInstruction").textContent = assignment?.description || "Tidak ada instruksi.";

  if (assignment?.attachmentUrl) {
    el("sAttachment").innerHTML = `<a href="${assignment.attachmentUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Buka Lampiran File</a>`;
  } else if (assignment?.linkUrl) {
    el("sAttachment").innerHTML = `<a href="${assignment.linkUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Buka Link Sumber</a>`;
  } else {
    el("sAttachment").textContent = "Tidak ada lampiran.";
  }

  const seenAssignments = JSON.parse(localStorage.getItem("seenAssignments") || "[]");
  if (!seenAssignments.includes(assignmentId)) {
    seenAssignments.push(assignmentId);
    localStorage.setItem("seenAssignments", JSON.stringify(seenAssignments));
    refreshRoleData();
  }
};

async function refreshRoleData() {
  if (!state.user) return;
  if (state.currentView === "admin" && state.user.role === "admin") {
    await loadAdminData();
    return;
  }
  if (isTeacher()) {
    await loadTeacherData();
  } else {
    await loadStudentData();
  }
  await renderDashboardStats();
}

async function loadAdminData() {
  const users = await api("/users");
  state.adminUsersData = users;
  renderAdminUsersTable();
}

function renderAdminUsersTable() {
  const query = el("adminSearchQuery").value.toLowerCase();
  const role = el("adminSearchRole").value;
  const classFilter = el("adminSearchClass").value.toLowerCase();

  const filtered = state.adminUsersData.filter(u => {
    const matchesQuery = (u.name || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query);
    const matchesRole = role === "" || u.role === role;
    const matchesClass = (u.className || "").toLowerCase().includes(classFilter);
    return matchesQuery && matchesRole && matchesClass;
  });

  el("adminUsersTable").innerHTML = `
    <thead>
      <tr>
        <th>Nama</th>
        <th>Email</th>
        <th>Role</th>
        <th>Kelas/Info</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody>
      ${filtered
        .map(
          (u) => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td><span class="pill ${u.role === "admin" ? "ok" : u.role === "teacher" ? "warn" : "accent"}">${u.role}</span></td>
          <td>${u.className || "-"} ${u.subject ? `(${u.subject})` : ""} ${u.major ? `(${u.major})` : ""}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-ghost btn-sm" onclick="openUserModal(${u.id})">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})">Hapus</button>
            </div>
          </td>
        </tr>`
        )
        .join("") || '<tr><td colspan="5" class="muted" style="text-align:center">User tidak ditemukan</td></tr>'}
    </tbody>
  `;
}

let editingUserId = null;

window.openUserModal = async (id = null) => {
  editingUserId = id;
  el("userModal").classList.remove("hidden");
  el("modalTitle").textContent = id ? "Edit User" : "Tambah User";
  
  if (id) {
    const user = await api(`/users/${id}`);
    el("mName").value = user.name;
    el("mEmail").value = user.email;
    el("mRole").value = user.role;
    el("mClassName").value = user.className || "";
    el("mSubject").value = user.subject || "";
    el("mMajor").value = user.major || "";
  } else {
    el("mName").value = "";
    el("mEmail").value = "";
    el("mRole").value = "student";
    el("mClassName").value = "";
    el("mSubject").value = "";
    el("mMajor").value = "";
  }
  updateModalFields();
};

function updateModalFields() {
  const role = el("mRole").value;
  el("mTeacherFields").classList.toggle("hidden", role !== "teacher");
  el("mStudentFields").classList.toggle("hidden", role !== "student");
}

el("mRole").addEventListener("change", updateModalFields);

el("addUserBtn").addEventListener("click", () => openUserModal());
el("cancelModalBtn").addEventListener("click", () => el("userModal").classList.add("hidden"));

el("saveUserBtn").addEventListener("click", async () => {
  const payload = {
    name: el("mName").value.trim(),
    email: el("mEmail").value.trim(),
    role: el("mRole").value,
    className: el("mClassName").value.trim() || null,
    subject: el("mRole").value === "teacher" ? el("mSubject").value.trim() : null,
    major: el("mRole").value === "student" ? el("mMajor").value.trim() : null
  };

  try {
    if (editingUserId) {
      await api(`/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await api("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    el("userModal").classList.add("hidden");
    await loadAdminData();
    alert("User berhasil disimpan.");
  } catch (e) {
    alert(e.message);
  }
});

window.deleteUser = async (id) => {
  if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
  try {
    await api(`/users/${id}`, { method: "DELETE" });
    await loadAdminData();
    alert("User berhasil dihapus.");
  } catch (e) {
    alert(e.message);
  }
};

el("logoutBtn").addEventListener("click", showAuth);

el("createAssignmentBtn").addEventListener("click", async () => {
  try {
    const attachmentUrl = await uploadFile(el("aFile").files[0]);
    await api("/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: state.user.id,
        title: el("aTitle").value.trim(),
        description: el("aDescription").value.trim(),
        deadline: new Date(el("aDeadline").value).toISOString(),
        attachmentUrl,
        linkUrl: el("aLink").value.trim() || undefined,
        targetClass: el("aTargetClass").value.trim() || undefined
      })
    });
    el("aTitle").value = "";
    el("aDescription").value = "";
    el("aTargetClass").value = "";
    el("aDeadline").value = "";
    el("aFile").value = "";
    el("aLink").value = "";
    await refreshRoleData();
    alert("Tugas berhasil dibuat.");
  } catch (e) {
    alert(e.message);
  }
});

async function saveSubmission(status) {
  try {
    if (!state.selectedSubmissionId) throw new Error("Pilih tugas dulu dari timeline.");
    const answerFileUrl = await uploadFile(el("sFile").files[0]);
    await api(`/submissions/${state.selectedSubmissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status, 
        answerText: el("sAnswer").value.trim(), 
        answerFileUrl,
        answerLinkUrl: el("sAnswerLink").value.trim() || undefined
      })
    });
    el("sFile").value = "";
    el("sAnswerLink").value = "";
    await refreshRoleData();
    alert(status === "draft" ? "Draft tersimpan." : "Jawaban terkirim.");
  } catch (e) {
    alert(e.message);
  }
}

el("saveDraftBtn").addEventListener("click", () => saveSubmission("draft"));
el("submitBtn").addEventListener("click", () => saveSubmission("submitted"));

el("saveProfileBtn").addEventListener("click", async () => {
  try {
    if (!state.user) throw new Error("Sesi login tidak ditemukan.");
    const teacher = isTeacher();
    let className = "";
    if (teacher) {
      className = Array.from(document.querySelectorAll('input[name="teacherClass"]:checked'))
        .map(cb => cb.value)
        .join(",");
    } else {
      className = el("psClassStudent").value.trim();
    }
    const payload = {
      name: el("psName").value.trim(),
      subject: teacher ? el("psSubject").value.trim() : undefined,
      major: teacher ? undefined : el("psMajor").value.trim(),
      className
    };
    const data = await api(`/users/${state.user.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showApp(data.user);
  } catch (e) {
    alert(e.message);
  }
});

document.querySelectorAll(".app-tab").forEach((item) => {
  item.addEventListener("click", () => switchView(item.getAttribute("data-view")));
});

document.querySelectorAll(".bottom-nav-item").forEach((item) => {
  item.addEventListener("click", () => switchView(item.getAttribute("data-view")));
});

el("startNowBtn").addEventListener("click", async () => {
  await initGoogleSignIn();
  setTimeout(openGoogleLoginPopup, 250);
});


el("trackerSearchName").addEventListener("input", renderTrackerTable);
el("trackerSearchClass").addEventListener("input", renderTrackerTable);

el("adminSearchQuery").addEventListener("input", renderAdminUsersTable);
el("adminSearchRole").addEventListener("change", renderAdminUsersTable);
el("adminSearchClass").addEventListener("input", renderAdminUsersTable);

el("studentSearchTeacher").addEventListener("input", renderStudentAssignmentsTable);

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  el("installContainer").classList.remove("hidden");
});

el("installAppBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    el("installContainer").classList.add("hidden");
  }
  deferredPrompt = null;
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed:', err));
  });
}

const savedUser = localStorage.getItem("savedUser");
if (savedUser) {
  showApp(JSON.parse(savedUser));
} else {
  showAuth();
}
initClassSelectors();
initGoogleSignIn();

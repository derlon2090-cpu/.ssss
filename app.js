const SESSION_KEY = "falooers-session";

const campaigns = [
  {
    id: 1,
    handle: "@founder.ksa",
    link: "https://www.tiktok.com/@founder.ksa",
    title: "مقاطع قصيرة عن ريادة الأعمال والبيع الرقمي",
    category: "ريادة",
    region: "السعودية",
    reward: 36,
    score: 92,
    reach: 4200,
    spent: 1280,
    opens: 318,
    status: "approved"
  },
  {
    id: 2,
    handle: "@studyloop.ar",
    link: "https://www.tiktok.com/@studyloop.ar",
    title: "شرح مبسط للدراسة والمنح والمهارات الرقمية",
    category: "تعليم",
    region: "العالم العربي",
    reward: 28,
    score: 88,
    reach: 2800,
    spent: 840,
    opens: 174,
    status: "approved"
  },
  {
    id: 3,
    handle: "@devlens.io",
    link: "https://www.tiktok.com/@devlens.io",
    title: "تحديثات تقنية وأدوات إنتاجية لصناع المحتوى",
    category: "تقنية",
    region: "الإمارات",
    reward: 42,
    score: 95,
    reach: 3600,
    spent: 960,
    opens: 251,
    status: "pending"
  }
];

const members = [
  {
    id: 1,
    name: "سارة العتيبي",
    email: "sara@example.com",
    link: "https://www.tiktok.com/@sara",
    interest: "ريادة",
    consented: true,
    invitations: 14
  },
  {
    id: 2,
    name: "عبدالله الشمري",
    email: "abdullah@example.com",
    link: "https://www.tiktok.com/@abdullah",
    interest: "تقنية",
    consented: true,
    invitations: 9
  },
  {
    id: 3,
    name: "لمياء المدني",
    email: "lamia@example.com",
    link: "https://www.tiktok.com/@lamia",
    interest: "تعليم",
    consented: false,
    invitations: 3
  }
];

const adminRoles = [
  {
    key: "super_admin",
    title: "Super Admin",
    description: "يملك صلاحية اعتماد الحملات وإدارة الأعضاء وتعديل مستويات الثقة.",
    permissions: [
      "اعتماد الحملات أو تعليقها",
      "إضافة أعضاء الشبكة وتعديل موافقتهم",
      "الوصول إلى سجل النشاط الكامل"
    ]
  },
  {
    key: "campaign_manager",
    title: "Campaign Manager",
    description: "يراجع الحملات ويرتب الأولويات ويراقب جودة الروابط والوصف.",
    permissions: [
      "مراجعة الطلبات الجديدة",
      "تعديل حالة الحملة",
      "الاطلاع على تقارير الفتح والاستكشاف"
    ]
  },
  {
    key: "trust_reviewer",
    title: "Trust Reviewer",
    description: "يراقب الثقة وجودة الحسابات والتزام أعضاء الشبكة بالرد.",
    permissions: [
      "مراجعة حالات الموافقة",
      "متابعة الانخفاض في النشاط",
      "رفع تنبيهات للإدارة"
    ]
  }
];

const promoSchedules = [
  {
    id: 1,
    platform: "X / Twitter",
    handle: "@storepulse_sa",
    profileLink: "https://x.com/storepulse_sa",
    storeLink: "https://store.example.com",
    publishTime: "20:00",
    copy: "عرض اليوم وصل. اطلب الآن من المتجر واستفد من الخصم قبل نهاية الليلة.",
    status: "مجدول للمراجعة"
  },
  {
    id: 2,
    platform: "Instagram",
    handle: "@storepulse.sa",
    profileLink: "https://www.instagram.com/storepulse.sa",
    storeLink: "https://store.example.com",
    publishTime: "21:30",
    copy: "منتجات مختارة بعناية وروابط شراء مباشرة داخل المتجر. اكتشف المجموعة الجديدة الآن.",
    status: "جاهز للنشر عبر الربط الرسمي"
  }
];

const discoveryGrid = document.getElementById("discoveryGrid");
const filterButtons = document.querySelectorAll(".filter-chip");
const toast = document.getElementById("toast");

const handleInput = document.getElementById("handleInput");
const linkInput = document.getElementById("linkInput");
const categoryInput = document.getElementById("categoryInput");
const regionInput = document.getElementById("regionInput");
const reachInput = document.getElementById("reachInput");
const rewardInput = document.getElementById("rewardInput");
const pitchInput = document.getElementById("pitchInput");
const campaignForm = document.getElementById("campaignForm");

const schedulerForm = document.getElementById("schedulerForm");
const schedulePlatformInput = document.getElementById("schedulePlatformInput");
const scheduleHandleInput = document.getElementById("scheduleHandleInput");
const scheduleProfileInput = document.getElementById("scheduleProfileInput");
const scheduleStoreInput = document.getElementById("scheduleStoreInput");
const scheduleTimeInput = document.getElementById("scheduleTimeInput");
const scheduleTextInput = document.getElementById("scheduleTextInput");
const scheduleList = document.getElementById("scheduleList");
const scheduledCountValue = document.getElementById("scheduledCountValue");
const nextPublishValue = document.getElementById("nextPublishValue");

const reachValue = document.getElementById("reachValue");
const summaryHandle = document.getElementById("summaryHandle");
const summaryCategory = document.getElementById("summaryCategory");
const summaryRegion = document.getElementById("summaryRegion");
const summaryPoints = document.getElementById("summaryPoints");
const summaryReward = document.getElementById("summaryReward");
const summaryEstimate = document.getElementById("summaryEstimate");
const summaryPitch = document.getElementById("summaryPitch");

const pointsValue = document.getElementById("pointsValue");
const campaignCount = document.getElementById("campaignCount");
const trustValue = document.getElementById("trustValue");
const networkMembersValue = document.getElementById("networkMembersValue");
const approvalRateValue = document.getElementById("approvalRateValue");
const heroProgressValue = document.getElementById("heroProgressValue");
const heroProgressBar = document.getElementById("heroProgressBar");
const heroCampaignHandle = document.getElementById("heroCampaignHandle");
const heroCampaignText = document.getElementById("heroCampaignText");
const heroReachValue = document.getElementById("heroReachValue");
const heroVisitsValue = document.getElementById("heroVisitsValue");
const heroSpentValue = document.getElementById("heroSpentValue");

const adminPanel = document.getElementById("admin-panel");
const adminRoleTitle = document.getElementById("adminRoleTitle");
const adminRoleText = document.getElementById("adminRoleText");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const permissionsGrid = document.getElementById("permissionsGrid");
const membersTableBody = document.getElementById("membersTableBody");
const campaignsTableBody = document.getElementById("campaignsTableBody");
const activityList = document.getElementById("activityList");
const consentedMembersValue = document.getElementById("consentedMembersValue");
const approvedCampaignsValue = document.getElementById("approvedCampaignsValue");
const openedLinksValue = document.getElementById("openedLinksValue");

const memberForm = document.getElementById("memberForm");
const memberNameInput = document.getElementById("memberNameInput");
const memberEmailInput = document.getElementById("memberEmailInput");
const memberLinkInput = document.getElementById("memberLinkInput");
const memberInterestInput = document.getElementById("memberInterestInput");
const memberConsentInput = document.getElementById("memberConsentInput");

let availablePoints = 2480;
let currentUser = null;
let activityFeed = [
  "تم اعتماد حملة @founder.ksa وربطها بفئة ريادة.",
  "أضاف الأدمن عضوًا جديدًا إلى قائمة الاستكشاف.",
  "تم تعليق حملة @devlens.io بانتظار مراجعة الوصف."
];
let adminSession = null;

function formatNumber(value) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function calculatePoints(reach) {
  return Math.round(reach * 0.3);
}

function calculateEstimate(reach) {
  const min = Math.round(reach * 0.026);
  const max = Math.round(reach * 0.048);
  return `${formatNumber(min)} - ${formatNumber(max)} تفاعلًا`;
}

function normalizeHandle(value) {
  if (!value.trim()) {
    return "@brand_name";
  }
  return value.trim().startsWith("@") ? value.trim() : `@${value.trim()}`;
}

function statusPill(status) {
  if (status === "approved") {
    return '<span class="pill pill-success">معتمد</span>';
  }
  if (status === "pending") {
    return '<span class="pill pill-warning">قيد المراجعة</span>';
  }
  return '<span class="pill pill-danger">معلّق</span>';
}

function memberPill(consented) {
  return consented
    ? '<span class="pill pill-success">موافق</span>'
    : '<span class="pill pill-danger">غير مفعل</span>';
}

function updateCampaignSummary() {
  const handle = normalizeHandle(handleInput.value);
  const category = categoryInput.value;
  const region = regionInput.value;
  const reach = Number(reachInput.value);
  const points = calculatePoints(reach);
  const reward = Number(rewardInput.value || 0);
  const pitch = pitchInput.value.trim();

  reachValue.textContent = formatNumber(reach);
  summaryHandle.textContent = handle;
  summaryCategory.textContent = category;
  summaryRegion.textContent = region;
  summaryPoints.textContent = formatNumber(points);
  summaryReward.textContent = formatNumber(reward);
  summaryEstimate.textContent = calculateEstimate(reach);
  summaryPitch.textContent =
    pitch || "سيظهر وصف الحملة هنا فور كتابة نبذة مختصرة عن الحساب أو العرض.";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function pushActivity(message) {
  activityFeed.unshift(message);
  activityFeed = activityFeed.slice(0, 8);
  renderActivityFeed();
}

function renderActivityFeed() {
  activityList.innerHTML = activityFeed
    .map((item, index) => `<li>${item}<small>سجل داخلي #${index + 1}</small></li>`)
    .join("");
}

function renderPermissions() {
  permissionsGrid.innerHTML = adminRoles
    .map((role) => {
      return `
        <article class="permission-card">
          <span class="card-label">${role.title}</span>
          <strong>${role.description}</strong>
          <p>${role.permissions.join(" • ")}</p>
        </article>
      `;
    })
    .join("");
}

function renderCampaignCards(activeFilter = "الكل") {
  const filteredCampaigns = campaigns.filter((campaign) => {
    return (activeFilter === "الكل" || campaign.category === activeFilter) && campaign.status !== "suspended";
  });

  discoveryGrid.innerHTML = filteredCampaigns
    .map((campaign) => {
      return `
        <article class="discovery-card">
          <header>
            <span class="card-label">فرصة موصى بها</span>
            <h3>${campaign.handle}</h3>
          </header>
          <div class="content">
            <div class="meta">
              <span>${campaign.category}</span>
              <span>${campaign.region}</span>
              <span>ثقة ${campaign.score}%</span>
            </div>
            <p>${campaign.title}</p>
            <div class="card-actions">
              <strong>${formatNumber(campaign.reward)} نقطة</strong>
              <div class="action-row">
                <a class="button button-secondary" href="${campaign.link}" target="_blank" rel="noreferrer">فتح الحساب</a>
                <button class="engage-button" data-id="${campaign.id}" data-action="viewed" type="button">
                  تم الاطلاع
                </button>
                <button class="engage-button" data-id="${campaign.id}" data-action="skip" type="button">
                  تخطي
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".engage-button").forEach((button) => {
    button.addEventListener("click", () => {
      const campaignId = Number(button.dataset.id);
      const action = button.dataset.action;
      const campaign = campaigns.find((item) => item.id === campaignId);

      if (!campaign) {
        return;
      }

      if (action === "viewed") {
        availablePoints += campaign.reward;
        campaign.opens += 1;
        pushActivity(`تم تسجيل اطلاع جديد على ${campaign.handle} وإضافة ${campaign.reward} نقطة.`);
        showToast(`تم احتساب ${campaign.reward} نقطة بعد الاطلاع على ${campaign.handle}.`);
      } else {
        pushActivity(`تم تخطي حملة ${campaign.handle} من أحد الأعضاء داخل اللوحة.`);
        showToast(`تم تسجيل تخطي للحملة ${campaign.handle}.`);
      }

      updateMetrics();
      renderCampaignCards(document.querySelector(".filter-chip.is-active")?.dataset.filter || "الكل");
      renderCampaignsTable();
    });
  });
}

function renderMembersTable() {
  membersTableBody.innerHTML = members
    .map((member) => {
      return `
        <tr>
          <td>
            <strong>${member.name}</strong><br>
            <small>${member.email}</small>
          </td>
          <td>${member.interest}</td>
          <td>${memberPill(member.consented)}</td>
          <td>${formatNumber(member.invitations)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCampaignsTable() {
  campaignsTableBody.innerHTML = campaigns
    .map((campaign) => {
      return `
        <tr>
          <td>
            <strong>${campaign.handle}</strong><br>
            <small>${campaign.link}</small>
          </td>
          <td>${campaign.category}</td>
          <td>${statusPill(campaign.status)}</td>
          <td>
            <div class="table-actions">
              <button class="tiny-button" data-campaign-id="${campaign.id}" data-status="approved" type="button">اعتماد</button>
              <button class="tiny-button warn" data-campaign-id="${campaign.id}" data-status="pending" type="button">مراجعة</button>
              <button class="tiny-button danger" data-campaign-id="${campaign.id}" data-status="suspended" type="button">تعليق</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-campaign-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!adminSession) {
        showToast("سجّل دخول الأدمن أولاً لتغيير حالة الحملة.");
        return;
      }

      const campaignId = Number(button.dataset.campaignId);
      const nextStatus = button.dataset.status;
      const campaign = campaigns.find((item) => item.id === campaignId);

      if (!campaign) {
        return;
      }

      campaign.status = nextStatus;
      pushActivity(`غيّر الأدمن حالة ${campaign.handle} إلى ${button.textContent.trim()}.`);
      updateMetrics();
      renderCampaignsTable();
      renderCampaignCards(document.querySelector(".filter-chip.is-active")?.dataset.filter || "الكل");
      showToast(`تم تحديث حالة ${campaign.handle}.`);
    });
  });
}

function renderPromoSchedules() {
  scheduleList.innerHTML = promoSchedules
    .map((schedule) => {
      return `
        <article class="schedule-item">
          <div class="schedule-item-head">
            <div>
              <span class="pill pill-success">${schedule.platform}</span>
              <strong>${schedule.handle}</strong>
            </div>
            <span class="pill pill-warning">${schedule.publishTime}</span>
          </div>
          <p>${schedule.copy} ${schedule.storeLink}</p>
          <div class="schedule-links">
            <a href="${schedule.profileLink}" target="_blank" rel="noreferrer">فتح الحساب</a>
            <a href="${schedule.storeLink}" target="_blank" rel="noreferrer">فتح المتجر</a>
            <span class="pill pill-warning">${schedule.status}</span>
          </div>
        </article>
      `;
    })
    .join("");

  scheduledCountValue.textContent = formatNumber(promoSchedules.length);
  const sortedTimes = [...promoSchedules].map((schedule) => schedule.publishTime).sort();
  nextPublishValue.textContent = sortedTimes[0] || "--:--";
}

function updateMetrics() {
  const approvedCampaigns = campaigns.filter((campaign) => campaign.status === "approved").length;
  const consentedMembers = members.filter((member) => member.consented).length;
  const totalOpens = campaigns.reduce((sum, campaign) => sum + campaign.opens, 0);
  const featuredCampaign = campaigns[0];
  const activeCampaigns = campaigns.filter((campaign) => campaign.status !== "suspended").length;
  const approvalRate = Math.round((approvedCampaigns / Math.max(campaigns.length, 1)) * 100);
  const trust = Math.min(99, 84 + consentedMembers);

  pointsValue.textContent = formatNumber(availablePoints);
  campaignCount.textContent = formatNumber(activeCampaigns);
  trustValue.textContent = `${trust}%`;
  networkMembersValue.textContent = formatNumber(members.length * 37 + 37);
  approvalRateValue.textContent = `${approvalRate}%`;

  consentedMembersValue.textContent = formatNumber(consentedMembers);
  approvedCampaignsValue.textContent = formatNumber(approvedCampaigns);
  openedLinksValue.textContent = formatNumber(totalOpens);

  if (featuredCampaign) {
    heroCampaignHandle.textContent = featuredCampaign.handle;
    heroCampaignText.textContent = featuredCampaign.title;
    heroReachValue.textContent = formatNumber(featuredCampaign.reach);
    heroVisitsValue.textContent = formatNumber(featuredCampaign.opens);
    heroSpentValue.textContent = formatNumber(featuredCampaign.spent);
    const progress = Math.min(96, Math.round((featuredCampaign.opens / Math.max(featuredCampaign.reach, 1)) * 100));
    heroProgressValue.textContent = `${progress}%`;
    heroProgressBar.style.width = `${progress}%`;
  }
}

function setAdminSession(roleKey) {
  adminSession = adminRoles.find((role) => role.key === roleKey) || adminRoles[0];
  adminRoleTitle.textContent = adminSession.title;
  adminRoleText.textContent = adminSession.description;
  adminPanel.classList.remove("is-admin-hidden");
  currentUser = {
    name: adminSession.title,
    email: "admin@falooers.local",
    role: "admin"
  };
  if (window.location.hash === "#admin-panel") {
    window.setTimeout(() => {
      adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }
}

function setMemberSession(user) {
  currentUser = user;
  adminSession = null;
  adminPanel.classList.add("is-admin-hidden");
}

function readSession() {
  const savedSession = localStorage.getItem(SESSION_KEY);
  return savedSession ? JSON.parse(savedSession) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function applySessionState() {
  const session = readSession();
  if (!session) {
    currentUser = null;
    adminSession = null;
    adminPanel.classList.add("is-admin-hidden");
    return;
  }

  if (session.role === "admin") {
    setAdminSession("super_admin");
    return;
  }

  setMemberSession(session);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((chip) => chip.classList.remove("is-active"));
    button.classList.add("is-active");
    renderCampaignCards(button.dataset.filter);
  });
});

[handleInput, linkInput, categoryInput, regionInput, reachInput, rewardInput, pitchInput].forEach((input) => {
  input.addEventListener("input", updateCampaignSummary);
});

campaignForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const handle = normalizeHandle(handleInput.value);
  const link = linkInput.value.trim();
  const category = categoryInput.value;
  const region = regionInput.value;
  const reach = Number(reachInput.value);
  const reward = Number(rewardInput.value);
  const pointsNeeded = calculatePoints(reach);

  if (pointsNeeded > availablePoints) {
    showToast("رصيد النقاط الحالي لا يكفي لهذه الحملة. زد التفاعل أولاً أو خفف فرص الظهور.");
    return;
  }

  campaigns.unshift({
    id: Date.now(),
    handle,
    link,
    title: pitchInput.value.trim() || "حملة جديدة داخل شبكة الاكتشاف.",
    category,
    region,
    reward,
    score: 89,
    reach,
    spent: pointsNeeded,
    opens: 0,
    status: "pending"
  });

  availablePoints -= pointsNeeded;

  pushActivity(`أضيفت حملة جديدة ${handle} إلى الشبكة بانتظار اعتماد الأدمن.`);
  showToast(`تمت إضافة الحملة ${handle} إلى قائمة الاكتشاف.`);

  campaignForm.reset();
  reachInput.value = "2500";
  rewardInput.value = "30";
  updateCampaignSummary();
  updateMetrics();
  renderCampaignCards(document.querySelector(".filter-chip.is-active")?.dataset.filter || "الكل");
  renderCampaignsTable();
});

schedulerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    showToast("سجّل الدخول أولًا من صفحة الدخول لإضافة خطة نشر.");
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 700);
    return;
  }

  promoSchedules.unshift({
    id: Date.now(),
    platform: schedulePlatformInput.value,
    handle: normalizeHandle(scheduleHandleInput.value),
    profileLink: scheduleProfileInput.value.trim(),
    storeLink: scheduleStoreInput.value.trim(),
    publishTime: scheduleTimeInput.value,
    copy: scheduleTextInput.value.trim(),
    status: "مجدول للمراجعة"
  });

  pushActivity(`تمت إضافة خطة نشر يومية لحساب ${normalizeHandle(scheduleHandleInput.value)} على ${schedulePlatformInput.value}.`);
  showToast("تمت إضافة خطة النشر اليومية إلى القائمة المنظمة.");
  schedulerForm.reset();
  scheduleTimeInput.value = "20:00";
  renderPromoSchedules();
});

adminLogoutButton.addEventListener("click", () => {
  currentUser = null;
  adminSession = null;
  adminRoleTitle.textContent = "Super Admin";
  adminRoleText.textContent = "يملك صلاحية اعتماد الحملات وإدارة الأعضاء وتعديل مستويات الثقة.";
  adminPanel.classList.add("is-admin-hidden");
  clearSession();
  showToast("تم تسجيل الخروج من لوحة الأدمن.");
  window.setTimeout(() => {
    window.location.href = "login.html";
  }, 600);
});

memberForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!adminSession) {
    showToast("سجّل دخول الأدمن أولاً لإضافة عضو جديد.");
    return;
  }

  const name = memberNameInput.value.trim();
  const email = memberEmailInput.value.trim();
  const link = memberLinkInput.value.trim();

  if (!name || !email || !link) {
    showToast("أكمل بيانات العضو قبل الحفظ.");
    return;
  }

  members.unshift({
    id: Date.now(),
    name,
    email,
    link,
    interest: memberInterestInput.value,
    consented: memberConsentInput.checked,
    invitations: 0
  });

  pushActivity(`أضاف الأدمن العضو ${name} إلى قائمة الشبكة الحقيقية.`);
  showToast(`تمت إضافة ${name} إلى لوحة الأدمن.`);
  memberForm.reset();
  memberConsentInput.checked = true;
  renderMembersTable();
  updateMetrics();
});

updateCampaignSummary();
renderPermissions();
renderCampaignCards();
renderPromoSchedules();
renderMembersTable();
renderCampaignsTable();
renderActivityFeed();
applySessionState();
updateMetrics();

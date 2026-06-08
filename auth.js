const authModal = document.getElementById("authModal");
const openAuthModal = document.getElementById("openAuthModal");
const closeAuthModal = document.getElementById("closeAuthModal");

let adminRefreshStarted = false;

let myBookingsRefreshStarted = false;

let currentUserRole = null;
let currentAppSection = "home";

const STUDIO_SETTINGS = {
  maxSpotsPerLesson: 13,
  weeklyBookingLimit: 3
};

const SITE_URL = window.location.origin;

document.addEventListener("keydown", function(event) {
  if (event.key !== "Enter") return;

  const modalIsOpen = authModal.style.display === "flex";

  if (!modalIsOpen) return;

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm.style.display !== "none") {
    loginUser();
  }

  if (registerForm.style.display !== "none") {
    registerUser();
  }
});

openAuthModal.onclick = () => {
  authModal.style.display = "flex";
  showLogin();
};

closeAuthModal.onclick = () => {
  authModal.style.display = "none";
};

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("authMessage").innerText = "";
}

function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  document.getElementById("authMessage").innerText = "";
}

async function registerUser() {
  const nome = document.getElementById("registerName").value.trim();
  const telefono = document.getElementById("registerPhone").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const message = document.getElementById("authMessage");

  if (!nome || !telefono || !email || !password) {
    message.innerText = "Compila tutti i campi.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
  if (
    error.message.includes("Invalid login credentials")
  ) {
    message.innerText =
      "Email o password non corretti.";
  } else {
    message.innerText =
      "Errore durante l'accesso. Riprova.";
  }

  return;
}

  const user = data.user;

  const { error: profileError } = await supabaseClient
    .from("profiles")
    .insert([
      {
        id: user.id,
        nome,
        telefono,
        email,
        ruolo: "cliente",
        approvato: false
      }
    ]);

  if (profileError) {
    message.innerText = profileError.message;
    return;
  }

  try {
    await emailjs.send(
      "service_g0bjzrk",
      "template_hrmqe0j",
      {
        user_name: nome,
        user_phone: telefono,
        user_email: email
      }
    );
  } catch (emailError) {
    console.log(emailError);
  }

  message.style.color = "#2e7d32";
  message.innerText =
    "✅ Richiesta di iscrizione inviata correttamente. Attendi approvazione dall'admin.";

  document.getElementById("registerName").value = "";
  document.getElementById("registerPhone").value = "";
  document.getElementById("registerEmail").value = "";
  document.getElementById("registerPassword").value = "";
}

async function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const message = document.getElementById("authMessage");

  if (!email || !password) {
    message.innerText = "Inserisci email e password.";
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.innerText = error.message;
    return;
  }

  const user = data.user;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    message.innerText = "Profilo utente non trovato.";
    return;
  }

  if (!profile.approvato) {
    message.innerText = "⏳ Account in attesa approvazione.";
    return;
  }

  authModal.style.display = "none";
  updateLoggedInterface(profile);
}

async function updateLoggedInterface(profile) {
  currentUserRole =
    (profile.ruolo || "").toLowerCase().trim();
    document.body.classList.add("logged-in");

  currentAppSection = "home";

  const openAuthModal =
    document.getElementById("openAuthModal");

  const userArea =
    document.getElementById("userArea");

  const appNav =
    document.getElementById("appNav");

  const aboutSection =
    document.querySelector(".about-section");

  const welcomeUser =
    document.getElementById("welcomeUser");

  const dashboardGreeting =
    document.getElementById("dashboardGreeting");

  if (openAuthModal) {
    openAuthModal.style.display = "none";
  }

  if (userArea) {
    userArea.style.display = "flex";
  }

  if (appNav) {
    appNav.style.display = "flex";
  }

const bookingNavButton =
  document.querySelector("#appNav button:nth-child(2)");

if (bookingNavButton) {
  if (currentUserRole === "admin") {
    bookingNavButton.innerText = "📊 Agenda";
    bookingNavButton.setAttribute(
      "onclick",
      "showAdminAgenda()"
    );
  } else {
    bookingNavButton.innerText = "📅 Prenota";
    bookingNavButton.setAttribute(
      "onclick",
      "showAppSection('booking')"
    );
  }
}

  if (aboutSection) {
    aboutSection.style.display = "none";
  }

  if (welcomeUser) {
    welcomeUser.innerText =
      `Ciao ${profile.nome} 👋`;
  }

  if (dashboardGreeting) {
    dashboardGreeting.innerText =
      `Ciao ${profile.nome}! 👋`;
  }

 await goHome();

if (currentUserRole !== "admin" && !myBookingsRefreshStarted) {
  myBookingsRefreshStarted = true;

  setInterval(() => {
    if (currentAppSection === "home") {
      loadMyBookings();
    }
  }, 3000);
}
}

async function forgotPassword() {
  const email =
    document.getElementById("loginEmail").value.trim().toLowerCase();

  if (!email) {
    alert("Inserisci prima la tua email nel campo Email.");
    return;
  }

  const { data: exists, error: checkError } =
    await supabaseClient.rpc(
      "email_exists_for_password_reset",
      {
        user_email: email
      }
    );

  if (checkError) {
    alert("Errore controllo email.");
    return;
  }

  if (!exists) {
    alert("Nessun account approvato registrato con questa email.");
    return;
  }

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
  SITE_URL + "/index.html"
      }
    );

  if (error) {
    alert("Errore invio email: " + error.message);
    return;
  }

  alert(
    "Ti abbiamo inviato una mail per reimpostare la password."
  );
}

async function loadAdminPanel() {
  const adminPanel = document.getElementById("adminPanel");
  const adminAgendaPanel =
  document.getElementById("adminAgendaPanel");

  if (!adminPanel) return;

  adminPanel.style.display = "block";

  const { count: usersCount } = await supabaseClient
    .from("profiles")
    .select("*", {
      count: "exact",
      head: true
    });

  document.getElementById("totalUsers").innerText =
    usersCount || 0;

  const { count: pendingCount } = await supabaseClient
    .from("profiles")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("approvato", false);

  document.getElementById("pendingUsersCount").innerText =
    pendingCount || 0;

  const { count: bookingsCount } = await supabaseClient
    .from("prenotazioni")
    .select("*", {
      count: "exact",
      head: true
    });

  document.getElementById("totalBookings").innerText =
    bookingsCount || 0;

  const { count: waitingCount } = await supabaseClient
    .from("attesa")
    .select("*", {
      count: "exact",
      head: true
    });

  document.getElementById("waitingList").innerText =
    waitingCount || 0;

  const { count: closuresCount } = await supabaseClient
    .from("chiusure")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("attiva", true);

  const { count: newsCount } = await supabaseClient
    .from("news")
    .select("*", {
      count: "exact",
      head: true
    })
    .eq("attiva", true);

  await loadPendingUsers();
  await loadClosuresAdmin();

  if (!adminRefreshStarted) {
    adminRefreshStarted = true;

    setInterval(() => {
      loadPendingUsers();
      loadAdminPanel();
    }, 5000);
  }
}

async function loadPendingUsers() {
  const pendingUsers = document.getElementById("pendingUsers");

  if (!pendingUsers) return;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("*");

  if (error) {
    console.log(error);
    pendingUsers.innerHTML = "<p>Errore caricamento utenti.</p>";
    return;
  }

  const pendingOnly =
    users.filter(user => user.approvato === false);

  pendingUsers.innerHTML = "";

  if (pendingOnly.length === 0) {
    pendingUsers.innerHTML = "<p>Nessun utente in attesa</p>";
    return;
  }

  pendingOnly.forEach(user => {
    pendingUsers.innerHTML += `
      <div class="pending-user">
        <div>
          <strong>${user.nome}</strong>
          <small>${user.telefono}</small>
          <small>${user.email || ""}</small>
        </div>

        <button onclick="approveUser('${user.id}')">
          Approva
        </button>
      </div>
    `;
  });
}

async function approveUser(userId) {
  const { data: userProfile, error: readError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (readError || !userProfile) {
    alert("Errore recupero utente.");
    return;
  }

  const { error } = await supabaseClient
    .from("profiles")
    .update({ approvato: true })
    .eq("id", userId);

  if (error) {
    alert(error.message);
    return;
  }

  emailjs.send(
    "service_g0bjzrk",
    "template_9wyut78",
    {
      user_email: userProfile.email,
      subject: "Iscrizione approvata - PilateSisters",
      message:
`Ciao ${userProfile.nome},

la tua iscrizione a PilateSisters è stata approvata.

Ora puoi accedere al sito e prenotare le tue lezioni 😊

A presto,
PilateSisters`
    }
  );

  alert("✅ Utente approvato ed email inviata");

  loadPendingUsers();
}

async function checkUserSession() {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError) {
    console.log(sessionError);
    return;
  }

  const session = sessionData.session;

  if (!session) return;

  const user = session.user;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.log(error);
    return;
  }

  if (!profile.approvato) {
    return;
  }

  updateLoggedInterface(profile);
}

function formatItalianDate(dateString) {
  const [year, month, day] =
    dateString.split("-").map(Number);

  const date =
    new Date(year, month - 1, day);

  return date.toLocaleDateString(
    "it-IT",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function formatSlotName(slot) {
  const [day, time] = slot.split("-");

  const days = {
    lunedi: "Lunedì",
    martedi: "Martedì",
    mercoledi: "Mercoledì",
    giovedi: "Giovedì",
    venerdi: "Venerdì"
  };

  const times = {
    "9": "09:00",
    "17": "17:00",
    "1815": "18:15",
    "1930": "19:30"
  };

  return `${days[day]} · ${times[time] || time}`;
}

function getLessonType(slot) {
  return slot.endsWith("-9")
    ? "Pilates Posturale"
    : "Pilates Matwork";
}

async function loadMyBookings() {

  await loadNews();

  await loadImportantNews();

  const myBookingsSection =
    document.getElementById("myBookingsSection");

  const myBookings =
    document.getElementById("myBookings");

  const myPastBookings =
    document.getElementById("myPastBookings");

  const myWaitingList =
    document.getElementById("myWaitingList");

    const pastBookingsSummary =
  document.getElementById("pastBookingsSummary");

const waitingListSummary =
  document.getElementById("waitingListSummary");

  const bookingCounter =
    document.getElementById("weeklyBookingCounter");
    const nextLessonCard =
  document.getElementById("nextLessonCard");

  if (
    !myBookingsSection ||
    !myBookings ||
    !myPastBookings ||
    !myWaitingList
  ) return;

  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session = sessionData.session;

  if (!session) return;

  if (currentAppSection === "home") {
  myBookingsSection.style.display = "block";
}

  const userEmail = session.user.email;

  const { data: bookings, error: bookingsError } = await supabaseClient
    .from("prenotazioni")
    .select("*")
    .eq("email", userEmail)
    .order("data_lezione", { ascending: true });

  const { data: waiting, error: waitingError } = await supabaseClient
    .from("attesa")
    .select("*")
    .eq("email", userEmail)
    .order("data_lezione", { ascending: true });

  if (bookingsError || waitingError) {
    myBookings.innerHTML =
      "<p>Errore nel caricamento delle prenotazioni.</p>";
    return;
  }

  const safeBookings = bookings || [];
  const safeWaiting = waiting || [];
  const now = new Date();

  const futureBookings =
    safeBookings.filter(booking => {
      const lessonStart =
        new Date(
          `${booking.data_lezione}T${extractTimeFromSlot(booking.fascia_oraria)}`
        );

      const oneMinuteAfterStart =
        new Date(
          lessonStart.getTime() + 60 * 1000
        );

      return now < oneMinuteAfterStart;
    });

  const pastBookings =
    safeBookings.filter(booking => {
      const lessonStart =
        new Date(
          `${booking.data_lezione}T${extractTimeFromSlot(booking.fascia_oraria)}`
        );

      const oneMinuteAfterStart =
        new Date(
          lessonStart.getTime() + 60 * 1000
        );

      return now >= oneMinuteAfterStart;
    });

  let weeklyBookings = [];

  if (futureBookings.length > 0) {
    const referenceDate =
      new Date(
        `${futureBookings[0].data_lezione}T00:00:00`
      );

    const startOfWeek =
      new Date(referenceDate);

    const day =
      startOfWeek.getDay();

    const diffToMonday =
      day === 0 ? -6 : 1 - day;

    startOfWeek.setDate(
      referenceDate.getDate() + diffToMonday
    );

    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek =
      new Date(startOfWeek);

    endOfWeek.setDate(
      startOfWeek.getDate() + 6
    );

    endOfWeek.setHours(23, 59, 59, 999);

    weeklyBookings =
      safeBookings.filter(booking => {
        const lessonDate =
          new Date(
            `${booking.data_lezione}T00:00:00`
          );

        return (
          lessonDate >= startOfWeek &&
          lessonDate <= endOfWeek
        );
      });
  }

  if (bookingCounter) {
  const booked =
    weeklyBookings.length;

  const safeBooked =
  Math.min(booked, STUDIO_SETTINGS.weeklyBookingLimit);

  const remainingBookings =
  Math.max(0, STUDIO_SETTINGS.weeklyBookingLimit - booked);

  const bookingMessage =
  booked >= STUDIO_SETTINGS.weeklyBookingLimit
    ? `
      <div class="booking-limit-message full">
        🔥 Hai raggiunto il limite settimanale
      </div>
    `
    : `
      <div class="booking-limit-message">
        ✨ Ti resta ancora ${remainingBookings}
        prenotazion${remainingBookings === 1 ? "e" : "i"}
        disponibil${remainingBookings === 1 ? "e" : "i"}
        questa settimana
      </div>
    `;

  bookingCounter.innerHTML = `
  

    <div class="booking-progress">
      <span style="width: ${(safeBooked / STUDIO_SETTINGS.weeklyBookingLimit) * 100}%"></span>
    </div>

    <div class="booking-counter-number">
      ${booked === 1 ? '1 lezione' : '{booked} lezioni'} su ${STUDIO_SETTINGS.weeklyBookingLimit}
    </div>

    ${bookingMessage}
  `;
}

  myBookings.innerHTML = "";

if (futureBookings.length === 0) {
  if (nextLessonCard) {
    nextLessonCard.innerHTML = "";
  }

  myBookings.innerHTML =
    `
  <div class="empty-booking-box">
    <p>Non hai lezioni future prenotate.</p>
    <button onclick="showAppSection('booking')">
      Prenota una lezione
    </button>
  </div>
`;
} else {

const nextLessonCard =
  document.getElementById("nextLessonCard");

if (futureBookings.length > 0 && nextLessonCard) {

  const nextLesson = futureBookings[0];

  nextLessonCard.innerHTML = `
    <div class="dashboard-next-lesson">

      <div class="next-lesson-info">

        <p class="next-lesson-label">
          La tua prossima lezione
        </p>

        <h3>
          ${getLessonType(nextLesson.fascia_oraria)}
        </h3>

        <div class="next-lesson-meta">

          <span>
            🗓️ ${formatItalianDate(nextLesson.data_lezione)}
          </span>

          <span>
            🕒 ${formatSlotName(nextLesson.fascia_oraria)}
          </span>

        </div>

       <div class="confirmed-box">
  <span>✓</span>
  <strong>Prenotata</strong>
</div>

      </div>

      <button onclick="cancelSpecificBooking('${nextLesson.id}', '${nextLesson.data_lezione}', '${nextLesson.fascia_oraria}')">
  Cancella 🗑️
</button>

    </div>
  `;
}

  futureBookings.slice(1).forEach(booking => {
    myBookings.innerHTML += `
      <div class="my-booking-card premium-booking-card future-booking-card">
        <div>
          <div class="confirmed-box">
  <span>✓</span>
  <strong>Prenotata</strong>
</div>

          <strong>
           ${formatSlotName(booking.fascia_oraria)}
          </strong>

          <small>
            🗓️ ${formatItalianDate(booking.data_lezione)}
          </small>

          <small class="booking-lesson-type">
  ${getLessonType(booking.fascia_oraria)}
</small>
        </div>

        <button class="cancel-booking-btn" onclick="cancelSpecificBooking('${booking.id}', '${booking.data_lezione}', '${booking.fascia_oraria}')">
          Cancella 🗑️
        </button>
      </div>
    `;
  });
}

myPastBookings.innerHTML = "";

myPastBookings.classList.remove("open");

if (pastBookingsSummary) {
  pastBookingsSummary.innerText =
    pastBookings.length === 0
      ? "Non hai ancora partecipato a lezioni."
      : `Hai partecipato a ${pastBookings.length} ${
          pastBookings.length === 1 ? "lezione" : "lezioni"
        }.`;
}

myPastBookings.classList.remove("open");

if (pastBookings.length === 0) {
  myPastBookings.innerHTML =
    "<p>Non hai ancora uno storico lezioni.</p>";
} else {
  pastBookings.forEach(booking => {
    myPastBookings.innerHTML += `
      <div class="my-booking-card past-booking-card">
        <div>
          <span class="booking-badge completed">
            ✅ Completata
          </span>

          <strong>
          ${formatSlotName(booking.fascia_oraria)}
          </strong>

          <small>
            🗓️ ${formatItalianDate(booking.data_lezione)}
          </small>

<small class="booking-lesson-type">
  ${getLessonType(booking.fascia_oraria)}
</small>

        </div>
      </div>
    `;
  });
}

  myWaitingList.innerHTML = "";

  myWaitingList.classList.remove("open");

  if (safeWaiting.length === 0) {
    myWaitingList.innerHTML =
      "<p>Non sei in lista d'attesa.</p>";
  } else {
    for (const wait of safeWaiting) {
      const { data: fullWaitingList } = await supabaseClient
        .from("attesa")
        .select("*")
        .eq("data_lezione", wait.data_lezione)
        .eq("fascia_oraria", wait.fascia_oraria)
        .order("created_at", { ascending: true });

      const waitingPeople =
        fullWaitingList || [];

      const position =
        waitingPeople.findIndex(
          person => person.id === wait.id
        ) + 1;

      myWaitingList.innerHTML += `
        <div class="my-booking-card premium-booking-card">
          <div>
            <div class="waiting-badge">
  <span>⏳</span>
  <strong>In attesa</strong>
</div>

<strong>
  ${formatSlotName(wait.fascia_oraria)}
</strong>
            <small>
  ${formatItalianDate(wait.data_lezione)}
</small>
            ${
  position === 1
    ? `
      <small class="waiting-position">
        ✨ Sei la prossima ad entrare
      </small>
    `
    : `
      <small class="waiting-position">
        ⏳ Hai ${position - 1} ${
          position - 1 === 1 ? "persona" : "persone"
        } davanti a te
      </small>
    `
}
          </div>
        </div>
      `;
    }
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function showAdminDetails(type) {
  const adminDetails =
    document.getElementById("adminDetails");

  if (!adminDetails) return;

  const newsPanel =
  document.getElementById("newsPanel");

if (newsPanel) {
  newsPanel.style.display = "none";
}

  const closuresPanel =
  document.getElementById("closuresPanel");

if (closuresPanel) {
  closuresPanel.style.display = "none";
}

  adminDetails.innerHTML =
    "<p>Caricamento...</p>";

  let data = [];
  let title = "";

  if (type === "users") {
    title = "Utenti registrati";

    const result = await supabaseClient
      .from("profiles")
      .select("*")
      .order("nome", { ascending: true });

    data = result.data || [];
  }

  if (type === "pending") {
    title = "Utenti in attesa";

    const result = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("approvato", false)
      .order("nome", { ascending: true });

    data = result.data || [];
  }

  if (type === "bookings") {
    title = "Prenotazioni";

    const result = await supabaseClient
      .from("prenotazioni")
      .select("*")
      .order("data_lezione", { ascending: true });

    data = result.data || [];
  }

  if (type === "waiting") {
    title = "Lista d'attesa";

    const result = await supabaseClient
      .from("attesa")
      .select("*")
      .order("data_lezione", { ascending: true });

    data = result.data || [];
  }

  adminDetails.innerHTML =
    `<h3>${title}</h3>`;

  if (data.length === 0) {
    adminDetails.innerHTML +=
      "<p>Nessun risultato.</p>";
    return;
  }

  data.forEach(item => {
    adminDetails.innerHTML += `
      <div class="admin-detail-card">
  <strong>${item.nome || "Senza nome"}</strong>

  <small>
    ${
      item.fascia_oraria
        ? formatSlotName(item.fascia_oraria)
        : ""
    }
  </small>

  <small>
  ${
    item.data_lezione
      ? "🗓️ " + formatItalianDate(item.data_lezione)
      : ""
  }
</small>

  ${
  item.fascia_oraria
    ? `
      <small class="lesson-type-admin">
        ${
          item.fascia_oraria.endsWith("-9")
            ? "Pilates Posturale"
            : "Pilates Matwork"
        }
      </small>
    `
    : ""
}

  <button
    class="details-btn"
    onclick="toggleAdminDetails(this)"
  >
    Dettagli
  </button>

  <div class="hidden-admin-details">
    <small>Email: ${item.email || "-"}</small>
    <small>Telefono: ${item.telefono || item.numero_telefono || "-"}</small>
  </div>
</div>
    `;
  });
}

function toggleAdminDetails(button) {
  const details =
    button.parentElement.querySelector(
      ".hidden-admin-details"
    );

  if (!details) return;

  details.classList.toggle("show");
}

function showClosuresPanel() {
  const closuresPanel =
    document.getElementById("closuresPanel");

  if (!closuresPanel) return;

  closuresPanel.style.display = "block";

  loadClosuresAdmin();
}

async function loadImportantNews() {
  const importantNewsBanner =
    document.getElementById("importantNewsBanner");

  if (!importantNewsBanner) return;

  const { data, error } = await supabaseClient
    .from("news")
    .select("*")
    .eq("attiva", true)
    .eq("fissata", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.log(error);
    return;
  }

  if (!data || data.length === 0) {
    importantNewsBanner.style.display = "none";
    importantNewsBanner.innerHTML = "";
    return;
  }

  const news = data[0];

  importantNewsBanner.style.display = "block";

  importantNewsBanner.innerHTML = `
    <span class="important-news-label">
      📌 Avviso importante
    </span>

    <h3>
      ${news.titolo}
    </h3>

    <p>
      ${news.contenuto}
    </p>
  `;
}

async function loadNews() {

  const newsContainer =
    document.getElementById("newsContainer");

  if (!newsContainer) return;

  const { data, error } =
    await supabaseClient
      .from("news")
      .select("*")
      .eq("attiva", true)
      .order("fissata", {
        ascending: false
      })
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.log(error);
    return;
  }

  newsContainer.innerHTML = "";

  if (!data || data.length === 0) {

    newsContainer.innerHTML = `
      <p>Nessuna comunicazione al momento.</p>
    `;

    return;
  }

  data.forEach(news => {

  newsContainer.innerHTML += `
    <div class="dashboard-news-card ${news.fissata ? "pinned" : ""}">

      <span class="dashboard-news-badge">
        ${news.fissata ? "📌 Avviso importante" : "📢 Avviso"}
      </span>

      <h4>
        ${news.titolo}
      </h4>

      <p>
        ${news.contenuto}
      </p>

      <span class="dashboard-news-date">
        Pubblicato il ${formatItalianDate(
          news.created_at.split("T")[0]
        )}
      </span>

    </div>
  `;
});
}

function showNewsPanel() {
  const adminDetails =
    document.getElementById("adminDetails");

  const closuresPanel =
    document.getElementById("closuresPanel");

  const newsPanel =
    document.getElementById("newsPanel");

  if (adminDetails) {
    adminDetails.innerHTML = "";
  }

  if (closuresPanel) {
    closuresPanel.style.display = "none";
  }

  if (!newsPanel) return;

  newsPanel.style.display =
    newsPanel.style.display === "block"
      ? "none"
      : "block";

  if (newsPanel.style.display === "block") {
    loadAdminNews();
  }
}

async function addNews() {
  const title =
    document.getElementById("newsTitle").value.trim();

  const content =
    document.getElementById("newsContent").value.trim();

  const pinned =
    document.getElementById("newsPinned").checked;

  if (!title || !content) {
    alert("Inserisci titolo e testo della news.");
    return;
  }

  const { error } = await supabaseClient
    .from("news")
    .insert([
      {
        titolo: title,
        contenuto: content,
        fissata: pinned,
        attiva: true
      }
    ]);

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("newsTitle").value = "";
  document.getElementById("newsContent").value = "";
  document.getElementById("newsPinned").checked = false;

  alert("✅ News pubblicata");

  loadAdminNews();
  loadNews();
}

async function loadAdminNews() {
  const adminNewsList =
    document.getElementById("adminNewsList");

  if (!adminNewsList) return;

  const { data, error } = await supabaseClient
    .from("news")
    .select("*")
    .eq("attiva", true)
    .order("fissata", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    adminNewsList.innerHTML =
      "<p>Errore caricamento news.</p>";
    return;
  }

  adminNewsList.innerHTML = "";

  if (!data || data.length === 0) {
    adminNewsList.innerHTML =
      "<p>Nessuna news pubblicata.</p>";
    return;
  }

  data.forEach(item => {
    adminNewsList.innerHTML += `
      <div class="admin-news-card">
        <div>
          <strong>
            ${item.fissata ? "📌 " : ""}
            ${item.titolo}
          </strong>

          <small>
            ${item.contenuto}
          </small>

          <small>
            ${formatItalianDate(item.created_at.split("T")[0])}
          </small>
        </div>

        <button onclick="disableNews('${item.id}')">
          Disattiva
        </button>
      </div>
    `;
  });
}

async function disableNews(id) {
  const { error } = await supabaseClient
    .from("news")
    .update({ attiva: false })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadAdminNews();
  loadNews();
}

async function goHome() {
  currentAppSection = "home";

  const myBookingsSection =
    document.getElementById("myBookingsSection");

  const adminPanel =
    document.getElementById("adminPanel");

  const dashboardWelcome =
    document.querySelector(".dashboard-welcome");

  const dashboardTop =
    document.querySelector(".dashboard-top");

  const dashboardBottom =
    document.querySelector(".dashboard-bottom");

  const scheduleIntro =
    document.querySelector(".schedule-intro");

  const dayTabs =
    document.querySelector(".mobile-day-tabs");

  const calendarSection =
    document.getElementById("calendario");

  if (scheduleIntro) scheduleIntro.style.display = "none";
  if (dayTabs) dayTabs.style.display = "none";
  if (calendarSection) calendarSection.style.display = "none";

  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session =
    sessionData.session;

  if (!session) return;

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("ruolo")
      .eq("id", session.user.id)
      .single();

  const realRole =
    (profile?.ruolo || "").toLowerCase().trim();

  currentUserRole = realRole;

  if (realRole === "admin") {
    if (myBookingsSection) myBookingsSection.style.display = "none";

    if (dashboardWelcome) dashboardWelcome.style.display = "none";
    if (dashboardTop) dashboardTop.style.display = "none";
    if (dashboardBottom) dashboardBottom.style.display = "none";

if (adminAgendaPanel) {
  adminAgendaPanel.style.display = "none";
}

if (adminPanel) {
  adminPanel.style.display = "block";
}

    await loadAdminPanel();

    return;
  }

  if (adminPanel) adminPanel.style.display = "none";

  if (myBookingsSection) myBookingsSection.style.display = "block";
  if (dashboardWelcome) dashboardWelcome.style.display = "block";
  if (dashboardTop) dashboardTop.style.display = "grid";
  if (dashboardBottom) dashboardBottom.style.display = "grid";

  await loadMyBookings();
}

async function showAdminAgenda() {

  const navButtons =
  document.querySelectorAll("#appNav button");

navButtons.forEach(button =>
  button.classList.remove("active")
);

if (navButtons[1]) {
  navButtons[1].classList.add("active");
}

  const adminPanel =
    document.getElementById("adminPanel");

  const adminAgendaPanel =
    document.getElementById("adminAgendaPanel");

  const myBookingsSection =
    document.getElementById("myBookingsSection");

  const scheduleIntro =
    document.querySelector(".schedule-intro");

  const dayTabs =
    document.querySelector(".mobile-day-tabs");

  const calendarSection =
    document.getElementById("calendario");

  if (adminPanel) adminPanel.style.display = "none";
  if (myBookingsSection) myBookingsSection.style.display = "none";
  if (scheduleIntro) scheduleIntro.style.display = "none";
  if (dayTabs) dayTabs.style.display = "none";
  if (calendarSection) calendarSection.style.display = "none";

  if (adminAgendaPanel) {
    adminAgendaPanel.style.display = "block";
  }

  await loadAdminAgenda();

}

async function loadAdminAgenda() {
  const totalLessonsEl =
    document.getElementById("agendaTotalLessons");

  const totalBookingsEl =
    document.getElementById("agendaTotalBookings");

  const totalWaitingEl =
    document.getElementById("agendaTotalWaiting");

  const fillRateEl =
    document.getElementById("agendaFillRate");

  if (
    !totalLessonsEl ||
    !totalBookingsEl ||
    !totalWaitingEl ||
    !fillRateEl
  ) return;

  const today =
    new Date();

  const startOfWeek =
    new Date(today);

  const day =
    startOfWeek.getDay();

  const diffToMonday =
    day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(
    today.getDate() + diffToMonday
  );

  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek =
    new Date(startOfWeek);

  endOfWeek.setDate(
    startOfWeek.getDate() + 6
  );

  endOfWeek.setHours(23, 59, 59, 999);

  const startDate =
    startOfWeek.toISOString().split("T")[0];

  const endDate =
    endOfWeek.toISOString().split("T")[0];

  const { data: bookings, error: bookingsError } =
    await supabaseClient
      .from("prenotazioni")
      .select("*")
      .gte("data_lezione", startDate)
      .lte("data_lezione", endDate);

  const { data: waiting, error: waitingError } =
    await supabaseClient
      .from("attesa")
      .select("*")
      .gte("data_lezione", startDate)
      .lte("data_lezione", endDate);

  if (bookingsError || waitingError) {
    totalLessonsEl.innerText = "-";
    totalBookingsEl.innerText = "-";
    totalWaitingEl.innerText = "-";
    fillRateEl.innerText = "-";
    return;
  }

  const safeBookings =
    bookings || [];

  const safeWaiting =
    waiting || [];

  const lessonSlots =
    [
      "lunedi-9",
      "lunedi-17",
      "lunedi-1815",
      "lunedi-1930",

      "martedi-17",
      "martedi-1815",
      "martedi-1930",

      "mercoledi-9",
      "mercoledi-17",
      "mercoledi-1815",
      "mercoledi-1930",

      "giovedi-17",
      "giovedi-1815",
      "giovedi-1930",

      "venerdi-9",
      "venerdi-17",
      "venerdi-1815",
      "venerdi-1930"
    ];

  const totalLessons =
    lessonSlots.length;

  const totalCapacity =
    totalLessons *
    STUDIO_SETTINGS.maxSpotsPerLesson;

  const totalBookings =
    safeBookings.length;

  const totalWaiting =
    safeWaiting.length;

  const fillRate =
    totalCapacity === 0
      ? 0
      : Math.round(
          (totalBookings / totalCapacity) * 100
        );

  totalLessonsEl.innerText =
    totalLessons;

  totalBookingsEl.innerText =
    totalBookings;

  totalWaitingEl.innerText =
    totalWaiting;

  fillRateEl.innerText =
    `${fillRate}%`;

    const todayBox =
  document.getElementById("agendaTodayLessons");

const tomorrowBox =
  document.getElementById("agendaTomorrowLessons");

const allSlots = [
  "lunedi-9",
  "lunedi-17",
  "lunedi-1815",
  "lunedi-1930",
  "martedi-17",
  "martedi-1815",
  "martedi-1930",
  "mercoledi-9",
  "mercoledi-17",
  "mercoledi-1815",
  "mercoledi-1930",
  "giovedi-17",
  "giovedi-1815",
  "giovedi-1930",
  "venerdi-9",
  "venerdi-17",
  "venerdi-1815",
  "venerdi-1930"
];

function toLocalDateString(date) {
  return date.toISOString().split("T")[0];
}

function renderAgendaDay(box, date) {
  if (!box) return;

  const dateString =
    toLocalDateString(date);

  const dayNames = [
    "domenica",
    "lunedi",
    "martedi",
    "mercoledi",
    "giovedi",
    "venerdi",
    "sabato"
  ];

  const dayName =
    dayNames[date.getDay()];

  const daySlots =
    allSlots.filter(slot =>
      slot.startsWith(dayName)
    );

  box.innerHTML = "";

  if (daySlots.length === 0) {
    box.innerHTML =
      "<p class='agenda-empty'>Nessuna lezione prevista.</p>";
    return;
  }

  daySlots.forEach(slot => {
    const booked =
      safeBookings.filter(item =>
        item.data_lezione === dateString &&
        item.fascia_oraria === slot
      ).length;

    const waitingCount =
      safeWaiting.filter(item =>
        item.data_lezione === dateString &&
        item.fascia_oraria === slot
      ).length;

    const fillPercent =
  Math.round(
    (booked / STUDIO_SETTINGS.maxSpotsPerLesson) * 100
  );

const fillClass =
  booked >= STUDIO_SETTINGS.maxSpotsPerLesson
    ? "full"
    : booked >= STUDIO_SETTINGS.maxSpotsPerLesson - 3
      ? "almost-full"
      : "available";

box.innerHTML += `
  <div
    class="agenda-lesson-row ${fillClass}"
    onclick="toggleAgendaLessonDetails('${dateString}', '${slot}')"
  >
    <div>
      <strong>${formatSlotName(slot)}</strong>
      <small>${getLessonType(slot)}</small>

      <div class="agenda-mini-progress">
        <span style="width: ${fillPercent}%"></span>
      </div>
    </div>

    <div class="agenda-lesson-numbers">
      <span>👥 ${booked}/${STUDIO_SETTINGS.maxSpotsPerLesson}</span>
      <span>⏳ ${waitingCount}</span>
    </div>
  </div>
`;
  });
}

const tomorrow =
  new Date(today);

tomorrow.setDate(
  today.getDate() + 1
);

renderAgendaDay(todayBox, today);
renderAgendaDay(tomorrowBox, tomorrow);

const weekSummary =
  document.getElementById("agendaWeekSummary");

if (weekSummary) {

  weekSummary.innerHTML = "";

  const weekDays = [
    { label: "LUN", key: "lunedi" },
    { label: "MAR", key: "martedi" },
    { label: "MER", key: "mercoledi" },
    { label: "GIO", key: "giovedi" },
    { label: "VEN", key: "venerdi" }
  ];

  weekDays.forEach(day => {

    const lessonsCount =
      lessonSlots.filter(slot =>
        slot.startsWith(day.key)
      ).length;

    const bookingsCount =
      safeBookings.filter(item =>
        item.fascia_oraria.startsWith(day.key)
      ).length;

    const waitingCount =
      safeWaiting.filter(item =>
        item.fascia_oraria.startsWith(day.key)
      ).length;

    weekSummary.innerHTML += `
      <div class="agenda-week-day">

        <strong>
          ${day.label}
        </strong>

        <span>
          📅 ${lessonsCount} lezioni
        </span>

        <span>
          👥 ${bookingsCount} prenotati
        </span>

        <span>
          ⏳ ${waitingCount} attese
        </span>

      </div>
    `;
  });
}

}

async function toggleAgendaLessonDetails(dateString, slot) {
  const existingBox =
    document.getElementById("agendaLessonDetails");

  if (existingBox) {
    existingBox.remove();
    return;
  }

  const { data: bookings } =
    await supabaseClient
      .from("prenotazioni")
      .select("*")
      .eq("data_lezione", dateString)
      .eq("fascia_oraria", slot)
      .order("created_at", { ascending: true });

  const { data: waiting } =
    await supabaseClient
      .from("attesa")
      .select("*")
      .eq("data_lezione", dateString)
      .eq("fascia_oraria", slot)
      .order("created_at", { ascending: true });

  const safeBookings =
    bookings || [];

  const safeWaiting =
    waiting || [];

  const detailsBox =
    document.createElement("div");

  detailsBox.id =
    "agendaLessonDetails";

  detailsBox.className =
    "agenda-lesson-details";

  detailsBox.innerHTML = `
    <div class="agenda-details-header">
      <div>
        <h3>${formatSlotName(slot)}</h3>
        <p>${formatItalianDate(dateString)} · ${getLessonType(slot)}</p>
      </div>

      <button onclick="document.getElementById('agendaLessonDetails').remove()">
        Chiudi
      </button>
    </div>

    <div class="agenda-details-grid">

      <div>
        <h4>👥 Prenotati (${safeBookings.length})</h4>

        ${
          safeBookings.length === 0
            ? "<p class='agenda-empty'>Nessun prenotato.</p>"
            : safeBookings.map(person => `
                <div class="agenda-person-card">
                  <strong>${person.nome || "Senza nome"}</strong>
                  </div>
              `).join("")
        }
      </div>

      <div>
        <h4>⏳ Lista d'attesa (${safeWaiting.length})</h4>

        ${
          safeWaiting.length === 0
            ? "<p class='agenda-empty'>Nessuno in lista d'attesa.</p>"
            : safeWaiting.map(person => `
                <div class="agenda-person-card waiting">
                  <strong>${person.nome || "Senza nome"}</strong>
                  <small>${person.numero_telefono || "-"}</small>
                  <small>${person.email || "-"}</small>
                </div>
              `).join("")
        }
      </div>

    </div>
  `;

  const adminAgendaPanel =
    document.getElementById("adminAgendaPanel");

  if (adminAgendaPanel) {
    adminAgendaPanel.appendChild(detailsBox);

    detailsBox.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function showAppSection(section) {
  currentAppSection = section;

  const navButtons =
    document.querySelectorAll("#appNav button");

  const myBookingsSection =
    document.getElementById("myBookingsSection");

  const adminPanel =
    document.getElementById("adminPanel");

  const dashboardWelcome =
    document.querySelector(".dashboard-welcome");

  const dashboardTop =
    document.querySelector(".dashboard-top");

  const dashboardBottom =
    document.querySelector(".dashboard-bottom");

  const myPastBookings =
    document.getElementById("myPastBookings");

  const myWaitingList =
    document.getElementById("myWaitingList");

  const scheduleIntro =
    document.querySelector(".schedule-intro");

  const dayTabs =
    document.querySelector(".mobile-day-tabs");

  const calendarSection =
    document.getElementById("calendario");

  navButtons.forEach(button => {
  button.classList.remove("active");

  const onclick =
    button.getAttribute("onclick") || "";

  if (section === "home" &&
      onclick.includes("home")) {
    button.classList.add("active");
  }

  if (section === "booking" &&
      onclick.includes("booking")) {
    button.classList.add("active");
  }
});

  let realRole = currentUserRole;

  if (section === "home") {
    const { data: sessionData } =
      await supabaseClient.auth.getSession();

    const session =
      sessionData.session;

    if (session) {
      const { data: profile } =
        await supabaseClient
          .from("profiles")
          .select("ruolo")
          .eq("id", session.user.id)
          .single();

      if (profile) {
        realRole =
          (profile.ruolo || "").toLowerCase().trim();

        currentUserRole = realRole;
      }
    }
  }

  if (section === "home" && realRole === "admin") {
    if (myBookingsSection) myBookingsSection.style.display = "none";

    if (dashboardWelcome) dashboardWelcome.style.display = "none";
    if (dashboardTop) dashboardTop.style.display = "none";
    if (dashboardBottom) dashboardBottom.style.display = "none";

    if (myPastBookings) myPastBookings.style.display = "none";
    if (myWaitingList) myWaitingList.style.display = "none";

    if (scheduleIntro) scheduleIntro.style.display = "none";
    if (dayTabs) dayTabs.style.display = "none";
    if (calendarSection) calendarSection.style.display = "none";

    const adminAgendaPanel =
  document.getElementById("adminAgendaPanel");

if (adminAgendaPanel) {
  adminAgendaPanel.style.display = "none";
}
    if (adminPanel) {
      adminPanel.style.setProperty("display", "block", "important");
    }

    await loadAdminPanel();

    return;
  }

 if (section === "home") {

  if (realRole === "admin") {
    return;
  }

  if (adminPanel) adminPanel.style.display = "none";

  if (myBookingsSection) myBookingsSection.style.display = "block";

  if (dashboardWelcome) dashboardWelcome.style.display = "block";

  if (dashboardTop) dashboardTop.style.display = "grid";

  if (dashboardBottom) dashboardBottom.style.display = "grid";

  if (myPastBookings) myPastBookings.style.display = "none";

  if (myWaitingList) myWaitingList.style.display = "none";

  if (scheduleIntro) scheduleIntro.style.display = "none";

  if (dayTabs) dayTabs.style.display = "none";

  if (calendarSection) calendarSection.style.display = "none";

  return;
}

  if (section === "booking") {
    if (myBookingsSection) myBookingsSection.style.display = "none";
    if (adminPanel) adminPanel.style.display = "none";

    if (dashboardWelcome) dashboardWelcome.style.display = "none";
    if (dashboardTop) dashboardTop.style.display = "none";
    if (dashboardBottom) dashboardBottom.style.display = "none";

    if (myPastBookings) myPastBookings.style.display = "none";
    if (myWaitingList) myWaitingList.style.display = "none";

    if (scheduleIntro) scheduleIntro.style.display = "block";
    if (dayTabs) dayTabs.style.display = "flex";
    if (calendarSection) calendarSection.style.display = "flex";
  }
}

async function cancelSpecificBooking(
  bookingId,
  bookingDate,
  bookingSlot
) {
  const slotTimes = {
    "lunedi-9": "09:00:00",
    "lunedi-17": "17:00:00",
    "lunedi-1815": "18:15:00",
    "lunedi-1930": "19:30:00",

    "martedi-17": "17:00:00",
    "martedi-1815": "18:15:00",
    "martedi-1930": "19:30:00",

    "mercoledi-9": "09:00:00",
    "mercoledi-17": "17:00:00",
    "mercoledi-1815": "18:15:00",
    "mercoledi-1930": "19:30:00",

    "giovedi-17": "17:00:00",
    "giovedi-1815": "18:15:00",
    "giovedi-1930": "19:30:00",

    "venerdi-9": "09:00:00",
    "venerdi-17": "17:00:00",
    "venerdi-1815": "18:15:00",
    "venerdi-1930": "19:30:00"
  };

  const lessonTime = slotTimes[bookingSlot];

  if (!lessonTime) {
    alert("Errore: orario lezione non riconosciuto.");
    return;
  }

  const now = new Date();
  const lessonDateTime =
    new Date(`${bookingDate}T${lessonTime}`);

  const diffHours =
    (lessonDateTime.getTime() - now.getTime()) / 1000 / 60 / 60;

  if (diffHours < 5) {
    alert(
      "❌ Non puoi cancellare una lezione nelle 5 ore precedenti l'inizio."
    );
    return;
  }

  const confirmCancel =
    confirm("Vuoi cancellare questa prenotazione?");

  if (!confirmCancel) return;

  const { error: deleteError } = await supabaseClient
    .from("prenotazioni")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    alert("Errore cancellazione");
    return;
  }

  const { data: waitingList } = await supabaseClient
    .from("attesa")
    .select("*")
    .eq("fascia_oraria", bookingSlot)
    .eq("data_lezione", bookingDate)
    .order("created_at", { ascending: true })
    .limit(1);

  if (waitingList && waitingList.length > 0) {
    const nextPerson = waitingList[0];

    await supabaseClient
      .from("prenotazioni")
      .insert([
        {
          nome: nextPerson.nome,
          numero_telefono: nextPerson.numero_telefono,
          email: nextPerson.email,
          fascia_oraria: nextPerson.fascia_oraria,
          data_lezione: nextPerson.data_lezione
        }
      ]);

    await supabaseClient
      .from("attesa")
      .delete()
      .eq("id", nextPerson.id);

    try {
      await emailjs.send(
        "service_g0bjzrk",
        "template_9wyut78",
        {
          user_email: nextPerson.email,
          subject: "Posto disponibile - PilateSisters",
          message:
`Ciao ${nextPerson.nome},

si è liberato un posto per:

${formatSlotName(nextPerson.fascia_oraria)}
${formatItalianDate(nextPerson.data_lezione)}

La tua prenotazione è stata confermata automaticamente 😊

A presto,
PilateSisters`
        }
      );
    } catch (emailError) {
      console.log(emailError);
    }

    alert(
      "✅ Prenotazione cancellata. La prima persona in lista d'attesa è stata inserita automaticamente."
    );
  } else {
    alert("✅ Prenotazione cancellata");
  }

  if (typeof loadMyBookings === "function") {
  currentAppSection = "home";

  await loadMyBookings();

  await goHome();
}

if (typeof updateAvailableSpots === "function") {
  await updateAvailableSpots();

  setTimeout(() => {
    updateAvailableSpots();
  }, 500);
}
}

async function disableClosureDate(id) {
  const { error } = await supabaseClient
    .from("chiusure")
    .update({ attiva: false })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  loadClosuresAdmin();
}

function toggleDashboardBox(id) {
  const box = document.getElementById(id);

  if (!box) return;

  box.classList.toggle("open");
}

checkUserSession();
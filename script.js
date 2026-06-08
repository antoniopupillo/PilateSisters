console.log("JS collegato");

// CONFIG SUPABASE

const SUPABASE_URL =
  "https://rryyazfzyiysienbytoo.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyeXlhemZ6eWl5c2llbmJ5dG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODc4MzAsImV4cCI6MjA5NDg2MzgzMH0.R3bXRf-xHv_XPCibVhZxxVY0TuAdpt0p_OTsdykJXs4";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

let closedDates = [];

async function loadClosedDates() {
  const { data, error } = await supabaseClient
    .from("chiusure")
    .select("*")
    .eq("attiva", true);

  if (error) {
    console.log("Errore caricamento chiusure:", error);
    return;
  }

  closedDates = data || [];
  console.log("CHIUSURE CARICATE:", closedDates);
}

function getClosureInfo(dateString) {
  return closedDates.find(item => item.data === dateString);
}

// TROVA PROSSIMA DATA LEZIONE

function getNextLessonDate(dayName, slotName) {
  const now = new Date();

  const days = {
    lunedi: 1,
    martedi: 2,
    mercoledi: 3,
    giovedi: 4,
    venerdi: 5
  };

  const targetDay = days[dayName];
  const currentDay = now.getDay();

  let diff = targetDay - currentDay;

  const slotParts = slotName.split("-");
  const lessonHourRaw = slotParts[1];

  let hour;
  let minute;

  if (lessonHourRaw.length === 4) {
    hour = lessonHourRaw.slice(0, 2);
    minute = lessonHourRaw.slice(2);
  } else {
    hour = lessonHourRaw.slice(0, 1);
    minute = lessonHourRaw.slice(1);
  }

  const lessonDate = new Date(now);

  lessonDate.setDate(now.getDate() + diff);
  lessonDate.setHours(hour);
  lessonDate.setMinutes(minute);
  lessonDate.setSeconds(0);

  if (
    diff < 0 ||
    (diff === 0 && lessonDate <= now)
  ) {
    lessonDate.setDate(
      lessonDate.getDate() + 7
    );
  }

  return formatDateLocal(lessonDate);
}

// CALCOLA SETTIMANA DELLA LEZIONE

function getWeekDatesFromLesson(lessonDate) {
  const date =
    new Date(`${lessonDate}T00:00:00`);

  const day =
    date.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  const monday =
    new Date(date);

  monday.setDate(
    date.getDate() + diffToMonday
  );

  const sunday =
    new Date(monday);

  sunday.setDate(
    monday.getDate() + 6
  );

  return {
  start: formatDateLocal(monday),
  end: formatDateLocal(sunday)
};
}

// PRENOTAZIONE

async function bookSlot(slotName) {
  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session =
    sessionData.session;

  if (!session) {
    alert("Devi accedere prima di prenotare.");
    return;
  }

  const user =
    session.user;

  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

  if (profileError || !profile) {
    alert("Profilo utente non trovato.");
    return;
  }

  if (!profile.approvato) {
    alert(
      "Il tuo account è in attesa di approvazione."
    );
    return;
  }

  const customerName =
    profile.nome;

  const customerPhone =
    profile.telefono;

  const customerEmail =
    user.email;

  const dayName =
    slotName.split("-")[0];

  const lessonDate =
    getNextLessonDate(
      dayName,
      slotName
    );
    const { data: closureData, error: closureError } =
  await supabaseClient
    .from("chiusure")
    .select("*")
    .eq("data", lessonDate)
    .eq("attiva", true)
    .limit(1);

if (closureError) {
  console.log("Errore controllo chiusura:", closureError);
  alert("Errore controllo disponibilità.");
  return;
}

if (closureData && closureData.length > 0) {
  alert(`⚠️ Lezione non disponibile: ${closureData[0].motivo}`);
  return;
}

  // LIMITE 3 LEZIONI SETTIMANALI

  const weekDates =
    getWeekDatesFromLesson(lessonDate);

  const {
    data: weeklyBookings,
    error: weeklyError
  } =
    await supabaseClient
      .from("prenotazioni")
      .select("*")
      .eq("email", customerEmail)
      .gte("data_lezione", weekDates.start)
      .lte("data_lezione", weekDates.end);

  if (weeklyError) {
    console.log(weeklyError);
    alert("Errore controllo prenotazioni settimanali");
    return;
  }

  if (weeklyBookings.length >= 3) {
    alert(
      "⚠️ Hai già raggiunto il limite massimo di 3 lezioni settimanali."
    );
    return;
  }

  // PRENOTAZIONI ESISTENTI PER QUESTA LEZIONE

  const { data, error } =
    await supabaseClient
      .from("prenotazioni")
      .select("*")
      .eq("fascia_oraria", slotName)
      .eq("data_lezione", lessonDate);

  if (error) {
    console.log(error);
    alert("Errore connessione");
    return;
  }

  const alreadyBooked =
    data.find(
      booking =>
        booking.numero_telefono === customerPhone ||
        booking.email === customerEmail
    );

  if (alreadyBooked) {
    alert(
      "⚠️ Hai già prenotato questa lezione"
    );
    return;
  }

  // CORSO PIENO

  if (
  data.length >=
  STUDIO_SETTINGS.maxSpotsPerLesson
) {
    const waitConfirm = confirm(
      "⚠️ Corso completo.\n\nVuoi entrare in lista d'attesa?"
    );

    if (!waitConfirm) return;

    const { error: waitError } =
      await supabaseClient
        .from("attesa")
        .insert([
          {
            nome: customerName,
            numero_telefono: customerPhone,
            email: customerEmail,
            fascia_oraria: slotName,
            data_lezione: lessonDate
          }
        ]);

    if (waitError) {
      console.log(waitError);
      alert(waitError.message);
      return;
    }

    alert("✅ Inserito in lista d'attesa");

    updateAvailableSpots();
    loadMyBookings();

    return;
  }

  // SALVA PRENOTAZIONE

  const { error: insertError } =
    await supabaseClient
      .from("prenotazioni")
      .insert([
        {
          nome: customerName,
          numero_telefono: customerPhone,
          email: customerEmail,
          fascia_oraria: slotName,
          data_lezione: lessonDate
        }
      ]);

  if (insertError) {
    console.log(insertError);
    alert(insertError.message);
    return;
  }

  alert(
  `✅ Prenotazione confermata per il ${lessonDate}`
);

await updateAvailableSpots();

if (typeof loadMyBookings === "function") {
  await loadMyBookings();

  setTimeout(() => {
    loadMyBookings();
  }, 700);
}
}

// POSTI DISPONIBILI

async function updateAvailableSpots() {
  const slots = [
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

  for (const slot of slots) {
    const dayName =
      slot.split("-")[0];

    const lessonDate =
      getNextLessonDate(
        dayName,
        slot
      );
     const closureInfo =
  getClosureInfo(lessonDate);

if (closureInfo) {
  const card =
    document.getElementById(slot);

  if (!card) continue;

  const spotsText =
    card.querySelector(".spots");

  const waitingText =
    card.querySelector(".waiting-count");

  const button =
    card.querySelector("button");

  if (spotsText) {
    spotsText.textContent =
      `⚠️ Chiuso - ${closureInfo.motivo}`;
  }

  if (waitingText) {
    waitingText.textContent = "";
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Non disponibile";
  }

  continue;
}

    const card =
      document.getElementById(slot);

    if (!card) continue;

    const spotsText =
      card.querySelector(".spots");

    const waitingText =
      card.querySelector(".waiting-count");

    if (!spotsText) continue;

    const {
      data: bookings,
      error: bookingsError
    } =
      await supabaseClient
        .from("prenotazioni")
        .select("*")
        .eq("fascia_oraria", slot)
        .eq("data_lezione", lessonDate);

    if (bookingsError) {
      console.log(bookingsError);
      continue;
    }

    const {
      data: waitingData,
      error: waitingError
    } =
      await supabaseClient
        .from("attesa")
        .select("*")
        .eq("fascia_oraria", slot)
        .eq("data_lezione", lessonDate);

    if (waitingError) {
      console.log(waitingError);
    }

    const remainingSpots =
  STUDIO_SETTINGS.maxSpotsPerLesson -
  bookings.length;

    const bookedCount =
  bookings.length;

const fillPercent =
  Math.round(
    (bookedCount / STUDIO_SETTINGS.maxSpotsPerLesson) * 100
  );

let spotsLabel = "";

if (remainingSpots === 0) {
  spotsLabel = "🔴 Corso completo";
} else if (remainingSpots <= 3) {
  spotsLabel = `🟡 Ultimi ${remainingSpots} posti`;
} else {
  spotsLabel = `🟢 ${remainingSpots} posti disponibili`;
}

spotsText.innerHTML = `
  <span>${spotsLabel}</span>

  <div class="booking-slot-progress">
    <span style="width: ${fillPercent}%"></span>
  </div>
`;

    if (waitingText) {
      const waitingNumber =
        waitingData ? waitingData.length : 0;

      if (waitingNumber > 0) {
        waitingText.computedStyleMap.display = "block";
        waitingText.textContent =
          `🔥 ${waitingNumber} in lista d'attesa`;
      } else {
        waitingText.textContent = " ";
        waitingText.computedStyleMap.display = "none";
      }
    }
  }
}

// CANCELLA PRENOTAZIONE

function extractTimeFromSlot(slot) {
  const timeRaw = slot.split("-")[1];

  let hour;
  let minute;

  if (timeRaw.length === 4) {
    hour = timeRaw.slice(0, 2);
    minute = timeRaw.slice(2);
  } else {
    hour = timeRaw.slice(0, 1);
    minute = timeRaw.slice(1);
  }

  hour = hour.padStart(2, "0");
  minute = minute.padStart(2, "0");

  return `${hour}:${minute}:00`;
}

async function cancelBooking() {
  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const session =
    sessionData.session;

  if (!session) {
    alert("Devi accedere.");
    return;
  }

  const userEmail =
    session.user.email;

  const { data, error } =
    await supabaseClient
      .from("prenotazioni")
      .select("*")
      .eq("email", userEmail)
      .order("created_at", {
        ascending: false
      })
      .limit(1);

  if (error || data.length === 0) {
    alert("Prenotazione non trovata");
    return;
  }

  const booking = data[0];

  const now = new Date();

  const lessonDateTime =
    new Date(
      `${booking.data_lezione}T${extractTimeFromSlot(booking.fascia_oraria)}`
    );

  const diffHours =
    (lessonDateTime - now) / 1000 / 60 / 60;

  if (diffHours < 5) {
    alert(
      "❌ Non puoi cancellare una lezione nelle 5 ore precedenti l'inizio."
    );
    return;
  }

  const { error: deleteError } =
    await supabaseClient
      .from("prenotazioni")
      .delete()
      .eq("id", booking.id);

  if (deleteError) {
    alert("Errore cancellazione");
    return;
  }

  const { data: waitingList } =
    await supabaseClient
      .from("attesa")
      .select("*")
      .eq("fascia_oraria", booking.fascia_oraria)
      .eq("data_lezione", booking.data_lezione)
      .order("created_at", {
        ascending: true
      })
      .limit(1);

  if (waitingList.length > 0) {
    const nextPerson =
      waitingList[0];

    emailjs.send(
      "service_g0bjzrk",
      "template_9wyut78",
      {
        user_email: nextPerson.email,
        subject: "Posto disponibile - PilateSisters",
        message:
`Ciao ${nextPerson.nome},

si è liberato un posto per:

${nextPerson.fascia_oraria}

La tua prenotazione è stata confermata automaticamente 😊

A presto,
PilateSisters`
      }
    );

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

    alert(
      `✅ ${nextPerson.nome} è entrato automaticamente nel corso`
    );
  } else {
    alert("✅ Prenotazione cancellata");
  }

    await updateAvailableSpots();

  if (typeof loadMyBookings === "function") {
    await loadMyBookings();

    setTimeout(() => {
      loadMyBookings();
    }, 700);
  }
}

// AVVIO

loadClosedDates().then(() => {
  updateAvailableSpots();
});

function showMobileDay(day) {
  const columns =
    document.querySelectorAll(".day-column");

  const buttons =
    document.querySelectorAll(".mobile-day-tabs button");

  columns.forEach(column => {
    if (column.dataset.day === day) {
      column.classList.add("mobile-active");
    } else {
      column.classList.remove("mobile-active");
    }
  });

  buttons.forEach(button => {
    button.classList.remove("active");
  });

  const activeButton =
    Array.from(buttons).find(button =>
      button.getAttribute("onclick").includes(day)
    );

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

window.addEventListener("load", () => {
  showMobileDay("lunedi");
});
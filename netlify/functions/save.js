export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = "appOnjwF4xcrYZUER";
    const TABLE_NAME = "tbl0A8bcJjNlpEyhG";
    const RESEND_API_KEY = process.env.RESEND_API_KEY; // Додано ключ
    
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Missing Airtable environment variables" }) 
      };
    }

    let fields = {};
    const isWaitlist = data.type === "waitlist"; // Визначаємо тип форми

    if (isWaitlist) {
      fields = {
        "Email": data.email,
        "Date": data.timestamp ? data.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]
      };
    } else if (data.type === "insight") {
      fields = {
        "Email": data.email || "",
        "Date": data.date,
        "userId": data.userId,
        "Score": data.score,
        "Sleep": data.sleep,
        "ScreenTime": data.screenTime,
        "Fatigue": data.fatigue,
        "Speed": data.speed,
        "Accuracy": data.accuracy,
        "FirstTestTime": data.firstTestTime || new Date().toISOString(),
        "RemindersSentCount": 0
      };
    }

    // 1. Відправка в Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AIRTABLE_PAT}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields })
      }
    );

    const result = await airtableResponse.json();

    if (!airtableResponse.ok) {
      return {
        statusCode: airtableResponse.status,
        body: JSON.stringify({ error: "Airtable error: " + JSON.stringify(result) })
      };
    }

    // 2. Відправка email через Resend (якщо користувач вказав пошту)
    if (data.email) {
      const emailSubject = isWaitlist 
          ? "ти в списку 👀" 
          : "перший вимір є ✓";

      const emailHtml = isWaitlist
          ? `<p>Привіт!</p>
             <p>Ми тебе запамʼятали.</p>
             <p>Коли бета буде готова — напишемо першим. А поки що можеш зайти на сайт і побачити як це працює — є короткий тест, надрукуй одне речення і отримаєш свій показник прямо зараз.</p>
             <p>— команда NeRN</p>`
          : `<p>Привіт!</p>
             <p>Перша точка є — і це вже щось.</p>
             <p>Але одного виміру замало, щоб побачити справжню картину. Когніція природно коливається протягом дня і тижня, тому сім вимірів приблизно в один час дають набагато чіткіший сигнал.</p>
             <p>Повертайся завтра о тій самій годині — нагадаємо.</p>
             <p>— команда NeRN</p>`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
              from: "NeRN <onboarding@resend.dev>",
              to: [data.email], 
              subject: emailSubject,
              html: emailHtml
          })
      });

      const resendResult = await resendResponse.json();
      
      // Якщо Resend видає помилку, зупиняємо виконання і виводимо її
      if (!resendResponse.ok) {
        return {
          statusCode: resendResponse.status,
          body: JSON.stringify({ error: "Resend API Error", details: resendResult })
        };
      }
    }

    // 3. Успішна відповідь фронтенду
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, record: result })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

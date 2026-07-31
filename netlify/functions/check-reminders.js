import { schedule } from "@netlify/functions";

export const handler = schedule("0 * * * *", async (event, context) => {
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = "appOnjwF4xcrYZUER";
    const TABLE_NAME = "tbl0A8bcJjNlpEyhG";
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    const SITE_URL = "https://nernweb.netlify.app/"; 

    const templates = [
        { // 0 відправлених -> Нагадування 1
            subject: "день 2 із семи",
            html: `<p>Привіт! Вчора о цей час ти вже зробила вимір.</p><p>Зайди сьогодні — займе менше хвилини. Дві точки вже цікавіші за одну.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 1 відправлене -> Нагадування 2
            subject: "день 3 із семи",
            html: `<p>Три виміри — і система починає бачити саме твій ритм, а не просто середнє значення.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 2 відправлених -> Нагадування 3
            subject: "половина шляху",
            html: `<p>Чотири з семи. Більшість зупиняються десь тут — але ти вже на середині.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 3 відправлених -> Нагадування 4
            subject: "день 5 із семи",
            html: `<p>Чотири точки вже є. NeRN починає шукати звʼязки — наприклад, чи є кореляція між твоїм сном і тим, як рухаються пальці наступного ранку. Ще два виміри — і покажемо.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 4 відправлених -> Нагадування 5
            subject: "залишилось два",
            html: `<p>Майже фінішна пряма. Не зупиняйся зараз.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 5 відправлених -> Нагадування 6
            subject: "завтра — перший підсумок",
            html: `<p>Завтра о цей час надішлемо твій перший тижневий звіт. Сьогоднішній вимір передостанній — не пропускай.</p><p><a href="${SITE_URL}">→ [зробити вимір]</a></p><p>— команда NeRN</p>`
        },
        { // 6 відправлених -> Нагадування 7
            subject: "тиждень завершено",
            html: `<p>Сім днів, сім вимірів. Мало хто доходить до цього моменту — ти дійшла.</p><p>Коли вийде додаток — отримаєш доступ до закритої бети першою. Там все це відбуватиметься автоматично, у фоні, без жодних нагадувань.</p><p>— команда NeRN</p>`
        }
    ];

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
            headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
        });
        
        const data = await response.json();
        const records = data.records || [];
        const now = new Date();

        for (const record of records) {
            const fields = record.fields;
            const firstTestTimeStr = fields.FirstTestTime;
            const email = fields.Email;
            const sentCount = fields.RemindersSentCount || 0;

            // Пропускаємо, якщо немає пошти, часу першого тесту, або ліміт (7 листів) вичерпано
            if (!firstTestTimeStr || !email || sentCount >= 7) continue;

            const firstTestDate = new Date(firstTestTimeStr);
            const diffDays = (now - firstTestDate) / (1000 * 60 * 60 * 24);
            
            // Якщо минуло більше 7 днів, припиняємо нагадування
            if (diffDays > 7) continue;

            // Якщо зараз та сама година, що й під час першого тесту
            if (now.getUTCHours() === firstTestDate.getUTCHours()) {
                
                const template = templates[sentCount];

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: "NeRN <onboarding@resend.dev>",
                        to: [email],
                        subject: template.subject,
                        html: template.html
                    })
                });

                // Оновлюємо лічильник
                await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}/${record.id}`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${AIRTABLE_PAT}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fields: {
                            RemindersSentCount: sentCount + 1
                        }
                    })
                });
            }
        }

        return { statusCode: 200, body: "Reminders processed successfully." };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
});

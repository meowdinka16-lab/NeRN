import { schedule } from "@netlify/functions";

export const handler = schedule("0 * * * *", async (event, context) => {
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = "appOnjwF4xcrYZUER";
    const TABLE_NAME = "tbl0A8bcJjNlpEyhG";
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    try {
        // 1. Отримуємо всі записи з Airtable
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`
            }
        });
        
        const data = await response.json();
        const records = data.records || [];
        const now = new Date();

        for (const record of records) {
            const fields = record.fields;
            const firstTestTimeStr = fields.FirstTestTime;
            const email = fields.Email;
            const sentCount = fields.RemindersSentCount || 0;

            if (!firstTestTimeStr || !email || sentCount >= 7) continue;

            const firstTestDate = new Date(firstTestTimeStr);
            
            // Перевіряємо, чи минуло менше ніж 7 днів
            const diffDays = (now - firstTestDate) / (1000 * 60 * 60 * 24);
            if (diffDays > 7) continue;

            // Перевіряємо збіг години та хвилини (в межах години запуску cron)
            if (now.getUTCHours() === firstTestDate.getUTCHours()) {
                
                // 2. Надсилаємо email через Resend API
                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${RESEND_API_KEY}`
                    },
                    body: JSON.stringify({
                        from: "NeRN <onboarding@resend.dev>",
                        to: [email],
                        subject: "Час для повторного тесту NeRN",
                        html: "<p>Привіт! Час пройти короткий щоденний тест когнітивної втоми.</p>"
                    })
                });

                // 3. Оновлюємо лічильник відправлених нагадувань в Airtable
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
        console.error("Error processing reminders:", error);
        return { statusCode: 500, body: error.toString() };
    }
});

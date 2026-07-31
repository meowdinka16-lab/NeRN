export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    const AIRTABLE_BASE_ID = "appOnjwF4xcrYZUER";
    const TABLE_NAME = "tbl0A8bcJjNlpEyhG";
    
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "Missing Airtable environment variables" }) 
      };
    }

    let fields = {};

    if (data.type === "waitlist") {
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

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    // Чисте URL посилання без зайвих символів
    const airtableUrl = "https://api.airtable.com/v0/appuV2qNUav59BzfW/tblkbG1G66nO4pREg";

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          "Date": data.date,
          "userId": data.userId,
          "Score": data.score,
          "Sleep": data.sleep,
          "ScreenTime": data.screenTime,
          "Fatigue": data.fatigue,
          "Speed": data.speed,
          "Accuracy": data.accuracy,
          "Email": data.email
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable error: ${errText}`);
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ success: true }) 
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
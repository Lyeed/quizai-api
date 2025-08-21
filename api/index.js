import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
    cors({
        origin: process.env.APP_ORIGIN,
    })
);

app.post("/quiz", async (req, res) => {
    const { prompt, difficulty } = req.body;

    if (!prompt || !difficulty) {
        return res.status(400).json({ error: "Invalid format" });
    }

    let data;

    try {
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-goog-api-key": process.env.GOOGLE_GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: {
                        parts: [
                            {
                                text: `Generate exactly this JSON:

{
  "topic": "short theme string",
  "questions": [
    {
      "question": "string",
      "responses": ["string","string","string","string"],
      "answer": 0
    }
  ]
}

Rules:
- topic = concise theme from input.
- questions = exactly 10.
- each has 4 responses, 1 correct.
- answer = 0-based index of correct response.
- Output only valid JSON, nothing else.

Difficulty levels:
- Easy → basic, obvious facts, everyone knows.
- Medium → common knowledge, but not obvious.
- Hard → advanced details, less familiar.
- Very hard → expert-only, highly specific, very difficult.

Quiz difficulty: "{{${difficulty}}}"
User topic: "{{${prompt}}}"`,
                            },
                        ],
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error("Request error");
        }

        const json = await response.json();

        const text = json.candidates?.[0]?.content?.parts[0]?.text;
        if (!text) {
            throw new Error("Response format error");
        }

        const regex = /```json([\s\S]*?)```/;
        const match = text.match(regex);

        if (!match) {
            throw new Error("Invalid format");
        }

        data = JSON.parse(match[1].trim());
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error when requesting model" });
    }

    if (!data) {
        return res.status(400).json({ error: "Invalid model response" });
    }

    res.send(data);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

export default app;

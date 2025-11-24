
import { GoogleGenAI } from "@google/genai";
import { DailyStatus, User, AttendanceStats, Flashcard, MindMapNode, StudyNote } from '../types';

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const askGeminiAdvisor = async (
  todayStatus: DailyStatus[],
  users: User[],
  userStats: AttendanceStats,
  userGoal: number,
  weather: string = "Sunny",
  customQuery?: string,
  dateLabel: string = "Today"
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Error: API Key missing. Please configure your environment.";

  const goingCount = todayStatus.filter(s => s.status === 'GOING').length;
  const notGoingCount = todayStatus.filter(s => s.status === 'NOT_GOING').length;
  const totalVotes = goingCount + notGoingCount;
  
  let majorityVerdict = "The squad is undecided.";
  if (totalVotes > 0) {
      if (goingCount > notGoingCount) majorityVerdict = "Majority says: GO TO SCHOOL.";
      else if (notGoingCount > goingCount) majorityVerdict = "Majority says: STAY HOME.";
      else majorityVerdict = "The squad is split 50/50.";
  }

  const prompt = `
    You are a witty, strategic "Attendance Advisor" for a Class 12 student preparing for JEE/NEET exams.
    
    Context:
    - Planning for: ${dateLabel}
    - School Timings: 12:00 PM to 07:00 PM (Afternoon School).
    - Weather Forecast: ${weather}
    
    Squad Status for ${dateLabel}:
    - Friends Going: ${goingCount}
    - Friends Not Going: ${notGoingCount}
    - Verdict: ${majorityVerdict}
    
    My Stats:
    - My Attendance: ${userStats.percentage.toFixed(1)}%
    - My Weekly Target: Go ${userGoal} days/week.
    
    User Query: "${customQuery || `Should I go to school ${dateLabel.toLowerCase()}?`}"

    Your Task:
    1. Analyze the "Majority Vote". If everyone is skipping, acknowledge the peer pressure (but warn about attendance if low).
    2. Consider the school timing (12-7 PM). Is it worth ruining the whole afternoon if friends aren't there?
    3. Compare my attendance vs my goal. If I'm behind goal, push me to go.
    
    Keep the response short (max 3 sentences), decisive, and formatted with Markdown. Use emojis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "AI is currently sleeping in class. Try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Connectivity issue. Just toss a coin!";
  }
};

export const generateStudyMaterial = async (
  topic: string, 
  type: 'NOTES' | 'FLASHCARDS' | 'MINDMAP'
): Promise<StudyNote | Flashcard[] | MindMapNode | null> => {
  const ai = getAIClient();
  if (!ai) throw new Error("API Key missing");
  
  if (type === 'NOTES') {
    const prompt = `Create a creative, structured, and INTERACTIVE study note for a Class 12 student on the topic: "${topic}".
    
    FORMATTING RULES:
    - Use **bold** for key terms.
    - Use ==double equals== to highlight definitions.
    - Tone: Handwritten, friendly, easy to read.
    
    INTERACTIVITY:
    Include at least 2 questions per section to test understanding. Mix these types:
    1. FILL_BLANK: A sentence with a missing key word.
    2. MCQ: A question with 4 options.
    3. SUBJECTIVE: A short thought-provoking question.
    
    Return a valid JSON object with the following structure:
    {
      "topic": "${topic}",
      "summary": "A short 2-sentence sticky-note summary.",
      "sections": [
        {
          "title": "Subtopic Title",
          "content": "Explanation using **bold** and ==highlights==. Max 3 sentences.",
          "visualKeywords": "3 words describing a specific scientific diagram for this section",
          "questions": [
             {
               "id": "q1",
               "type": "FILL_BLANK",
               "question": "The powerhouse of the cell is ____.",
               "answer": "mitochondria"
             }
          ]
        }
      ]
    }
    Ensure at least 4 sections.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    try {
        return JSON.parse(response.text || "{}") as StudyNote;
    } catch (e) {
        console.error("Failed to parse notes JSON", e);
        return null;
    }
  }
  
  if (type === 'FLASHCARDS') {
    const prompt = `Create 8 engaging study flashcards for "${topic}". 
    Return a JSON array of objects with these properties:
    - "question": string
    - "answer": string (keep it concise)
    - "hint": string (a small clue)
    - "emoji": string (a single relevant emoji)
    
    Make them fun and conceptual.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "[]");
  }
  
  if (type === 'MINDMAP') {
    const prompt = `Create a hierarchical mind map structure for the topic "${topic}". 
    Return a single JSON object representing the root node. 
    
    Structure:
    {
      "id": "root",
      "label": "Main Topic",
      "emoji": "🧬",
      "children": [
        {
          "id": "c1",
          "label": "Subtopic",
          "emoji": "🔬",
          "children": []
        }
      ]
    }
    
    Rules:
    1. Root node should be the main topic.
    2. Break it down into 3-5 main branches.
    3. Each branch should have 2-3 sub-branches.
    4. Provide a relevant "emoji" for EVERY node.
    5. Max depth 3.
    6. Keep labels short (max 3 words).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || "{}");
  }

  return null;
};

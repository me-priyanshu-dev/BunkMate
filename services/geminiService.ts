
import { GoogleGenAI } from "@google/genai";
import { DailyStatus, User, AttendanceStats, MindMapNode, StudyNote } from '../types';

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Robust JSON cleaner to handle AI markdown output
const cleanJSON = (text: string) => {
  if (!text) return "{}";
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*|```/g, '').trim();
  
  // Find the first '{' or '[' and the last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  if (firstBrace === -1 && firstBracket === -1) return "{}";
  
  let start = 0;
  let end = cleaned.length;
  
  // Determine if we are looking for an object or array
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
      end = cleaned.lastIndexOf('}') + 1;
  } else if (firstBracket !== -1) {
      start = firstBracket;
      end = cleaned.lastIndexOf(']') + 1;
  }
  
  return cleaned.substring(start, end);
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
  type: 'NOTES' | 'MINDMAP'
): Promise<StudyNote | MindMapNode | null> => {
  const ai = getAIClient();
  if (!ai) {
      console.error("API Key missing");
      return null;
  }
  
  try {
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
      
      const cleanText = cleanJSON(response.text || "{}");
      return JSON.parse(cleanText) as StudyNote;
    }
    
    if (type === 'MINDMAP') {
      const prompt = `Create a hierarchical mind map for the topic: "${topic}".
      Return a JSON object representing the root node with this structure:
      {
        "id": "root",
        "label": "${topic}",
        "emoji": "🧠",
        "children": [
          {
            "id": "child_1",
            "label": "Subtopic",
            "emoji": "🔹",
            "children": [...]
          }
        ]
      }
      Ensure at least 3 levels of depth. Use relevant emojis for every node.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const cleanText = cleanJSON(response.text || "{}");
      return JSON.parse(cleanText) as MindMapNode;
    }

    return null;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return null;
  }
};
import { GoogleGenAI } from "@google/genai";
import { DailyStatus, User, AttendanceStats } from '../types';

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
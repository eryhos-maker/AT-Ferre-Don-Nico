import { GoogleGenAI } from "@google/genai";
import { Priority, TaskStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeTask = async (title: string, description: string): Promise<{ priority: Priority; suggestedSteps: string[] }> => {
  if (!apiKey) {
    console.warn("API Key missing, returning mock AI response");
    return {
      priority: Priority.MEDIUM,
      suggestedSteps: ["Paso 1: Definir alcance", "Paso 2: Ejecutar", "Paso 3: Revisar"]
    };
  }

  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Actúa como un experto en gestión de proyectos. Analiza la siguiente tarea operativa:
      Título: ${title}
      Descripción: ${description}

      Devuelve un JSON con:
      1. "priority": El nivel de prioridad sugerido (Baja, Media, Alta, Crítica) basado en la urgencia implícita.
      2. "suggestedSteps": Un array de strings con 3 a 5 pasos cortos para completar la tarea.
      
      No incluyas markdown, solo el JSON crudo.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text || "{}";
    // Clean potential markdown blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
      priority: result.priority || Priority.MEDIUM,
      suggestedSteps: result.suggestedSteps || []
    };

  } catch (error) {
    console.error("Error calling Gemini:", error);
    return {
      priority: Priority.MEDIUM,
      suggestedSteps: ["No se pudieron generar pasos automáticamente."]
    };
  }
};

export const generateExecutiveSummary = async (tasks: any[]): Promise<string> => {
   if (!apiKey) return "Resumen no disponible sin API Key.";
   
   const taskSummary = tasks.map(t => `- ${t.title} (${t.status})`).join('\n');
   
   try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Genera un resumen ejecutivo muy breve (máximo 50 palabras) sobre el estado actual de estas tareas para un gerente:\n${taskSummary}`
    });
    return response.text || "No se pudo generar el resumen.";
   } catch (e) {
       return "Error al generar resumen.";
   }
};
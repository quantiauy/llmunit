import { Injectable } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';

export interface EvaluationResult {
  passed: boolean;
  score: number;
  feedback: string;
}

@Injectable()
export class LLMEvaluator {
  constructor(private readonly llmService: OpenRouterService) {}

  async evaluate(
    userInput: string,
    actualResponse: string,
    expectedBehavior: string,
    judgeModel: string = 'openai/gpt-oss-safeguard-20b'
  ): Promise<EvaluationResult> {
    const prompt = `
Eres un juez experto en evaluar respuestas de asistentes de IA.
Tu tarea es determinar si la Respuesta Actual cumple con el Comportamiento Esperado basándote en la Consulta del Usuario.

### Entrada
- **Consulta del Usuario**: "${userInput}"
- **Respuesta Actual**: "${actualResponse}"
- **Comportamiento Esperado**: "${expectedBehavior}"

### Instrucciones
1. Analiza si la respuesta cumple con los requisitos del comportamiento esperado.
2. Proporciona una puntuación del 0 al 10.
3. Determina si pasó (passed: true si score >= 7).
4. Proporciona un breve feedback justificando la nota.

### Salida Obligatoria (JSON válido únicamente)
{
  "passed": boolean,
  "score": number,
  "feedback": string
}
`;

    try {
      const response = await this.llmService.chat(
        [{ role: 'user', content: prompt }],
        judgeModel
      );

      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error evaluating response:', error);
      return {
        passed: false,
        score: 0,
        feedback: `Error in evaluation: ${error.message}`,
      };
    }
  }
}

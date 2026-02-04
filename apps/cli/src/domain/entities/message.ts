export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  role: Role;
  content: string;
  name?: string;
  tool_call_id?: string;
}

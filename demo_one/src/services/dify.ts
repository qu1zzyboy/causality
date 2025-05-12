export interface DifyMessage {
  event: string;
  conversation_id: string;
  message_id: string;
  created_at: number;
  task_id: string;
  id: string;
  answer: string;
  from_variable_selector?: string[];
}

export interface DifyRequest {
  inputs: Record<string, any>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user: string;
  files?: Array<{
    type: string;
    transfer_method: string;
    url: string;
  }>;
}

export class DifyService {
  private static instance: DifyService;
  private baseURL: string = 'https://api.dify.ai/v1';
  private apiKey: string = 'app-NsSTTfcsLu815hikfIxyTrvN';

  private constructor() {}

  public static getInstance(): DifyService {
    if (!DifyService.instance) {
      DifyService.instance = new DifyService();
    }
    return DifyService.instance;
  }

  async sendMessage(
    query: string,
    conversationId?: string,
    onMessage: (message: DifyMessage) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {},
          query,
          response_mode: 'streaming',
          conversation_id: conversationId || '',
          user: 'user-' + Date.now(), // Generate a unique user ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line) as DifyMessage;
              onMessage(message);
            } catch (e) {
              console.error('Failed to parse message:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message to Dify:', error);
      throw error;
    }
  }
}

export const difyService = DifyService.getInstance(); 
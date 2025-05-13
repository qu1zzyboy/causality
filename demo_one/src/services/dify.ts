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
    onMessage: (message: DifyMessage) => void,
    walletAddress: string,
    conversationId?: string
  ): Promise<void> {
    try {
      const requestBody = {
        inputs: {},
        query,
        response_mode: 'streaming',
        conversation_id: conversationId || '',
        user: walletAddress,
      };

      console.log('Sending request to Dify:', {
        url: `${this.baseURL}/chat-messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
        conversationId
      });

      const response = await fetch(`${this.baseURL}/chat-messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Dify response status:', response.status);
      
      if (!response.ok) {
        console.error('Dify error response:', {
          status: response.status,
          statusText: response.statusText,
        });
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
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6);
              const message = JSON.parse(jsonStr) as DifyMessage;
              console.log('Received Dify message:', {
                event: message.event,
                conversation_id: message.conversation_id,
                message_id: message.message_id,
                answer: message.answer?.substring(0, 100) + '...'
              });
              onMessage(message);
            } catch (e) {
              console.error('Failed to parse message:', line, e);
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
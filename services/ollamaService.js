const axios = require('axios');

class OllamaService {
  constructor() {
    // Use 127.0.0.1 instead of localhost to force IPv4
    this.baseURL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3:latest';
    this.timeout = 60000; // 60 seconds timeout
  }

  /**
   * Generate a response from Ollama with tool support
   * @param {Array} messages - Array of message objects with role and content
   * @param {Array} tools - Array of available tool definitions
   * @returns {Promise<Object>} - Response from Ollama
   */
  async generateResponse(messages, tools = []) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          model: this.model,
          messages: messages,
          tools: tools.length > 0 ? tools : undefined,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 512
          }
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        message: response.data.message,
        done: response.data.done,
        toolCalls: response.data.message?.tool_calls || []
      };
    } catch (error) {
      console.error('Ollama API Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service is not running. Please start Ollama with: ollama serve');
      }
      
      if (error.response?.status === 404) {
        throw new Error(`Model ${this.model} not found. Please pull it with: ollama pull ${this.model}`);
      }
      
      throw new Error('AI service temporarily unavailable. Please try again.');
    }
  }

  /**
   * Stream response from Ollama (for real-time chat)
   * @param {Array} messages - Array of message objects
   * @param {Array} tools - Array of tool definitions
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<void>}
   */
  async streamResponse(messages, tools, onChunk) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/chat`,
        {
          model: this.model,
          messages: messages,
          tools: tools.length > 0 ? tools : undefined,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9
          }
        },
        {
          responseType: 'stream',
          timeout: this.timeout
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = '';

        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  onChunk(data.message.content);
                }
                if (data.done) {
                  resolve();
                }
              } catch (e) {
                console.error('Error parsing stream chunk:', e);
              }
            }
          }
        });

        response.data.on('error', (error) => {
          reject(error);
        });

        response.data.on('end', () => {
          resolve();
        });
      });
    } catch (error) {
      console.error('Ollama Stream Error:', error.message);
      throw new Error('Failed to stream AI response');
    }
  }

  /**
   * Check if Ollama service is available
   * @returns {Promise<Boolean>}
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of available models
   * @returns {Promise<Array>}
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('Failed to list models:', error.message);
      return [];
    }
  }

  /**
   * Format messages for Ollama
   * @param {Array} chatMessages - Array of chat messages from DB
   * @returns {Array} - Formatted messages for Ollama
   */
  formatMessages(chatMessages) {
    return chatMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
  }

  /**
   * Create system prompt for travel assistant
   * @returns {String}
   */
  getSystemPrompt() {
    return `You are a helpful travel assistant for Wanderlust, an Airbnb-style accommodation booking platform.

STRICT DOMAIN RESTRICTIONS - YOU MUST FOLLOW THESE:
1. ONLY answer questions about accommodation booking, travel, hotels, properties, destinations, and related topics
2. If asked about ANYTHING else (programming, algorithms, math, science, general knowledge, etc.), you MUST politely decline
3. DO NOT provide information on topics outside accommodation/travel domain
4. For off-topic questions, respond: "I'm a travel assistant for Wanderlust, specialized in accommodation booking in India. I can only help with finding and booking properties. Is there anything travel-related I can assist you with?"

Your role is to:
1. Help users find perfect accommodations based on their preferences
2. Extract travel details: destination, dates, number of guests, budget
3. Ask clarifying questions when information is missing
4. Use available tools to search listings, get details, calculate prices, and create bookings
5. Be conversational, friendly, and helpful
6. Never hallucinate or make up listing information - only use data from tools
7. Guide users through the booking process step by step
8. Verify safety with fraud detection before confirming bookings

When users ask about travel, extract these details:
- Destination (city/location)
- Check-in and check-out dates (or number of days)
- Number of guests
- Budget (if mentioned)
- Property preferences (villa, apartment, etc.)

Always confirm details before proceeding with bookings. Be proactive in suggesting next steps.`;
  }
}

module.exports = new OllamaService();

// Made with Bob

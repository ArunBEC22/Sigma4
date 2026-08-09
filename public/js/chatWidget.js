/**
 * Wanderlust AI Chat Widget
 * Handles chat interface interactions and API communication
 */

class ChatWidget {
  constructor() {
    this.conversationId = null;
    this.isOpen = false;
    this.isProcessing = false;
    this.init();
  }

  /**
   * Initialize chat widget
   */
  init() {
    this.setupEventListeners();
    this.setupAutoResize();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const toggleBtn = document.getElementById('chat-toggle');
    const closeBtn = document.getElementById('chat-close');
    const endChatBtn = document.getElementById('chat-end');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleChat());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    if (endChatBtn) {
      endChatBtn.addEventListener('click', () => this.endChat());
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  /**
   * Setup auto-resize for textarea
   */
  setupAutoResize() {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
      });
    }
  }

  /**
   * Toggle chat window
   */
  toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    
    if (this.isOpen) {
      this.closeChat();
    } else {
      chatWindow.classList.remove('hidden');
      this.isOpen = true;
      
      // Start conversation if not already started
      if (!this.conversationId) {
        this.startConversation();
      }
      
      // Focus input
      setTimeout(() => {
        document.getElementById('chat-input')?.focus();
      }, 300);
    }
  }

  /**
   * Close chat window
   */
  closeChat() {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.add('hidden');
    this.isOpen = false;
  }

  /**
   * Start a new conversation
   */
  async startConversation() {
    try {
      const response = await fetch('/chat/conversation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Start conversation failed:', response.status, errorText);
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      
      if (data.success) {
        this.conversationId = data.conversationId;
        this.addMessage('assistant', data.message);
      } else {
        throw new Error(data.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Show error message - don't set fallback ID
      this.addMessage('assistant', 'Please login to use the chat assistant. 🔐');
      this.conversationId = null;
    }
  }

  /**
   * Send user message
   */
  async sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const message = input.value.trim();

    if (!message || this.isProcessing) return;

    // Check if conversation is started
    if (!this.conversationId) {
      this.addMessage('assistant', 'Please refresh the page and make sure you\'re logged in to use the chat.');
      this.isProcessing = false;
      input.disabled = false;
      sendBtn.disabled = false;
      return;
    }

    // Disable input while processing
    this.isProcessing = true;
    input.disabled = true;
    sendBtn.disabled = true;

    // Add user message to UI
    this.addMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await fetch('/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: this.conversationId,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📥 Frontend received data:', {
        success: data.success,
        hasResponse: !!data.response,
        hasListings: !!data.listings,
        listingsCount: data.listings ? data.listings.length : 0,
        listings: data.listings
      });

      this.hideTypingIndicator();

      if (data.success) {
        // Add AI response
        if (data.response) {
          this.addMessage('assistant', data.response);
        }

        // Display listings if any
        if (data.listings && data.listings.length > 0) {
          console.log('✅ Displaying', data.listings.length, 'listings');
          this.displayListings(data.listings);
        } else {
          console.log('❌ No listings to display');
        }

        // Handle payment redirect
        if (data.paymentUrl) {
          this.addMessage('assistant', '🔒 Redirecting to secure payment...');
          setTimeout(() => {
            window.location.href = data.paymentUrl;
          }, 2000);
        }
      } else {
        this.addMessage('assistant', data.message || 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      console.error('Send message error:', error);
      this.hideTypingIndicator();
      this.addMessage('assistant', 'Sorry, I\'m having trouble processing your request. Please make sure you\'re logged in and try again.');
    } finally {
      // Re-enable input
      this.isProcessing = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  /**
   * Add message to chat
   */
  addMessage(role, content) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (role === 'assistant') {
      messageDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div>
          <div class="message-content" style="color: #000000 !important; background: #ffffff !important;">${this.formatMessage(content)}</div>
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div>
          <div class="message-content" style="color: #000000 !important; background: #ffffff !important;">${this.escapeHtml(content)}</div>
          <div class="message-time">${timeStr}</div>
        </div>
      `;
    }

    messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Format message content (handle markdown-like formatting)
   */
  formatMessage(content) {
    let formatted = this.escapeHtml(content);
    
    // Bold text (**text**) with white color
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #ffffff !important;">$1</strong>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Display listing cards
   */
  displayListings(listings) {
    console.log('🎨 displayListings called with:', listings);
    const messagesContainer = document.getElementById('chat-messages');
    console.log('📦 Messages container:', messagesContainer);

    if (!messagesContainer) {
      console.error('❌ Messages container not found!');
      return;
    }

    listings.forEach((listing, index) => {
      console.log(`🏠 Creating card ${index + 1}:`, {
        title: listing.title,
        location: listing.location,
        price: listing.price
      });

      const card = document.createElement('div');
      card.className = 'listing-card';
      card.onclick = () => this.selectListing(listing._id);

      const imageUrl = listing.image?.url || '/images/placeholder.jpg';
      const rating = listing.averageRating || 'New';
      const reviewCount = listing.reviewCount || 0;

      card.innerHTML = `
        <img src="${imageUrl}" alt="${this.escapeHtml(listing.title)}" onerror="this.src='/images/placeholder.jpg'">
        <div class="listing-info">
          <h4>${this.escapeHtml(listing.title)}</h4>
          <p>${this.escapeHtml(listing.location)}, ${this.escapeHtml(listing.country)}</p>
          <div class="rating">
            <span>⭐ ${rating}</span>
            ${reviewCount > 0 ? `<span>(${reviewCount} reviews)</span>` : '<span>(New listing)</span>'}
          </div>
          <p class="price">₹${listing.price.toLocaleString('en-IN')}/night</p>
          <button class="btn-select">View Details</button>
        </div>
      `;

      console.log('➕ Appending card to container');
      messagesContainer.appendChild(card);
      console.log('✅ Card appended successfully');
    });

    console.log('🎯 All cards created, scrolling to bottom');

    this.scrollToBottom();
  }

  /**
   * Handle listing selection
   */
  async selectListing(listingId) {
    // Don't show the message in chat, just send it silently
    const message = `Show me details of listing ${listingId}`;
    
    if (this.isProcessing) return;
    
    if (!this.conversationId) {
      this.addMessage('assistant', 'Please refresh the page and make sure you\'re logged in to use the chat.');
      return;
    }

    this.isProcessing = true;
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    input.disabled = true;
    sendBtn.disabled = true;

    // Show typing indicator
    this.showTypingIndicator();

    try {
      const response = await fetch('/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: this.conversationId,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      this.hideTypingIndicator();

      if (data.success) {
        // Add AI response (details)
        if (data.response) {
          this.addMessage('assistant', data.response);
        }

        // Don't display listing cards again for details view
        // The response already contains the details

        // Handle payment redirect
        if (data.paymentUrl) {
          this.addMessage('assistant', '🔒 Redirecting to secure payment...');
          setTimeout(() => {
            window.location.href = data.paymentUrl;
          }, 2000);
        }
      } else {
        this.addMessage('assistant', data.message || 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      console.error('Select listing error:', error);
      this.hideTypingIndicator();
      this.addMessage('assistant', 'Sorry, I\'m having trouble processing your request. Please try again.');
    } finally {
      this.isProcessing = false;
      input.disabled = false;
      sendBtn.disabled = false;
    }
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.classList.remove('hidden');
      this.scrollToBottom();
    }
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.classList.add('hidden');
    }
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    messagesContainer.appendChild(errorDiv);
    this.scrollToBottom();
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    messagesContainer.appendChild(successDiv);
    this.scrollToBottom();
  }

  /**
   * End current chat and start fresh
   */
  async endChat() {
    // Confirm with user
    if (!confirm('Are you sure you want to end this chat and start a new conversation?')) {
      return;
    }

    // Clear messages
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';

    // Reset conversation ID
    this.conversationId = null;

    // Start new conversation
    await this.startConversation();

    // Show confirmation
    this.addMessage('assistant', '✨ New conversation started! How can I help you today?');
  }
}

// Initialize chat widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if user is logged in
  if (document.getElementById('chat-widget')) {
    window.chatWidget = new ChatWidget();
  }
});

// Made with Bob

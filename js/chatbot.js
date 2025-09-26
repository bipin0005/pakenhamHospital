// AI Chatbot for Pakenham Hospital
import { getCurrentUser } from './auth.js';
import { showToast } from './utils.js';

class HospitalChatbot {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.initializeElements();
    this.bindEvents();
    this.addWelcomeMessage();
  }

  initializeElements() {
    this.container = document.getElementById('chatbotContainer');
    this.toggle = document.getElementById('chatbotToggle');
    this.closeBtn = document.getElementById('closeChatbot');
    this.messagesContainer = document.getElementById('chatMessages');
    this.input = document.getElementById('chatInput');
    this.sendBtn = document.getElementById('sendMessage');
  }

  bindEvents() {
    this.toggle.addEventListener('click', () => this.toggleChat());
    this.closeBtn.addEventListener('click', () => this.closeChat());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Quick question buttons
    this.messagesContainer.addEventListener('click', (e) => {
      if (e.target.dataset.quickQuestion) {
        this.handleQuickQuestion(e.target.dataset.quickQuestion);
      }
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.container.classList.remove('d-none');
      this.input.focus();
    } else {
      this.container.classList.add('d-none');
    }
  }

  closeChat() {
    this.isOpen = false;
    this.container.classList.add('d-none');
  }

  addWelcomeMessage() {
    this.messages = [{
      type: 'bot',
      content: 'Hi! I\'m your hospital assistant. How can I help you today?',
      timestamp: new Date()
    }];
    this.renderMessages();
  }

  addMessage(content, type = 'user') {
    this.messages.push({
      type,
      content,
      timestamp: new Date()
    });
    this.renderMessages();
    this.scrollToBottom();
  }

  renderMessages() {
    const user = getCurrentUser();
    const isLoggedIn = user && user.role === 'patient';
    
    this.messagesContainer.innerHTML = this.messages.map(msg => {
      if (msg.type === 'bot') {
        return `
          <div class="d-flex mb-3">
            <div class="bg-light rounded p-2 me-3" style="max-width: 80%;">
              <div class="small text-muted">Hospital Assistant</div>
              <div>${msg.content}</div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="d-flex justify-content-end mb-3">
            <div class="bg-primary text-white rounded p-2" style="max-width: 80%;">
              <div class="small opacity-75">You</div>
              <div>${msg.content}</div>
            </div>
          </div>
        `;
      }
    }).join('') + (this.messages.length === 1 ? `
      <div class="text-center text-muted">
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-primary me-1" data-quick-question="book">Book Appointment</button>
          <button class="btn btn-sm btn-outline-primary me-1" data-quick-question="hours">Opening Hours</button>
          <button class="btn btn-sm btn-outline-primary" data-quick-question="contact">Contact Info</button>
        </div>
      </div>
    ` : '');
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  sendMessage() {
    const message = this.input.value.trim();
    if (!message) return;

    this.addMessage(message);
    this.input.value = '';
    
    // Simulate typing delay
    setTimeout(() => {
      const response = this.generateResponse(message);
      this.addMessage(response, 'bot');
    }, 1000);
  }

  handleQuickQuestion(type) {
    const questions = {
      book: 'How do I book an appointment?',
      hours: 'What are your opening hours?',
      contact: 'How can I contact the hospital?'
    };
    
    const question = questions[type];
    if (question) {
      this.addMessage(question);
      setTimeout(() => {
        const response = this.generateResponse(question);
        this.addMessage(response, 'bot');
      }, 1000);
    }
  }

  generateResponse(message) {
    const user = getCurrentUser();
    const isLoggedIn = user && user.role === 'patient';
    const lowerMessage = message.toLowerCase();

    // Appointment booking
    if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      if (isLoggedIn) {
        return 'You can book an appointment by going to your Patient Dashboard and clicking "Book Appointment". You can also visit our Patient Portal to register if you\'re new. Would you like me to help you with anything else?';
      } else {
        return 'To book an appointment, you need to register first. Please visit our Patient Portal to create an account, then you can book appointments online. You can also call us at (03) 1234-5678 for assistance.';
      }
    }

    // Opening hours
    if (lowerMessage.includes('hour') || lowerMessage.includes('open') || lowerMessage.includes('time')) {
      return 'Our hospital is open Monday to Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 2:00 PM. We are closed on Sundays. Emergency services are available 24/7.';
    }

    // Contact information
    if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('call') || lowerMessage.includes('email')) {
      return 'You can contact us at:<br>📞 Phone: (03) 1234-5678<br>📧 Email: info@pakenham.example<br>📍 Address: 123 Hospital Street, Pakenham VIC 3810<br>🌐 Website: www.pakenham.example';
    }

    // Services
    if (lowerMessage.includes('service') || lowerMessage.includes('specialty') || lowerMessage.includes('doctor')) {
      return 'We offer various medical services including:<br>• Cardiology (Dr. Smith)<br>• Pediatrics (Dr. Lee)<br>• General Medicine<br>• Emergency Care<br>• Diagnostic Services<br>Our doctors are highly qualified and experienced in their fields.';
    }

    // Payment and insurance
    if (lowerMessage.includes('payment') || lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('insurance')) {
      return 'Our consultation fee is $120 per appointment. We accept most major health insurance plans, credit cards, and cash payments. Payment is due at the time of service. For insurance inquiries, please contact our billing department at (03) 1234-5679.';
    }

    // Emergency
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('help')) {
      return 'For medical emergencies, please call 000 immediately or visit our Emergency Department which is open 24/7. If you need urgent medical advice, you can also call our emergency line at (03) 1234-5678.';
    }

    // Registration
    if (lowerMessage.includes('register') || lowerMessage.includes('sign up') || lowerMessage.includes('account')) {
      return 'To register as a new patient, visit our Patient Portal and fill out the registration form. You\'ll need to provide your personal details, contact information, and create a username and password. Registration is free and takes just a few minutes.';
    }

    // Prescription
    if (lowerMessage.includes('prescription') || lowerMessage.includes('medicine') || lowerMessage.includes('medication')) {
      return 'Prescriptions can be issued by our doctors during your appointment. You can collect them from our pharmacy or have them sent to your preferred pharmacy. Please bring your Medicare card and any current medications to your appointment.';
    }

    // Test results
    if (lowerMessage.includes('result') || lowerMessage.includes('test') || lowerMessage.includes('lab')) {
      return 'Test results are typically available within 2-3 business days. You can view them through your Patient Portal once logged in, or we can send them to you via secure email. For urgent results, we will contact you directly.';
    }

    // General greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'Hello! Welcome to Pakenham Hospital. I\'m here to help you with any questions about our services, appointments, or general information. How can I assist you today?';
    }

    // Default response
    return 'I understand you\'re looking for information. I can help you with:<br>• Booking appointments<br>• Hospital services and specialties<br>• Opening hours and contact information<br>• Payment and insurance<br>• Registration process<br><br>Could you please be more specific about what you need help with?';
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HospitalChatbot();
});

export default HospitalChatbot;

import { useState, useEffect, useRef } from 'react';
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize system message for context
  useEffect(() => {
    setMessages([
      {
        role: "system",
        content: "You are a helpful assistant. Respond conversationally to user inputs., respond should be a maximum of 100 words, is a chat no need to go to deeper",
      },
    ]);
  }, []);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to send a message and get the response
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userInput.trim()) return; // Prevent sending empty messages

    const newUserMessage = { role: 'user', content: userInput };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setUserInput('');
    setIsAIThinking(true);

    try {

      const baseUrl = import.meta.env.VITE_API_URL;

      // Genera un tiempo de espera aleatorio entre 0 y 10 segundos
      const waitTime = Math.random() * 10000; // 10000 ms = 10 segundos

      await new Promise(resolve => setTimeout(resolve, waitTime));

      const response = await fetch(
        `${baseUrl}/chatbot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: userInput, 
            conversationId: conversationId 
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        if (!conversationId) {
          setConversationId(data.conversationId);
        }

        const botMessage = { role: 'assistant', content: data.response };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } else {
        throw new Error(data.error || 'Error desconocido al obtener la respuesta del chatbot.');
      }
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setIsAIThinking(false);
      scrollToBottom();
    }
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="chatbot-wrap">
      <div className="chatbot">
        <div className="chatbot-avatar">
          <img src="https://i.pravatar.cc/300" alt="Avatar" />
        </div>
        <div className="messages">
          {messages.map((message, index) => 
            message.role !== 'system' && (
              <div
                key={index}
                className={message.role === 'user' ? 'user-message' : 'bot-message'}
              >
                {message.content}
              </div>
            )
          )}
          {isAIThinking && <div className="message-typing">AI está escribiendo</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
          />
          <button type="submit">Enviar</button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
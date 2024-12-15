import { useState, useEffect } from 'react';
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [conversationId, setConversationId] = useState(null);

  // Initialize system message for context
  useEffect(() => {
    setMessages([
      {
        role: "system",
        content: "You are a helpful assistant. Respond conversationally to user inputs.",
      },
    ]);
  }, []);

  // Function to send a message and get the response
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userInput.trim()) return; // Prevent sending empty messages

    const newUserMessage = { role: 'user', content: userInput };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setUserInput('');

    try {

      const env = import.meta.env.VITE_Enviroment_BaseURL;

      const baseUrl = env === 'Dev' ? 'http://localhost:3000' : 'https://docmanagerapi.onrender.com';

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
      });
      const data = await response.json();
      if (response.ok) {
        // Update conversationId if it's a new conversation
        if (!conversationId) {
          setConversationId(data.conversationId);
        }

        // Add the assistant's response to the chat
        const botMessage = { role: 'assistant', content: data.response };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } else {
        throw new Error(data.error || 'Error desconocido al obtener la respuesta del chatbot.');
      }
    } catch (error) {
      console.error('Error generating response:', error);
      // Optionally, add an error message to the UI if desired
    }
  };

  return (
    <div className="chatbot">
      <img src="https://i.pravatar.cc/300" alt="Avatar" />
      <div className="messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === 'user' ? 'user-message' : 'bot-message'}
          >
            {message.content}
          </div>
        ))}
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
  );
};

export default ChatBot;
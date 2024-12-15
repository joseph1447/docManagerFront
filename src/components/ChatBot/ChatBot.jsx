import { useState, useEffect } from 'react';
import './ChatBot.css';
import { GoogleGenerativeAI } from "@google/generative-ai";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');

  // Accessing API key from environment variable
  const apiKey = import.meta.env.VITE_APP_GEMINI_API_KEY;

  // Configuration of the chat session
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
      // Include the entire message history for context
      const result = await model.startChat({
        messages: [...messages, newUserMessage],
      });

      // Add the assistant's response to the chat
      const botMessage = { role: 'assistant', content: result.text() };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
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

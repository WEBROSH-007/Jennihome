'use client'
import { useState, useRef, useEffect } from 'react';
import formatMessage from './util';
import './chat.css';
import { Mulish } from "next/font/google";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [currentRatingMessageId, setCurrentRatingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Quick response options
  const quickResponses = [
    { id: 1, text: 'Different bed sizes available' },
    { id: 2, text: 'Outdoor dining tables' },
    { id: 3, text: 'Unique Sofa sets colors' },
    { id: 4, text: 'Living room furniture colors' },
 
  ];

  // Function to scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: 'Hey there! How can I help you today?',
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showQuickResponses: true
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
    // Focus input when chat is opened
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // Toggle expanded/minimized state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Close chat window
  const closeChat = () => {
    setIsOpen(false);
  };

  // Handle quick response click
  const handleQuickResponse = (text) => {
    sendMessage(null, text);
  };

  // Handle rating click
  const handleRating = (messageId, isPositive) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, rated: true, rating: isPositive ? 'positive' : 'negative' } 
          : msg
      )
    );
    setShowRating(false);
    // Here you could also send the rating to your API
  };

  // Handle key press in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Send message to API
  const sendMessage = async (e, quickResponseText = null) => {
    if (e) e.preventDefault();
    
    const messageText = quickResponseText || inputValue;
    if (!messageText.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the API
      const response = await fetch('/api/proxy-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      console.log(response);
      const data = await response.json();
      
      // Add bot response to chat
      const botMessageId = Date.now();
      const botMessage = {
        id: botMessageId,
        text: formatMessage(data.response) || 'Sorry, I could not process your request.',
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showRating: true,
        isHTML: true // Flag to indicate this message contains HTML
      };
      
      setMessages(prev => [...prev, botMessage]);
      setCurrentRatingMessageId(botMessageId);
      setShowRating(true);
    } catch (error) {
      console.error('Error:', error);
      
      // Add error message
      const errorMessage = {
        id: Date.now(),
        text: 'Sorry, there was an error processing your request. Please try again later.',
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat toggle button */}
      {!isOpen && (
        <button 
          onClick={toggleChat}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors w-16 h-16"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
      
      {/* Chat window */}
      {isOpen && (
        <div className="bg-white rounded-[16px] shadow-xl flex flex-col w-96 overflow-hidden border border-gray-200" style={{height: isExpanded ? '700px' : 'auto', maxHeight: '700px'}}>
          {/* Fluid Header with Wave Pattern */}
          <div className="relative bg-blue-600 text-white" style={{ minHeight: '100px' }}>
            {/* Curved Wave Bottom Border */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: '16px' }}>
              <svg 
                className="absolute bottom-0 w-full h-full"
                viewBox="0 0 400 20" 
                preserveAspectRatio="none"
              >
                <path 
                  d="M0,0 C100,40 300,-20 400,10 L400,20 L0,20 Z" 
                  fill="white"
                />
              </svg>
            </div>
            
            {/* Header Content */}
            <div className="py-[20px] px-[20px] relative z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <button onClick={closeChat} className="w-8 h-8 rounded-full flex items-center justify-center mr-1 text-white font-bold hover:bg-[#0558DA]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24" className="directional-icon">
                      <path d="M16.6312 17.7375L14.8687 19.5L7.36865 12L14.8687 4.5L16.6312 6.2625L10.9062 12L16.6312 17.7375Z"></path>
                    </svg>
                  </button>
                  <div>
                    <div className={`${mulish.variable}`}>
                      <div className="text-md font-mulish">Hi there! <span className='text-lg'>👋</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex">
                  <button onClick={toggleExpand} className="text-white p-1 hover:bg-blue-500 rounded mr-1">
                    {isExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <button onClick={closeChat} className="text-white p-1 hover:bg-blue-500 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Status Label */}
              {isExpanded && (
                <div className="text-sm text-white opacity-90 mt-2 font-sans ml-[10px]">
                  I'm JenniBot – Your 24/7 Design Concierge
                </div>
              )}
            </div>
          </div>
          
          {isExpanded && (
            <>
              {/* Messages area */}
              <div className="flex-1 p-4 overflow-y-auto bg-white" style={{minHeight: '400px'}}>
                {messages.map((message) => (
                  <div key={message.id} className={`mb-6 ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                    <div 
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender === 'bot' && (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 bg-blue-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      <div 
                        className={`px-4 py-3 rounded-2xl max-w-[75%] ${
                          message.sender === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}
                      >
                        {message.isHTML ? (
                          <div 
                            className="message-content" 
                            dangerouslySetInnerHTML={{ __html: message.text }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-sm">{message.text}</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Time under message */}
                    <div className={`text-xs text-gray-500 mt-1 ${message.sender === 'user' ? 'text-right mr-1' : 'ml-10'}`}>
                      {message.sender === 'bot' ? 'Algo AI Agent - ' : ''}{message.time}
                    </div>
                    
                    {/* Quick responses after bot messages */}
                    {message.showQuickResponses && (
                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {quickResponses.map(response => (
                          <button
                            key={response.id}
                            onClick={() => handleQuickResponse(response.text)}
                            className="bg-white text-gray-700 border border-gray-300 rounded-full px-3 py-1 text-sm hover:bg-gray-50 transition-colors"
                          >
                            {response.text}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Rating buttons */}
                    {message.showRating && currentRatingMessageId === message.id && showRating && !message.rated && (
                      <div className="mt-2 flex items-center justify-start">
                        <span className="text-sm text-gray-500 mr-2">Was this helpful?</span>
                        <button 
                          onClick={() => handleRating(message.id, true)}
                          className="text-gray-500 hover:text-blue-500 mr-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleRating(message.id, false)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    {/* Show rating result */}
                    {message.rated && (
                      <div className="mt-2 text-xs text-gray-500 ml-10">
                        Thanks for your feedback!
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 bg-blue-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="bg-gray-100 text-black px-4 py-3 rounded-2xl rounded-tl-none">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} /> {/* Anchor for auto-scroll */}
              </div>
              
              {/* Input area */}
              <form onSubmit={sendMessage} className="border-t border-gray-200 p-3 bg-white">
                <div className="flex items-center rounded-3xl border border-gray-300 bg-white pl-4 pr-1 py-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    ref={inputRef}
                    placeholder="Hello, how can I help you? 😊"
                    className="flex-1 text-sm focus:outline-none text-black font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={`p-2 rounded-full ${
                      !inputValue.trim() || isLoading ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="flex justify-end items-center mt-2 text-xs text-gray-400">
                  <div>POWERED BY <span className="font-bold text-gray-500">Algo AI AGENT</span></div>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
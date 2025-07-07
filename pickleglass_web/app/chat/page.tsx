'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/utils/auth'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatSession {
  id: string
  title: string
  started_at: number
  updated_at: number
}

export default function ChatPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSessions = async () => {
    try {
      // TODO: Implement API call to load chat sessions
      // For now, using mock data
      setSessions([])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const createNewSession = async () => {
    try {
      // TODO: Implement API call to create new session
      const newSessionId = `session_${Date.now()}`
      setCurrentSessionId(newSessionId)
      setMessages([])
      loadSessions()
    } catch (error) {
      console.error('Failed to create new session:', error)
    }
  }

  const sendMessage = async () => {
    if (!currentInput.trim() || isSending) return

    const message = currentInput.trim()
    setCurrentInput('')
    setIsSending(true)

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // TODO: Implement API call to send message
      // For now, simulate streaming response
      setIsStreaming(true)
      setStreamingMessage('')
      
      const response = "I'm a simulated response for the web chat interface. This will be replaced with actual AI integration."
      
      // Simulate streaming
      for (let i = 0; i < response.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 20))
        setStreamingMessage(response.slice(0, i + 1))
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsStreaming(false)
      setStreamingMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-black/60 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 fill-white/90" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <span className="text-white/90 text-sm font-medium">Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-white/70 text-sm mr-2">
              {currentSessionId ? 'Session Active' : 'No Session'}
            </div>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 text-white/90 border border-white/20 rounded hover:bg-white/10 transition-colors text-xs"
              title="Toggle Sessions"
            >
              ☰
            </button>
            <button
              onClick={createNewSession}
              className="p-1 text-white/90 border border-white/20 rounded hover:bg-white/10 transition-colors text-xs"
              title="New Session"
            >
              +
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/60 text-center py-20">
              <h3 className="text-white/90 text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-sm">Ask me anything and I'll help you out!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse justify-start' : 'justify-start'}`}
              >
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white/90 text-xs font-medium flex-shrink-0">
                  {message.role === 'user' ? 'U' : 'AI'}
                </div>
                <div
                  className={`max-w-md px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30 text-white'
                      : 'bg-white/10 border border-white/10 text-white'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}

          {isStreaming && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-white/90 text-xs font-medium flex-shrink-0">
                AI
              </div>
              <div className="max-w-md px-3 py-2 rounded-lg text-sm leading-relaxed bg-white/5 border border-white/10 text-white opacity-80">
                {streamingMessage}
                <span className="animate-pulse">▋</span>
              </div>
            </div>
          )}

          {isSending && !isStreaming && (
            <div className="flex items-center gap-2 text-white/70 text-sm px-3 py-2">
              <div className="w-3 h-3 border border-white/20 border-t-white/70 rounded-full animate-spin"></div>
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black/20 border-t border-white/10 flex gap-2">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isSending}
            className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm resize-none min-h-[2.5rem] max-h-24 focus:outline-none focus:border-white/40 transition-colors placeholder-white/50"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isSending || !currentInput.trim()}
            className="bg-blue-500/30 text-white/90 border border-blue-500/50 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-blue-500/40 hover:border-blue-500/70 disabled:bg-white/10 disabled:border-white/20 disabled:text-white/50 disabled:cursor-not-allowed min-w-[60px]"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`absolute left-0 top-0 bottom-0 w-64 bg-black/80 backdrop-blur-lg border-r border-white/10 transform transition-transform duration-300 z-10 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="text-white/90 text-sm font-medium">Sessions</div>
          <button
            onClick={createNewSession}
            className="bg-blue-500/30 text-white/90 border border-blue-500/50 px-2 py-1 rounded text-xs transition-colors hover:bg-blue-500/40"
          >
            New
          </button>
        </div>
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`p-3 rounded-md cursor-pointer transition-colors border ${
                session.id === currentSessionId
                  ? 'bg-blue-500/20 border-blue-500/40'
                  : 'bg-white/5 border-transparent hover:bg-white/10'
              }`}
            >
              <div className="text-white/90 text-sm font-medium truncate">
                {session.title || 'New Chat'}
              </div>
              <div className="text-white/60 text-xs">
                {formatTimestamp(session.started_at)}
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="text-white/60 text-sm text-center py-8">
              No sessions yet
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/20 z-5"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  )
}

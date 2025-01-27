import { Fragment, useState, useEffect, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Bot, X, Send, Trash2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { processMessage, syncDataToPinecone, setupRealtimeSync, forceSync } from '../lib/ai-service'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AIChat({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const messagesEndRef = useRef(null)
  
  useEffect(() => {
    // Load chat history from localStorage when component mounts
    const savedMessages = localStorage.getItem('aiChatHistory')
    if (savedMessages) {
      const messages = JSON.parse(savedMessages)
      // Add timestamps to any messages that don't have them
      const messagesWithTimestamps = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || new Date().toISOString()
      }))
      setMessages(messagesWithTimestamps)
    }

    // Set up real-time sync
    const cleanup = setupRealtimeSync()
    return cleanup
  }, [])

  useEffect(() => {
    // Initial data sync when the chat is first opened
    if (isOpen && !localStorage.getItem('lastSyncTime')) {
      handleInitialSync()
    }
  }, [isOpen])

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem('aiChatHistory', JSON.stringify(messages))
    scrollToBottom()
  }, [messages])

  const handleInitialSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncDataToPinecone()
      if (result.success) {
        localStorage.setItem('lastSyncTime', new Date().toISOString())
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I\'ve synced your ticket data and I\'m ready to help! You can ask me questions like:\n- How many open tickets do we have?\n- Show me the distribution of ticket priorities\n- List the most recent tickets\n- How many tickets were closed last week?',
          timestamp: new Date().toISOString()
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'I encountered an error while syncing your data. Some features might be limited.',
          timestamp: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error('Error during initial sync:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      await forceSync()
      const response = await processMessage(input)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.text,
        data: response.data,
        visualType: response.visualType,
        timestamp: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Error processing message:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem('aiChatHistory')
  }

  const renderVisualization = (data, type) => {
    if (!data) return null

    switch (type) {
      case 'line':
        return (
          <LineChart width={500} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        )
      case 'bar':
        return (
          <BarChart width={500} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        )
      case 'pie':
        return (
          <PieChart width={400} height={400}>
            <Pie
              data={data}
              cx={200}
              cy={200}
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )
      default:
        return null
    }
  }

  const renderMessageContent = (message) => {
    if (message.role === 'user') {
      return <p className="text-xs">{message.content}</p>
    }

    // For assistant messages
    if (message.content.includes('\n-')) {
      // This is a list message
      const [intro, ...items] = message.content.split('\n-')
      return (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">{intro}</p>
          <div className="space-y-1">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-1.5 bg-white/50 p-1.5 rounded-md">
                <div className="flex-shrink-0 w-1 h-1 mt-1.5 rounded-full bg-primary"></div>
                <div 
                  className="text-xs"
                  dangerouslySetInnerHTML={{ __html: item.trim() }}
                />
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Regular message
    return message.isHTML ? (
      <div className="text-xs" dangerouslySetInnerHTML={{ __html: message.content }} />
    ) : (
      <p className="text-xs">{message.content}</p>
    )
  }

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Set hours to 0 for accurate date comparison
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    let dateStr
    if (messageDate.getTime() === todayDate.getTime()) {
      dateStr = 'Today'
    } else if (messageDate.getTime() === yesterdayDate.getTime()) {
      dateStr = 'Yesterday'
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return `${dateStr} at ${timeStr}`
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setIsOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-7 w-7" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 sm:mx-0 sm:h-12 sm:w-12">
                    <Bot className="h-8 w-8 text-primary" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      AI Assistant
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={clearHistory}
                    className="ml-auto flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear History
                  </button>
                </div>

                <div className="mt-4 h-[70vh] flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`rounded-md px-4 py-2 max-w-[85%] relative ${
                            message.role === 'user'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {renderMessageContent(message)}
                          {message.data && (
                            <div className="mt-4 bg-white rounded-md p-4 shadow-sm">
                              {renderVisualization(message.data, message.visualType)}
                            </div>
                          )}
                          <div 
                            className={`text-[10px] mt-1 text-right ${
                              message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                            }`}
                          >
                            {formatMessageTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-md px-4 py-2">
                          <div className="flex space-x-1.5">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="mt-4 flex gap-3 px-4">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask me anything about your tickets..."
                      className="flex-1 rounded-lg border-0 py-2.5 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary"
                    />
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="inline-flex items-center gap-x-2 rounded-lg bg-primary px-4 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                      Send
                    </button>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-4 pb-4">
                    <button
                      onClick={() => {
                        setInput("How many tickets were completed today?")
                        handleSend()
                      }}
                      className="text-left px-2 py-1 text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis italic"
                    >
                      "How many tickets were completed today?"
                    </button>
                    <button
                      onClick={() => {
                        setInput("How many tickets are assigned to me?")
                        handleSend()
                      }}
                      className="text-left px-2 py-1 text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis italic"
                    >
                      "How many tickets are assigned to me?"
                    </button>
                    <button
                      onClick={() => {
                        setInput("How many tickets have I completed today?")
                        handleSend()
                      }}
                      className="text-left px-2 py-1 text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis italic"
                    >
                      "How many tickets have I completed today?"
                    </button>
                    <button
                      onClick={() => {
                        setInput("How many Open tickets are there?")
                        handleSend()
                      }}
                      className="text-left px-2 py-1 text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis italic"
                    >
                      "How many Open tickets are there?"
                    </button>
                    <button
                      onClick={() => {
                        setInput("How many tickets have I closed?")
                        handleSend()
                      }}
                      className="text-left px-2 py-1 text-[10px] text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors duration-200 ease-in-out whitespace-nowrap overflow-hidden text-ellipsis italic"
                    >
                      "How many tickets have I closed?"
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
} 
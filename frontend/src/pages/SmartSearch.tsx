import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Loader2, Bot, User, Sparkles, Plus, Trash2, MessageSquare, Menu, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  hotels?: HotelCard[];
}

interface HotelCard {
  id?: number | null;
  hotelname?: string;
  name?: string;
  district?: string;
  price_text?: string;
  priceText?: string;
  price_vnd?: number | null;
  imageUrl?: string;
  image_url?: string;
  detail_path?: string;
  detail_url?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const pickHotelName = (h: HotelCard) => h.hotelname || h.name || 'Khách sạn';
const pickHotelPrice = (h: HotelCard) => h.price_text || h.priceText || (h.price_vnd ? `${Number(h.price_vnd).toLocaleString('vi-VN')} ₫/đêm` : '—');
const pickHotelImage = (h: HotelCard) => h.imageUrl || h.image_url || '';
const pickHotelLink = (h: HotelCard) => h.detail_path || h.detail_url || (h.id != null ? `/properties/${h.id}` : '');

const STORAGE_KEY = 'smart_search_conversations';

const SmartSearch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const convs = parsed.map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: new Date(c.createdAt as string),
          updatedAt: new Date(c.updatedAt as string),
          messages: (c.messages as Array<Record<string, unknown>>).map((m) => ({
            ...m,
            timestamp: new Date(m.timestamp as string),
          })),
        }));
        setConversations(convs);
        if (convs.length > 0) {
          setCurrentConversationId(convs[0].id);
        }
      } catch (e) {
        console.error('Error loading conversations:', e);
      }
    }
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, currentConversationId]);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'Cuộc trò chuyện mới',
      messages: [
        {
          id: '1',
          text: 'Xin chào! Tôi là trợ lý AI của 3T2M1Stay. Tôi có thể giúp bạn tìm khách sạn phù hợp với nhu cầu của bạn. Hãy cho tôi biết bạn muốn tìm phòng ở khu vực nào, mức giá bao nhiêu, hoặc các tiện nghi bạn cần?',
          sender: 'bot',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setMobileSidebarOpen(false);
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
    setMobileSidebarOpen(false);
  };

  const updateConversationTitle = (convId: string, firstUserMessage: string) => {
    const title = firstUserMessage.length > 30 
      ? firstUserMessage.substring(0, 30) + '...' 
      : firstUserMessage;
    setConversations(prev => 
      prev.map(c => c.id === convId ? { ...c, title, updatedAt: new Date() } : c)
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Create new conversation if none exists
    if (!currentConversationId) {
      createNewConversation();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    // Check if this is the first user message to update title
    const isFirstUserMessage = messages.filter(m => m.sender === 'user').length === 0;
    if (isFirstUserMessage) {
      updateConversationTitle(currentConversationId, inputMessage);
    }

    setConversations(prev =>
      prev.map(c =>
        c.id === currentConversationId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date() }
          : c
      )
    );
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: inputMessage,
          history: messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.answer || 'Xin lỗi, tôi không hiểu câu hỏi của bạn. Bạn có thể hỏi lại được không?',
        sender: 'bot',
        timestamp: new Date(),
        hotels: Array.isArray(data.hotels) ? data.hotels : undefined,
      };

      setConversations(prev =>
        prev.map(c =>
          c.id === currentConversationId
            ? { ...c, messages: [...c.messages, botMessage], updatedAt: new Date() }
            : c
        )
      );
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setConversations(prev =>
        prev.map(c =>
          c.id === currentConversationId
            ? { ...c, messages: [...c.messages, errorMessage], updatedAt: new Date() }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Tìm khách sạn giá rẻ ở Quận 1",
    "Khách sạn có hồ bơi gần trung tâm",
    "Phòng cho gia đình 4 người dưới 2 triệu",
    "Khách sạn view đẹp ở Đà Nẵng",
  ];

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Navbar />
      
      <main className="flex-1 pt-20 flex">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="lg:hidden fixed top-24 left-4 z-50 p-2 bg-white rounded-lg shadow-md border"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Overlay for mobile */}
        {mobileSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto w-72 bg-gray-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 pt-20 lg:pt-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-700">
            <Button
              onClick={createNewConversation}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Cuộc trò chuyện mới
            </Button>
          </div>

          {/* Conversations List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                  <p className="text-xs mt-1">Bấm nút trên để bắt đầu</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                      currentConversationId === conv.id 
                        ? "bg-gray-700" 
                        : "hover:bg-gray-800"
                    )}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{conv.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      title="Xóa cuộc trò chuyện"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* User Info */}
          {user && (
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">
            {/* Header - Only show when no conversation */}
            {!currentConversationId || messages.length <= 1 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
                    Tìm kiếm Thông Minh
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Trợ lý AI của 3T2M1Stay sẽ giúp bạn tìm khách sạn phù hợp nhất. 
                  Hãy mô tả nhu cầu của bạn bằng ngôn ngữ tự nhiên!
                </p>
              </div>
            ) : null}

            {/* Messages Area */}
            {currentConversationId && (
              <ScrollArea className="flex-1 py-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.sender === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.sender === 'bot' && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center flex-shrink-0 shadow-md">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-5 py-4 text-sm shadow-sm",
                          message.sender === 'user'
                            ? "bg-gradient-to-r from-primary to-primary-hover text-white rounded-br-md"
                            : "bg-white text-foreground rounded-bl-md border"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

                        {message.sender === 'bot' && message.hotels?.length ? (
                          <div className="mt-4 space-y-3">
                            {message.hotels.slice(0, 5).map((h, idx) => {
                              const name = pickHotelName(h);
                              const price = pickHotelPrice(h);
                              const district = h.district || '';
                              const img = pickHotelImage(h);
                              const link = pickHotelLink(h);
                              const canNavigate = Boolean(link);
                              return (
                                <button
                                  key={`${h.id ?? idx}-${name}`}
                                  type="button"
                                  onClick={() => {
                                    if (!canNavigate) return;
                                    navigate(link);
                                  }}
                                  className={cn(
                                    "w-full text-left rounded-xl border-2 border-gray-100 bg-gray-50 hover:bg-white hover:border-primary/30 transition-all duration-200 p-3 shadow-sm hover:shadow-md",
                                    !canNavigate && "opacity-70 cursor-not-allowed"
                                  )}
                                >
                                  <div className="flex gap-3">
                                    <div className="h-20 w-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                      {img ? (
                                        <img
                                          src={img}
                                          alt={name}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                          <Bot className="w-8 h-8 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-semibold text-gray-800 leading-snug line-clamp-2">{name}</div>
                                      {district && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                          📍 {district}
                                        </div>
                                      )}
                                      <div className="text-sm font-medium text-primary mt-1">💰 {price}</div>
                                      {canNavigate && (
                                        <div className="text-xs mt-2 text-primary font-medium flex items-center gap-1">
                                          Xem chi tiết →
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        <span className="text-xs opacity-60 mt-2 block">
                          {message.timestamp.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {message.sender === 'user' && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-md">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border rounded-2xl rounded-bl-md px-5 py-4 flex items-center gap-2 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Đang tìm kiếm...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Suggested Questions - Only show when starting new conversation */}
            {(!currentConversationId || messages.length <= 1) && (
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-3 text-center">Gợi ý tìm kiếm:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!currentConversationId) {
                          createNewConversation();
                        }
                        setInputMessage(question);
                      }}
                      className="px-4 py-2 text-sm bg-white hover:bg-primary/10 text-primary rounded-full transition-colors duration-200 border border-primary/20 hover:border-primary/40"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="py-4 border-t border-gray-200 bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
              <div className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập yêu cầu tìm kiếm của bạn... VD: Tìm khách sạn giá rẻ ở Quận 1"
                  disabled={isLoading}
                  className="flex-1 h-12 text-base rounded-xl border-2 border-gray-200 focus:border-primary transition-colors bg-white"
                />
                <Button
                  onClick={() => {
                    if (!currentConversationId) {
                      createNewConversation();
                    }
                    handleSendMessage();
                  }}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="bg-gradient-to-r from-primary to-primary-hover hover:opacity-90 h-12 w-12 rounded-xl shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Powered by AI • 3T2M1Stay
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SmartSearch;

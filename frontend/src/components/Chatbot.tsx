import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

const pickHotelName = (h: HotelCard) => h.hotelname || h.name || 'Khách sạn';
const pickHotelPrice = (h: HotelCard) => h.price_text || h.priceText || (h.price_vnd ? `${Number(h.price_vnd).toLocaleString('vi-VN')} ₫/đêm` : '—');
const pickHotelImage = (h: HotelCard) => h.imageUrl || h.image_url || '';
const pickHotelLink = (h: HotelCard) => h.detail_path || h.detail_url || (h.id != null ? `/properties/${h.id}` : '');

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là trợ lý AI của 3T2M1Stay. Tôi có thể giúp bạn tìm khách sạn phù hợp. Bạn cần tìm phòng ở khu vực nào?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
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

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300",
          "bg-gradient-to-r from-primary to-primary-hover hover:scale-110",
          isOpen && "opacity-0 pointer-events-none"
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Chat Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 w-full md:w-1/3 h-full bg-card shadow-2xl transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-hover p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Trợ lý AI 3T2M1Stay</h3>
              <p className="text-white/80 text-xs">Luôn sẵn sàng hỗ trợ</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.sender === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.sender === 'bot' && (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

                  {message.sender === 'bot' && message.hotels?.length ? (
                    <div className="mt-3 space-y-2">
                      {message.hotels.slice(0, 3).map((h, idx) => {
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
                              setIsOpen(false);
                            }}
                            className={cn(
                              "w-full text-left rounded-xl border bg-background/60 hover:bg-background transition p-3",
                              !canNavigate && "opacity-70 cursor-not-allowed"
                            )}
                          >
                            <div className="flex gap-3">
                              <div className="h-16 w-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold leading-snug line-clamp-2">{name}</div>
                                <div className="text-xs opacity-80 mt-1">
                                  {district ? `📍 ${district}` : null}
                                </div>
                                <div className="text-xs mt-1">💰 {price}</div>
                                <div className="text-xs mt-1 text-primary">
                                  {canNavigate ? 'Xem chi tiết →' : ''}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      <div className="text-xs opacity-70">
                        Bạn có thể bấm vào thẻ để xem trang chi tiết khách sạn.
                      </div>
                    </div>
                  ) : null}

                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {message.sender === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Đang suy nghĩ...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 border-t border-border bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn của bạn..."
                disabled={isLoading}
                className="flex-1 h-12"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="bg-primary hover:bg-primary-hover h-12 w-12"
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
    </>
  );
};

export default Chatbot;

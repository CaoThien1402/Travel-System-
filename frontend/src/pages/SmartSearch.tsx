/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Menu,
  X,
  Clock,
  MapPin,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  hotels?: HotelCard[];
}

interface HotelCard {
  id?: number | null;

  // name
  hotelname?: string;
  name?: string;

  // location
  district?: string;
  district_num?: number | null;

  // pricing
  price_text?: string; // "490000 - 1150000" hoặc "Chưa cập nhật giá"
  priceText?: string;
  price_vnd?: number | null;
  price_min_vnd?: number | null;
  price_max_vnd?: number | null;

  // rating
  rating?: number | null;
  star?: number | null;

  // explain
  match_reason?: string;

  // ui extras (nếu backend trả về)
  ui?: {
    district_label?: string;
    price_label?: string;
    rating_label?: string;
    star_label?: string;
    badges?: string[];
    highlights?: string[];
    cta_label?: string;
  };

  // media + navigation
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

const STORAGE_KEY = "smart_search_conversations";
const TOP_K = 10;

function BotMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // react-markdown mặc định KHÔNG render HTML raw (an toàn hơn).
      components={{
        p: ({ ...props }) => (
          <p className="whitespace-pre-wrap leading-relaxed" {...props} />
        ),
        ul: ({ ...props }) => (
          <ul className="list-disc pl-5 space-y-1 my-2" {...props} />
        ),
        ol: ({ ...props }) => (
          <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />
        ),
        li: ({ ...props }) => <li className="my-0" {...props} />,
        a: ({ ...props }) => (
          <a
            className="underline underline-offset-2 text-primary hover:opacity-80"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),
        table: ({ ...props }) => (
          <div className="overflow-x-auto my-3 rounded-xl border">
            <table className="w-full border-collapse text-sm" {...props} />
          </div>
        ),
        thead: ({ ...props }) => <thead className="bg-muted/40" {...props} />,
        th: ({ ...props }) => (
          <th
            className="border px-3 py-2 text-left font-semibold whitespace-nowrap"
            {...props}
          />
        ),
        td: ({ ...props }) => (
          <td className="border px-3 py-2 align-top" {...props} />
        ),
        code: ({ className, children, ...props }) => {
          const isBlock =
            typeof className === "string" && className.includes("language-");

          if (isBlock) {
            return (
              <code className={cn("font-mono text-xs", className)} {...props}>
                {children}
              </code>
            );
          }

          return (
            <code
              className={cn("px-1 py-0.5 rounded bg-muted font-mono", className)}
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ className, children, ...props }) => (
          <pre
            className={cn("p-3 rounded-xl bg-muted overflow-x-auto", className)}
            {...props}
          >
            {children}
          </pre>
        ),
}}
    >
      {text}
    </ReactMarkdown>
  );
}


const buildInitialBotMessage = (): Message => ({
  id: "1",
  text: "Xin chào! Tôi là trợ lý AI của 3T2M1Stay. Hãy cho tôi biết bạn muốn tìm khách sạn ở đâu, ngân sách bao nhiêu/đêm và cần tiện ích gì nhé.",
  sender: "bot",
  timestamp: new Date(),
});

const buildConversation = (id: string): Conversation => ({
  id,
  title: "Cuộc trò chuyện mới",
  messages: [buildInitialBotMessage()],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ------- helpers -------
const pickHotelName = (h: HotelCard) => h.hotelname || h.name || "Khách sạn";
const pickHotelPrice = (h: HotelCard) =>
  h.price_text ||
  h.priceText ||
  (h.price_vnd ? `${Number(h.price_vnd).toLocaleString("vi-VN")} ₫/đêm` : "—");
const pickHotelImage = (h: HotelCard) => h.imageUrl || h.image_url || "";
const pickHotelLink = (h: HotelCard) =>
  h.detail_path || h.detail_url || (h.id != null ? `/properties/${h.id}` : "");

const pickHotelDistrict = (h: HotelCard) =>
  h.ui?.district_label ||
  h.district ||
  (h.district_num ? `Quận ${h.district_num}` : "—");

const pickHotelPriceLabel = (h: HotelCard) =>
  h.ui?.price_label ||
  h.price_text ||
  h.priceText ||
  (h.price_vnd
    ? `${Number(h.price_vnd).toLocaleString("vi-VN")} ₫/đêm`
    : "Chưa cập nhật giá");

const pickHotelBadges = (h: HotelCard) =>
  Array.isArray(h.ui?.badges) ? h.ui!.badges!.slice(0, 3) : [];
const pickHotelHighlights = (h: HotelCard) =>
  Array.isArray(h.ui?.highlights) ? h.ui!.highlights!.slice(0, 3) : [];

const pickHotelRatingLabel = (h: HotelCard) => {
  if (h.ui?.rating_label) return h.ui.rating_label;
  if (typeof h.rating === "number" && Number.isFinite(h.rating))
    return h.rating.toFixed(1);
  return "";
};

function HotelResultCard({
  h,
  idx,
  onOpen,
}: {
  h: HotelCard;
  idx: number;
  onOpen: () => void;
}) {
  const name = pickHotelName(h);
  const district = pickHotelDistrict(h);
  const price = pickHotelPriceLabel(h);
  const img = pickHotelImage(h);
  const badges = pickHotelBadges(h);
  const highlights = pickHotelHighlights(h);
  const ratingLabel = pickHotelRatingLabel(h);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group w-full text-left overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-all",
        "hover:-translate-y-[1px] hover:border-primary/30"
      )}
    >
      {/* Image */}
      <div className="relative w-full h-44 md:h-52 bg-gray-200">
        {img ? (
          <img
            src={img}
            alt={name}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Bot className="w-10 h-10 text-gray-400" />
          </div>
        )}

        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />

        {/* index */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 border">
          #{idx + 1}
        </div>

        {/* rating */}
        {ratingLabel ? (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 border flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {ratingLabel}
          </div>
        ) : null}

        {/* badges */}
        {badges.length ? (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className="px-2 py-1 rounded-full text-[11px] font-medium bg-white/90 border"
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-base md:text-lg leading-snug line-clamp-2 text-gray-900">
              {name}
            </div>
            <div className="mt-1 text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{district}</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-xs text-gray-500">Giá/đêm</div>
            <div className="text-base md:text-lg font-bold text-primary leading-tight">
              {price}
            </div>
          </div>
        </div>

        {/* highlights */}
        {highlights.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {highlights.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 border"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {/* reason */}
        {h.match_reason ? (
          <div className="mt-3 text-sm text-gray-600 line-clamp-2">
            ✨ {h.match_reason}
          </div>
        ) : null}

        {/* CTA */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">Nhấn để xem chi tiết</div>
          <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {h.ui?.cta_label || "Xem phòng"}
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
}

const SmartSearch = () => {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollPageToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const el = document.scrollingElement || document.documentElement;
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  };

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
      } catch (e) {
        console.error("Error loading conversations:", e);
      }
    }
    setHasLoaded(true);
  }, []);

  // Sync current conversation with route
  useEffect(() => {
    if (!hasLoaded) return;

    if (routeId) {
      const exists = conversations.some((c) => c.id === routeId);
      if (!exists) {
        const newConv = buildConversation(routeId);
        setConversations((prev) => [newConv, ...prev]);
      }
      if (currentConversationId !== routeId) setCurrentConversationId(routeId);
      return;
    }

    if (conversations.length > 0) {
      const fallbackId = conversations[0].id;
      if (currentConversationId !== fallbackId)
        setCurrentConversationId(fallbackId);
      navigate(`/smart-search/${fallbackId}`, { replace: true });
    } else if (currentConversationId !== null) {
      setCurrentConversationId(null);
    }
  }, [routeId, conversations, hasLoaded, currentConversationId, navigate]);

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [conversations]);

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages = currentConversation?.messages || [];

  // Auto scroll to bottom - find the actual scrollable viewport inside ScrollArea
  useEffect(() => {
    if (!currentConversationId) return;

    let timeoutId: number | undefined;
    const rafId = requestAnimationFrame(() => {
      scrollPageToBottom();
      timeoutId = window.setTimeout(() => scrollPageToBottom(), 180);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [currentConversationId, messages.length]);

  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConv = buildConversation(newId);
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setMobileSidebarOpen(false);
    navigate(`/smart-search/${newId}`);
  };

  const deleteConversation = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (currentConversationId === id) {
      const nextId = remaining.length > 0 ? remaining[0].id : null;
      setCurrentConversationId(nextId);
      if (nextId) {
        navigate(`/smart-search/${nextId}`, { replace: true });
      } else {
        navigate("/smart-search", { replace: true });
      }
    }
  };

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
    setMobileSidebarOpen(false);
    navigate(`/smart-search/${id}`);
  };

  const updateConversationTitle = (
    convId: string,
    firstUserMessage: string
  ) => {
    const title =
      firstUserMessage.length > 30
        ? firstUserMessage.substring(0, 30) + "..."
        : firstUserMessage;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, title, updatedAt: new Date() } : c
      )
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!currentConversationId) {
      createNewConversation();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    const isFirstUserMessage =
      messages.filter((m) => m.sender === "user").length === 0;
    if (isFirstUserMessage)
      updateConversationTitle(currentConversationId, inputMessage);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversationId
          ? {
              ...c,
              messages: [...c.messages, userMessage],
              updatedAt: new Date(),
            }
          : c
      )
    );

    const outgoingText = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoingText,
          top_k: TOP_K,
          history: messages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text:
          data.response ||
          data.answer ||
          "Xin lỗi, tôi không hiểu câu hỏi của bạn. Bạn có thể hỏi lại được không?",
        sender: "bot",
        timestamp: new Date(),
        hotels: Array.isArray(data.hotels) ? data.hotels : undefined,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                messages: [...c.messages, botMessage],
                updatedAt: new Date(),
              }
            : c
        )
      );
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        sender: "bot",
        timestamp: new Date(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                messages: [...c.messages, errorMessage],
                updatedAt: new Date(),
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    "Tìm khách sạn giá rẻ ở Quận 1 dưới 1tr",
    "Khách sạn có hồ bơi gần trung tâm",
    "Phòng cho gia đình 4 người dưới 2 triệu",
    "Khách sạn view đẹp gần sông",
  ];

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Navbar />

      <main className="flex-1 pt-20 flex min-h-0">
        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="lg:hidden fixed top-24 left-4 z-50 p-2 bg-white rounded-lg shadow-md border"
        >
          {mobileSidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Overlay for mobile */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed lg:sticky inset-y-0 left-0 lg:inset-y-auto lg:top-20 lg:h-[calc(100vh-5rem)] z-50 lg:z-auto w-72 bg-gray-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 pt-20 lg:pt-0",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
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
                conversations.map((conv) => (
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 min-h-0">
            {/* Header - Only show when no conversation */}
            {!currentConversationId || messages.length <= 1 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-cyan-600 bg-clip-text text-transparent">
                    Tìm khách sạn thông minh
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Nhập yêu cầu như bạn đang chat: khu vực, ngân sách/đêm, tiện
                  ích… hệ thống sẽ gợi ý ~10 lựa chọn phù hợp nhất.
                </p>
              </div>
            ) : null}

            {/* Messages Area */}
            {currentConversationId && (
              <ScrollArea
                className="flex-1 min-h-0 py-4"
                ref={scrollRef as any}
              >
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                      )}
                    >
                      {message.sender === "bot" && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center flex-shrink-0 shadow-md">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}

                      <div
                        className={cn(
                          message.sender === "user"
                            ? "max-w-[75%] rounded-2xl px-5 py-4 text-sm shadow-sm bg-gradient-to-r from-primary to-primary-hover text-white rounded-br-md"
                            : cn(
                                "max-w-[92%] md:max-w-[88%] rounded-2xl px-5 py-4 text-sm shadow-sm bg-white text-foreground rounded-bl-md border",
                                message.hotels?.length && "p-4 md:p-5"
                              )
                        )}
                      >
                        {message.sender === "bot" ? (
                          <BotMarkdown text={message.text} />
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {message.text}
                          </p>
                        )}

                        {/* HOTEL CARDS (Booking-style) */}
                        {message.sender === "bot" && message.hotels?.length ? (
                          <div className="mt-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-gray-800">
                                Gợi ý phù hợp cho bạn
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.min(TOP_K, message.hotels.length)} lựa
                                chọn
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {message.hotels.slice(0, TOP_K).map((h, idx) => {
                                const link = pickHotelLink(h);
                                const canNavigate = Boolean(link);

                                return (
                                  <div
                                    key={`${h.id ?? idx}-${pickHotelName(h)}`}
                                    className={cn(!canNavigate && "opacity-70")}
                                  >
                                    <HotelResultCard
                                      h={h}
                                      idx={idx}
                                      onOpen={() => {
                                        if (!canNavigate) return;
                                        navigate(link);
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <span className="text-xs opacity-60 mt-2 block">
                          {message.timestamp.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {message.sender === "user" && (
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
                        <span className="text-sm text-muted-foreground">
                          Đang tìm kiếm...
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} className="h-px" />
                </div>
              </ScrollArea>
            )}

            {/* Suggested Questions - Only show when starting new conversation */}
            {(!currentConversationId || messages.length <= 1) && (
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Gợi ý tìm kiếm:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!currentConversationId) createNewConversation();
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
                  placeholder="Nhập yêu cầu... VD: Quận 1 dưới 1tr, gần trung tâm, có hồ bơi"
                  disabled={isLoading}
                  className="flex-1 h-12 text-base rounded-xl border-2 border-gray-200 focus:border-primary transition-colors bg-white"
                />
                <Button
                  onClick={() => {
                    if (!currentConversationId) createNewConversation();
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

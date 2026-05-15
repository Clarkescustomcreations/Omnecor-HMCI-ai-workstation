import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import type { ChatMessage } from "@/lib/chatContext";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onSendMessage?: (content: string) => void;
  onClearHistory?: () => void;
  className?: string;
}

/**
 * Chat Interface Component
 * 
 * Full-featured chat UI with:
 * - Message history display
 * - Streaming response support
 * - Markdown rendering
 * - Copy message functionality
 * - Token usage display
 */
export default function ChatInterface({
  messages,
  isLoading = false,
  onSendMessage,
  onClearHistory,
  className,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage?.(input);
      setInput("");
    }
  };

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Chat</CardTitle>
            <CardDescription className="text-xs">
              AI conversation with context awareness
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {messages.length} messages
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalTokens.toLocaleString()} tokens
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearHistory}
              disabled={messages.length === 0}
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
              <div>
                <p className="text-sm mb-2">No messages yet</p>
                <p className="text-xs">Start a conversation by typing a message below</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-xs lg:max-w-md xl:max-w-lg rounded-lg px-4 py-3",
                    message.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card border border-border text-card-foreground"
                  )}
                >
                  {/* Message Content */}
                  <div className="text-sm mb-2">
                    {message.role === "assistant" ? (
                      <Streamdown>{message.content}</Streamdown>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>

                  {/* Message Footer */}
                  <div className="flex items-center justify-between gap-2 text-xs opacity-70">
                    <span className="text-xs">
                      {message.tokens?.toLocaleString()} tokens
                    </span>
                    <span className="text-xs">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => handleCopy(message.content, message.id)}
                      title="Copy message"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Error Display */}
                  {message.metadata?.error && (
                    <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30">
                      <p className="text-xs text-destructive">{message.metadata.error}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Type your message... (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isLoading ? "AI is thinking..." : "Press Enter to send, Shift+Enter for new line"}
        </p>
      </div>
    </Card>
  );
}

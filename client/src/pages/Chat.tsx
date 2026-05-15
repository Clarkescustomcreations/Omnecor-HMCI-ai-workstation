import CortexDashboardLayout from "@/components/CortexDashboardLayout";
import ChatInterface from "@/components/ChatInterface";
import ContextTransparencyIndicator from "@/components/ContextTransparencyIndicator";
import VisualContextMap from "@/components/VisualContextMap";
import { MessageCircle } from "lucide-react";
import { useState, useCallback } from "react";
import {
  createMockConversation,
  addMessageToConversation,
  createChatMessage,
  toggleFileInContext,
  removeFileFromContext,
  calculateContextTransparency,
} from "@/lib/chatContext";

/**
 * Chat Page - AI Conversation Interface
 * 
 * Features:
 * - Message history with streaming responses
 * - Markdown rendering for responses
 * - Context transparency indicator showing exact memory usage
 * - Visual Context Map for file management
 * - Manual file ejection from context
 * - Token usage tracking
 */
export default function Chat() {
  const [conversation, setConversation] = useState(() => createMockConversation());
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Add user message
      let updated = addMessageToConversation(conversation, createChatMessage("user", content));

      // Simulate AI response
      setIsLoading(true);
      setTimeout(() => {
        const responses = [
          "That's a great question! Based on the context provided, I can help you with that. Let me break it down into steps:\n\n1. First, we need to understand the core requirements\n2. Then, we'll design the architecture\n3. Finally, we'll implement and test the solution\n\nWhat specific aspect would you like me to focus on?",
          "I understand what you're looking for. Here's my analysis:\n\n**Key Points:**\n- This approach is scalable and maintainable\n- We should consider performance implications\n- Error handling is critical\n\nWould you like me to provide code examples or dive deeper into any particular area?",
          "Excellent observation! Let me elaborate on that:\n\nThe implementation strategy should follow these principles:\n- Modularity: Keep components independent\n- Testability: Write comprehensive tests\n- Documentation: Maintain clear documentation\n\nDo you have any questions about the implementation details?",
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        updated = addMessageToConversation(
          updated,
          createChatMessage("assistant", randomResponse, {
            model: "gpt-4",
            provider: "openai",
            streaming: true,
          })
        );

        setConversation(updated);
        setIsLoading(false);
      }, 1500);
    },
    [conversation]
  );

  const handleToggleFile = useCallback((fileId: string) => {
    setConversation((prev) => toggleFileInContext(prev, fileId));
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setConversation((prev) => removeFileFromContext(prev, fileId));
  }, []);

  const handleClearHistory = useCallback(() => {
    if (confirm("Are you sure you want to clear the conversation history?")) {
      setConversation(createMockConversation());
    }
  }, []);

  const transparency = calculateContextTransparency(conversation);

  return (
    <CortexDashboardLayout>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Chat</h1>
              <p className="text-sm text-muted-foreground">
                Conversational AI with context transparency and file management
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <ChatInterface
              messages={conversation.messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
              className="flex-1"
            />
          </div>

          {/* Context Panel */}
          <div className="w-80 flex flex-col gap-4 overflow-hidden">
            {/* Context Transparency Indicator */}
            <ContextTransparencyIndicator
              transparency={transparency}
              className="flex-shrink-0"
            />

            {/* Visual Context Map */}
            <VisualContextMap
              files={conversation.contextFiles}
              onToggleFile={handleToggleFile}
              onRemoveFile={handleRemoveFile}
              className="flex-1 min-h-0"
            />
          </div>
        </div>
      </div>
    </CortexDashboardLayout>
  );
}

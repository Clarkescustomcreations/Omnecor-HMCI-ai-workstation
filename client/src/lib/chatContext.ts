/**
 * Chat & Context Management Library
 * 
 * Handles chat messages, conversation history, context transparency,
 * and Visual Context Map for the AI chat interface.
 */

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: {
    model?: string;
    provider?: string;
    streaming?: boolean;
    error?: string;
  };
}

export interface ContextFile {
  id: string;
  path: string;
  name: string;
  type: "file" | "folder";
  size: number; // in bytes
  tokens: number; // estimated token count
  included: boolean;
  lastModified: Date;
  preview?: string;
}

export interface ContextTransparency {
  totalTokens: number;
  maxTokens: number;
  usedPercentage: number;
  files: ContextFile[];
  systemPromptTokens: number;
  conversationTokens: number;
  remainingTokens: number;
}

export interface ConversationContext {
  id: string;
  title: string;
  messages: ChatMessage[];
  contextFiles: ContextFile[];
  createdAt: Date;
  updatedAt: Date;
  modelId: string;
  totalTokensUsed: number;
}

/**
 * Estimate tokens for a given text
 * Rule of thumb: ~1 token per 4 characters for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new chat message
 */
export function createChatMessage(
  role: MessageRole,
  content: string,
  metadata?: ChatMessage["metadata"]
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date(),
    tokens: estimateTokens(content),
    metadata,
  };
}

/**
 * Create a new conversation
 */
export function createConversation(
  title: string,
  modelId: string,
  initialMessages: ChatMessage[] = []
): ConversationContext {
  return {
    id: generateConversationId(),
    title,
    messages: initialMessages,
    contextFiles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    modelId,
    totalTokensUsed: initialMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
  };
}

/**
 * Add message to conversation
 */
export function addMessageToConversation(
  conversation: ConversationContext,
  message: ChatMessage
): ConversationContext {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date(),
    totalTokensUsed: conversation.totalTokensUsed + (message.tokens || 0),
  };
}

/**
 * Add file to context
 */
export function addFileToContext(
  conversation: ConversationContext,
  file: ContextFile
): ConversationContext {
  const existingIndex = conversation.contextFiles.findIndex((f) => f.id === file.id);

  let updatedFiles: ContextFile[];
  if (existingIndex >= 0) {
    updatedFiles = [
      ...conversation.contextFiles.slice(0, existingIndex),
      file,
      ...conversation.contextFiles.slice(existingIndex + 1),
    ];
  } else {
    updatedFiles = [...conversation.contextFiles, file];
  }

  return {
    ...conversation,
    contextFiles: updatedFiles,
    updatedAt: new Date(),
  };
}

/**
 * Remove file from context
 */
export function removeFileFromContext(
  conversation: ConversationContext,
  fileId: string
): ConversationContext {
  return {
    ...conversation,
    contextFiles: conversation.contextFiles.filter((f) => f.id !== fileId),
    updatedAt: new Date(),
  };
}

/**
 * Toggle file inclusion in context
 */
export function toggleFileInContext(
  conversation: ConversationContext,
  fileId: string
): ConversationContext {
  const updatedFiles = conversation.contextFiles.map((f) =>
    f.id === fileId ? { ...f, included: !f.included } : f
  );

  return {
    ...conversation,
    contextFiles: updatedFiles,
    updatedAt: new Date(),
  };
}

/**
 * Calculate context transparency metrics
 */
export function calculateContextTransparency(
  conversation: ConversationContext,
  maxTokens: number = 8192,
  systemPromptTokens: number = 500
): ContextTransparency {
  const conversationTokens = conversation.totalTokensUsed;
  const fileTokens = conversation.contextFiles
    .filter((f) => f.included)
    .reduce((sum, f) => sum + f.tokens, 0);

  const totalTokens = systemPromptTokens + conversationTokens + fileTokens;
  const remainingTokens = Math.max(0, maxTokens - totalTokens);
  const usedPercentage = (totalTokens / maxTokens) * 100;

  return {
    totalTokens,
    maxTokens,
    usedPercentage,
    files: conversation.contextFiles,
    systemPromptTokens,
    conversationTokens,
    remainingTokens,
  };
}

/**
 * Get included files for context
 */
export function getIncludedFiles(conversation: ConversationContext): ContextFile[] {
  return conversation.contextFiles.filter((f) => f.included);
}

/**
 * Get excluded files from context
 */
export function getExcludedFiles(conversation: ConversationContext): ContextFile[] {
  return conversation.contextFiles.filter((f) => !f.included);
}

/**
 * Mock context files for demo
 */
export const mockContextFiles: ContextFile[] = [
  {
    id: "file_1",
    path: "/projects/cortex/src/main.ts",
    name: "main.ts",
    type: "file",
    size: 2048,
    tokens: 512,
    included: true,
    lastModified: new Date(Date.now() - 3600000),
    preview: "// Omnecor main entry point\nexport function initialize() { ... }",
  },
  {
    id: "file_2",
    path: "/projects/cortex/src/utils.ts",
    name: "utils.ts",
    type: "file",
    size: 1536,
    tokens: 384,
    included: true,
    lastModified: new Date(Date.now() - 7200000),
    preview: "// Utility functions\nexport function formatDate(date: Date) { ... }",
  },
  {
    id: "file_3",
    path: "/projects/cortex/README.md",
    name: "README.md",
    type: "file",
    size: 4096,
    tokens: 1024,
    included: false,
    lastModified: new Date(Date.now() - 86400000),
    preview: "# Omnecor\n\nThe Ultimate All-in-One AI Workstation...",
  },
  {
    id: "file_4",
    path: "/projects/cortex/config.json",
    name: "config.json",
    type: "file",
    size: 512,
    tokens: 128,
    included: true,
    lastModified: new Date(Date.now() - 172800000),
    preview: '{\n  "version": "1.0.0",\n  "features": ["chat", "brain-map", "model-hub"]\n}',
  },
];

/**
 * Mock conversation for demo
 */
export function createMockConversation(): ConversationContext {
  const conversation = createConversation(
    "Omnecor Development Discussion",
    "gpt-4",
    [
      createChatMessage(
        "user",
        "Help me implement the Neural Node-Tree UI for Omnecor. I want a spatial graph visualization with nodes and branches."
      ),
      createChatMessage(
        "assistant",
        "I'll help you build the Neural Node-Tree UI! Here's a comprehensive approach:\n\n1. **Data Structure**: Create a graph representation with nodes (folders/files) and edges (relationships)\n2. **Visualization**: Use React Flow for interactive graph rendering\n3. **Tree View**: Implement a collapsible tree as an alternative view\n4. **Interactivity**: Add drag-and-drop, click-to-edit, and search capabilities\n\nLet me provide code examples for each component..."
      ),
      createChatMessage(
        "user",
        "What about performance for large file structures with thousands of files?"
      ),
      createChatMessage(
        "assistant",
        "Great question! For large file structures, consider:\n\n- **Virtual Scrolling**: Only render visible nodes\n- **Lazy Loading**: Load child nodes on demand\n- **Memoization**: Cache node positions and relationships\n- **Clustering**: Group similar nodes together\n- **Web Workers**: Offload heavy calculations\n\nThese techniques will keep the UI responsive even with thousands of files."
      ),
    ]
  );

  // Add mock context files
  return mockContextFiles.reduce((conv, file) => addFileToContext(conv, file), conversation);
}

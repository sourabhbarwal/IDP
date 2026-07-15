export type MessageRole = 'system' | 'user' | 'assistant';

export interface ConversationMessageProps {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export class ConversationMessage {
  readonly role: MessageRole;
  readonly content: string;
  readonly timestamp: Date;

  constructor(props: ConversationMessageProps) {
    this.role = props.role;
    this.content = props.content;
    this.timestamp = props.timestamp;
  }

  toGroqMessage(): { role: MessageRole; content: string } {
    return { role: this.role, content: this.content };
  }

  static user(content: string): ConversationMessage {
    return new ConversationMessage({ role: 'user', content, timestamp: new Date() });
  }

  static assistant(content: string): ConversationMessage {
    return new ConversationMessage({ role: 'assistant', content, timestamp: new Date() });
  }

  static system(content: string): ConversationMessage {
    return new ConversationMessage({ role: 'system', content, timestamp: new Date() });
  }
}
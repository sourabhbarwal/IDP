import { ConversationMessage } from './conversation-message.entity';

describe('ConversationMessage', () => {
  it('user() creates a user message', () => {
    const msg = ConversationMessage.user('Hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(msg.timestamp).toBeInstanceOf(Date);
  });

  it('assistant() creates an assistant message', () => {
    const msg = ConversationMessage.assistant('Hi there');
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('Hi there');
  });

  it('system() creates a system message', () => {
    const msg = ConversationMessage.system('You are a helpful assistant');
    expect(msg.role).toBe('system');
  });

  it('toGroqMessage() returns only role and content', () => {
    const msg = ConversationMessage.user('test');
    const groq = msg.toGroqMessage();
    expect(groq).toEqual({ role: 'user', content: 'test' });
    expect(Object.keys(groq)).toHaveLength(2);
  });
});
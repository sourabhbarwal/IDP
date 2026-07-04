import { ChannelType } from '../enums/channel-type.enum';

export interface NotificationChannelProps {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  config: Record<string, string>; // Slack: webhookUrl; Email: to,from; Webhook: url
  createdAt: Date;
}

export class NotificationChannel {
  readonly id: string;
  readonly name: string;
  readonly type: ChannelType;
  readonly enabled: boolean;
  readonly config: Record<string, string>;
  readonly createdAt: Date;

  constructor(props: NotificationChannelProps) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.enabled = props.enabled;
    this.config = props.config;
    this.createdAt = props.createdAt;
  }

  isSlack(): boolean { return this.type === ChannelType.SLACK; }
  isEmail(): boolean { return this.type === ChannelType.EMAIL; }
  isWebhook(): boolean { return this.type === ChannelType.WEBHOOK; }
}
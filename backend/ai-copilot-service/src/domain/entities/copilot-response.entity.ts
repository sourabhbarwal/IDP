import { CopilotMode } from '../enums/copilot-mode.enum';

export interface CopilotResponseProps {
  id: string;
  mode: CopilotMode;
  content: string;
  contextUsed: string[];
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
  createdAt: Date;
}

export class CopilotResponse {
  readonly id: string;
  readonly mode: CopilotMode;
  readonly content: string;
  readonly contextUsed: string[];
  readonly tokensUsed: number;
  readonly modelUsed: string;
  readonly durationMs: number;
  readonly createdAt: Date;

  constructor(props: CopilotResponseProps) {
    this.id = props.id;
    this.mode = props.mode;
    this.content = props.content;
    this.contextUsed = props.contextUsed;
    this.tokensUsed = props.tokensUsed;
    this.modelUsed = props.modelUsed;
    this.durationMs = props.durationMs;
    this.createdAt = props.createdAt;
  }
}
export enum CopilotMode {
  /** General chat about the IDP platform */
  CHAT = 'CHAT',
  /** Investigates active alerts using live platform data */
  INCIDENT = 'INCIDENT',
  /** Analyses cost data and gives rightsizing recommendations */
  COST = 'COST',
  /** Advises on deployment strategy for a given service */
  DEPLOYMENT = 'DEPLOYMENT',
}
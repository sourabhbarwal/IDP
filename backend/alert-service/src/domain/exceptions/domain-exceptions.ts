export class AlertRuleNotFoundError extends Error {
  constructor(id: string) {
    super(`Alert rule '${id}' was not found`);
    this.name = 'AlertRuleNotFoundError';
  }
}

export class AlertEventNotFoundError extends Error {
  constructor(id: string) {
    super(`Alert event '${id}' was not found`);
    this.name = 'AlertEventNotFoundError';
  }
}

export class AlertRuleNameConflictError extends Error {
  constructor(name: string) {
    super(`An alert rule named '${name}' already exists`);
    this.name = 'AlertRuleNameConflictError';
  }
}
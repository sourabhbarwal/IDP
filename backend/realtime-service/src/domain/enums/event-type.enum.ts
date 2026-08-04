export enum EventType {
  // Alert events
  ALERT_FIRED      = 'alert:fired',
  ALERT_RESOLVED   = 'alert:resolved',
  ALERT_ACKNOWLEDGED = 'alert:acknowledged',

  // Deployment events
  DEPLOYMENT_STARTED   = 'deployment:started',
  DEPLOYMENT_SUCCEEDED = 'deployment:succeeded',
  DEPLOYMENT_FAILED    = 'deployment:failed',
  DEPLOYMENT_ROLLED_BACK = 'deployment:rolled_back',

  // Audit events
  AUDIT_EVENT = 'audit:event',

  // Platform events
  SERVICE_REGISTERED = 'service:registered',
  SERVICE_DELETED    = 'service:deleted',

  // System
  CONNECTED    = 'system:connected',
  DISCONNECTED = 'system:disconnected',
}
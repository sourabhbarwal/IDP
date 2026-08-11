export enum DependencyType {
  /** Service cannot function without this dependency */
  HARD  = 'HARD',
  /** Graceful degradation possible when dependency is unavailable */
  SOFT  = 'SOFT',
  /** Event-driven / async — non-blocking */
  ASYNC = 'ASYNC',
}
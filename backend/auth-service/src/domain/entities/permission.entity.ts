/**
 * A fine-grained permission string, e.g. "service:create", "deployment:rollback".
 * Plain domain object - no framework/ORM dependencies (Clean Architecture).
 */
export class Permission {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null = null,
  ) {}
}

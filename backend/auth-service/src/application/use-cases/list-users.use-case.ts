import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/repositories/user.repository.port';

export interface ListUsersQuery {
  page:   number;
  size:   number;
  search?: string;
  role?:   string;
  status?: string;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(query: ListUsersQuery) {
    return this.users.findAll({
      page:   query.page,
      size:   query.size,
      search: query.search,
      role:   query.role,
      status: query.status,
    });
  }
}
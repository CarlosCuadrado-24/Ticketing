import { Injectable, Inject } from "@nestjs/common";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { USER_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { GetUsersQueryDto } from "../../presentation/dtos/get-users-query.dto";

@Injectable()
export class GetUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetUsersQueryDto) {
    const { page = 1, limit = 10, email, role, search } = query;
    const offset = (page - 1) * limit;

    const users = await this.userRepository.findWithFilters({
      email,
      role,
      search,
      limit,
      offset,
    });

    const total = await this.userRepository.countWithFilters({
      email,
      role,
      search,
    });

    // Remove passwords from response
    const usersWithoutPasswords = users.map((user) => {
      const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      data: usersWithoutPasswords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

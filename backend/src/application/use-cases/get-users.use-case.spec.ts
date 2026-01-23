import { Test, TestingModule } from "@nestjs/testing";
import { GetUsersUseCase } from "./get-users.use-case";
import { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { USER_REPOSITORY } from "../../domain/interfaces/repository-tokens";
import { UserRole } from "../../domain/enums/user-role.enum";
import { Email } from "../../domain/value-objects/email.vo";

describe("GetUsersUseCase", () => {
  let useCase: GetUsersUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    mockUserRepository = {
      findWithFilters: jest.fn(),
      countWithFilters: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findByRole: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsersUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetUsersUseCase>(GetUsersUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should return paginated users without passwords", async () => {
      const query = { page: 1, limit: 10 };
      const mockUsers = [
        {
          id: "1",
          email: Email.create("user1@test.com"),
          firstName: "User",
          lastName: "One",
          passwordHash: "hashed_password_1",
          role: UserRole.BUYER,
          createdAt: new Date(),
        },
        {
          id: "2",
          email: Email.create("user2@test.com"),
          firstName: "User",
          lastName: "Two",
          passwordHash: "hashed_password_2",
          role: UserRole.BUYER,
          createdAt: new Date(),
        },
      ];

      mockUserRepository.findWithFilters.mockResolvedValue(mockUsers as any);
      mockUserRepository.countWithFilters.mockResolvedValue(2);

      const result = await useCase.execute(query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).not.toHaveProperty("passwordHash");
      expect(result.data[1]).not.toHaveProperty("passwordHash");
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockUserRepository.findWithFilters).toHaveBeenCalledWith({
        email: undefined,
        role: undefined,
        search: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it("should apply filters correctly", async () => {
      const query = {
        page: 2,
        limit: 5,
        email: "test@test.com",
        role: UserRole.ADMIN,
        search: "admin",
      };

      mockUserRepository.findWithFilters.mockResolvedValue([]);
      mockUserRepository.countWithFilters.mockResolvedValue(0);

      const result = await useCase.execute(query);

      expect(mockUserRepository.findWithFilters).toHaveBeenCalledWith({
        email: "test@test.com",
        role: UserRole.ADMIN,
        search: "admin",
        limit: 5,
        offset: 5,
      });
      expect(mockUserRepository.countWithFilters).toHaveBeenCalledWith({
        email: "test@test.com",
        role: UserRole.ADMIN,
        search: "admin",
      });
      expect(result.data).toEqual([]);
    });

    it("should calculate pagination correctly for multiple pages", async () => {
      const query = { page: 3, limit: 10 };

      mockUserRepository.findWithFilters.mockResolvedValue([]);
      mockUserRepository.countWithFilters.mockResolvedValue(25);

      const result = await useCase.execute(query);

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.total).toBe(25);
      expect(mockUserRepository.findWithFilters).toHaveBeenCalledWith({
        email: undefined,
        role: undefined,
        search: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it("should use default values when page and limit not provided", async () => {
      const query = {};

      mockUserRepository.findWithFilters.mockResolvedValue([]);
      mockUserRepository.countWithFilters.mockResolvedValue(0);

      await useCase.execute(query);

      expect(mockUserRepository.findWithFilters).toHaveBeenCalledWith({
        email: undefined,
        role: undefined,
        search: undefined,
        limit: 10,
        offset: 0,
      });
    });
  });
});

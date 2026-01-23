import { User } from "../../../domain/entities/user.entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { UserOrmEntity } from "../entities/user.orm-entity";

/**
 * UserMapper
 * Maps between User domain entity and UserOrmEntity
 * Handles conversion between domain and persistence layers
 *
 * Requirements: 8.3
 */
export class UserMapper {
  /**
   * Converts a User domain entity to a UserOrmEntity for persistence
   * @param user - The User domain entity
   * @returns UserOrmEntity ready for database storage
   */
  static toPersistence(user: User): UserOrmEntity {
    const ormEntity = new UserOrmEntity();
    ormEntity.id = user.id;
    ormEntity.email =
      typeof user.email === "string" ? user.email : user.email.value;
    ormEntity.passwordHash = user.passwordHash;
    ormEntity.firstName = user.firstName;
    ormEntity.lastName = user.lastName;
    ormEntity.role = user.role;
    ormEntity.createdAt = user.createdAt;
    return ormEntity;
  }

  /**
   * Converts a UserOrmEntity from the database to a User domain entity
   * @param ormEntity - The UserOrmEntity from the database
   * @returns User domain entity
   */
  static toDomain(ormEntity: UserOrmEntity): User {
    return new User(
      ormEntity.id,
      Email.create(ormEntity.email),
      ormEntity.passwordHash,
      ormEntity.firstName,
      ormEntity.lastName,
      ormEntity.role,
      ormEntity.createdAt,
    );
  }
}

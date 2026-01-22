import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: AddDescriptionToEvents
 * Adds a description column to the events table to store event descriptions.
 * 
 * @implements {MigrationInterface}
 */
export class AddDescriptionToEvents1737519600000 implements MigrationInterface {
  name = "AddDescriptionToEvents1737519600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add description column to events table
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN description TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove description column from events table
    await queryRunner.query(`
      ALTER TABLE events
      DROP COLUMN description
    `);
  }
}

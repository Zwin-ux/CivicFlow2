import database from '../../config/database';
import bcrypt from 'bcryptjs';
import logger from '../../utils/logger';

export async function seed(): Promise<void> {
  try {
    logger.info('Seeding test users...');

    const SALT_ROUNDS = 10;
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

    const users = [
      {
        email: 'admin@example.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: 'Administrator',
      },
      {
        email: 'reviewer@example.com',
        passwordHash,
        firstName: 'Review',
        lastName: 'Staff',
        role: 'Reviewer',
      },
      {
        email: 'approver@example.com',
        passwordHash,
        firstName: 'Approval',
        lastName: 'Manager',
        role: 'Approver',
      },
      {
        email: 'auditor@example.com',
        passwordHash,
        firstName: 'Audit',
        lastName: 'Officer',
        role: 'Auditor',
      },
      {
        email: 'applicant@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        role: 'Applicant',
      },
    ];

    for (const user of users) {
      // Check if user already exists
      const existingUser = await database.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length === 0) {
        await database.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role)
           VALUES ($1, $2, $3, $4, $5)`,
          [user.email, user.passwordHash, user.firstName, user.lastName, user.role]
        );
        logger.info(`Created test user: ${user.email} (${user.role})`);
      } else {
        logger.info(`Test user already exists: ${user.email}`);
      }
    }

    logger.info('Test users seeded successfully');
    logger.info(`Default password for all test users: ${defaultPassword}`);
  } catch (error) {
    logger.error('Error seeding test users', { error });
    throw error;
  }
}

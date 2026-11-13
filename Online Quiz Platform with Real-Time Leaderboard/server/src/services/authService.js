/**
 * Authentication Business Logic Service
 * Handles user registration with bcrypt password hashing and JWT token issuance.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_jwt_secret_college_dbms_quiz_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

class AuthService {
  async register({ name, email, password, role = 'student' }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error('A user with this email address is already registered.');
      err.statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await userRepository.create({
      name,
      email,
      passwordHash,
      role,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const safeUser = {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(safeUser);
    return { user: safeUser, token };
  }

  generateToken(user) {
    return jwt.sign(
      {
        userId: user.userId || user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }
}

module.exports = new AuthService();

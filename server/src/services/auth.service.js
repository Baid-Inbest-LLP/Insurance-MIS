import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generatePassword } from '../utils/passwordUtils.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/tokenUtils.js';

const MAX_REFRESH_SESSIONS = 5;

const toAuthUser = (user) => ({
  _id: user._id,
  name: user.name,
  userName: user.userName,
  role: user.role,
  ...(user.locationCity !== undefined ? { locationCity: user.locationCity } : {}),
});

/** Normalize legacy string | string[] | null refreshToken storage. */
const listRefreshTokens = (value) => {
  if (Array.isArray(value)) return value.filter((t) => typeof t === 'string' && t);
  if (typeof value === 'string' && value) return [value];
  return [];
};

const rememberRefreshToken = (user, token) => {
  const next = listRefreshTokens(user.refreshToken).filter((t) => t !== token);
  next.push(token);
  user.refreshToken = next.slice(-MAX_REFRESH_SESSIONS);
};

export const login = async (userName, password) => {
  const normalizedUserName = String(userName).trim().toLowerCase();
  const user = await User.findOne({ userName: normalizedUserName })
    .select('name userName role isActive password refreshToken locationCity')
    .populate('locationCity', 'name');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid username or password');
  }
  if (!user.isActive) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  const payload = { id: String(user._id) };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Append session token instead of replacing — local/prod or multi-device
  // logins no longer invalidate each other's refresh tokens.
  rememberRefreshToken(user, refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: toAuthUser(user), accessToken, refreshToken };
};

export const refreshAccessToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('isActive refreshToken');
  const sessions = listRefreshTokens(user?.refreshToken);
  if (!user || !user.isActive || !sessions.includes(token)) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const payload = { id: String(user._id) };
  const accessToken = generateAccessToken(payload);
  return { accessToken };
};

export const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: [] });
};

export const registerUser = async (data, requestedBy) => {
  const exists = await User.findOne({ userName: data.userName });
  if (exists) throw ApiError.conflict('User name already registered');

  if (requestedBy.role !== 'superadmin') {
    throw ApiError.forbidden('Only superadmin can create users');
  }

  if (data.role === 'superadmin') {
    throw ApiError.forbidden('Only one superadmin account can exist');
  }

  return User.create({ ...data, role: 'accountant' });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('password refreshToken');
  if (!user) throw ApiError.notFound('User not found');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = newPassword;
  user.refreshToken = [];
  await user.save();
};

export const resetUserPassword = async (targetUserId, requestedBy) => {
  if (requestedBy.role !== 'superadmin') {
    throw ApiError.forbidden('Only superadmin can reset passwords');
  }
  if (String(targetUserId) === String(requestedBy._id)) {
    throw ApiError.forbidden('Use change password to update your own password');
  }

  const user = await User.findById(targetUserId).select('role refreshToken');
  if (!user) throw ApiError.notFound('User not found');
  if (user.role !== 'accountant') {
    throw ApiError.forbidden('You do not have permission to reset this user\'s password');
  }

  const newPassword = generatePassword();
  user.password = newPassword;
  user.refreshToken = [];
  await user.save();

  return newPassword;
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId)
    .select('name userName role locationCity')
    .populate('locationCity', 'name');
  if (!user) throw ApiError.notFound('User not found');
  return toAuthUser(user);
};

export const toAuthUserPayload = toAuthUser;

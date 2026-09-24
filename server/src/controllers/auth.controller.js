import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as authService from '../services/auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const { userName, password } = req.body;
  const result = await authService.login(userName, password);
  ApiResponse.success(res, result, 'Login successful');
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const result = await authService.refreshAccessToken(token);
  ApiResponse.success(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  ApiResponse.success(res, null, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  ApiResponse.success(res, user, 'User profile');
});

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body, req.user);
  ApiResponse.created(res, user, 'User registered');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user._id, currentPassword, newPassword);
  ApiResponse.success(res, null, 'Password updated successfully');
});

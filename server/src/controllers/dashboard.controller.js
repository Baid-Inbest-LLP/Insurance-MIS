import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboard } from '../services/dashboard.service.js';

export const getPremiumDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboard({ actor: req.user, filters: req.validated.query });
  ApiResponse.success(res, dashboard);
});

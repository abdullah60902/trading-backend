"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controllers/profileController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// Profile info
router.get('/', profileController_1.getProfile);
// Change password
router.post('/change-password', profileController_1.changePassword);
// Profile picture upload
router.post('/avatar', profileController_1.uploadAvatar, profileController_1.updateProfilePicture);
// KYC document upload
router.post('/kyc', profileController_1.uploadKycDoc, profileController_1.submitKycDocument);
// Notification preferences
router.get('/notifications', profileController_1.getNotificationPreferences);
router.put('/notifications', profileController_1.updateNotificationPreferences);
exports.default = router;

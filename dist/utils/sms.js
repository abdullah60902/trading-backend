"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMobileOtp = void 0;
const sendMobileOtp = async (phoneNumber, otp) => {
    // Console logging for verification
    console.log(`
=========================================
[DEV SMS OUTBOX]
To: ${phoneNumber}
Message: Your CryptoPlatform verification OTP is: ${otp}. It is valid for 10 minutes.
=========================================
`);
    return true;
};
exports.sendMobileOtp = sendMobileOtp;

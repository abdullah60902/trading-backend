export const sendMobileOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
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

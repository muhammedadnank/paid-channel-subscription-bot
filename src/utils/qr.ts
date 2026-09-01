import QRCode from "qrcode";

export async function generateUPIQRBuffer(
  amount: number,
  upiId: string,
  payeeName: string = "Paid Channel Subscription"
): Promise<Buffer> {
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
  return await QRCode.toBuffer(upiUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    scale: 8,
  });
}

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,        // STARTTLS — works on Render (port 465 may be blocked)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,  // allow self-signed certs in some cloud envs
  },
  pool: true,
  maxConnections: 3,
  socketTimeout: 10000,        // 10s timeout
});

const BRAND = 'Chloe Memories 💕';
const PINK  = '#ff6b8b';

// ── Base HTML wrapper ──────────────────────────────────────────────────────
const htmlWrap = (bodyContent) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#fff0f2;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff0f2;padding:32px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;box-shadow:0 8px 32px rgba(255,107,139,0.15);overflow:hidden;max-width:480px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${PINK},#ff477e);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">${BRAND}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Góc nhỏ riêng tư của hai đứa mình ✨</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fff0f2;padding:20px 32px;text-align:center;border-top:1px solid #ffd3da;">
            <p style="margin:0;font-size:12px;color:#8c7377;">Email này được gửi tự động từ ${BRAND}.<br>Đừng trả lời email này nhé 💌</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Email: brush notification ──────────────────────────────────────────────
export const sendBrushEmail = async (toEmail, fromName) => {
  if (!toEmail) return;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🪥 ${fromName} đang gọi bạn!`,
    html: htmlWrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:56px;margin-bottom:12px;">🪥💕</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#ff6b8b;">${fromName} đang gọi bạn!</h2>
        <p style="margin:0;font-size:15px;color:#4a373b;line-height:1.6;">
          <strong style="color:${PINK}">${fromName}</strong> đang di chuyển bàn chải để gọi bạn đó 🥺<br>
          Mở app ngay để xem bạn ấy đang làm gì nhé!
        </p>
      </div>
      <div style="background:linear-gradient(135deg,#fff0f2,#fffdf0);border-radius:16px;padding:16px;text-align:center;border:1px solid #ffd3da;">
        <p style="margin:0;font-size:13px;color:#8c7377;">🕐 Thông báo này sẽ không lặp lại trong 5 phút tiếp theo</p>
      </div>
    `),
  });
};

// ── Email: new post notification ───────────────────────────────────────────
export const sendPostEmail = async (toEmail, fromName, userStatus, imageUrl) => {
  if (!toEmail) return;
  const imgSection = imageUrl
    ? `<div style="margin:16px 0;border-radius:16px;overflow:hidden;"><img src="${imageUrl}" alt="post" style="width:100%;display:block;max-height:280px;object-fit:cover;"></div>`
    : '';
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `📸 ${fromName} vừa đăng ảnh mới cho bạn!`,
    html: htmlWrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;margin-bottom:12px;">📸✨</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#ff6b8b;">${fromName} vừa đăng ảnh mới!</h2>
        ${userStatus ? `<div style="display:inline-block;background:#fff0f2;border:1px solid #ffd3da;border-radius:20px;padding:8px 16px;margin:8px 0;font-size:14px;color:#ff6b8b;font-weight:600;">💬 "${userStatus}"</div>` : ''}
      </div>
      ${imgSection}
      <p style="text-align:center;font-size:14px;color:#4a373b;margin:16px 0 0;">Mở app ngay để xem và phản ứng nhé! ❤️</p>
    `),
  });
};

// ── Email: new comment / reply notification ────────────────────────────────
export const sendCommentEmail = async (toEmail, fromName, commentText, isReply = false) => {
  if (!toEmail) return;
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `💬 ${fromName} ${isReply ? 'đã trả lời bình luận của bạn' : 'đã bình luận vào ảnh của bạn'}!`,
    html: htmlWrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;margin-bottom:12px;">${isReply ? '↩️💬' : '💬❤️'}</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#ff6b8b;">
          ${fromName} ${isReply ? 'đã trả lời bình luận' : 'đã bình luận'}!
        </h2>
      </div>
      <div style="background:#fff0f2;border-left:4px solid ${PINK};border-radius:0 12px 12px 0;padding:14px 16px;margin:16px 0;">
        <p style="margin:0;font-size:15px;color:#4a373b;font-style:italic;">"${commentText}"</p>
        <p style="margin:6px 0 0;font-size:12px;color:#8c7377;">— ${fromName}</p>
      </div>
      <p style="text-align:center;font-size:14px;color:#4a373b;margin:16px 0 0;">Mở app để trả lời nhé! 💕</p>
    `),
  });
};

// ── Email: OTP verification ────────────────────────────────────────────────
export const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🔐 Mã xác thực email — ${BRAND}`,
    html: htmlWrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;margin-bottom:12px;">🔐</div>
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#ff6b8b;">Xác thực địa chỉ email</h2>
        <p style="margin:0;font-size:14px;color:#4a373b;">Nhập mã dưới đây trong ứng dụng để xác thực email của bạn:</p>
      </div>
      <div style="background:linear-gradient(135deg,${PINK},#ff477e);border-radius:16px;padding:24px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:8px;">${otp}</p>
      </div>
      <p style="text-align:center;font-size:13px;color:#8c7377;margin:12px 0 0;">⏰ Mã này có hiệu lực trong <strong>10 phút</strong></p>
    `),
  });
};

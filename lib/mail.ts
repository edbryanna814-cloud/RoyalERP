import nodemailer from "nodemailer";

export const mailConfigured = Boolean(
  process.env.SMTP_USER && process.env.SMTP_PASS
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendPasswordResetEmail(to: string, link: string) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "";
  return transporter.sendMail({
    from: from ? `رويال للتوريدات العمومية <${from}>` : undefined,
    to,
    subject: "استعادة كلمة المرور — رويال للتوريدات العمومية",
    html: `<!doctype html>
<html dir="rtl" lang="ar">
  <body style="margin:0;padding:0;background:#f4f4f4;font-family:Segoe UI,Tahoma,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e6e6">
            <tr>
              <td style="background:#1c1c1c;padding:20px 24px;text-align:center">
                <div style="font-size:15px;color:#c9a13b;font-weight:700;letter-spacing:1px">الملكية الملكية</div>
                <div style="font-size:22px;color:#ffffff;font-weight:800;margin-top:4px">رويال للتوريدات العمومية</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px">
                <h1 style="font-size:20px;color:#1c1c1c;margin:0 0 12px">استعادة كلمة المرور</h1>
                <p style="font-size:15px;line-height:1.8;color:#444;margin:0 0 20px">
                  وصلنالك طلب لتغيير كلمة مرور حسابك في نظام عروض الأسعار.
                  لو مش إنت اللي طلبت، تجاهل الرسالة دي — كلمة مرورك لسه زي ما هي.
                </p>
                <p style="margin:0 0 24px;text-align:center">
                  <a href="${link}" style="display:inline-block;background:#c9a13b;color:#1c1c1c;text-decoration:none;font-weight:800;font-size:16px;padding:14px 36px;border-radius:8px;mso-padding-alt:0">إعادة تعيين كلمة المرور</a>
                </p>
                <p style="font-size:13px;line-height:1.8;color:#888;margin:0">
                  الرابط صالح لمدة 30 دقيقة ويُستخدم مرة واحدة بس.
                  <br/>لو الزر مش شغال، انسخ الرابط ده: <a href="${link}" style="color:#c9a13b">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8f8f8;padding:14px 24px;text-align:center;font-size:12px;color:#999">
                رويال للتوريدات العمومية — نظام إدارة عروض الأسعار
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `استعادة كلمة المرور — رويال للتوريدات العمومية\n\nوصلنالك طلب لتغيير كلمة مرور حسابك.\nلو مش إنت اللي طلبت، تجاهل الرسالة.\n\nافتح الرابط ده لإعادة التعيين (صالح 30 دقيقة):\n${link}`,
  });
}
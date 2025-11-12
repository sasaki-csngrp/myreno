import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const fromEmail = process.env.EMAIL_FROM;
  
  if (!fromEmail) {
    throw new Error('EMAIL_FROM environment variable is not set');
  }

  const msg = {
    to,
    from: fromEmail,
    subject,
    text: text || html.replace(/<[^>]*>/g, ''),
    html,
  };

  console.log('Sending email:', { to, from: fromEmail, subject });

  try {
    const result = await sgMail.send(msg);
    console.log('SendGrid email sent successfully:', { 
      statusCode: result[0]?.statusCode,
      headers: result[0]?.headers 
    });
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid error occurred:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.response) {
      console.error('SendGrid response status:', error.response.statusCode);
      console.error('SendGrid response body:', JSON.stringify(error.response.body, null, 2));
      console.error('SendGrid response headers:', JSON.stringify(error.response.headers, null, 2));
    }
    throw error;
  }
}


import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
});

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

  const textContent = text ?? html.replace(/<[^>]*>/g, '');

  const command = new SendEmailCommand({
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
        Text: {
          Charset: 'UTF-8',
          Data: textContent,
        },
      },
    },
  });

  console.log('Sending email:', { to, from: fromEmail, subject });

  try {
    const result = await sesClient.send(command);
    console.log('SES email sent successfully:', {
      messageId: result.MessageId,
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('SES error occurred:');
    console.error('Error:', error);
    throw error;
  }
}

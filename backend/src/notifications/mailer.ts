import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

let cachedTransport: Transporter | null = null;

export function getTransport(): Transporter {
    if (cachedTransport) return cachedTransport;
    cachedTransport = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: false,
        ignoreTLS: true,
    });
    return cachedTransport;
}

export interface AlertEmail {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmail(msg: AlertEmail): Promise<{ messageId: string }> {
    const transport = getTransport();
    const result = await transport.sendMail({
        from: config.smtp.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
    });
    return { messageId: result.messageId };
}
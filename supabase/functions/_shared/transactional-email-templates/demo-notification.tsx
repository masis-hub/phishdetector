/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  company?: string
  phone?: string
  message?: string
  ip?: string
}

const Email = ({ name, email, company, phone, message, ip }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Nueva solicitud de demo de {name || 'un visitante'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nueva solicitud de demo</Heading>
        <Text style={row}><strong>Nombre:</strong> {name || '—'}</Text>
        <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
        {company ? <Text style={row}><strong>Empresa:</strong> {company}</Text> : null}
        {phone ? <Text style={row}><strong>Teléfono:</strong> {phone}</Text> : null}
        {message ? (
          <>
            <Text style={row}><strong>Comentarios:</strong></Text>
            <Text style={messageBox}>{message}</Text>
          </>
        ) : null}
        <Text style={footer}>
          Origen: landing page PhishDetector{ip ? ` · IP: ${ip}` : ''}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Props) =>
    `Solicitud de demo - ${data?.name || 'sin nombre'}${data?.company ? ` (${data.company})` : ''}`,
  displayName: 'Notificación interna de solicitud de demo',
  to: 'info@techsecureai.com',
  previewData: { name: 'María', email: 'maria@acme.com', company: 'Acme Corp', message: 'Quiero ver una demo.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 18px' }
const row = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '0 0 8px' }
const messageBox = { fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: '6px 0 16px', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }
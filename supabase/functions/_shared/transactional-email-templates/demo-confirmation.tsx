/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  company?: string
}

const Email = ({ name, company }: Props) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Recibimos tu solicitud de demo de PhishDetector</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>¡Gracias{name ? `, ${name}` : ''}!</Heading>
        <Text style={text}>
          Recibimos tu solicitud de demo de <strong>PhishDetector</strong>
          {company ? ` para ${company}` : ''}. Nuestro equipo te contactará en
          menos de 24 horas hábiles para coordinar una sesión personalizada.
        </Text>
        <Section style={card}>
          <Text style={cardTitle}>¿Qué sigue?</Text>
          <Text style={cardText}>
            • Te enviaremos un enlace para agendar la demo en el horario que prefieras.<br/>
            • Te mostraremos cómo simular campañas de phishing de forma ética y segura.<br/>
            • Resolveremos tus dudas sobre métricas, mitigación y cumplimiento.
          </Text>
        </Section>
        <Text style={text}>
          Si necesitas contactarnos antes, escríbenos a{' '}
          <a href="mailto:info@techsecureai.com" style={link}>info@techsecureai.com</a>.
        </Text>
        <Text style={footer}>
          PhishDetector · powered by Techsecure AI
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Recibimos tu solicitud de demo · PhishDetector',
  displayName: 'Confirmación de solicitud de demo',
  previewData: { name: 'María', company: 'Acme Corp' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 20px' }
const card = { backgroundColor: '#f8fafc', borderLeft: '3px solid #7C3AED', borderRadius: '6px', padding: '16px 18px', margin: '20px 0' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#7C3AED', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const cardText = { fontSize: '14px', color: '#334155', lineHeight: '1.7', margin: '0' }
const link = { color: '#7C3AED', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '32px 0 0', textAlign: 'center' as const }
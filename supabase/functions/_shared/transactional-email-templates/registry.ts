/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

import { template as demoConfirmation } from './demo-confirmation.tsx'
import { template as demoNotification } from './demo-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'demo-confirmation': demoConfirmation,
  'demo-notification': demoNotification,
}
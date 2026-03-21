import { z } from 'zod'

// ─── Auth Schemas ───────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be at most 100 characters'),
})

export type SignupInput = z.infer<typeof signupSchema>

// ─── Project Schemas ────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be at most 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(5, 'Project key must be at most 5 characters')
    .regex(/^[A-Z]+$/, 'Project key must be uppercase letters only'),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>

// ─── Issue Schemas ──────────────────────────────────────────────

export const issueStatusEnum = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
])

export const issuePriorityEnum = z.enum([
  'urgent',
  'high',
  'medium',
  'low',
  'no_priority',
])

export const createIssueSchema = z.object({
  title: z
    .string()
    .min(1, 'Issue title is required')
    .max(200, 'Issue title must be at most 200 characters'),
  description: z.string().optional(),
  status: issueStatusEnum,
  priority: issuePriorityEnum,
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>

// ─── Messaging Schemas ─────────────────────────────────────────

export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel name is required')
    .max(80, 'Channel name must be at most 80 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
  isPrivate: z.boolean(),
})

export type CreateChannelInput = z.infer<typeof createChannelSchema>

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be at most 5000 characters'),
  channelId: z.string().uuid('Invalid channel ID'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

// ─── ERP Schemas ────────────────────────────────────────────────

export const orderLineSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  unitPrice: z
    .number()
    .min(0, 'Unit price must be non-negative'),
})

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z
    .array(orderLineSchema)
    .min(1, 'Order must have at least one item'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

// ─── Docs Schemas ───────────────────────────────────────────────

export const createDocSchema = z.object({
  title: z
    .string()
    .min(1, 'Document title is required')
    .max(200, 'Document title must be at most 200 characters'),
  content: z.string().optional(),
  parentId: z.string().uuid('Invalid parent document ID').optional(),
})

export type CreateDocInput = z.infer<typeof createDocSchema>

// ─── Settings Schemas ───────────────────────────────────────────

export const settingsSchema = z.object({
  orgName: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be at most 100 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
})

export type SettingsInput = z.infer<typeof settingsSchema>

export const userRoleEnum = z.enum(['admin', 'member', 'viewer'])

export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  role: userRoleEnum,
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

// ─── Utility ────────────────────────────────────────────────────

/**
 * Extract the first error message from a ZodError.
 * Useful for displaying a single validation error in the UI.
 */
export function getFirstZodError(error: z.ZodError): string {
  const first = error.errors[0]
  return first?.message ?? 'Validation failed'
}

/**
 * Collect all field errors from a ZodError into a flat record.
 * Useful for inline form validation.
 */
export function getZodFieldErrors(
  error: z.ZodError
): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.errors) {
    const path = issue.path.join('.')
    if (path && !fieldErrors[path]) {
      fieldErrors[path] = issue.message
    }
  }
  return fieldErrors
}

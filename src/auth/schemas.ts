import { z } from 'zod'

export const emailField = z.email('Enter a valid email')
export const newPasswordField = z.string().min(8, 'At least 8 characters')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password'),
})

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'What should we call you?').max(60, 'Keep it under 60 characters'),
  email: emailField,
  password: newPasswordField,
})

export const forgotPasswordSchema = z.object({ email: emailField })

export const newPasswordSchema = z.object({ password: newPasswordField })

/** `?email=` on the code screens; an empty value sends the user back a step. */
export const emailSearchSchema = z.object({ email: z.string().catch('') })

export const CODE_LENGTH = 6

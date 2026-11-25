import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(80, 'Name cannot exceed 80 characters'),
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(80, 'Name cannot exceed 80 characters')
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password cannot exceed 128 characters')
    .optional(),
});

export const updateChapterSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  instructions: z.string().trim().max(4000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const submitPracticeSchema = z.object({
  chapterId: z.string().min(1, 'Chapter ID is required'),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOption: z.string(),
      })
    )
    .min(1, 'At least one answered question is required'),
});

export const savePracticeProgressSchema = z.object({
  chapterId: z.string().min(1, 'Chapter ID is required'),
  currentIndex: z.number().int().min(0),
  questionId: z.string().min(1).optional(),
  selectedOption: z.string().optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOption: z.string(),
      })
    )
    .optional(),
});

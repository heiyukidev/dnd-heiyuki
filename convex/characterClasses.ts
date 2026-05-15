import { v } from 'convex/values'

/** Built-in v1 template: empty placeholder for wiring UI and future stats. */
export const characterClassKeyValidator = v.literal('test')

export const CHARACTER_CLASS_OPTIONS = [{ key: 'test' as const, label: 'Test class' }] as const

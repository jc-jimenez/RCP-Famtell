import { MODULE_1_SYSTEM } from './module-1'
import { MODULE_2_SYSTEM } from './module-2'
import { MODULE_3_SYSTEM } from './module-3'
import { MODULE_4_SYSTEM } from './module-4'
import { MODULE_5_SYSTEM } from './module-5'
import { MODULE_6_SYSTEM } from './module-6'
import { MODULE_7_SYSTEM } from './module-7'
import type { ModuleCode } from '@/types'

export const MODULE_PROMPTS: Record<ModuleCode, string> = {
  M1: MODULE_1_SYSTEM,
  M2: MODULE_2_SYSTEM,
  M3: MODULE_3_SYSTEM,
  M4: MODULE_4_SYSTEM,
  M5: MODULE_5_SYSTEM,
  M6: MODULE_6_SYSTEM,
  M7: MODULE_7_SYSTEM,
}

export function getModulePrompt(code: ModuleCode): string {
  return MODULE_PROMPTS[code]
}

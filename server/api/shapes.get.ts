/** GET /api/shapes – returns all entity shapes. */
import { shapeStore } from '../utils/store'

export default defineEventHandler(() => {
  return { data: shapeStore }
})

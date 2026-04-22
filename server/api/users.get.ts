/** GET /api/users – returns all users (no passwords in this PoC). */
import { userStore } from '../utils/store'

export default defineEventHandler(() => {
  return { data: userStore }
})

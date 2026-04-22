/**
 * composables/useAuth.ts
 *
 * Manages the "currently active user" across the whole app.
 * Role switching is intentional and is a core demo feature – it lets
 * interviewers quickly switch between personas.
 *
 * Nielsen H6 – Recognition rather than recall:
 *   The current role is always visible in the header and in every permission
 *   explanation so users never have to remember their role.
 */
import type { User } from '~/types/index'

export const useAuth = () => {
  // useState persists across navigation within a session
  const currentUser = useState<User | null>('currentUser', () => null)

  const setUser = (user: User): void => {
    currentUser.value = user
  }

  const clearUser = (): void => {
    currentUser.value = null
  }

  return { currentUser, setUser, clearUser }
}

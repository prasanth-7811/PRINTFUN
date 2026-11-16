import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop ensures that whenever a user navigates between pages,
 * the window and document scroll position immediately resets to the top (0, 0).
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  // Prevent browser history scroll restoration from overriding landing position
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    // If navigation includes an explicit hash anchor (#faq, #reviews, etc.)
    if (hash) {
      const targetId = hash.replace('#', '')
      const element = document.getElementById(targetId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }

    // Immediately snap to the top of the new page
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search, hash])

  return null
}

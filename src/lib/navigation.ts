/**
 * Navigation abstraction layer — Next.js migration aid.
 *
 * All app code imports routing utilities from here instead of react-router-dom
 * directly. When migrating to Next.js, swap this file's exports for
 * next/navigation equivalents and the rest of the codebase stays unchanged.
 *
 * Note: src/App.tsx still imports from react-router-dom for BrowserRouter setup.
 */
export {
  useNavigate as useRouter,
  useParams,
  useLocation,
  useSearchParams,
  Link,
  NavLink,
} from 'react-router-dom';

export type { NavigateFunction, LinkProps } from 'react-router-dom';

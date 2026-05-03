import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="container-px py-32 text-center">
      <span className="eyebrow">404</span>
      <h1 className="display-1 mt-2">Page not found</h1>
      <Link to="/" className="mt-8 inline-block text-xs uppercase tracking-widest border-b border-foreground pb-1">Return home</Link>
    </div>
  );
}

import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-up">
      <p className="font-display text-7xl text-plum-200">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">This page isn't in the collection</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page you're looking for may have been moved or doesn't exist.
      </p>
      <Button as={Link} to="/" className="mt-6">Back to dashboard</Button>
    </div>
  );
}

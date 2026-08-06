import { Spinner } from './Spinner';

/** Rota bazlı kod bölmede (React.lazy) chunk yüklenirken gösterilir. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

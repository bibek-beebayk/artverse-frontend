import { Navigate } from 'react-router-dom';

export function Videos() {
  return <Navigate to="/gallery?tab=videos" replace />;
}

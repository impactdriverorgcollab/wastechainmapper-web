import { redirect } from 'next/navigation';

// Root redirects to the public map
export default function RootPage() {
  redirect('/map');
}

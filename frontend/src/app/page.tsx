// Middleware handles root redirect for authenticated users.
// This server component is the fallback when middleware is not involved.
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function RootPage() {
  const role = cookies().get('user_role')?.value;
  if (!role) redirect('/login');
  if (role === 'FACILITATOR') redirect('/dashboard');
  redirect('/join');
}

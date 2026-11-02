import type { Metadata } from 'next';
import { FieldApp } from '@/components/field/FieldApp';

export const metadata: Metadata = {
  title: 'Field records',
  description: 'Record waste sites in the field, with or without signal.',
};

export default function FieldPage() {
  return <FieldApp />;
}

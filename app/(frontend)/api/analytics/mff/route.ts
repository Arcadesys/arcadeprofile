import { NextRequest } from 'next/server';
import { receiveAnalytics } from '@/lib/analytics-receiver';

export function POST(request: NextRequest) {
  return receiveAnalytics(request, 'mff_manifesto');
}

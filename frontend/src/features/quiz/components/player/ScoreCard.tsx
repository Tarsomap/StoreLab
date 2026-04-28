'use client';

import { useRouter } from 'next/navigation';
import type { SubmitResponse } from '../../types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ScoreCardProps {
  result: SubmitResponse;
  storeId: string;
}

export function ScoreCard({ result, storeId }: ScoreCardProps) {
  const router = useRouter();

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="text-2xl text-green-600">
          {result.correctAnswers}/{result.totalQuestions} corretas
        </CardTitle>
        <CardDescription>Score: {result.scorePercentage.toFixed(0)}%</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button variant="outline" onClick={() => router.push(`/store/${storeId}/plan`)}>
          Voltar ao Plano
        </Button>
      </CardFooter>
    </Card>
  );
}

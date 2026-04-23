import { PhotoBanner } from '@/components/PhotoBanner';
import { StepProgress } from '@/components/create/StepProgress';

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PhotoBanner />
      <StepProgress />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-2">
        {children}
      </main>
    </div>
  );
}

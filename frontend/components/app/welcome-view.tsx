import { Button } from '@/components/ui/button';

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-md bg-cf-blue font-mono text-[14px] font-semibold text-white">C</span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-cf-ink">Caseflow</div>
        <div className="text-[10px] font-semibold tracking-[0.22em] text-cf-muted">AUTO · INTAKE</div>
      </div>
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref} className="min-h-svh w-full bg-cf-cream">
      <header className="mx-auto flex max-w-[1100px] items-center justify-between px-10 pt-8">
        <BrandMark />
        <div className="hidden items-center gap-2 text-[12px] text-cf-muted sm:flex">
          <span className="size-1.5 rounded-full bg-cf-green" />
          Available 24/7 · Confidential
        </div>
      </header>

      <section className="mx-auto mt-16 flex max-w-[720px] flex-col items-center px-6 text-center sm:mt-24">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-cf-blue">
          AFTER A CAR ACCIDENT · YOU&rsquo;RE NOT ALONE
        </div>
        <h1 className="mt-3 font-serif text-[52px] leading-[1.05] font-semibold tracking-tight text-cf-ink sm:text-[64px]">
          Tell us what happened.
        </h1>
        <p className="mt-5 max-w-[560px] text-[15px] leading-[1.6] text-cf-ink-2">
          Speak with our intake specialist in your own words. We&rsquo;ll listen, take down the facts, and connect you
          with the right attorney for your case &mdash; usually within an hour.
        </p>

        <Button
          size="lg"
          onClick={onStartCall}
          className="mt-9 h-12 w-72 rounded-full bg-cf-blue font-mono text-[12px] font-bold tracking-[0.16em] uppercase text-white hover:bg-cf-blue/90"
        >
          {startButtonText}
        </Button>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {['Bilingual intake', 'HIPAA-aware', 'No legal advice given'].map((label) => (
            <span
              key={label}
              className="rounded-full bg-white px-3 py-1 text-[12px] text-cf-ink-2 ring-1 ring-cf-border"
            >
              {label}
            </span>
          ))}
        </div>
      </section>

      <div className="fixed bottom-6 left-0 flex w-full items-center justify-center px-6">
        <p className="max-w-prose text-center text-[12px] leading-5 text-cf-muted">
          Caseflow collects the facts of your case and routes you to a licensed attorney. We do not give legal advice,
          quote settlement values, or evaluate case strength.
        </p>
      </div>
    </div>
  );
};

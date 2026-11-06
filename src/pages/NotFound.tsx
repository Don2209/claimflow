import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { DocSheet } from '@/components/DocSheet';
import { Seo } from '@/components/Seo';
import { notFound } from '@/content/site';

export default function NotFound() {
  return (
    <>
      <Seo {...notFound.meta} path="/404" noindex />
      <div className="sun">
        <Container className="flex flex-col gap-10 py-20 sm:py-28 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-display-lg">{notFound.title}</h1>
            <p className="mt-5 text-lead text-muted">{notFound.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {notFound.links.map((link, index) => (
                <Button
                  key={link.to}
                  to={link.to}
                  size="lg"
                  variant={index === 0 ? 'primary' : 'secondary'}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-40 shrink-0 rotate-3 rounded-[3px] border-2 border-dashed border-warn p-2">
            <DocSheet variant="form" className="aspect-[3/4] opacity-40" />
          </div>
        </Container>
      </div>
    </>
  );
}

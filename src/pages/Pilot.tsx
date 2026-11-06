import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import {
  CheckboxField,
  FormNotice,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/FormFields';
import { Section } from '@/components/Section';
import { Seo } from '@/components/Seo';
import { pilotMeta, pilotPage as page } from '@/content/pilot';
import { contact, ui } from '@/content/site';
import { submitForm } from '@/lib/forms';
import { PageHero } from '@/sections/shared/PageHero';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  title: z.string().trim().min(2, 'Enter your job title'),
  company: z.string().trim().min(2, 'Enter your company name'),
  email: z.string().trim().email('Enter a valid work email, like name@company.com'),
  country: z.string().trim().min(2, 'Enter your country'),
  classOfBusiness: z.string().min(1, 'Choose a class of business'),
  monthlyVolume: z.string().min(1, 'Choose the closest range'),
  claimsSystem: z.string().trim().optional(),
  message: z.string().trim().optional(),
  consent: z.boolean().refine(Boolean, 'Tick this box so we can respond to your application'),
  website: z.string().optional(), // honeypot
});

type PilotValues = z.infer<typeof schema>;
type Status = 'idle' | 'success' | 'email' | 'error';

function PilotForm() {
  const [status, setStatus] = useState<Status>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PilotValues>({ resolver: zodResolver(schema) });
  const copy = page.form;

  useEffect(() => {
    if (status === 'success') reset();
  }, [status, reset]);

  const onSubmit = async ({ website, ...values }: PilotValues) => {
    try {
      const result = website ? 'sent' : await submitForm('pilot-application', values);
      setStatus(result === 'email' ? 'email' : 'success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <TextField
        label="Name"
        required
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Title"
        required
        autoComplete="organization-title"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextField
        label="Company"
        required
        autoComplete="organization"
        error={errors.company?.message}
        {...register('company')}
      />
      <TextField
        label="Work email"
        required
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Country"
        required
        autoComplete="country-name"
        error={errors.country?.message}
        {...register('country')}
      />
      <SelectField
        label="Class of business"
        required
        options={copy.classes}
        error={errors.classOfBusiness?.message}
        {...register('classOfBusiness')}
      />
      <SelectField
        label="Approximate monthly claim volume"
        required
        options={copy.volumes}
        error={errors.monthlyVolume?.message}
        {...register('monthlyVolume')}
      />
      <TextField
        label="Current claims system"
        error={errors.claimsSystem?.message}
        {...register('claimsSystem')}
      />
      <TextAreaField
        label="Message"
        className="sm:col-span-2"
        error={errors.message?.message}
        {...register('message')}
      />
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>
      <CheckboxField
        className="sm:col-span-2"
        required
        label={copy.consent}
        error={errors.consent?.message}
        {...register('consent')}
      />
      <div className="space-y-4 sm:col-span-2">
        {status === 'success' && (
          <FormNotice tone="ok" title={copy.successTitle}>
            {copy.successBody}
          </FormNotice>
        )}
        {status === 'email' && (
          <FormNotice tone="ok" title={ui.emailTitle}>
            {ui.emailBody}{' '}
            <a className="underline" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
          </FormNotice>
        )}
        {status === 'error' && (
          <FormNotice tone="danger" title={copy.errorTitle}>
            {copy.errorBody}{' '}
            <a className="underline" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            .
          </FormNotice>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting} className="max-sm:w-full">
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>
      </div>
    </form>
  );
}

export default function Pilot() {
  return (
    <>
      <Seo {...pilotMeta} path="/pilot" />
      <PageHero title={page.title} lead={page.lead} photo="jacaranda-avenue">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button href="#apply" size="lg">
            {page.form.title}
          </Button>
        </div>
        <p className="mt-6 max-w-2xl rounded-lg border border-line bg-surface p-4 text-small">
          {page.note}
        </p>
      </PageHero>

      <Section compact title={page.timeline.title} lead={page.timeline.lead}>
        {/* The bar is drawn to scale, one column per week. */}
        <div aria-hidden="true" className="grid grid-cols-12 gap-1">
          {page.timeline.phases.map((phase, index) => (
            <div
              key={phase.weeks}
              style={{ gridColumn: `span ${phase.span}` }}
              className={index === 1 ? 'h-2 rounded-full bg-primary' : 'h-2 rounded-full bg-fg/30'}
            />
          ))}
        </div>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          {page.timeline.phases.map((phase) => (
            <li key={phase.weeks}>
              <p className="text-small font-semibold text-ok">{phase.weeks}</p>
              <h3 className="mt-1 text-display-sm">{phase.title}</h3>
              <p className="mt-2 text-muted">{phase.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="surface">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {[page.included, page.needs].map((list) => (
            <div key={list.title}>
              <h2 className="text-display-md">{list.title}</h2>
              <ul className="mt-6 space-y-3">
                {list.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden="true"
                      strokeWidth={3}
                      className="mt-1 size-4 shrink-0 text-ok"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section compact title={page.measures.title} lead={page.measures.lead}>
        <ul className="grid gap-8 md:grid-cols-3">
          {page.measures.items.map((item) => (
            <li key={item.title} className="border-t-2 border-fg pt-4">
              <h3 className="text-display-sm">{item.title}</h3>
              <p className="mt-2 text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section id="apply" aria-labelledby="apply-title" className="ink py-section">
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h2 id="apply-title" className="text-display-md">
              {page.form.title}
            </h2>
            <p className="mt-4 text-lead text-muted">{page.form.lead}</p>
          </div>
          <PilotForm />
        </Container>
      </section>
    </>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { FormNotice, SelectField, TextAreaField, TextField } from '@/components/FormFields';
import { Placeholder, showPlaceholders } from '@/components/Placeholder';
import { Photo } from '@/components/Photo';
import { Seo } from '@/components/Seo';
import { demoMeta, demoPage as page } from '@/content/demoPage';
import { contact, placeholderText, ui } from '@/content/site';
import { submitForm } from '@/lib/forms';

const schema = z.object({
  name: z.string().trim().min(2, page.form.errors.name),
  email: z.string().trim().email(page.form.errors.email),
  phone: z.string().trim().optional(),
  company: z.string().trim().min(2, page.form.errors.company),
  role: z.string().trim().min(2, page.form.errors.role),
  country: z.string().trim().min(2, page.form.errors.country),
  preferredDate: z.string().min(1, page.form.errors.date),
  timeWindow: z.string().min(1, page.form.errors.timeWindow),
  message: z.string().trim().optional(),
  website: z.string().optional(), // honeypot
});

type DemoValues = z.infer<typeof schema>;
type Status = 'idle' | 'success' | 'email' | 'error';

function DemoForm() {
  const [status, setStatus] = useState<Status>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DemoValues>({ resolver: zodResolver(schema) });
  const copy = page.form;

  useEffect(() => {
    if (status === 'success') reset();
  }, [status, reset]);

  const onSubmit = async ({ website, ...values }: DemoValues) => {
    try {
      const result = website ? 'sent' : await submitForm('demo-request', values);
      setStatus(result === 'email' ? 'email' : 'success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <TextField
        label={page.form.labels.name}
        required
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label={page.form.labels.email}
        required
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label={page.form.labels.phone}
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />
      <TextField
        label={page.form.labels.company}
        required
        autoComplete="organization"
        error={errors.company?.message}
        {...register('company')}
      />
      <TextField
        label={page.form.labels.role}
        required
        autoComplete="organization-title"
        error={errors.role?.message}
        {...register('role')}
      />
      <TextField
        label={page.form.labels.country}
        required
        autoComplete="country-name"
        error={errors.country?.message}
        {...register('country')}
      />
      <TextField
        label={page.form.labels.date}
        required
        type="date"
        error={errors.preferredDate?.message}
        {...register('preferredDate')}
      />
      <SelectField
        label={page.form.labels.timeWindow}
        required
        options={copy.timeWindows}
        error={errors.timeWindow?.message}
        {...register('timeWindow')}
      />
      <p className="-mt-2 text-caption text-muted sm:col-span-2">{copy.timezoneNote}</p>
      <TextAreaField
        label={page.form.labels.message}
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
        <p className="text-caption text-muted">{copy.consent}</p>
      </div>
    </form>
  );
}

export default function Demo() {
  return (
    <>
      <Seo {...demoMeta} path="/demo" />
      <div className="ink relative isolate overflow-hidden">
        <Photo
          id="jacaranda-avenue"
          alt=""
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />
        <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h1 className="text-display-lg">{page.title}</h1>
            <p className="mt-5 text-lead text-muted">{page.lead}</p>
            <p className="mt-3 font-medium">{page.replyLine}</p>

            <h2 className="mt-10 text-display-sm">{page.expect.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {page.expect.items.map((item) => (
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

            <h2 className="mt-10 text-display-sm">{page.direct.title}</h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-small text-muted">{page.direct.email}</dt>
                <dd>
                  <a className="text-link" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </dd>
              </div>
              {(contact.phone || showPlaceholders) && (
                <div>
                  <dt className="text-small text-muted">{page.direct.phone}</dt>
                  <dd className="mt-0.5">
                    {contact.phone || <Placeholder>{placeholderText.phone}</Placeholder>}
                  </dd>
                </div>
              )}
              {(contact.postalAddress || showPlaceholders) && (
                <div>
                  <dt className="text-small text-muted">{page.direct.address}</dt>
                  <dd className="mt-0.5">
                    {contact.postalAddress || (
                      <Placeholder>{placeholderText.postalAddress}</Placeholder>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="bg-surface p-5 shadow-window sm:p-8">
            <h2 className="mb-6 text-display-sm">{page.form.title}</h2>
            <DemoForm />
          </div>
        </Container>
      </div>
    </>
  );
}

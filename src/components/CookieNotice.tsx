import { useEffect, useState } from 'react';
import { cookieNotice } from '@/content/site';
import { analyticsSrc } from '@/lib/site';
import { Button } from './Button';

const key = 'claimsflow-analytics-consent';

function readChoice(): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function loadAnalytics() {
  const script = document.createElement('script');
  script.src = analyticsSrc;
  script.defer = true;
  document.head.appendChild(script);
}

/** Only rendered when VITE_ANALYTICS_SRC is set. The script never loads without consent. */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = readChoice();
    if (choice === 'accepted') loadAnalytics();
    else if (choice === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(key, choice);
    } catch {
      // Without storage the notice returns on the next visit, which is the safe outcome.
    }
    if (choice === 'accepted') loadAnalytics();
    setVisible(false);
  };

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-4 bottom-4 z-50 max-w-md rounded-xl border border-line bg-surface p-5 shadow-window sm:left-auto"
    >
      <p className="text-small">{cookieNotice.body}</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => choose('accepted')}>{cookieNotice.accept}</Button>
        <Button variant="secondary" onClick={() => choose('declined')}>
          {cookieNotice.decline}
        </Button>
      </div>
    </section>
  );
}

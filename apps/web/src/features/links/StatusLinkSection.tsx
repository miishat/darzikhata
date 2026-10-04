import { activeLink, linkState, shopContact, type Order } from '@darzikhata/domain';
import { useState } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { shareOrCopy } from '../../lib/share';
import { Button, buttonClasses } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { Shell, useSave } from '../orders/itemDialogs';
import { linkShareText, newLinkToken, statusPath, statusUrl } from './statusLink';

function RevokeDialog({ order, token, onClose }: { order: Order; token: string; onClose(): void }) {
  const { t } = useI18n();
  const { problem, working, save } = useSave(onClose);
  return (
    <Shell
      title={t('link.revokeTitle')}
      onClose={onClose}
      onSave={() => void save({ type: 'link.revoked', orderId: order.id, token })}
      working={working}
      problem={problem}
      saveLabel={t('link.revoke')}
    >
      <p>{t('link.revokeBody')}</p>
    </Shell>
  );
}

/** Create, share and turn off the customer's status link for one order. */
export function StatusLinkSection({ order, inDialog = false }: { order: Order; /** The dialog's own title is the heading, so the heading and the card around it are left off. */ inDialog?: boolean }) {
  const { t, language } = useI18n();
  const { config } = useSnapshot();
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const create = useSave(() => undefined);
  const expiryDays = config?.settings.linkExpiryDays ?? 0;
  const link = activeLink(order);
  const expired = link !== null && linkState(order, link.token, new Date().toISOString(), expiryDays) === 'expired';

  const share = async (token: string) => {
    if (!config) return;
    const shop = shopContact(config, language).name;
    const url = statusUrl(window.location.origin, token);
    const result = await shareOrCopy(shop, linkShareText(shop, order.number, url, language));
    setCopied(result === 'copied');
  };

  return (
    <section
      aria-label={inDialog ? t('link.section') : undefined}
      aria-labelledby={inDialog ? undefined : `link-${order.id}`}
      className={inDialog ? 'flex flex-col gap-3' : 'flex flex-col gap-3 rounded-lg border border-line bg-panel p-4'}
    >
      {!inDialog && (
        <h3 id={`link-${order.id}`} className="text-lg font-semibold">
          {t('link.section')}
        </h3>
      )}
      <p>{t('link.about')}</p>
      <p className="text-sm text-muted">{t('link.demoNote')}</p>
      <p className="text-sm text-muted">{t('link.expiresAfter', { n: expiryDays })}</p>

      {expired ? (
        <p className="font-semibold">{t('link.expired', { n: expiryDays })}</p>
      ) : link ? (
        <>
          <TextField label={t('link.url')} readOnly value={statusUrl(window.location.origin, link.token)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void share(link.token)}>
              {t('print.share')}
            </Button>
            <a href={statusPath(link.token)} data-tour="open-link" className={buttonClasses('secondary')}>
              {t('link.open')}
            </a>
            <Button variant="secondary" data-tour="revoke-link" onClick={() => setRevoking(true)}>
              {t('link.revoke')}
            </Button>
          </div>
          {copied && <p role="status">{t('print.copied')}</p>}
        </>
      ) : (
        <div>
          <Button
            data-tour="create-link"
            disabled={create.working}
            onClick={() => void create.save({ type: 'link.created', orderId: order.id, token: newLinkToken() })}
          >
            {t('link.create')}
          </Button>
        </div>
      )}
      {create.problem && (
        <p role="alert" className="text-danger">
          {create.problem}
        </p>
      )}
      {revoking && link && <RevokeDialog order={order} token={link.token} onClose={() => setRevoking(false)} />}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeCheck,
  Banknote, Bell, Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, Copy,
  ExternalLink, Eye, FileText, Globe2, House, KeyRound, LoaderCircle, LockKeyhole,
  LogOut, Menu, MoreHorizontal, Plus, RefreshCw, Send, Settings2, ShieldCheck,
  Sparkles, UserRound, Users, Wallet, X, Zap,
} from 'lucide-react';
import { isAddress, getAddress, formatUnits, parseUnits, type Hex } from 'viem';
import type { KiteAccount } from './lib/account';
import { createMonadPublicClient, AUSD_TESTNET, MONAD_TESTNET_ID, TESTNET_EXPLORER, erc20Abi } from './lib/config';
import { readWalletSnapshot, sendAUSD, requestTestAUSD, getAUSDTransfers } from './lib/chain';
import { decodePaymentRequest, createShareUrl, signPaymentRequest, verifyPaymentRequest, formatAUSD } from './lib/invoices';
import { localEstimate, DISPLAY_CURRENCIES } from './lib/fx';
import { runAIAssist, localDraftPreview, type AIProvider } from './lib/ai';
import { loadContacts, saveContacts } from './lib/storage';
import type { ContactRecord } from './lib/crypto';
import { formatDate, friendlyError, initials, shortAddress } from './lib/format';

const previewContacts = [
  { id: 'p1', name: 'Mika Chen', address: '0x03d75ce8c2831b76f68b816e6f83a488aa620583', country: 'Japan', currency: 'JPY', createdAt: 0 },
  { id: 'p2', name: 'Studio North', address: '0x1cb83bc460fa2b5539f292170f1d5c44ec58bb77', country: 'Singapore', currency: 'SGD', createdAt: 0 },
  { id: 'p3', name: 'Leo Martinez', address: '0x5f7a12cb1e9913aa6bfb6e15b998de4f8d912e87', country: 'Spain', currency: 'EUR', createdAt: 0 },
] as ContactRecord[];

const previewTransfers = [
  { id: 'd1', from: '0x8f6e8f11a082a3e6c1475833f456b6132775f081', to: '0x03D75Ce8C2831B76F68b816E6F83A488Aa620583', value: 425_000_000n, blockNumber: 67_241_201n, hash: '0x' as Hex, timestamp: Date.now() / 1000 - 3600 * 2, source: 'preview' as const },
  { id: 'd2', from: '0x1cB83bC460fA2B5539f292170F1d5c44Ec58bb77', to: '0x8f6e8f11a082a3e6c1475833f456b6132775f081', value: 1_200_000_000n, blockNumber: 67_239_076n, hash: '0x' as Hex, timestamp: Date.now() / 1000 - 3600 * 6, source: 'preview' as const },
  { id: 'd3', from: '0x8f6e8f11a082a3e6c1475833f456b6132775f081', to: '0x5f7A12cB1e9913aa6BfB6E15b998dE4F8d912e87', value: 68_000_000n, blockNumber: 67_230_487n, hash: '0x' as Hex, timestamp: Date.now() / 1000 - 3600 * 23, source: 'preview' as const },
  { id: 'd4', from: '0x3d21b44aa0248dfbce6127912891871aa36a1dfc', to: '0x8f6e8f11a082a3e6c1475833f456b6132775f081', value: 780_000_000n, blockNumber: 67_224_601n, hash: '0x' as Hex, timestamp: Date.now() / 1000 - 86400 * 2, source: 'preview' as const },
];

type NavKey = 'overview' | 'payments' | 'invoices' | 'contacts' | 'activity' | 'settings';
type ToastMessage = { tone: 'success' | 'error' | 'info'; text: string };
type Transfer = { id: string; from: string; to: string; value: bigint; blockNumber: bigint; timestamp?: number; hash: Hex; source: 'envio' | 'rpc' | 'preview' };
type PendingTransfer = { hash: Hex; recipient: string; amount: string };
type Health = { rpcProvider?: 'alchemy' | 'public'; integrations?: { envio?: boolean; ai?: Record<string, boolean> } };
const PENDING_TRANSFER_KEY = 'kite:pending-ausd-transfer:v1';
const PENDING_FAUCET_KEY = 'kite:pending-ausd-faucet:v1';
const pendingInvoiceKey = (invoiceId: string) => `kite:pending-invoice-payment:v1:${invoiceId.toLowerCase()}`;

function restorePendingInvoicePayment(invoiceId: string): Hex | null {
  try {
    const hash = sessionStorage.getItem(pendingInvoiceKey(invoiceId));
    return hash && /^0x[0-9a-fA-F]{64}$/.test(hash) ? hash as Hex : null;
  } catch { return null; }
}

function savePendingInvoicePayment(invoiceId: string, hash: Hex | null) {
  try {
    if (hash) sessionStorage.setItem(pendingInvoiceKey(invoiceId), hash);
    else sessionStorage.removeItem(pendingInvoiceKey(invoiceId));
  } catch { /* pending status survives when session storage is available */ }
}

function restorePendingFaucetHash(): Hex | null {
  try {
    const hash = sessionStorage.getItem(PENDING_FAUCET_KEY);
    return hash && /^0x[0-9a-fA-F]{64}$/.test(hash) ? hash as Hex : null;
  } catch { return null; }
}

function savePendingFaucetHash(hash: Hex | null) {
  try {
    if (hash) sessionStorage.setItem(PENDING_FAUCET_KEY, hash);
    else sessionStorage.removeItem(PENDING_FAUCET_KEY);
  } catch { /* faucet status is best-effort when session storage is unavailable */ }
}

function restorePendingTransfer(): PendingTransfer | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TRANSFER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingTransfer>;
    if (typeof value.hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value.hash)
      || typeof value.recipient !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(value.recipient)
      || typeof value.amount !== 'string' || !/^(?:0|[1-9]\d{0,6})(?:\.\d{1,6})?$/.test(value.amount)) return null;
    return { hash: value.hash as Hex, recipient: value.recipient, amount: value.amount };
  } catch { return null; }
}

const DEMO_ADDRESS = '0x8f6e8f11a082a3e6c1475833f456b6132775f081';
const PREVIEW_COUNTERPARTIES: Record<string, string> = {
  '0x03d75ce8c2831b76f68b816e6f83a488aa620583': 'Mika Chen',
  '0x1cb83bc460fa2b5539f292170f1d5c44ec58bb77': 'Studio North',
  '0x5f7a12cb1e9913aa6bfb6e15b998de4f8d912e87': 'Leo Martinez',
  '0x3d21b44aa0248dfbce6127912891871aa36a1dfc': 'Northstar Media',
};

function App() {
  const [account, setAccount] = useState<KiteAccount | null>(null);
  const [active, setActive] = useState<NavKey>('overview');
  const [connectOpen, setConnectOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [chainBusy, setChainBusy] = useState(false);
  const [faucetBusy, setFaucetBusy] = useState(false);
  const [faucetPendingHash, setFaucetPendingHash] = useState<Hex | null>(restorePendingFaucetHash);
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof readWalletSnapshot>> | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>(previewContacts);
  const [transfers, setTransfers] = useState<Transfer[]>(previewTransfers);
  const [feedSource, setFeedSource] = useState<'envio' | 'rpc' | 'preview'>('preview');
  const [health, setHealth] = useState<Health>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [pendingOutbound, setPendingOutbound] = useState<PendingTransfer | null>(restorePendingTransfer);
  const [requestOpen, setRequestOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [initialRecipient, setInitialRecipient] = useState('');
  const [incomingRequest, setIncomingRequest] = useState<Awaited<ReturnType<typeof decodePaymentRequest>> | null>(null);
  const [requestVerified, setRequestVerified] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [incomingPayBusy, setIncomingPayBusy] = useState(false);
  const [incomingPendingHash, setIncomingPendingHash] = useState<Hex | null>(null);
  const [qrData, setQrData] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const refreshToken = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const accountRef = useRef<KiteAccount | null>(null);
  accountRef.current = account;

  const isLive = Boolean(account);
  const activeAddress = account?.address;
  const currentContacts = isLive ? contacts : previewContacts;
  const displayBalance = !isLive ? '4,286.50' : snapshot ? formatAUSD(snapshot.balance) : '—';

  const showToast = useCallback((message: ToastMessage) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => { setToast(null); toastTimer.current = null; }, 4200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);
  const updatePendingOutbound = useCallback((pending: PendingTransfer | null) => {
    setPendingOutbound(pending);
    try {
      if (pending) sessionStorage.setItem(PENDING_TRANSFER_KEY, JSON.stringify(pending));
      else sessionStorage.removeItem(PENDING_TRANSFER_KEY);
    } catch { /* pending transaction visibility is best-effort when storage is unavailable */ }
  }, []);

  useEffect(() => {
    fetch('/api/health').then((res) => res.json()).then(setHealth).catch(() => undefined);
  }, []);

  useEffect(() => {
    const encoded = new URLSearchParams(window.location.search).get('r');
    if (!encoded) return;
    try {
      const request = decodePaymentRequest(encoded);
      setIncomingRequest(request);
      const pendingHash = restorePendingInvoicePayment(request.invoiceId);
      if (pendingHash) setIncomingPendingHash(pendingHash);
      setActive('payments');
      void verifyPaymentRequest(request).then((verified) => {
        setRequestVerified(verified);
        if (!verified) setRequestError('Invoice signature did not match. Do not send funds to an unverified request.');
      });
    } catch (error) {
      setRequestError(friendlyError(error));
      setActive('payments');
    }
  }, []);

  const refreshLiveData = useCallback(async () => {
    if (!account) return;
    const refreshId = ++refreshToken.current;
    setChainBusy(true);
    try {
      const [contactsResult, chainResult] = await Promise.allSettled([
        loadContacts(account.prfRoot),
        Promise.all([
          readWalletSnapshot(account.address),
          getAUSDTransfers(account.address).catch(() => ({ source: 'rpc' as const, transfers: [] as Transfer[] })),
        ]),
      ]);
      if (refreshId !== refreshToken.current) return;
      if (contactsResult.status === 'fulfilled') setContacts(contactsResult.value);
      else {
        setContacts([]);
        showToast({ tone: 'error', text: friendlyError(contactsResult.reason) });
      }
      if (chainResult.status === 'fulfilled') {
        const [freshSnapshot, feed] = chainResult.value;
        setSnapshot(freshSnapshot);
        setTransfers(feed.transfers as Transfer[]);
        setFeedSource(feed.source);
      } else {
        showToast({ tone: 'error', text: friendlyError(chainResult.reason) });
      }
    } finally {
      if (refreshId === refreshToken.current) setChainBusy(false);
    }
  }, [account, showToast]);

  useEffect(() => {
    if (!account) {
      refreshToken.current += 1;
      setSnapshot(null);
      setChainBusy(false);
      setContacts(previewContacts);
      setTransfers(previewTransfers);
      setFeedSource('preview');
      return;
    }
    setSnapshot(null);
    setContacts([]);
    setTransfers([]);
    setFeedSource('rpc');
    void refreshLiveData();
    const timer = window.setInterval(() => void refreshLiveData(), 30_000);
    return () => window.clearInterval(timer);
  }, [account, refreshLiveData]);

  useEffect(() => {
    if (!account) return;
    const activeAccount: KiteAccount = account;
    let timeout = window.setTimeout(lockSession, 15 * 60_000);
    const reset = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(lockSession, 15 * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    function lockSession() {
      if (accountRef.current !== activeAccount) return;
      refreshToken.current += 1;
      activeAccount.lock();
      accountRef.current = null;
      setAccount(null);
      setSendOpen(false);
      setRequestOpen(false);
      setContactOpen(false);
      setInitialRecipient('');
      showToast({ tone: 'info', text: 'Your 15-minute passkey signing session was locked. Your encrypted contacts remain on this device.' });
    }
    return () => {
      window.clearTimeout(timeout);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [account, showToast]);

  const finishConnect = async (mode: 'create' | 'signin') => {
    setAuthBusy(true);
    try {
      const { createPasskeyAccount, signInWithPasskey } = await import('./lib/account');
      const next = mode === 'create' ? await createPasskeyAccount(createName || 'Kite user') : await signInWithPasskey();
      setAccount(next);
      setConnectOpen(false);
      setCreateName('');
      showToast({ tone: 'success', text: `Passkey account ready · ${shortAddress(next.address)}` });
    } catch (error) {
      showToast({ tone: 'error', text: friendlyError(error) });
    } finally {
      setAuthBusy(false);
    }
  };

  const lockAccount = () => {
    if (!account || accountRef.current !== account) return;
    refreshToken.current += 1;
    account.lock();
    accountRef.current = null;
    setAccount(null);
    setSendOpen(false);
    setRequestOpen(false);
    setContactOpen(false);
    setInitialRecipient('');
    showToast({ tone: 'info', text: 'Wallet locked. No private key or PRF output was saved.' });
  };

  const openSend = () => {
    setInitialRecipient('');
    setSendOpen(true);
    setRequestOpen(false);
    setCreatedUrl('');
    setQrData('');
  };

  const openRequest = () => {
    setRequestOpen(true);
    setSendOpen(false);
    setCreatedUrl('');
    setQrData('');
  };

  const navItems: Array<{ key: NavKey; label: string; icon: typeof House }> = [
    { key: 'overview', label: 'Overview', icon: House },
    { key: 'payments', label: 'Payments', icon: ArrowLeftRight },
    { key: 'invoices', label: 'Invoices', icon: FileText },
    { key: 'contacts', label: 'Private contacts', icon: Users },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'settings', label: 'Security & settings', icon: Settings2 },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawerOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><KiteMark /></div>
          <div><div className="brand-name">kite</div><div className="brand-caption">money in motion</div></div>
          <button className="icon-button mobile-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} onClick={() => { setActive(key); setDrawerOpen(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {key === 'invoices' && !isLive && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="network-card">
          <div className="network-card-top"><span className="pulse-dot" /> Monad testnet</div>
          <div className="network-card-bottom">AUSD · 6 decimals <span className="network-chain">10143</span></div>
          <a href="https://faucet.monad.xyz/" target="_blank" rel="noreferrer">Get test MON <ExternalLink size={12} /></a>
        </div>
        <div className="profile-row">
          <div className="avatar avatar-dark">{isLive ? 'K' : 'D'}</div>
          <div className="profile-meta"><strong>{isLive ? 'Passkey wallet' : 'Demo workspace'}</strong><span>{isLive && activeAddress ? shortAddress(activeAddress) : 'Preview only'}</span></div>
          <button className="icon-button more-button" onClick={isLive ? lockAccount : () => setConnectOpen(true)} aria-label={isLive ? 'Lock wallet' : 'Connect wallet'}>{isLive ? <LockKeyhole size={16} /> : <MoreHorizontal size={18} />}</button>
        </div>
      </aside>

      {drawerOpen && <button className="drawer-scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)} />}

      <main className="main-column">
        <header className="topbar">
          <button className="icon-button menu-toggle" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{active === 'overview' ? 'Overview' : navItems.find((item) => item.key === active)?.label}</strong></div>
          <div className="topbar-right">
            <span className={`network-pill ${isLive ? 'network-pill-live' : ''}`}><span className="pulse-dot" /> {isLive ? 'Monad testnet' : 'Interactive preview'}</span>
            {isLive ? (
              <button className="wallet-chip" onClick={lockAccount}><span className="wallet-chip-dot"><KeyRound size={13} /></span><span>{shortAddress(activeAddress, 5, 4)}</span><ChevronDown size={14} /></button>
            ) : (
              <button className="button button-dark button-small" onClick={() => setConnectOpen(true)}><KeyRound size={14} /> Connect passkey</button>
            )}
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => showToast({ tone: 'info', text: 'You are all caught up.' })}><Bell size={17} /><i /></button>
          </div>
        </header>

        <div className="page-content">
          {active === 'overview' && <OverviewPage
            isLive={isLive} account={account} balance={displayBalance} snapshot={snapshot} contacts={currentContacts}
            transfers={isLive ? transfers : previewTransfers} feedSource={isLive ? feedSource : 'preview'} chainBusy={chainBusy}
            openSend={openSend} openRequest={openRequest} setActive={setActive} onConnect={() => setConnectOpen(true)}
            onRefresh={() => void refreshLiveData()} faucetBusy={faucetBusy} faucetPendingHash={faucetPendingHash}
            requestTestAUSD={() => account || faucetPendingHash ? void handleFaucet() : setConnectOpen(true)} health={health}
          />}
          {active === 'payments' && <PaymentsPage
            isLive={isLive} account={account} snapshot={snapshot} contacts={currentContacts} openSend={openSend}
            incomingRequest={incomingRequest} requestVerified={requestVerified} requestError={requestError}
            incomingPayBusy={incomingPayBusy} incomingPendingHash={incomingPendingHash} transfers={isLive ? transfers : previewTransfers} onPayIncoming={handleIncomingPayment}
            faucetBusy={faucetBusy} faucetPendingHash={faucetPendingHash} onRequestTestAUSD={() => account || faucetPendingHash ? void handleFaucet() : setConnectOpen(true)} onConnect={() => setConnectOpen(true)}
            showToast={showToast} setActive={setActive}
          />}
          {active === 'invoices' && <InvoicesPage
            isLive={isLive} account={account} health={health} onConnect={() => setConnectOpen(true)}
            createdUrl={createdUrl} qrData={qrData} setCreated={async (url) => {
              setCreatedUrl(url);
              try { setQrData(await createQrData(url)); } catch { setQrData(''); }
            }}
            onCreated={(request, url) => { setCreatedUrl(url); void createQrData(url).then(setQrData).catch(() => setQrData('')); showToast({ tone: 'success', text: `Signed invoice link created · ${formatAUSD(request.amount)} AUSD` }); }}
            onCopy={async () => { try { await copyText(createdUrl); showToast({ tone: 'success', text: 'Payment link copied.' }); } catch { showToast({ tone: 'error', text: 'Clipboard is unavailable; select and copy the payment link.' }); } }}
            showToast={showToast}
          />}
          {active === 'contacts' && <ContactsPage isLive={isLive} contacts={currentContacts} account={account} onConnect={() => setConnectOpen(true)} onAdd={() => setContactOpen(true)} onSelect={(contact) => { setActive('payments'); setSendOpen(true); setInitialRecipient(contact.address); }} />}
          {active === 'activity' && <ActivityPage isLive={isLive} transfers={isLive ? transfers : previewTransfers} feedSource={isLive ? feedSource : 'preview'} address={activeAddress} busy={chainBusy} refresh={() => void refreshLiveData()} onConnect={() => setConnectOpen(true)} />}
          {active === 'settings' && <SettingsPage isLive={isLive} address={activeAddress} snapshot={snapshot} health={health} onConnect={() => setConnectOpen(true)} onLock={lockAccount} onForget={async () => { lockAccount(); const { forgetCredential } = await import('./lib/account'); forgetCredential(); showToast({ tone: 'info', text: 'This browser no longer remembers the passkey credential hint. Your authenticator credential was not deleted.' }); }} />}
        </div>
      </main>

      {sendOpen && <SendModal account={account} snapshot={snapshot} contacts={currentContacts} initialRecipient={initialRecipient} pendingTransfer={pendingOutbound} onPendingTransfer={updatePendingOutbound} onClose={() => setSendOpen(false)} onConnect={() => setConnectOpen(true)} onSent={async (hash) => { updatePendingOutbound(null); setSendOpen(false); showToast({ tone: 'success', text: `Payment confirmed on Monad · ${shortAddress(hash, 8, 6)}` }); await refreshLiveData(); }} />}
      {requestOpen && <RequestModal account={account} health={health} onClose={() => setRequestOpen(false)} onConnect={() => setConnectOpen(true)} onCreated={(request, url) => { setRequestOpen(false); setCreatedUrl(url); setActive('invoices'); void createQrData(url).then(setQrData).catch(() => setQrData('')); showToast({ tone: 'success', text: `Signed invoice link created · ${formatAUSD(request.amount)} AUSD` }); }} showToast={showToast} />}
      {contactOpen && <ContactModal account={account} contacts={contacts} onClose={() => setContactOpen(false)} onSave={(next) => { setContacts(next); setContactOpen(false); showToast({ tone: 'success', text: 'Contact encrypted on this device.' }); }} onConnect={() => setConnectOpen(true)} />}
      {connectOpen && <ConnectModal name={createName} setName={setCreateName} busy={authBusy} onClose={() => setConnectOpen(false)} onCreate={() => void finishConnect('create')} onSignin={() => void finishConnect('signin')} />}
      {toast && <div className={`toast toast-${toast.tone}`} role="status"><span className="toast-icon">{toast.tone === 'success' ? <CheckCircle2 size={17} /> : toast.tone === 'error' ? <CircleHelp size={17} /> : <Bell size={17} />}</span>{toast.text}<button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  );

  async function resolveFaucetRequest(hash: Hex) {
    setFaucetBusy(true);
    try {
      const client = createMonadPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
      setFaucetPendingHash(null);
      savePendingFaucetHash(null);
      if (receipt.status !== 'success') {
        showToast({ tone: 'error', text: 'The faucet request reverted. No AUSD was received; check the MonadScan receipt before retrying.' });
        return;
      }
      showToast({ tone: 'success', text: 'Test AUSD received. Testnet assets have no monetary value.' });
      await refreshLiveData();
    } catch {
      showToast({ tone: 'info', text: `Faucet transaction is still pending · ${shortAddress(hash, 8, 6)}. Do not request again; check this same transaction.` });
    } finally { setFaucetBusy(false); }
  }

  async function handleFaucet() {
    if (faucetBusy) return;
    if (faucetPendingHash) {
      await resolveFaucetRequest(faucetPendingHash);
      return;
    }
    if (!account) return;
    setFaucetBusy(true);
    try {
      showToast({ tone: 'info', text: 'Request submitted to Agora’s testnet faucet. Waiting for Monad confirmation…' });
      const hash = await requestTestAUSD(account);
      setFaucetPendingHash(hash);
      savePendingFaucetHash(hash);
      await resolveFaucetRequest(hash);
    } catch (error) {
      showToast({ tone: 'error', text: friendlyError(error) });
    } finally { setFaucetBusy(false); }
  }

  async function resolveIncomingPayment(hash: Hex, invoiceId: Hex) {
    setIncomingPayBusy(true);
    try {
      const client = createMonadPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
      if (receipt.status !== 'success') {
        setIncomingPendingHash(null);
        savePendingInvoicePayment(invoiceId, null);
        showToast({ tone: 'error', text: 'The payment transaction reverted; no AUSD was transferred. Review the details before retrying.' });
        return;
      }
      setIncomingPendingHash(null);
      savePendingInvoicePayment(invoiceId, null);
      setIncomingRequest(null);
      setRequestVerified(false);
      setRequestError('');
      window.history.replaceState({}, '', '/');
      showToast({ tone: 'success', text: `AUSD paid on Monad · ${shortAddress(hash, 8, 6)}` });
      await refreshLiveData();
    } catch {
      showToast({ tone: 'info', text: `Payment is still pending · ${shortAddress(hash, 8, 6)}. Do not submit it again; check this same transaction.` });
    } finally {
      setIncomingPayBusy(false);
    }
  }

  async function handleIncomingPayment() {
    if (incomingPendingHash) {
      if (!incomingRequest) return;
      await resolveIncomingPayment(incomingPendingHash, incomingRequest.invoiceId);
      return;
    }
    if (!account || !incomingRequest || !requestVerified) return;
    setIncomingPayBusy(true);
    try {
      const client = createMonadPublicClient();
      const chainId = await client.getChainId();
      if (chainId !== MONAD_TESTNET_ID) throw new Error('Wrong network; payment was not sent.');
      if (incomingRequest.payee.toLowerCase() === account.address.toLowerCase()) throw new Error('This request is payable by a different wallet.');
      const amount = BigInt(incomingRequest.amount);
      const balance = await client.readContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
      if (amount > balance) throw new Error(`Insufficient AUSD balance. Current balance: ${formatAUSD(balance)} AUSD.`);
      const { createKiteWalletClient } = await import('./lib/account');
      const wallet = createKiteWalletClient(account);
      const hash = await wallet.writeContract({ address: AUSD_TESTNET, abi: erc20Abi, functionName: 'transfer', args: [incomingRequest.payee, amount] });
      setIncomingPendingHash(hash);
      savePendingInvoicePayment(incomingRequest.invoiceId, hash);
      showToast({ tone: 'info', text: `Payment submitted · ${shortAddress(hash, 8, 6)}. Confirmation is pending; do not submit it again.` });
      await resolveIncomingPayment(hash, incomingRequest.invoiceId);
    } catch (error) {
      showToast({ tone: 'error', text: friendlyError(error) });
    } finally {
      setIncomingPayBusy(false);
    }
  }
}

function KiteMark() {
  return <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 4.7 27.2 3 15.8 27.4l-3.2-10.2L4 4.7Z" fill="currentColor"/><path d="m12.7 17.2 7.7-7.6" stroke="#e7f2db" strokeWidth="1.9" strokeLinecap="round"/><path d="m14.3 21.9 5.1 1.5-3.7 4.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function DemoFlag({ children = 'PREVIEW DATA' }: { children?: React.ReactNode }) {
  return <span className="demo-flag"><Eye size={12} /> {children}</span>;
}

async function createQrData(url: string) {
  const { default: QRCode } = await import('qrcode');
  return QRCode.toDataURL(url, { margin: 1, width: 180, color: { dark: '#183b33', light: '#ffffff' } });
}

function OverviewPage(props: {
  isLive: boolean; account: KiteAccount | null; balance: string; snapshot: Awaited<ReturnType<typeof readWalletSnapshot>> | null;
  contacts: ContactRecord[]; transfers: Transfer[]; feedSource: 'envio'|'rpc'|'preview'; chainBusy: boolean;
  openSend: () => void; openRequest: () => void; setActive: (key: NavKey) => void; onConnect: () => void; onRefresh: () => void; requestTestAUSD: () => void; faucetBusy: boolean; faucetPendingHash: Hex | null; health: Health;
}) {
  const { isLive, account, balance, snapshot, contacts, transfers, feedSource, chainBusy } = props;
  const sent = transfers.filter((tx) => tx.from.toLowerCase() === account?.address.toLowerCase()).reduce((sum, tx) => sum + tx.value, 0n);
  const received = transfers.filter((tx) => tx.to.toLowerCase() === account?.address.toLowerCase()).reduce((sum, tx) => sum + tx.value, 0n);
  const transferCount = isLive ? transfers.length : 28;
  return <>
    <PageHeader eyebrow="OVERVIEW · MONAD TESTNET" title="Your work, paid faster." description="A calmer way to request, send and settle AUSD across borders." action={<div className="header-actions"><button className="button button-light" onClick={props.onRefresh} disabled={!isLive || chainBusy}><RefreshCw size={15} className={chainBusy ? 'spin' : ''} /> Refresh</button><button className="button button-dark" onClick={props.openRequest}><Plus size={16} /> New invoice</button></div>} />
    {!isLive && <div className="preview-banner"><div className="preview-banner-icon"><Eye size={17} /></div><div><strong>Interactive preview</strong><span>Numbers and activity below are sample data — nothing is on-chain until you connect a passkey.</span></div><button onClick={props.onConnect}>Use my passkey <ArrowRight size={14} /></button></div>}
    <section className="overview-grid">
      <div className="balance-card">
        <div className="balance-top"><div><div className="balance-eyebrow">TOTAL BALANCE <span className="live-dot" /></div><div className="balance-number"><span className="currency-mark">$</span>{balance}</div><div className="balance-sub">AUSD <span>·</span> Agora Dollar <span className="balance-chain">Monad {isLive ? 'testnet' : 'preview'}</span></div></div><div className="balance-graphic"><span /><span /><span /></div></div>
        <div className="balance-bottom"><div className="balance-change"><span className="change-arrow"><ArrowUpRight size={14} /></span><strong>{isLive ? snapshot ? `${formatAUSD(received)} received` : '—' : '+ 8.4%'}</strong><span>{isLive ? snapshot ? 'indexed transfers' : 'awaiting chain data' : 'preview this month'}</span></div><div className="balance-actions"><button onClick={props.openSend}><Send size={14} /> Send</button><button onClick={props.openRequest}><ArrowDownLeft size={15} /> Request</button><button disabled={props.faucetBusy} onClick={props.requestTestAUSD}>{props.faucetBusy ? <LoaderCircle size={14} className="spin" /> : props.faucetPendingHash ? <RefreshCw size={14} /> : <Banknote size={14} />}{props.faucetPendingHash ? 'Check faucet' : 'Test AUSD'}</button></div></div>
      </div>
      <div className="settlement-card">
        <div className="settlement-card-header"><span className="settlement-icon"><Zap size={17} /></span><span className="settlement-status"><span className="pulse-dot" /> SETTLEMENT LAYER</span><button className="icon-button" onClick={() => props.setActive('settings')} aria-label="Network details"><MoreHorizontal size={17} /></button></div>
        <h2>Built for the<br/><em>borderless</em> day.</h2>
        <div className="settlement-foot"><div><span>Network</span><strong>Monad</strong></div><div><span>Asset</span><strong>AUSD · 6 decimals</strong></div><a href="https://monad.xyz/developers" target="_blank" rel="noreferrer" aria-label="Monad developer docs"><ArrowUpRight size={16} /></a></div>
      </div>
    </section>

    <section className="metrics-row">
      <MetricCard icon={<ArrowUpRight size={16} />} label={isLive ? 'Sent in current feed' : 'Sent this month'} value={isLive ? `${formatAUSD(sent)} AUSD` : '$2,860.00'} detail={isLive ? 'from recent indexed transfers' : 'across 9 preview payments'} tone="mint" />
      <MetricCard icon={<ArrowDownLeft size={16} />} label={isLive ? 'Received in current feed' : 'Received'} value={isLive ? `${formatAUSD(received)} AUSD` : '$4,124.00'} detail={isLive ? 'from recent indexed transfers' : 'across 19 preview payments'} tone="lilac" />
      <MetricCard icon={<FileText size={16} />} label="Open invoices" value={isLive ? '—' : '3'} detail={isLive ? 'shared invoice links' : '$1,480.00 pending'} tone="peach" />
      <MetricCard icon={<Activity size={16} />} label="Recent activity" value={String(transferCount).padStart(2, '0')} detail={isLive ? (feedSource === 'envio' ? 'indexed by Envio' : 'direct Monad logs') : 'sample transactions'} tone="sky" />
    </section>

    <div className="content-grid">
      <section className="surface-card activity-card">
        <div className="section-heading"><div><div className="eyebrow">THE LEDGER</div><h2>Recent activity</h2></div><button className="text-link" onClick={() => props.setActive('activity')}>View all <ArrowRight size={14} /></button></div>
        <div className="activity-table">
          <div className="activity-table-head"><span>PAYMENT</span><span>AMOUNT</span><span>WHEN</span><span>STATUS</span></div>
          {transfers.slice(0, 4).map((tx) => <TransferRow key={tx.id} transfer={tx} viewer={account?.address} />)}
          {transfers.length === 0 && <EmptyInline text={isLive ? 'No AUSD transfers found yet. Make a small test payment to see it here.' : 'No activity to show.'} />}
        </div>
        <div className="activity-source"><span className={`source-dot source-${feedSource}`} /> {feedSource === 'envio' ? 'Indexed by Envio HyperIndex' : feedSource === 'rpc' ? 'Direct Monad RPC · recent block window' : 'Demo data · not on-chain'}<span className="source-right">{chainBusy ? 'Syncing…' : 'Updated just now'}</span></div>
      </section>
      <section className="surface-card payees-card">
        <div className="section-heading"><div><div className="eyebrow">PEOPLE YOU WORK WITH</div><h2>Quick pay</h2></div><button className="icon-button" aria-label="Add a contact" onClick={() => props.setActive('contacts')}><Plus size={17} /></button></div>
        <div className="payee-list">{contacts.slice(0, 4).map((contact, index) => <button key={contact.id} className="payee-row" onClick={() => { props.setActive('payments'); props.openSend(); }}><span className={`avatar payee-avatar avatar-${index % 4}`}>{initials(contact.name)}</span><span className="payee-meta"><strong>{contact.name}</strong><small>{contact.country} <span>·</span> {contact.currency}</small></span><span className="payee-arrow"><ArrowUpRight size={15} /></span></button>)}</div>
        <button className="all-contacts" onClick={() => props.setActive('contacts')}>Open private address book <ArrowRight size={14} /></button>
      </section>
    </div>

    <section className="smart-banner"><div className="smart-icon"><Sparkles size={19} /></div><div className="smart-copy"><div className="smart-kicker">KITE ASSIST <span>AI</span></div><h3>Say what you need. Keep the final say.</h3><p>Draft clear, localized invoices with Kimi or Qwen. Only copy you enter is sent for writing; review it before sharing. Your connected wallet and payment amount are not attached automatically.</p></div><button className="button button-light" onClick={props.openRequest}>Draft an invoice <ArrowRight size={15} /></button><div className="smart-orbit orbit-one" /><div className="smart-orbit orbit-two" /></section>
    <div className="bottom-note"><ShieldCheck size={14} /> Your signing key lives in the passkey session. Contacts are encrypted on this device.</div>
  </>;
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function TransferRow({ transfer, viewer }: { transfer: Transfer; viewer?: string }) {
  const effectiveViewer = viewer ?? (transfer.source === 'preview' ? DEMO_ADDRESS : undefined);
  const outgoing = effectiveViewer ? transfer.from.toLowerCase() === effectiveViewer.toLowerCase() : true;
  const counterparty = outgoing ? transfer.to : transfer.from;
  const title = transfer.source === 'preview' ? (PREVIEW_COUNTERPARTIES[counterparty.toLowerCase()] ?? 'Freelance client') : shortAddress(counterparty, 6, 4);
  return <div className="activity-row"><span className={`activity-avatar ${outgoing ? 'activity-out' : 'activity-in'}`}>{outgoing ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}</span><span className="activity-name"><strong>{outgoing ? 'Sent to' : 'Received from'} {title}</strong><small>{shortAddress(counterparty)} <span>·</span> {transfer.source === 'preview' ? <span>Sample only</span> : <a href={`${TESTNET_EXPLORER}/tx/${transfer.hash}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>View tx <ExternalLink size={10} /></a>}</small></span><strong className={`activity-amount ${outgoing ? 'negative' : 'positive'}`}>{outgoing ? '−' : '+'}{formatAUSD(transfer.value)} <small>AUSD</small></strong><span className="activity-when">{transfer.timestamp ? formatDate(transfer.timestamp) : `Block ${transfer.blockNumber.toLocaleString()}`}</span><span className="status-pill status-complete"><Check size={11} /> Settled</span></div>;
}

function EmptyInline({ text }: { text: string }) { return <div className="empty-inline"><Activity size={18} /><span>{text}</span></div>; }

function PaymentsPage(props: {
  isLive: boolean; account: KiteAccount | null; snapshot: Awaited<ReturnType<typeof readWalletSnapshot>> | null; contacts: ContactRecord[];
  openSend: () => void; incomingRequest: ReturnType<typeof decodePaymentRequest> | null; requestVerified: boolean; requestError: string;
  incomingPayBusy: boolean; incomingPendingHash: Hex | null; faucetBusy: boolean; faucetPendingHash: Hex | null; transfers: Transfer[]; onPayIncoming: () => void; onRequestTestAUSD: () => void; onConnect: () => void; showToast: (message: ToastMessage) => void; setActive: (key: NavKey) => void;
}) {
  const request = props.incomingRequest;
  const [filter, setFilter] = useState<'all'|'sent'|'received'>('all');
  const visibleTransfers = props.transfers.filter((transfer) => {
    if (filter === 'all') return true;
    const viewer = props.account?.address ?? DEMO_ADDRESS;
    const sent = transfer.from.toLowerCase() === viewer.toLowerCase();
    return filter === 'sent' ? sent : !sent;
  });
  return <>
    <PageHeader eyebrow="PAYMENTS · AUSD" title={request ? 'Review payment request' : 'Keep money moving.'} description={request ? 'Check the signed invoice details before you pay.' : 'AUSD transfers that settle directly between passkey accounts.'} action={<button className="button button-dark" onClick={props.openSend}><Send size={15} /> Send AUSD</button>} />
    {request && <section className="request-review surface-card">
      <div className="request-review-top"><div className="request-shield"><ShieldCheck size={21} /></div><div><div className="eyebrow">SIGNED PAYMENT REQUEST</div><h2>{request.title}</h2></div><span className={`signature-pill ${props.requestVerified ? 'verified' : 'unverified'}`}>{props.requestVerified ? <><BadgeCheck size={14} /> Verified</> : <><CircleHelp size={14} /> Not verified</>}</span></div>
      {props.requestError && <div className="inline-error"><CircleHelp size={16} /> {props.requestError}</div>}
      <p className="request-description">{request.description}</p>
      <div className="request-details"><div><span>Amount due</span><strong>{formatAUSD(request.amount)} <small>AUSD</small></strong><em>≈ {localEstimate(Number(formatUnits(BigInt(request.amount), 6)), 'JPY')} reference only</em></div><div><span>Pay to</span><strong className="mono">{shortAddress(request.payee, 8, 6)}</strong><a href={`${TESTNET_EXPLORER}/address/${request.payee}`} target="_blank" rel="noreferrer">View recipient <ExternalLink size={12} /></a></div><div><span>Invoice expires</span><strong>{new Date(request.expiresAt * 1000).toLocaleDateString()}</strong><em>On Monad testnet</em></div></div>
      <div className="request-safety"><LockKeyhole size={15} /><span>The sender signed the amount, recipient, title and description. Kite never auto-sends: you confirm each transfer.</span></div>
      {props.incomingPendingHash && <div className="form-safety"><Activity size={15} /><span>A payment transaction is already submitted. Do not send it again. <a className="text-link" href={`${TESTNET_EXPLORER}/tx/${props.incomingPendingHash}`} target="_blank" rel="noreferrer">View on MonadScan <ExternalLink size={12} /></a></span></div>}
      {props.incomingPendingHash ? <button className="button button-dark request-pay" disabled={props.incomingPayBusy} onClick={props.onPayIncoming}>{props.incomingPayBusy ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={15} />} {props.incomingPayBusy ? 'Checking confirmation…' : 'Check payment status'}</button> : props.isLive ? <button className="button button-dark request-pay" disabled={!props.requestVerified || props.incomingPayBusy || !props.snapshot || BigInt(request.amount) > props.snapshot.balance} onClick={props.onPayIncoming}>{props.incomingPayBusy ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />} {props.incomingPayBusy ? 'Settling on Monad…' : `Pay ${formatAUSD(request.amount)} AUSD`}</button> : <button className="button button-dark request-pay" onClick={props.onConnect}><KeyRound size={15} /> Connect passkey to pay</button>}
      {!props.isLive && <p className="form-footnote">Testnet only. Connect a passkey and get free MON gas before making a payment.</p>}
    </section>}
    {request && <div className="divider-label"><span>PAYMENT TOOLKIT</span></div>}
    <div className="payment-tiles"><button className="payment-tile tile-green" onClick={props.openSend}><span className="tile-icon"><Send size={18} /></span><strong>Send AUSD</strong><small>Pay a person or invoice</small><ArrowRight size={16} className="tile-arrow" /></button><button className="payment-tile tile-lilac" onClick={() => props.setActive('invoices')}><span className="tile-icon"><FileText size={18} /></span><strong>Request payment</strong><small>Share a signed invoice link</small><ArrowRight size={16} className="tile-arrow" /></button><button className="payment-tile tile-peach" disabled={props.faucetBusy} onClick={props.onRequestTestAUSD}><span className="tile-icon">{props.faucetPendingHash ? <RefreshCw size={18} /> : <Banknote size={18} />}</span><strong>{props.faucetPendingHash ? 'Check faucet status' : 'Get test AUSD'}</strong><small>{props.faucetPendingHash ? 'A faucet request is awaiting confirmation' : 'Agora faucet · testnet only'}</small><ArrowRight size={16} className="tile-arrow" /></button></div>
    <section className="surface-card payments-list"><div className="section-heading"><div><div className="eyebrow">YOUR MONAD ACTIVITY</div><h2>Latest transfers</h2></div><div className="filter-chips">{(['all','sent','received'] as const).map((option) => <button key={option} className={filter === option ? 'selected' : ''} onClick={() => setFilter(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}</div></div>
      <div className="activity-table"><div className="activity-table-head"><span>PAYMENT</span><span>AMOUNT</span><span>WHEN</span><span>STATUS</span></div>{visibleTransfers.length ? visibleTransfers.slice(0, 6).map((transfer) => <TransferRow key={transfer.id} transfer={transfer} viewer={props.account?.address} />) : <EmptyInline text={props.isLive ? 'No AUSD transfers found for this wallet yet.' : 'No preview transfers match this filter.'} />}<button className="text-link centered-link" onClick={() => props.setActive('activity')}>Open activity feed <ArrowRight size={14} /></button></div>
    </section>
  </>;
}

function InvoicesPage(props: {
  isLive: boolean; account: KiteAccount | null; health: Health; onConnect: () => void; createdUrl: string; qrData: string;
  setCreated: (url: string) => Promise<void>; onCreated: (request: Awaited<ReturnType<typeof signPaymentRequest>>, url: string) => void;
  onCopy: () => void; showToast: (message: ToastMessage) => void;
}) {
  const [amount, setAmount] = useState('250');
  const [title, setTitle] = useState('Product design sprint');
  const [description, setDescription] = useState('Three days of product design and prototype feedback. Thank you for working with me.');
  const [currency, setCurrency] = useState('JPY');
  const [brief, setBrief] = useState('Write an invoice for the work I completed this week. Keep it friendly and concise.');
  const [provider, setProvider] = useState<AIProvider>('kimi');
  const [aiBusy, setAiBusy] = useState(false);
  const [translateBusy, setTranslateBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBadge, setAiBadge] = useState('');

  const draft = async () => {
    if (brief.trim().length < 4) return props.showToast({ tone: 'error', text: 'Add a short brief before asking AI to write invoice copy.' });
    setAiBusy(true);
    try {
      const response = await runAIAssist<{ title: string; description: string }>({ task: 'draft', provider, text: brief, locale: 'English' });
      setTitle(response.result.title);
      setDescription(response.result.description);
      setAiBadge(`Generated by ${provider.toUpperCase()} · review before sharing`);
    } catch (error) {
      if (String(error).includes('not configured')) {
        const local = localDraftPreview(brief);
        setTitle(local.title);
        setDescription(local.description);
        setAiBadge('Local preview only · connect the selected model for bounty mode');
        props.showToast({ tone: 'info', text: `${provider.toUpperCase()} is not configured. A local non-AI preview was inserted; it does not count as sponsor-model usage.` });
      } else props.showToast({ tone: 'error', text: friendlyError(error) });
    } finally { setAiBusy(false); }
  };

  const translate = async () => {
    setTranslateBusy(true);
    try {
      const response = await runAIAssist<{ title: string; description: string }>({ task: 'translate', provider: 'qwen', title, description, targetLanguage: currency === 'JPY' ? 'Japanese' : currency === 'CNY' ? 'Simplified Chinese' : currency === 'EUR' ? 'Spanish' : currency === 'SGD' ? 'English (Singapore)' : 'English' });
      setTitle(response.result.title);
      setDescription(response.result.description);
      setAiBadge('Localized with Qwen · original copy replaced; review it');
    } catch (error) { props.showToast({ tone: 'error', text: friendlyError(error) }); }
    finally { setTranslateBusy(false); }
  };

  const create = async () => {
    if (!props.account) return props.onConnect();
    setBusy(true);
    try {
      const amountNumber = Number(amount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) throw new Error('Enter a positive AUSD amount.');
      const request = await signPaymentRequest({ account: props.account.account, payee: props.account.address, amountText: amount, title, description });
      const url = createShareUrl(request, window.location.origin);
      props.onCreated(request, url);
    } catch (error) { props.showToast({ tone: 'error', text: friendlyError(error) }); }
    finally { setBusy(false); }
  };

  return <>
    <PageHeader eyebrow="INVOICES · SIGNED LINKS" title="Make the ask easy." description="Create a signed request. The payer sees what you signed before they send anything." action={props.createdUrl ? <button className="button button-light" onClick={() => { void navigator.clipboard.writeText(props.createdUrl).then(() => props.showToast({ tone: 'success', text: 'Payment link copied.' })).catch(() => props.showToast({ tone: 'error', text: 'Clipboard is unavailable; select and copy the link.' })); }}><Copy size={15} /> Copy link</button> : undefined} />
    <div className="invoice-grid">
      <section className="surface-card invoice-builder">
        <div className="section-heading"><div><div className="eyebrow">NEW PAYMENT REQUEST</div><h2>Invoice details</h2></div><span className="private-chip"><LockKeyhole size={12} /> Passkey-signed</span></div>
        <div className="ai-composer"><div className="ai-composer-head"><span className="ai-composer-icon"><Sparkles size={15} /></span><div><strong>Draft with AI</strong><small>Only this brief is sent · avoid secrets or payment data</small></div><select aria-label="AI provider" value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)}><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="hunyuan">Hunyuan</option></select></div><div className="ai-compose-controls"><input value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1400} placeholder="Describe the work and tone…" /><button className="button button-soft" onClick={() => void draft()} disabled={aiBusy}>{aiBusy ? <LoaderCircle size={14} className="spin" /> : <Sparkles size={14} />}{aiBusy ? 'Writing…' : 'Draft'}</button></div>{aiBadge && <div className="ai-result-note"><CheckCircle2 size={12} /> {aiBadge}</div>}</div>
        <div className="form-row"><label className="field-label" htmlFor="invoice-amount">Amount</label><div className="amount-input-wrap"><span className="amount-prefix">$</span><input id="invoice-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={14} placeholder="0.00" /><span className="amount-suffix">AUSD</span></div><div className="field-hint">Agora Dollar · settles on Monad testnet. No live currency conversion.</div></div>
        <div className="form-two-col"><div className="form-row"><label className="field-label" htmlFor="invoice-title">Invoice title</label><input className="field-input" id="invoice-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></div><div className="form-row"><label className="field-label" htmlFor="invoice-currency">Show local estimate in</label><select id="invoice-currency" className="field-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{DISPLAY_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></div></div>
        <div className="form-row"><div className="field-label-line"><label className="field-label" htmlFor="invoice-description">Recipient-facing note</label><button className="inline-action" disabled={translateBusy || !props.health.integrations?.ai?.qwen} onClick={() => void translate()}>{translateBusy ? <LoaderCircle size={12} className="spin" /> : <Globe2 size={12} />} Translate with Qwen</button></div><textarea className="field-input field-textarea" id="invoice-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} rows={3} /></div>
        <div className="local-estimate"><div className="estimate-icon"><Globe2 size={16} /></div><div><strong>Local view</strong><span>Approximate amount shown to the recipient</span></div><div className="estimate-amount">{localEstimate(Number(amount) || 0, currency)} <small>{currency}</small></div></div>
        <div className="form-safety"><ShieldCheck size={15} /><span>Kite signs invoice terms with EIP-712. A payer can verify the payee, amount, expiry and description before sending.</span></div>
        {!props.isLive && <div className="connect-inline"><KeyRound size={15} /><span>Connect a passkey to sign and share an invoice link.</span><button onClick={props.onConnect}>Connect</button></div>}
        <button className="button button-dark full-button" disabled={busy} onClick={() => void create()}>{busy ? <LoaderCircle size={16} className="spin" /> : <LockKeyhole size={15} />}{busy ? 'Signing with Mera…' : props.isLive ? 'Sign & create payment link' : 'Connect passkey to continue'}<ArrowRight size={15} /></button>
        <p className="form-footnote">Each request expires in 7 days. The amount is always settled in AUSD; local currency is an estimate only.</p>
      </section>
      <aside className="invoice-side">
        <div className="invoice-preview-card">
          <div className="preview-card-top"><span className="preview-brand"><KiteMark /> kite</span><span className="preview-status">PAYMENT REQUEST</span></div>
          <div className="preview-line" /><div className="preview-label">AMOUNT DUE</div><div className="preview-amount">${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div><div className="preview-unit">AUSD · ≈ {localEstimate(Number(amount) || 0, currency)}</div>
          <div className="preview-info"><span>FROM</span><strong>{props.account ? shortAddress(props.account.address) : 'Your passkey account'}</strong><span>FOR</span><strong>{title || 'Invoice title'}</strong></div>
          <div className="preview-payee-note">{description || 'Your invoice note will appear here.'}</div>
          <div className="preview-card-foot"><ShieldCheck size={13} /> EIP-712 signed · Monad testnet</div>
        </div>
        <div className="side-tip"><div className="tip-icon"><Zap size={15} /></div><div><strong>One link. Clear terms.</strong><p>The recipient checks the signature, then signs an AUSD transfer from their own passkey wallet. No custodian holds funds.</p></div></div>
        {props.createdUrl && <div className="surface-card share-card"><div className="share-card-title"><CheckCircle2 size={16} /> Link ready to share</div>{props.qrData && <img className="qr-image" src={props.qrData} alt="QR code for signed Kite payment request" />}<div className="share-url">{props.createdUrl}</div><button className="button button-dark full-button" onClick={props.onCopy}><Copy size={14} /> Copy payment link</button></div>}
        <div className="provider-card"><span className="provider-kicker">MODEL CONNECTIONS</span><div className="provider-row"><span className="provider-logo kimi-logo">K</span><span><strong>Kimi</strong><small>Invoice copy</small></span><span className={`provider-state ${props.health.integrations?.ai?.kimi ? 'ready' : ''}`}>{props.health.integrations?.ai?.kimi ? 'READY' : 'KEY NEEDED'}</span></div><div className="provider-row"><span className="provider-logo qwen-logo">Q</span><span><strong>Qwen</strong><small>Localization</small></span><span className={`provider-state ${props.health.integrations?.ai?.qwen ? 'ready' : ''}`}>{props.health.integrations?.ai?.qwen ? 'READY' : 'KEY NEEDED'}</span></div><div className="provider-note">Keys are server-side only. Without a real sponsor key, local preview text is not counted as model usage.</div></div>
      </aside>
    </div>
  </>;
}

function ContactsPage({ isLive, contacts, account, onConnect, onAdd, onSelect }: { isLive: boolean; contacts: ContactRecord[]; account: KiteAccount | null; onConnect: () => void; onAdd: () => void; onSelect: (contact: ContactRecord) => void }) {
  const [query, setQuery] = useState('');
  const filtered = contacts.filter((contact) => `${contact.name} ${contact.country} ${contact.address}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeader eyebrow="CONTACTS · PASSKEY ENCRYPTED" title="The people behind the work." description="A portable address book, encrypted on this device with a key derived from your Mera passkey." action={isLive ? <button className="button button-dark" onClick={onAdd}><Plus size={15} /> Add contact</button> : <button className="button button-dark" onClick={onConnect}><KeyRound size={15} /> Unlock with passkey</button>} />
    {!isLive && <div className="preview-banner"><div className="preview-banner-icon"><Eye size={17} /></div><div><strong>Preview contacts</strong><span>Sample names and addresses are illustrative. Your live address book is passkey-encrypted.</span></div><DemoFlag /></div>}
    <section className="contact-intro"><div className="contact-lock-icon"><LockKeyhole size={20} /></div><div><strong>{isLive ? 'Encrypted locally · unlocked for this session' : 'One passkey, many keys'}</strong><p>{isLive ? 'Kite derives a separate AES-256-GCM key from Mera PRF output. Only ciphertext is saved to this browser; the server never receives contacts.' : 'Your account key and contact-encryption key are separately derived. The contact key never leaves your device.'}</p></div><span className="encryption-chip"><ShieldCheck size={13} /> AES-GCM</span></section>
    <section className="surface-card contacts-surface"><div className="contacts-toolbar"><div><div className="eyebrow">{filtered.length} SAVED CONTACT{filtered.length === 1 ? '' : 'S'}</div><h2>Address book</h2></div><div className="contact-search"><UserRound size={15} /><input placeholder="Search by name, country or address" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>
      {filtered.length ? <div className="contact-table">{filtered.map((contact, index) => <div key={contact.id} className="contact-row"><span className={`avatar contact-avatar avatar-${index % 4}`}>{initials(contact.name)}</span><div className="contact-main"><strong>{contact.name}</strong><small>{contact.country} <span>·</span> {contact.currency}</small></div><div className="contact-address"><span>WALLET ADDRESS</span><strong className="mono">{shortAddress(contact.address, 8, 6)}</strong></div><button className="button button-outline button-xs" onClick={() => onSelect(contact)}><Send size={13} /> Pay</button></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Users size={22} /></div><strong>{query ? 'No matches' : isLive ? 'Your private book is empty' : 'Connect your passkey'}</strong><span>{query ? 'Try another search.' : isLive ? 'Add a trusted contact to make repeat payments simpler.' : 'Unlock to reveal or add contacts. Preview data is not saved.'}</span>{isLive && !query && <button className="button button-dark button-small" onClick={onAdd}><Plus size={14} /> Add contact</button>}</div>}
    </section>
    <div className="privacy-foot"><KeyRound size={14} /> {account ? `Account: ${shortAddress(account.address)}` : 'No wallet is connected.'} <span>·</span> Contact plaintext is never sent to Kite's server.</div>
  </>;
}

function ActivityPage({ isLive, transfers, feedSource, address, busy, refresh, onConnect }: { isLive: boolean; transfers: Transfer[]; feedSource: 'envio'|'rpc'|'preview'; address?: string; busy: boolean; refresh: () => void; onConnect: () => void }) {
  return <>
    <PageHeader eyebrow="ACTIVITY · MONAD" title="Every transfer, accounted for." description="AUSD movements from the chain, not a made-up activity feed." action={<button className="button button-light" disabled={!isLive || busy} onClick={refresh}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Sync now</button>} />
    {!isLive && <div className="preview-banner"><div className="preview-banner-icon"><Eye size={17} /></div><div><strong>Sample ledger</strong><span>Preview transactions are not real blockchain data. Connect a passkey to query the chain.</span></div><button onClick={onConnect}>Connect <ArrowRight size={14} /></button></div>}
    <div className="activity-summary-row"><div className="surface-card activity-summary"><span className="summary-icon mint"><Activity size={17} /></span><div><small>DATA SOURCE</small><strong>{feedSource === 'envio' ? 'Envio HyperIndex' : feedSource === 'rpc' ? 'Monad RPC' : 'Preview'}</strong></div><span className={`source-dot source-${feedSource}`} /></div><div className="surface-card activity-summary"><span className="summary-icon lilac"><Wallet size={17} /></span><div><small>WALLET</small><strong className="mono">{address ? shortAddress(address, 8, 6) : 'Not connected'}</strong></div></div><div className="surface-card activity-summary"><span className="summary-icon peach"><Clock3 size={17} /></span><div><small>LOOKBACK</small><strong>{feedSource === 'envio' ? 'Latest indexed transfers' : 'Last 15,000 blocks'}</strong></div></div></div>
    <section className="surface-card activity-full"><div className="section-heading"><div><div className="eyebrow">AUSD · MONAD TESTNET</div><h2>Transfer ledger</h2></div><span className="source-label"><span className={`source-dot source-${feedSource}`} /> {feedSource === 'envio' ? 'Envio indexer' : feedSource === 'rpc' ? 'RPC fallback' : 'Demo mode'}</span></div>
      <div className="activity-table"><div className="activity-table-head"><span>TRANSFER</span><span>AMOUNT</span><span>BLOCK / TIME</span><span>CONFIRMATION</span></div>{transfers.map((tx) => <TransferRow key={tx.id} transfer={tx} viewer={address} />)}{!transfers.length && <div className="empty-state"><div className="empty-icon"><Activity size={22} /></div><strong>{isLive ? 'No transfers in the indexed window' : 'No preview transfers'}</strong><span>{isLive ? 'Make a test AUSD payment or request funds from the Agora faucet to see a verified event.' : 'Connect a passkey to read real activity.'}</span></div>}</div>
      <div className="activity-table-foot"><span>History appears after the transaction is indexed.</span><a href="https://docs.envio.dev/docs/HyperIndex/overview" target="_blank" rel="noreferrer">About Envio <ExternalLink size={12} /></a></div>
    </section>
  </>;
}

function SettingsPage({ isLive, address, snapshot, health, onConnect, onLock, onForget }: { isLive: boolean; address?: string; snapshot: Awaited<ReturnType<typeof readWalletSnapshot>> | null; health: Health; onConnect: () => void; onLock: () => void; onForget: () => void }) {
  return <>
    <PageHeader eyebrow="SETTINGS · TRUST BY DESIGN" title="Your keys. Your call." description="Kite is a thin payment interface, not a custodian. Review how this workspace is configured." />
    <section className="surface-card settings-card"><div className="settings-section-head"><span className="settings-icon"><KeyRound size={18} /></span><div><h2>Passkey account</h2><p>Mera WebAuthn PRF · self-custodial EOA · no seed phrase on this screen</p></div><span className={`settings-status ${isLive ? 'good' : ''}`}><span className="pulse-dot" /> {isLive ? 'UNLOCKED' : 'NOT CONNECTED'}</span></div><div className="settings-details"><div><span>Address</span><strong className="mono">{address ?? 'Connect a passkey to reveal'}</strong></div><div><span>Native gas balance</span><strong>{snapshot ? `${Number(formatUnits(snapshot.monBalance, 18)).toFixed(4)} MON` : '—'}</strong></div><div><span>Session behavior</span><strong>15-minute inactivity lock</strong></div><div><span>Secret storage</span><strong>Memory only · zeroed on lock</strong></div></div><div className="settings-actions">{isLive ? <><button className="button button-light" onClick={onLock}><LockKeyhole size={14} /> Lock now</button><button className="text-danger" onClick={onForget}><LogOut size={14} /> Forget this browser hint</button></> : <button className="button button-dark" onClick={onConnect}><KeyRound size={14} /> Create or sign in</button>}</div></section>
    <section className="surface-card settings-card"><div className="settings-section-head"><span className="settings-icon mint"><Globe2 size={18} /></span><div><h2>Network & providers</h2><p>Payment actions are constrained to Monad testnet (chain ID 10143).</p></div><span className="settings-status good">TESTNET ONLY</span></div><div className="settings-details"><div><span>Token</span><strong>AUSD · {shortAddress(AUSD_TESTNET)}</strong></div><div><span>RPC provider</span><strong>{health.rpcProvider === 'alchemy' ? 'Alchemy · server-side proxy' : 'Public Monad testnet RPC'}</strong></div><div><span>Envio HyperIndex</span><strong>{health.integrations?.envio ? 'Configured' : 'Fallback to recent RPC logs'}</strong></div><div><span>Latest observed block</span><strong>{snapshot ? snapshot.blockNumber.toLocaleString() : '—'}</strong></div></div><div className="settings-actions"><a className="text-link" href="https://faucet.monad.xyz/" target="_blank" rel="noreferrer">Monad testnet faucet <ExternalLink size={13} /></a><a className="text-link" href="https://docs.agora.finance/developer/contract-deployments" target="_blank" rel="noreferrer">AUSD contract references <ExternalLink size={13} /></a></div></section>
    <section className="surface-card settings-card"><div className="settings-section-head"><span className="settings-icon lilac"><Sparkles size={18} /></span><div><h2>AI integrations</h2><p>AI drafts copy only. It has no wallet key, transaction tool, or ability to send money.</p></div></div><div className="ai-provider-grid">{(['kimi','qwen','hunyuan'] as const).map((provider) => <div key={provider}><strong>{provider === 'kimi' ? 'Kimi' : provider === 'qwen' ? 'Qwen' : 'Hunyuan'}</strong><small>{health.integrations?.ai?.[provider] ? 'Server key configured' : 'Key not configured'}</small><span className={`provider-state ${health.integrations?.ai?.[provider] ? 'ready' : ''}`}>{health.integrations?.ai?.[provider] ? 'READY' : 'OFF'}</span></div>)}</div></section>
    <div className="bottom-note"><ShieldCheck size={14} /> Testnet tokens are valueless. Never paste a private key, recovery phrase, GitHub token or model API key into the app.</div>
  </>;
}

function SendModal({ account, snapshot, contacts, initialRecipient, pendingTransfer, onPendingTransfer, onClose, onConnect, onSent }: { account: KiteAccount | null; snapshot: Awaited<ReturnType<typeof readWalletSnapshot>> | null; contacts: ContactRecord[]; initialRecipient: string; pendingTransfer: PendingTransfer | null; onPendingTransfer: (pending: PendingTransfer | null) => void; onClose: () => void; onConnect: () => void; onSent: (hash: Hex) => void }) {
  const [recipient, setRecipient] = useState(pendingTransfer?.recipient ?? initialRecipient);
  const [amount, setAmount] = useState(pendingTransfer?.amount ?? '25.00');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(Boolean(pendingTransfer));
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(pendingTransfer?.hash ?? null);
  const recipientContact = contacts.find((contact) => contact.address.toLowerCase() === recipient.toLowerCase());
  const maxBalance = snapshot ? formatAUSD(snapshot.balance) : '0.00';

  const submit = async () => {
    setError('');
    if (!account) { onClose(); onConnect(); return; }
    if (!isAddress(recipient)) { setError('Enter a valid EVM address.'); return; }
    if (recipient.toLowerCase() === account.address.toLowerCase()) { setError('You cannot send AUSD to your own wallet.'); return; }
    if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,6})?$/.test(amount.trim())) { setError('Enter an amount between 0.000001 and 1,000,000 AUSD, with up to 6 decimal places.'); return; }
    const amountAtomic = parseUnits(amount.trim(), 6);
    if (amountAtomic <= 0n) { setError('Enter a positive AUSD amount.'); return; }
    if (snapshot && amountAtomic > snapshot.balance) { setError('Your AUSD balance is lower than this payment.'); return; }
    setConfirm(true);
  };

  const checkStatus = async (hash: Hex) => {
    setBusy(true);
    setError('');
    try {
      const client = createMonadPublicClient();
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
      if (receipt.status === 'success') {
        setSubmittedHash(null);
        onPendingTransfer(null);
        onSent(hash);
      } else {
        setSubmittedHash(null);
        onPendingTransfer(null);
        setConfirm(false);
        setError('The transaction was mined but reverted; no AUSD was transferred. Check the balance and recipient before retrying.');
      }
    } catch {
      setError('The transaction was submitted but is still awaiting confirmation. Do not submit it again; check this same hash or try again later.');
    } finally { setBusy(false); }
  };

  const pay = async () => {
    if (!account || submittedHash) return;
    setBusy(true);
    setError('');
    try {
      const hash = await sendAUSD(account, recipient, amount);
      const pending = { hash, recipient, amount };
      setSubmittedHash(hash);
      onPendingTransfer(pending);
      await checkStatus(hash);
    } catch (cause) {
      setError(friendlyError(cause));
      setConfirm(false);
    } finally { setBusy(false); }
  };

  return <Modal title={confirm ? 'Review payment' : 'Send AUSD'} subtitle={confirm ? 'Confirm the details before settlement.' : 'A direct, non-custodial transfer on Monad testnet.'} onClose={onClose}>
    {!account && <div className="modal-info-banner"><KeyRound size={15} /><span>Connect a Mera passkey to sign from your own wallet. Demo mode never broadcasts.</span></div>}
    {!confirm ? <div className="modal-form">
      <div className="form-row"><label className="field-label" htmlFor="send-to">Pay to</label><input id="send-to" className="field-input mono" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x wallet address" autoComplete="off" />{contacts.length > 0 && <select className="contact-select" value="" onChange={(e) => { const found = contacts.find((contact) => contact.id === e.target.value); if (found) setRecipient(found.address); }}><option value="">Choose a saved contact…</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} · {contact.country}</option>)}</select>}{recipientContact && <div className="field-hint">Paying {recipientContact.name} · {recipientContact.country}</div>}</div>
      <div className="form-row"><div className="field-label-line"><label className="field-label" htmlFor="send-amount">Amount</label><button className="inline-action" onClick={() => setAmount(maxBalance)}>Max {maxBalance} AUSD</button></div><div className="amount-input-wrap"><span className="amount-prefix">$</span><input id="send-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /><span className="amount-suffix">AUSD</span></div><div className="field-hint">Available: {maxBalance} AUSD {snapshot && snapshot.monBalance < 1000000000000000n && <span className="warning-inline">· Low MON gas</span>}</div></div>
      <div className="form-row"><label className="field-label" htmlFor="send-memo">Private note <span className="optional-label">optional · stays on this device</span></label><input id="send-memo" className="field-input" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={120} placeholder="e.g. Design review — May" /></div>
      {error && <div className="inline-error"><CircleHelp size={15} /> {error}</div>}
      <div className="form-safety"><ShieldCheck size={15} /><span>Kite sends AUSD directly from your passkey account to the address shown. Double-check before signing.</span></div>
      <button className="button button-dark full-button" onClick={() => void submit()}>{account ? 'Review payment' : 'Connect passkey to continue'} <ArrowRight size={15} /></button>
    </div> : <div className="modal-form">
      <div className="review-amount"><span>YOU ARE SENDING</span><strong>${formatAUSD(parseUnits(amount.trim(), 6))}</strong><small>AUSD · Agora Dollar</small></div>
      <div className="review-row"><span>Recipient</span><strong>{recipientContact?.name ?? 'Wallet address'}<small className="mono">{shortAddress(recipient, 10, 8)}</small></strong></div>
      <div className="review-row"><span>Network</span><strong>Monad testnet <small>Chain ID 10143 · test assets only</small></strong></div>
      {memo && <div className="review-row"><span>Note</span><strong>{memo}</strong></div>}
      <div className="form-safety"><LockKeyhole size={15} /><span>This passkey session signs the transaction. Testnet MON gas is required. A successful transfer cannot be reversed.</span></div>
      {submittedHash && <div className="form-safety"><Activity size={15} /><span>Transaction submitted. Do not send it again while confirmation is pending. <a className="text-link" href={`${TESTNET_EXPLORER}/tx/${submittedHash}`} target="_blank" rel="noreferrer">View on MonadScan <ExternalLink size={12} /></a></span></div>}
      {error && <div className="inline-error"><CircleHelp size={15} /> {error}</div>}
      {submittedHash ? <div className="modal-button-row"><button className="button button-light" disabled={busy} onClick={onClose}>Close</button><button className="button button-dark" disabled={busy} onClick={() => void checkStatus(submittedHash)}>{busy ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}{busy ? 'Checking…' : 'Check status'}</button></div> : <div className="modal-button-row"><button className="button button-light" disabled={busy} onClick={() => setConfirm(false)}>Back</button><button className="button button-dark" disabled={busy} onClick={() => void pay()}>{busy ? <LoaderCircle size={15} className="spin" /> : <LockKeyhole size={15} />}{busy ? 'Settling…' : 'Confirm & send'} <ArrowRight size={14} /></button></div>}
    </div>}
  </Modal>;
}

function RequestModal({ account, health, onClose, onConnect, onCreated, showToast }: { account: KiteAccount | null; health: Health; onClose: () => void; onConnect: () => void; onCreated: (request: Awaited<ReturnType<typeof signPaymentRequest>>, url: string) => void; showToast: (message: ToastMessage) => void }) {
  const [amount, setAmount] = useState('150');
  const [title, setTitle] = useState('Freelance work');
  const [description, setDescription] = useState('Thank you for the collaboration. Please settle this invoice in AUSD.');
  const [brief, setBrief] = useState('Write a warm invoice note for this week’s design work.');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<AIProvider>('kimi');

  const runDraft = async () => {
    if (brief.trim().length < 4) { setError('Add a short brief before drafting invoice copy.'); return; }
    setAiBusy(true);
    try {
      const response = await runAIAssist<{ title: string; description: string }>({ task: 'draft', provider, text: brief, locale: 'English' });
      setTitle(response.result.title); setDescription(response.result.description);
    } catch (cause) {
      if (String(cause).includes('not configured')) {
        const preview = localDraftPreview(brief); setTitle(preview.title); setDescription(preview.description);
        showToast({ tone: 'info', text: 'Local preview copy only; connect a model key to use the sponsor model.' });
      } else setError(friendlyError(cause));
    } finally { setAiBusy(false); }
  };
  const create = async () => {
    setError('');
    if (!account) { onClose(); onConnect(); return; }
    setBusy(true);
    try {
      const request = await signPaymentRequest({ account: account.account, payee: account.address, amountText: amount, title, description });
      onCreated(request, createShareUrl(request, window.location.origin));
    } catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <Modal title="Request payment" subtitle="Create an EIP-712 signed invoice link." onClose={onClose}>
    {!account && <div className="modal-info-banner"><KeyRound size={15} /><span>Connect a passkey before creating a signed request.</span></div>}
    <div className="modal-form">
      <div className="form-row"><label className="field-label" htmlFor="quick-amount">Amount</label><div className="amount-input-wrap"><span className="amount-prefix">$</span><input id="quick-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /><span className="amount-suffix">AUSD</span></div></div>
      <div className="ai-modal-mini"><div className="ai-composer-head"><span className="ai-composer-icon"><Sparkles size={14} /></span><div><strong>AI invoice copy</strong><small>Only this brief is sent · avoid secrets or payment data</small></div><select value={provider} onChange={(e) => setProvider(e.target.value as AIProvider)} aria-label="AI provider"><option value="kimi">Kimi</option><option value="qwen">Qwen</option><option value="hunyuan">Hunyuan</option></select></div><div className="ai-compose-controls"><input value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1400} placeholder="Describe the work…" /><button className="button button-soft button-xs" onClick={() => void runDraft()} disabled={aiBusy}>{aiBusy ? <LoaderCircle size={13} className="spin" /> : <Sparkles size={13} />} Draft</button></div></div>
      <div className="form-row"><label className="field-label" htmlFor="quick-title">Title</label><input id="quick-title" className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></div>
      <div className="form-row"><label className="field-label" htmlFor="quick-description">Description</label><textarea id="quick-description" className="field-input field-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={400} /></div>
      <div className="form-safety"><ShieldCheck size={15} /><span>Link expires in 7 days. The request is signed by your passkey; this does not move any funds.</span></div>
      {error && <div className="inline-error"><CircleHelp size={15} /> {error}</div>}
      <button className="button button-dark full-button" disabled={busy} onClick={() => void create()}>{busy ? <LoaderCircle size={15} className="spin" /> : <LockKeyhole size={15} />}{account ? 'Sign & create link' : 'Connect passkey to continue'} <ArrowRight size={14} /></button>
      {!health.integrations?.ai?.[provider] && <p className="form-footnote">{provider.toUpperCase()} is not configured in this deployment. Local preview copy is not sponsor-model usage.</p>}
    </div>
  </Modal>;
}

function ContactModal({ account, contacts, onClose, onSave, onConnect }: { account: KiteAccount | null; contacts: ContactRecord[]; onClose: () => void; onSave: (contacts: ContactRecord[]) => void; onConnect: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('JPY');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setError('');
    if (!account) { onClose(); onConnect(); return; }
    if (name.trim().length < 2 || name.trim().length > 70) return setError('Contact name must be 2–70 characters.');
    if (!isAddress(address)) return setError('Enter a valid EVM address.');
    if (contacts.some((contact) => contact.address.toLowerCase() === address.toLowerCase())) return setError('That wallet is already in your address book.');
    setBusy(true);
    const next = [...contacts, { id: crypto.randomUUID(), name: name.trim(), address: getAddress(address), country: country.trim().slice(0, 60) || '—', currency, createdAt: Date.now() }];
    try { await saveContacts(account.prfRoot, next); onSave(next); }
    catch (cause) { setError(friendlyError(cause)); }
    finally { setBusy(false); }
  };
  return <Modal title="Add a private contact" subtitle="Encrypted on this device; never uploaded to Kite." onClose={onClose}>
    <div className="modal-form"><div className="form-row"><label className="field-label" htmlFor="contact-name">Name or business</label><input id="contact-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={70} placeholder="e.g. Mika Chen" /></div><div className="form-row"><label className="field-label" htmlFor="contact-address">Monad / EVM wallet</label><input id="contact-address" className="field-input mono" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" placeholder="0x…" /></div><div className="form-two-col"><div className="form-row"><label className="field-label" htmlFor="contact-country">Country / region</label><input id="contact-country" className="field-input" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="Japan" /></div><div className="form-row"><label className="field-label" htmlFor="contact-currency">Local currency</label><select id="contact-currency" className="field-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{DISPLAY_CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></div></div><div className="form-safety"><LockKeyhole size={15} /><span>The address book uses an AES-GCM key derived from a separate Mera PRF namespace. Only encrypted data is written to browser storage.</span></div>{error && <div className="inline-error"><CircleHelp size={15} /> {error}</div>}<button className="button button-dark full-button" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle size={15} className="spin" /> : <LockKeyhole size={15} />}{account ? 'Encrypt & save contact' : 'Connect passkey to continue'}</button></div>
  </Modal>;
}

function ConnectModal({ name, setName, busy, onClose, onCreate, onSignin }: { name: string; setName: (name: string) => void; busy: boolean; onClose: () => void; onCreate: () => void; onSignin: () => void }) {
  return <Modal title="A wallet that feels like you." subtitle="Create or restore a self-custodial Monad account with a passkey." onClose={onClose}>
    <div className="connect-modal-art"><div className="connect-glow" /><div className="connect-lock"><KeyRound size={27} /></div><div className="connect-art-caption"><ShieldCheck size={13} /> No seed phrase · no extension · no custody server</div></div>
    <div className="modal-form"><div className="connect-benefits"><div><span><Check size={13} /></span>Face ID, Touch ID or your device PIN</div><div><span><Check size={13} /></span>Your private key stays in memory only</div><div><span><Check size={13} /></span>Monad testnet · chain ID {MONAD_TESTNET_ID}</div></div><div className="form-row"><label className="field-label" htmlFor="passkey-name">Name shown in your authenticator <span className="optional-label">new passkey only</span></label><input id="passkey-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={64} placeholder="Your name" /></div><div className="modal-button-row"><button className="button button-light" disabled={busy} onClick={onSignin}><KeyRound size={14} /> Sign in</button><button className="button button-dark" disabled={busy} onClick={onCreate}>{busy ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />} Create passkey</button></div><p className="form-footnote">Mera is a preview-stage library. Passkey PRF support varies by device and browser. If your device cannot provide PRF, the app will not silently fall back to a custodial wallet.</p></div>
  </Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div>;
}

function copyText(text: string) {
  return navigator.clipboard.writeText(text);
}

export default App;

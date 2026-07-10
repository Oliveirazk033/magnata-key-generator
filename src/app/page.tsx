'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Starfield from '@/components/Starfield';
import {
  Key, Shield, Plus, Trash2, RefreshCw, Coins, ArrowRight,
  Lock, Unlock, History, Copy, Check, Store, BarChart3,
  Package, BookOpen, X, LayoutDashboard, Hash, User, UserPlus, LogIn, LogOut, Wallet, Play, Link2, ExternalLink, FolderOpen, Tag, Pencil, MoreVertical, Bell, BellOff, Megaphone, CreditCard, Loader2, ShoppingCart, CheckCircle, XCircle, Clock,
} from 'lucide-react';

/* ===== Types ===== */
interface CategoryItem {
  id: string; name: string; description: string | null;
  sortOrder: number; isActive: boolean; productCount: number;
  createdAt: string;
}
interface Product {
  id: string; name: string; description: string | null;
  duration: string; credits: number; isActive: boolean;
  categoryId: string | null; categoryName: string | null;
  _count: { keys: number };
}
interface TransactionItem {
  id: string; key: { code: string }; productName: string;
  credits: number; buyerInfo: string; createdAt: string;
}
interface KeyItem {
  id: string; code: string; productId: string;
  product: { name: string; duration: string };
  isSold: boolean; soldTo: string | null; soldAt: string | null; createdAt: string;
}
interface UserData {
  id: string; username: string; displayName: string;
  credits: number; isActive: boolean; createdAt: string;
}
interface LoggedUser {
  id: string; username: string; displayName: string; credits: number;
}
interface TutorialItem {
  id: string; title: string; url: string; embedUrl: string;
  sortOrder: number; isActive: boolean; createdAt: string;
}
interface LinkItem {
  id: string; title: string; url: string; description: string | null;
  sortOrder: number; isActive: boolean; createdAt: string;
}
interface UserHistoryItem {
  id: string; keyCode: string; productName: string;
  credits: number; createdAt: string;
}
interface NotificationItem {
  id: string; userId: string | null; userName?: string; username?: string;
  title: string; message: string; type: string;
  isRead: boolean; createdAt: string;
}
interface OrderItem {
  id: string; userId: string; credits: number; amount: number;
  buyerName: string; buyerEmail: string; buyerCpf: string;
  status: string; pixKey: string | null; adminNotes: string | null;
  createdAt: string; updatedAt: string;
  username?: string; userDisplayName?: string;
}
const creditPackages = [
  { credits: 5, price: 5, popular: false },
  { credits: 15, price: 12, popular: true },
  { credits: 30, price: 22, popular: false },
  { credits: 50, price: 35, popular: false },
  { credits: 100, price: 60, popular: true },
];

/* ===== Main ===== */
export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = pathname.startsWith('/admin');

  // Auth states
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // User states
  const [loggedUser, setLoggedUser] = useState<LoggedUser | null>(null);
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [userLoggingIn, setUserLoggingIn] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [stats, setStats] = useState({ totalCredits: 0, totalSales: 0 });
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [generateQuantity, setGenerateQuantity] = useState(1);
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const [deliveredKey, setDeliveredKey] = useState<string | null>(null);
  const [deliveredKeys, setDeliveredKeys] = useState<string[]>([]);
  const [deliveredProduct, setDeliveredProduct] = useState('');
  const [remainingCredits, setRemainingCredits] = useState(0);

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [catListOpen, setCatListOpen] = useState(false);

  // Admin form states
  const [newProduct, setNewProduct] = useState({ name: '', description: '', duration: '', credits: '', categoryId: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', duration: '', credits: '', categoryId: '' });
  const [newKeysText, setNewKeysText] = useState('');
  const [addingKeysTo, setAddingKeysTo] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [userTab, setUserTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // User management
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', credits: '10' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState('');

  // Tutorials
  const [tutorials, setTutorials] = useState<TutorialItem[]>([]);
  const [userTutorials, setUserTutorials] = useState<TutorialItem[]>([]);
  const [newTutorial, setNewTutorial] = useState({ title: '', url: '' });

  // Links
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [userLinks, setUserLinks] = useState<LinkItem[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', description: '' });

  // User history
  const [userHistory, setUserHistory] = useState<UserHistoryItem[]>([]);
  const [userTotalKeys, setUserTotalKeys] = useState(0);
  const [userTotalCreditsUsed, setUserTotalCreditsUsed] = useState(0);
  const [historySearch, setHistorySearch] = useState('');

  const getUserHeaders = () => loggedUser ? ({ 'x-user-id': loggedUser.id }) : {};
  const getAdminHeaders = () => ({ 'x-admin-key': adminPassword });

  const fetchCategories = useCallback(async (isAdminFetch: boolean) => {
    try {
      const headers = isAdminFetch ? { 'x-admin-key': adminPassword } : {};
      const res = await fetch('/api/categories', { headers });
      if (!res.ok) { console.error('fetchCategories status:', res.status); return; }
      const data = await res.json();
      if (data.categories) {
        if (isAdminFetch) setCategories(data.categories);
      } else if (data.error) {
        console.error('fetchCategories error:', data.error);
      }
    } catch (err) {
      console.error('fetchCategories catch:', err);
    }
  }, [adminPassword]);

  const fetchProducts = useCallback(async (catId?: string) => {
    setLoadingProducts(true);
    try {
      const url = catId ? `/api/products?categoryId=${catId}` : '/api/products';
      const res = await fetch(url);
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch { toast.error('Erro ao carregar produtos'); }
    finally { setLoadingProducts(false); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch('/api/transactions', { headers: { 'x-admin-key': adminPassword } });
      const data = await res.json();
      if (data.transactions) { setTransactions(data.transactions); setStats({ totalCredits: data.totalCredits, totalSales: data.totalSales }); }
    } catch { /* silent */ }
  }, [adminPassword]);

  const fetchKeys = useCallback(async (productId?: string) => {
    try {
      const url = productId ? `/api/keys?productId=${productId}` : '/api/keys';
      const res = await fetch(url, { headers: { 'x-admin-key': adminPassword } });
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch { /* silent */ }
  }, [adminPassword]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/register', { headers: { 'x-admin-key': adminPassword } });
      const data = await res.json();
      if (data.users) setUsers(data.users);
      else if (data.error) { toast.error('Erro usuarios: ' + data.error); }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Erro'; toast.error('Fetch users: ' + msg); }
  }, [adminPassword]);

  const fetchTutorials = useCallback(async (isAdminFetch: boolean) => {
    try {
      const headers = isAdminFetch ? { 'x-admin-key': adminPassword } : {};
      const res = await fetch('/api/tutorials', { headers });
      const data = await res.json();
      if (data.tutorials) {
        if (isAdminFetch) setTutorials(data.tutorials);
        else setUserTutorials(data.tutorials);
      }
    } catch { /* silent */ }
  }, [adminPassword]);

  const fetchUserTutorials = useCallback(async () => {
    try {
      const res = await fetch('/api/tutorials');
      const data = await res.json();
      if (data.tutorials) setUserTutorials(data.tutorials);
    } catch { /* silent */ }
  }, []);

  const fetchLinks = useCallback(async (isAdminFetch: boolean) => {
    try {
      const headers = isAdminFetch ? { 'x-admin-key': adminPassword } : {};
      const res = await fetch('/api/links', { headers });
      const data = await res.json();
      if (data.links) {
        if (isAdminFetch) setLinks(data.links);
        else setUserLinks(data.links);
      }
    } catch { /* silent */ }
  }, [adminPassword]);

  const fetchUserLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      if (data.links) setUserLinks(data.links);
    } catch { /* silent */ }
  }, []);

  const fetchUserHistory = useCallback(async () => {
    if (!loggedUser) return;
    try {
      const res = await fetch('/api/user/history', { headers: { 'x-user-id': loggedUser.id } });
      const data = await res.json();
      if (data.transactions) {
        setUserHistory(data.transactions);
        setUserTotalKeys(data.totalKeys);
        setUserTotalCreditsUsed(data.totalCreditsUsed);
      }
    } catch { /* silent */ }
  }, [loggedUser?.id]);

  // --- Notifications ---
  const fetchNotifications = useCallback(async () => {
    if (loggedUser) {
      try {
        const res = await fetch(`/api/notifications?userId=${loggedUser.id}`);
        const data = await res.json();
        if (data.notifications) { setNotifications(data.notifications); setUnreadCount(data.unread || 0); }
      } catch { /* silent */ }
    } else if (isAdmin) {
      try {
        const res = await fetch('/api/notifications?admin=true', { headers: { 'x-admin-key': adminPassword } });
        const data = await res.json();
        if (data.notifications) setNotifications(data.notifications);
      } catch { /* silent */ }
    }
  }, [loggedUser?.id, isAdmin, adminPassword]);

  const handleMarkNotifRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    if (!loggedUser) return;
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true, userId: loggedUser.id }) });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', userId: '' });
  const [pixChecking, setPixChecking] = useState(false);
  const [pixResults, setPixResults] = useState<{ amount: number; description: string; senderName: string; credited: boolean; username: string | null; creditsAdded: number | null; message: string }[]>([]);

  // Buy credits
  const [buyStep, setBuyStep] = useState<'packages' | 'form' | 'pix' | 'done'>('packages');
  const [selectedPkg, setSelectedPkg] = useState<{ credits: number; price: number } | null>(null);
  const [buyForm, setBuyForm] = useState({ name: '', email: '', cpf: '' });
  const [buyLoading, setBuyLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [userOrders, setUserOrders] = useState<OrderItem[]>([]);
  const [adminOrders, setAdminOrders] = useState<OrderItem[]>([]);
  const [orderFilter, setOrderFilter] = useState('pending');

  const fetchUserOrders = async () => {
    if (!loggedUser) return;
    try {
      const res = await fetch('/api/orders', { headers: getUserHeaders() });
      const data = await res.json();
      if (data.orders) setUserOrders(data.orders);
    } catch {}
  };

  const fetchAdminOrders = async (status?: string) => {
    const s = status || orderFilter;
    try {
      const res = await fetch(`/api/orders?status=${s}`, { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.orders) setAdminOrders(data.orders);
    } catch {}
  };

  const handleSelectPackage = (pkg: typeof creditPackages[0]) => {
    setSelectedPkg(pkg);
    setBuyStep('form');
  };

  const handleSubmitBuy = async () => {
    if (!selectedPkg || !buyForm.name || !buyForm.email || !buyForm.cpf) {
      toast.error('Preencha todos os campos'); return;
    }
    const cleanCpf = buyForm.cpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) { toast.error('CPF invalido'); return; }
    setBuyLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getUserHeaders() },
        body: JSON.stringify({
          credits: selectedPkg.credits,
          amount: selectedPkg.price,
          buyerName: buyForm.name,
          buyerEmail: buyForm.email,
          buyerCpf: cleanCpf,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedOrderId(data.orderId);
        setBuyStep('pix');
        toast.success('Pedido criado! Faca o PIX abaixo.');
      } else {
        toast.error(data.error || 'Erro ao criar pedido');
      }
    } catch { toast.error('Erro ao criar pedido'); }
    setBuyLoading(false);
  };

  const handleAdminOrderAction = async (orderId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'approve' ? 'Pagamento aprovado e creditos adicionados!' : 'Pedido recusado');
        fetchAdminOrders();
        fetchUsers();
      } else {
        toast.error(data.error || 'Erro ao processar');
      }
    } catch { toast.error('Erro ao processar pedido'); }
  };

  const handleCheckPix = async () => {
    setPixChecking(true);
    try {
      const res = await fetch('/api/payments/check-pix', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() } });
      const data = await res.json();
      if (data.error) { toast.error(data.error); }
      else {
        setPixResults(data.results || []);
        const credited = (data.results || []).filter((r: any) => r.credited).length;
        if (data.total === 0) toast.info('Nenhum pagamento novo encontrado');
        else toast.success(`${credited} de ${data.total} pagamento(s) processado(s)`);
      }
    } catch { toast.error('Erro ao verificar pagamentos'); }
    setPixChecking(false);
  };
  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) { toast.error('Preencha titulo e mensagem'); return; }
    try {
      const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() }, body: JSON.stringify({ ...newAnnouncement, userId: newAnnouncement.userId || null }) });
      const data = await res.json();
      if (data.success) {
        toast.success(data.sentTo ? `Enviado para ${data.sentTo} usuarios` : 'Notificacao enviada');
        setNewAnnouncement({ title: '', message: '', userId: '' });
        fetchNotifications();
      } else toast.error(data.error || 'Erro');
    } catch { toast.error('Erro'); }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      toast.success('Notificacao removida'); fetchNotifications();
    } catch { toast.error('Erro'); }
  };

  useEffect(() => { fetchProducts(); fetchUserTutorials(); fetchUserLinks(); }, [fetchProducts, fetchUserTutorials, fetchUserLinks]);
  useEffect(() => {
    if (isAdmin) { fetchTransactions(); fetchKeys(); fetchUsers(); fetchTutorials(true); fetchLinks(true); fetchCategories(true); fetchNotifications(); }
  }, [isAdmin, fetchTransactions, fetchKeys, fetchUsers, fetchTutorials, fetchLinks, fetchCategories]);
  // Ensure categories are loaded when switching to products tab
  useEffect(() => {
    if (isAdmin && adminTab === 'products' && categories.length === 0) { fetchCategories(true); }
    if (isAdmin && adminTab === 'orders') { fetchAdminOrders(); }
  }, [isAdmin, adminTab, categories.length, fetchCategories]);
  useEffect(() => { fetchUserHistory(); }, [fetchUserHistory]);
  useEffect(() => { if (loggedUser) fetchNotifications(); }, [loggedUser, fetchNotifications]);
  useEffect(() => { fetchUserOrders(); }, [loggedUser]);

  // --- Route & session management ---
  // Sync isAdmin with route
  useEffect(() => {
    if (isAdminRoute && !isAdmin) {
      // Try to restore admin session from localStorage
      try {
        const saved = localStorage.getItem('magnata_admin');
        if (saved) {
          const { password } = JSON.parse(saved);
          if (password) {
            setAdminPassword(password);
            setIsAdmin(true);
            setShowAdminLogin(false);
            return;
          }
        }
      } catch { /* ignore */ }
      // No valid session, show login on admin route
      if (!showAdminLogin) setShowAdminLogin(true);
    } else if (!isAdminRoute && isAdmin) {
      setIsAdmin(false);
    }
  }, [isAdminRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore user session from localStorage (1-hour expiry)
  useEffect(() => {
    if (loggedUser) return; // already logged in
    try {
      const saved = localStorage.getItem('magnata_user');
      if (saved) {
        const session = JSON.parse(saved);
        const ONE_HOUR = 3600000;
        if (session.lastSeen && Date.now() - session.lastSeen < ONE_HOUR) {
          // Update lastSeen
          localStorage.setItem('magnata_user', JSON.stringify({ ...session, lastSeen: Date.now() }));
          // Verify session is still valid
          fetch('/api/auth/login', { headers: { 'x-user-id': session.id } })
            .then(r => r.json())
            .then(data => {
              if (data.user) {
                setLoggedUser(data.user);
              } else {
                localStorage.removeItem('magnata_user');
              }
            })
            .catch(() => localStorage.removeItem('magnata_user'));
        } else {
          localStorage.removeItem('magnata_user');
        }
      }
    } catch { /* ignore */ }
  }, []); // only on mount

  // Update user session lastSeen on activity
  useEffect(() => {
    if (!loggedUser) return;
    const updateSeen = () => {
      try {
        const saved = localStorage.getItem('magnata_user');
        if (saved) {
          const session = JSON.parse(saved);
          localStorage.setItem('magnata_user', JSON.stringify({ ...session, lastSeen: Date.now() }));
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(updateSeen, 60000); // update every minute
    return () => clearInterval(interval);
  }, [loggedUser]);

  // Refresh user credits after login
  const refreshUser = async () => {
    if (!loggedUser) return;
    try {
      const res = await fetch('/api/auth/login', { headers: { 'x-user-id': loggedUser.id } });
      const data = await res.json();
      if (data.user) setLoggedUser(data.user);
    } catch { /* silent */ }
  };

  // === HANDLERS ===
  const handleAdminLogin = async () => {
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) });
      const data = await res.json();
      if (data.success) {
        setIsAdmin(true);
        setShowAdminLogin(false);
        localStorage.setItem('magnata_admin', JSON.stringify({ password: adminPassword }));
        toast.success('Login admin realizado');
        // Fetch admin data directly after login
        setTimeout(async () => {
          const headers = { 'x-admin-key': adminPassword };
          try {
            const [tRes, kRes, uRes, tutRes, lnkRes, catRes] = await Promise.all([
              fetch('/api/transactions', { headers }),
              fetch('/api/keys', { headers }),
              fetch('/api/auth/register', { headers }),
              fetch('/api/tutorials', { headers }),
              fetch('/api/links', { headers }),
              fetch('/api/categories', { headers }),
            ]);
            const [tData, kData, uData, tutData, lnkData, catData] = await Promise.all([tRes.json(), kRes.json(), uRes.json(), tutRes.json(), lnkRes.json(), catRes.json()]);
            if (tData.transactions) { setTransactions(tData.transactions); setStats({ totalCredits: tData.totalCredits, totalSales: tData.totalSales }); }
            if (kData.keys) setKeys(kData.keys);
            if (uData.users) setUsers(uData.users);
            if (tutData.tutorials) setTutorials(tutData.tutorials);
            if (lnkData.links) setLinks(lnkData.links);
            if (catData.categories) setCategories(catData.categories);
          } catch (err) { console.error('Admin data fetch error:', err); }
        }, 100);
      }
      else toast.error('Senha incorreta');
    } catch { toast.error('Erro ao fazer login'); }
    finally { setLoggingIn(false); }
  };

  const handleUserLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) { toast.error('Preencha usuário e senha'); return; }
    setUserLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginUsername, password: loginPassword }) });
      const data = await res.json();
      if (data.success) {
        setLoggedUser(data.user);
        setShowUserLogin(false);
        setLoginUsername('');
        setLoginPassword('');
        localStorage.setItem('magnata_user', JSON.stringify({ id: data.user.id, username: data.user.username, displayName: data.user.displayName, credits: data.user.credits, lastSeen: Date.now() }));
        toast.success(`Bem-vindo, ${data.user.displayName}!`);
      } else toast.error(data.error || 'Erro no login');
    } catch { toast.error('Erro ao fazer login'); }
    finally { setUserLoggingIn(false); }
  };

  const handleUserLogout = () => {
    setLoggedUser(null);
    setDeliveredKey(null);
    setDeliveredKeys([]);
    localStorage.removeItem('magnata_user');
    toast.success('Desconectado');
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.displayName) { alert('Preencha todos os campos'); return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.user) {
        toast.success(`Usuario "${data.user.displayName}" criado com ${data.user.credits} creditos!`);
        setNewUser({ username: '', password: '', displayName: '', credits: '10' });
        fetchUsers();
      } else { alert('Erro: ' + (data.error || 'Erro ao criar')); toast.error(data.error || 'Erro ao criar'); }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Erro'; alert('Catch: ' + msg); }
  };

  const handleUpdateCredits = async (userId: string, credits: number) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ userId, credits }),
      });
      const data = await res.json();
      if (data.user) { toast.success(`Creditos atualizados para ${data.user.credits}`); setEditingUser(null); fetchUsers(); }
      else { alert('Erro: ' + (data.error || 'Erro')); toast.error(data.error || 'Erro'); }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Erro'; alert('Catch: ' + msg); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deletar este usuário?')) return;
    try {
      const res = await fetch(`/api/auth/register?id=${userId}`, { method: 'DELETE', headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Usuario removido'); fetchUsers(); }
      else { alert('Erro: ' + (data.error || 'Erro')); toast.error(data.error || 'Erro'); }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Erro'; alert('Catch: ' + msg); }
  };

  const handleCreateTutorial = async () => {
    if (!newTutorial.title.trim() || !newTutorial.url.trim()) { toast.error('Preencha titulo e URL do video'); return; }
    try {
      const res = await fetch('/api/tutorials', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(newTutorial),
      });
      const data = await res.json();
      if (data.tutorial) {
        toast.success(`Tutorial "${data.tutorial.title}" adicionado!`);
        setNewTutorial({ title: '', url: '' });
        fetchTutorials(true);
      } else { toast.error(data.error || 'Erro ao criar tutorial'); }
    } catch { toast.error('Erro'); }
  };

  const handleDeleteTutorial = async (id: string) => {
    if (!confirm('Remover este tutorial?')) return;
    try {
      const res = await fetch(`/api/tutorials?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Tutorial removido'); fetchTutorials(true); }
      else toast.error(data.error || 'Erro');
    } catch { toast.error('Erro'); }
  };

  const handleCreateLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) { toast.error('Preencha titulo e URL do link'); return; }
    try {
      const res = await fetch('/api/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify(newLink),
      });
      const data = await res.json();
      if (data.link) {
        toast.success(`Link "${data.link.title}" adicionado!`);
        setNewLink({ title: '', url: '', description: '' });
        fetchLinks(true);
      } else { toast.error(data.error || 'Erro ao criar link'); }
    } catch { toast.error('Erro'); }
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Remover este link?')) return;
    try {
      const res = await fetch(`/api/links?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Link removido'); fetchLinks(true); }
      else toast.error(data.error || 'Erro');
    } catch { toast.error('Erro'); }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) { toast.error('Preencha o nome da categoria'); return; }
    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() }, body: JSON.stringify(newCategory) });
      const data = await res.json();
      if (data.category) {
        toast.success(`Categoria "${data.category.name}" criada!`);
        setNewCategory({ name: '', description: '' });
        // Add to state optimistically and refetch
        const newCat = { ...data.category, productCount: 0, isActive: true, sortOrder: 0, createdAt: data.category.createdAt || new Date().toISOString(), description: data.category.description || null };
        setCategories((prev) => {
          if (prev.some(c => c.id === newCat.id)) return prev;
          return [...prev, newCat];
        });
        // Delayed refetch to confirm, merge instead of overwrite
        setTimeout(async () => {
          try {
            const r = await fetch('/api/categories', { headers: getAdminHeaders() });
            if (r.ok) {
              const d = await r.json();
              if (d.categories) setCategories(d.categories);
            }
          } catch { /* keep optimistic state */ }
        }, 500);
      } else { toast.error(data.error || 'Erro ao criar'); }
    } catch (err) {
      console.error('handleCreateCategory error:', err);
      toast.error('Erro ao criar categoria');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Desativar esta categoria? Produtos vinculados nao serao excluidos.')) return;
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      toast.success('Categoria desativada'); fetchCategories(true);
    } catch { toast.error('Erro'); }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.duration || !newProduct.credits) { toast.error('Preencha todos os campos obrigatorios'); return; }
    try {
      const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() }, body: JSON.stringify({ ...newProduct, categoryId: newProduct.categoryId || null }) });
      const data = await res.json();
      if (data.product) {
        toast.success(`"${data.product.name}" criado!`);
        setNewProduct({ name: '', description: '', duration: '', credits: '', categoryId: '' });
        fetchProducts(); fetchCategories(true);
      } else { toast.error(data.error || 'Erro ao criar'); }
    } catch { toast.error('Erro'); }
  };

  const handleAddKeys = async () => {
    if (!addingKeysTo || !newKeysText.trim()) { toast.error('Selecione produto e cole as keys'); return; }
    const codes = newKeysText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() }, body: JSON.stringify({ productId: addingKeysTo, codes }) });
      const data = await res.json();
      if (data.added > 0) { toast.success(data.message); setNewKeysText(''); fetchProducts(adminCategoryFilter || undefined); fetchKeys(addingKeysTo); }
      else toast.error(data.error || 'Nenhuma key adicionada');
    } catch { toast.error('Erro'); }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Desativar "${name}"?`)) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      toast.success('Produto desativado'); fetchProducts(adminCategoryFilter || undefined); fetchCategories(true);
    } catch { toast.error('Erro'); }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditProductForm({ name: p.name, description: p.description || '', duration: p.duration, credits: String(p.credits), categoryId: p.categoryId || '' });
  };

  const handleSaveEditProduct = async () => {
    if (!editingProduct || !editProductForm.name || !editProductForm.duration || !editProductForm.credits) { toast.error('Preencha todos os campos obrigatorios'); return; }
    try {
      const res = await fetch(`/api/products?id=${editingProduct.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...getAdminHeaders() }, body: JSON.stringify({ ...editProductForm, categoryId: editProductForm.categoryId || null }) });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${editProductForm.name}" atualizado!`);
        setEditingProduct(null);
        fetchProducts(adminCategoryFilter || undefined); fetchCategories(true);
      } else { toast.error(data.error || 'Erro ao editar'); }
    } catch { toast.error('Erro'); }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: 'DELETE', headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success) { toast.success('Key removida'); fetchKeys(selectedProductId || undefined); fetchProducts(); }
      else toast.error(data.error || 'Erro');
    } catch { toast.error('Erro'); }
  };

  const handleBuy = async (productId: string, qty: number = 1) => {
    if (!loggedUser) { setShowUserLogin(true); return; }
    setBuyingProductId(productId); setDeliveredKey(null); setDeliveredKeys([]);
    try {
      const generatedKeys: string[] = [];
      let lastProduct = '';
      let lastCredits = loggedUser.credits;

      for (let i = 0; i < qty; i++) {
        const res = await fetch('/api/buy', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': loggedUser.id }, body: JSON.stringify({ productId }) });
        const data = await res.json();
        if (data.success) {
          generatedKeys.push(data.key);
          lastProduct = data.product;
          lastCredits = data.remainingCredits;
          setLoggedUser((prev) => prev ? { ...prev, credits: data.remainingCredits } : prev);
        } else {
          toast.error(data.error || 'Erro ao gerar key ' + (i + 1));
          break;
        }
      }

      if (generatedKeys.length > 0) {
        if (generatedKeys.length === 1) {
          setDeliveredKey(generatedKeys[0]);
        } else {
          setDeliveredKeys(generatedKeys);
        }
        setDeliveredProduct(lastProduct);
        setRemainingCredits(lastCredits);
        toast.success(`${generatedKeys.length} key${generatedKeys.length > 1 ? 's' : ''} gerada${generatedKeys.length > 1 ? 's' : ''}!`);
        fetchProducts();
        fetchUserHistory();
      }
    } catch (err) { const msg = err instanceof Error ? err.message : 'Erro de rede'; toast.error(msg); }
    finally { setBuyingProductId(null); }
  };

  const copyKey = (key: string) => { navigator.clipboard.writeText(key); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); };
  const activeProducts = products.filter((p) => p.isActive);
  // User-side: categories derived from products that have a categoryId
  const userCategories = [...new Map(activeProducts.filter(p => p.categoryId).map(p => [p.categoryId!, { id: p.categoryId!, name: p.categoryName || 'Sem nome' }])).values()];
  const categoryProducts = selectedCategory ? activeProducts.filter((p) => p.categoryId === selectedCategory) : [];
  const filteredHistory = historySearch.trim()
    ? userHistory.filter((h) => h.keyCode.toLowerCase().includes(historySearch.toLowerCase()) || h.productName.toLowerCase().includes(historySearch.toLowerCase()))
    : userHistory;

  const userNavItems = [
    { group: 'Central', items: [{ icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' }] },
    { group: 'Gerador', items: [{ icon: Key, label: 'Gerar Key', tab: 'generate' }, { icon: History, label: 'Historico Keys', tab: 'history' }] },
    { group: 'Compras', items: [{ icon: ShoppingCart, label: 'Comprar Creditos', tab: 'buy' }] },
    { group: 'Instalacao', items: [{ icon: Play, label: 'Tutoriais', tab: 'tutorials' }, { icon: Link2, label: 'Links', tab: 'links' }] },
  ];

  const navItems = isAdmin
    ? [
        { group: 'Central', items: [{ icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' }] },
        { group: 'Gerador', items: [{ icon: Key, label: 'Gerar Keys', tab: 'products' }, { icon: Package, label: 'Estoque', tab: 'stock' }, { icon: History, label: 'Historico Keys', tab: 'sales' }] },
        { group: 'Instalacao', items: [{ icon: Play, label: 'Tutoriais', tab: 'tutorials' }, { icon: Link2, label: 'Links', tab: 'links' }] },
        { group: 'Sistema', items: [{ icon: User, label: 'Usuarios', tab: 'users' }, { icon: Bell, label: 'Notificacoes', tab: 'notifications' }, { icon: CreditCard, label: 'Pagamentos', tab: 'payments' }, { icon: ShoppingCart, label: 'Pedidos', tab: 'orders' }] },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white relative">
      <Starfield />

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
            <motion.nav
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] z-50 flex flex-col p-4"
              style={{ background: 'linear-gradient(180deg, rgba(8,8,8,0.78), rgba(4,4,4,0.72))', backdropFilter: 'blur(36px) saturate(180%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Key className="w-4 h-4 text-white/60" /></div>
                  <span className="text-sm font-semibold tracking-wider text-white">Gerador Magnata</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/60 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                {isAdmin ? (
                  navItems.map((g) => (
                    <div key={g.group}>
                      <p className="text-[10px] uppercase tracking-wider text-white/25 px-2 mb-2">{g.group}</p>
                      <div className="space-y-1">
                        {g.items.map((item) => (
                          <button key={item.tab} onClick={() => { setAdminTab(item.tab); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${adminTab === item.tab ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
                            <item.icon className="w-4 h-4" />{item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-6">
                    {userNavItems.map((g) => (
                      <div key={g.group}>
                        <p className="text-[10px] uppercase tracking-wider text-white/25 px-2 mb-2">{g.group}</p>
                        <div className="space-y-1">
                          {g.items.map((item) => (
                            <button key={item.tab} onClick={() => { setUserTab(item.tab); setSidebarOpen(false); }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${userTab === item.tab ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
                              <item.icon className="w-4 h-4" />{item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator className="bg-white/5 my-4" />
              {isAdmin ? (
                <button onClick={() => { localStorage.removeItem('magnata_admin'); setIsAdmin(false); router.push('/'); setSidebarOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors">
                  <Store className="w-4 h-4" />Ver Loja
                </button>
              ) : null}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="glass-nav h-12 sm:h-14 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 hover:text-white/80 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10"><Key className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/60" /></div>
            <span className="text-xs sm:text-sm font-bold tracking-wider text-white/90">Gerador Magnata</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {isAdmin ? (
            <>
              {/* Admin bell */}
              <div className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }} className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
                  <Bell className="w-4 h-4" />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">{Math.min(notifications.filter(n => !n.isRead).length, 9)}+</span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-11 z-50 bg-black/95 backdrop-blur-xl rounded-xl border border-white/[0.08] w-[calc(100vw-1.5rem)] sm:w-[320px] max-h-[400px] flex flex-col"
                      >
                        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
                          <span className="text-xs font-semibold tracking-wider text-white">Notificacoes</span>
                          <button onClick={() => { setAdminTab('notifications'); setNotifOpen(false); }} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Ver todas</button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8"><BellOff className="w-6 h-6 text-white/10 mx-auto mb-2" /><p className="text-xs text-white/20">Nenhuma notificacao</p></div>
                          ) : notifications.slice(0, 10).map((n) => (
                            <div key={n.id} className="p-3 border-b border-white/[0.03]">
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === 'credit' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-white">{n.title}</p>
                                  <p className="text-[11px] text-white/30 mt-0.5 break-words">{n.message}</p>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-white/15">
                                    {n.userName && <span>{n.userName}</span>}
                                    <span>{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-white/50 hover:text-white/80 hover:bg-white/5 text-xs tracking-wider hidden sm:flex"><Store className="w-4 h-4 mr-1.5" />LOJA</Button>
              <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem('magnata_admin'); setIsAdmin(false); router.push('/'); }} className="text-white/50 hover:text-white/80 hover:bg-white/5 text-xs tracking-wider"><LogOut className="w-4 h-4 sm:mr-1.5" />{''}</Button>
            </>
          ) : loggedUser ? (
            <div className="flex items-center gap-1">
              {/* User bell */}
              <div className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }} className="relative w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="fixed left-2 right-2 top-12 sm:absolute sm:left-auto sm:right-0 sm:w-[320px] z-50 bg-black/95 backdrop-blur-xl rounded-xl border border-white/[0.08] max-h-[70vh] flex flex-col"
                      >
                        <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
                          <span className="text-xs font-semibold tracking-wider text-white">Notificacoes</span>
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">Marcar todas como lidas</button>
                          )}
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8"><BellOff className="w-6 h-6 text-white/10 mx-auto mb-2" /><p className="text-xs text-white/20">Nenhuma notificacao</p></div>
                          ) : notifications.map((n) => (
                            <div key={n.id} onClick={() => handleMarkNotifRead(n.id)} className={`p-3 border-b border-white/[0.03] cursor-pointer transition-colors hover:bg-white/[0.03] ${!n.isRead ? 'bg-white/[0.02]' : ''}`}>
                              <div className="flex items-start gap-2">
                                {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium ${!n.isRead ? 'text-white' : 'text-white/60'}`}>{n.title}</p>
                                  <p className="text-[11px] text-white/30 mt-0.5 break-words">{n.message}</p>
                                  <p className="text-[10px] text-white/15 mt-1">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5">
                <Wallet className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-400">{loggedUser.credits}</span>
              </div>
              <button onClick={handleUserLogout} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"><LogOut className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowUserLogin(true)} className="text-white/50 hover:text-white/80 hover:bg-white/5 text-xs tracking-wider"><LogIn className="w-4 h-4 mr-1.5" />LOGIN</Button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full p-4 md:p-6">
        <AnimatePresence mode="wait">
          {!isAdmin ? (
            /* ====== STORE VIEW ====== */
            <motion.div key="store" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              {deliveredKey || deliveredKeys.length > 0 ? (
                <div className="max-w-lg mx-auto mt-8">
                  <div className="glass-strong rounded-xl p-8 text-center space-y-5">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-emerald-400" /></div>
                      <h2 className="text-lg font-bold tracking-wider text-white">{deliveredKeys.length > 1 ? `${deliveredKeys.length} Keys Geradas` : 'Key Gerada'}</h2>
                      <p className="text-sm text-white/50 mt-1">{deliveredProduct}</p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                      {deliveredKeys.length > 0 ? (
                        <div className="space-y-2 text-left">
                          {deliveredKeys.map((k, i) => (
                            <div key={i} className="glass-input rounded-xl p-3 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] text-white/20 shrink-0">#{i + 1}</span>
                                <code className="text-emerald-400 font-mono text-xs break-all">{k}</code>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => copyKey(k)} className="text-white/30 hover:text-white/60 shrink-0">
                                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          ))}
                          <button onClick={() => { navigator.clipboard.writeText(deliveredKeys.join('\n')); toast.success('Todas as keys copiadas!'); }} className="w-full mt-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-[11px] tracking-wider transition-colors">COPIAR TODAS</button>
                        </div>
                      ) : deliveredKey ? (
                        <div className="glass-input rounded-xl p-4 flex items-center justify-between gap-3">
                          <code className="text-emerald-400 font-mono text-sm break-all text-left">{deliveredKey}</code>
                          <Button size="sm" variant="ghost" onClick={() => copyKey(deliveredKey)} className="text-white/30 hover:text-white/60 shrink-0">
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      ) : null}
                      <p className="text-[11px] text-white/20 mt-3">Copie sua{deliveredKeys.length > 1 ? 's' : ''} key{deliveredKeys.length > 1 ? 's' : ''} agora. Ela{deliveredKeys.length > 1 ? 's' : ''} nao sera{deliveredKeys.length === 1 ? '' : 'o'} exibida{deliveredKeys.length === 1 ? '' : 's'} novamente.</p>
                      <p className="text-[11px] text-amber-400/60 mt-1">Créditos restantes: {remainingCredits}</p>
                    </motion.div>
                    <Button variant="ghost" onClick={() => { setDeliveredKey(null); setDeliveredKeys([]); refreshUser(); }} className="text-white/40 hover:text-white/70 hover:bg-white/5 text-xs tracking-wider">COMPRAR OUTRA</Button>
                  </div>
                </div>
              ) : (
                <Tabs value={userTab} onValueChange={(v) => { setUserTab(v); setUserMenuOpen(false); }}>
                  <div className="relative mb-4">
                    <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {userMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 top-12 z-50 glass-strong rounded-xl border border-white/[0.08] p-1.5 min-w-[180px]"
                          >
                            {[
                              { value: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                              { value: 'generate', icon: Key, label: 'Gerar Key' },
                              { value: 'history', icon: History, label: 'Historico Keys' },
                              { value: 'tutorials', icon: Play, label: 'Tutoriais' },
                              { value: 'links', icon: Link2, label: 'Links' },
                            ].map((t) => (
                              <button
                                key={t.value}
                                onClick={() => { setUserTab(t.value); setUserMenuOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wider transition-colors ${userTab === t.value ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/70'}`}
                              >
                                <t.icon className="w-3.5 h-3.5" />{t.label}
                              </button>
                            ))}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                <TabsContent value="dashboard" className="mt-0">
                <div>
                  {loggedUser ? (
                    <>
                      <div className="mb-6">
                        <h1 className="text-xl font-bold tracking-wider text-white">
                          {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, {loggedUser.displayName}!
                        </h1>
                        <p className="text-sm text-white/40 mt-1">Bem-vindo ao Gerador Magnata</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                          <div className="glass rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-amber-400" /><span className="text-[10px] uppercase tracking-wider text-white/30">Saldo Atual</span></div>
                            <p className="text-2xl font-bold text-amber-400">{loggedUser.credits}</p>
                            <p className="text-[11px] text-white/20 mt-1">creditos disponiveis</p>
                          </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          <div className="glass rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2"><Key className="w-4 h-4 text-emerald-400" /><span className="text-[10px] uppercase tracking-wider text-white/30">Keys Geradas</span></div>
                            <p className="text-2xl font-bold text-white">{userTotalKeys}</p>
                            <p className="text-[11px] text-white/20 mt-1">{userTotalCreditsUsed} creditos utilizados</p>
                          </div>
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <div className="glass rounded-xl p-12 text-center">
                      <Lock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 mb-4">Faca login para ver seu dashboard.</p>
                      <button onClick={() => setShowUserLogin(true)} className="h-10 px-6 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors">FAZER LOGIN</button>
                    </div>
                  )}
                </div>
                </TabsContent>

                <TabsContent value="generate" className="mt-0">
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <Key className="w-5 h-5 text-white/40" />
                    <h1 className="text-xl font-bold tracking-wider text-white">Gerar Keys</h1>
                  </div>
                  {loadingProducts ? (
                    <div className="glass rounded-xl p-6 space-y-4"><div className="skeleton-shimmer h-5 w-48 rounded-lg" /><div className="skeleton-shimmer h-12 w-full rounded-xl" /><div className="skeleton-shimmer h-12 w-full rounded-xl" /></div>
                  ) : activeProducts.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center"><Package className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/30">Nenhum produto disponivel.</p></div>
                  ) : !loggedUser ? (
                    <div className="glass rounded-xl p-12 text-center">
                      <Lock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 mb-4">Faca login para gerar keys.</p>
                      <button onClick={() => setShowUserLogin(true)} className="h-10 px-6 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors">FAZER LOGIN</button>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-5 space-y-4 max-w-md">
                      {/* Dropdown 1: Selecionar Categoria */}
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-white/30 mb-2 block">Selecionar Categoria</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => { setSelectedCategory(e.target.value); setSelectedProductId(''); setGenerateQuantity(1); }}
                          className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white bg-transparent"
                        >
                          <option value="">Selecione...</option>
                          {userCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown 2: Selecionar Tipo da Key */}
                      {selectedCategory && (
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-white/30 mb-2 block">Selecionar Tipo da Key</label>
                          <select
                            value={selectedProductId}
                            onChange={(e) => { setSelectedProductId(e.target.value); setGenerateQuantity(1); }}
                            className="glass-input w-full rounded-xl px-4 py-3 text-sm text-white bg-transparent"
                          >
                            <option value="">Selecione</option>
                            {categoryProducts.map((p) => (
                              <option key={p.id} value={p.id} disabled={p._count.keys === 0}>
                                Key {p.duration} ({p.credits} cr.) {p._count.keys === 0 ? '— ESGOTADO' : `— ${p._count.keys} disp.`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Product details + quantity */}
                      {selectedProductId && (() => {
                        const prod = activeProducts.find((p) => p.id === selectedProductId);
                        if (!prod) return null;
                        const totalCost = prod.credits * generateQuantity;
                        const maxQty = Math.min(Math.floor(loggedUser.credits / prod.credits), prod._count.keys);
                        return (
                          <div className="space-y-3 px-1">
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span className="text-white/40">Estoque</span><span className={prod._count.keys > 0 ? 'text-white/80' : 'text-red-400'}>{prod._count.keys} disponiveis</span></div>
                              <div className="flex justify-between text-xs"><span className="text-white/40">Seus creditos</span><span className={loggedUser.credits >= prod.credits ? 'text-amber-400 font-semibold' : 'text-red-400 font-semibold'}>{loggedUser.credits} cr.</span></div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                              <label className="text-[11px] uppercase tracking-wider text-white/30 mb-2 block">Quantidade de keys</label>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setGenerateQuantity((q) => Math.max(1, q - 1))}
                                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center text-lg font-medium transition-colors"
                                >-</button>
                                <input
                                  type="number"
                                  min={1}
                                  max={maxQty || 1}
                                  value={generateQuantity}
                                  onChange={(e) => { const v = Math.max(1, Math.min(maxQty || 1, Number(e.target.value) || 1)); setGenerateQuantity(v); }}
                                  className="glass-input w-20 rounded-xl px-3 py-2.5 text-sm text-white text-center font-semibold"
                                />
                                <button
                                  onClick={() => setGenerateQuantity((q) => Math.min(maxQty || 1, q + 1))}
                                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center text-lg font-medium transition-colors"
                                >+</button>
                              </div>
                              <p className="text-[11px] text-white/20 mt-1.5">Max: {maxQty} key{maxQty !== 1 ? 's' : ''} | Total: <span className="text-emerald-400/70">{totalCost} cr.</span></p>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        disabled={!selectedProductId || buyingProductId === selectedProductId || (() => { const p = activeProducts.find((p) => p.id === selectedProductId); return p ? (p._count.keys === 0 || loggedUser.credits < p.credits * generateQuantity) : true; })()}
                        onClick={() => selectedProductId && handleBuy(selectedProductId, generateQuantity)}
                        className="w-full h-11 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {buyingProductId === selectedProductId ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Gerando {generateQuantity > 1 ? `${generateQuantity} keys...` : '...'}</>) : (<><Key className="w-4 h-4" /> GERAR {generateQuantity > 1 ? `${generateQuantity} KEYS` : 'KEYS'}</>)}
                      </button>
                    </div>
                  )}
                </>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <History className="w-5 h-5 text-white/40" />
                    <h1 className="text-xl font-bold tracking-wider text-white">Historico de Keys</h1>
                  </div>
                  <p className="text-sm text-white/30 mb-4">Visualize todas as suas keys geradas</p>
                  {!loggedUser ? (
                    <div className="glass rounded-xl p-12 text-center">
                      <Lock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 mb-4">Faca login para ver seu historico.</p>
                      <button onClick={() => setShowUserLogin(true)} className="h-10 px-6 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors">FAZER LOGIN</button>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          placeholder="Buscar por key..."
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20"
                        />
                        <button onClick={fetchUserHistory} className="text-white/30 hover:text-white/60 transition-colors p-2"><RefreshCw className="w-4 h-4" /></button>
                      </div>
                      <p className="text-[11px] text-white/20 mb-3">{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''}</p>
                      <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-1">
                        {filteredHistory.length === 0 ? (
                          <div className="text-center py-8"><History className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">{historySearch ? 'Nenhum resultado.' : 'Nenhuma key gerada.'}</p></div>
                        ) : filteredHistory.map((h) => (
                          <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-emerald-400/80 truncate">{h.keyCode}</code>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-white/30">
                                <span>{h.productName}</span>
                                <span className="text-amber-400/60">{h.credits} cr.</span>
                                <span>{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                              </div>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(h.keyCode); toast.success('Key copiada!'); }} className="text-white/20 hover:text-white/60 transition-colors p-1.5 shrink-0">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </TabsContent>

                <TabsContent value="tutorials" className="mt-0">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Play className="w-5 h-5 text-white/40" />
                    <h1 className="text-xl font-bold tracking-wider text-white">Tutoriais</h1>
                  </div>
                  {userTutorials.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center"><Play className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/30">Nenhum tutorial disponivel.</p></div>
                  ) : (
                    <div className="space-y-4">
                      {userTutorials.map((t) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="glass rounded-xl overflow-hidden">
                          <p className="text-sm font-semibold text-white px-5 pt-4 pb-2">{t.title}</p>
                          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={t.embedUrl}
                              title={t.title}
                              className="absolute inset-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                </TabsContent>

                <TabsContent value="links" className="mt-0">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Link2 className="w-5 h-5 text-white/40" />
                    <h1 className="text-xl font-bold tracking-wider text-white">Links</h1>
                  </div>
                  {userLinks.length === 0 ? (
                    <div className="glass rounded-xl p-12 text-center"><Link2 className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/30">Nenhum link disponivel.</p></div>
                  ) : (
                    <div className="space-y-3">
                      {userLinks.map((lnk, i) => (
                        <motion.a
                          key={lnk.id}
                          href={lnk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3 }}
                          className="glass glass-hover rounded-xl p-4 flex items-center gap-4 group cursor-pointer block"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                            <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white group-hover:text-white/90 transition-colors">{lnk.title}</p>
                            {lnk.description && <p className="text-xs text-white/30 mt-0.5 truncate">{lnk.description}</p>}
                            <p className="text-[11px] text-white/15 mt-1 truncate">{lnk.url}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.a>
                      ))}
                    </div>
                  )}
                </div>
                </TabsContent>

                {/* Buy Credits Tab */}
                <TabsContent value="buy" className="mt-0">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <ShoppingCart className="w-5 h-5 text-white/40" />
                    <h1 className="text-xl font-bold tracking-wider text-white">Comprar Creditos</h1>
                  </div>

                  {/* Step 1: Package Selection */}
                  {buyStep === 'packages' && (
                    <div className="space-y-3">
                      <p className="text-sm text-white/40 mb-4">Escolha um pacote de creditos para comprar via PIX:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {creditPackages.map((pkg, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleSelectPackage(pkg)}
                            className="glass glass-hover rounded-xl p-5 cursor-pointer relative overflow-hidden group"
                          >
                            {pkg.popular && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-white/70 tracking-wider">POPULAR</div>
                            )}
                            <div className="flex items-center gap-2 mb-3">
                              <Coins className="w-5 h-5 text-amber-400/70" />
                              <span className="text-2xl font-bold text-white">{pkg.credits}</span>
                              <span className="text-xs text-white/30">creditos</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs text-white/40">R$</span>
                              <span className="text-xl font-bold text-white">{pkg.price}</span>
                              <span className="text-[10px] text-white/30 line-through ml-1">R${(pkg.credits * 1).toFixed(0)}</span>
                            </div>
                            {pkg.credits / pkg.price > 1 && (
                              <p className="text-[10px] text-green-400/60 mt-2">Economia de {Math.round((1 - pkg.price / pkg.credits) * 100)}%</p>
                            )}
                            <div className="mt-4 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-medium text-white/50 group-hover:bg-white group-hover:text-black transition-colors">
                              Selecionar
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Form */}
                  {buyStep === 'form' && selectedPkg && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md">
                      <button onClick={() => setBuyStep('packages')} className="text-xs text-white/30 hover:text-white/60 transition-colors mb-4 flex items-center gap-1"><ArrowRight className="w-3 h-3 rotate-180" /> Voltar aos pacotes</button>
                      <div className="glass rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-400/70" />
                            <span className="text-sm font-semibold text-white">{selectedPkg.credits} creditos</span>
                          </div>
                          <span className="text-lg font-bold text-white">R$ {selectedPkg.price.toFixed(2)}</span>
                        </div>
                        <div>
                          <label className="text-[11px] text-white/40 font-medium tracking-wider mb-1.5 block">NOME COMPLETO</label>
                          <input placeholder="Seu nome completo" value={buyForm.name} onChange={(e) => setBuyForm({ ...buyForm, name: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/40 font-medium tracking-wider mb-1.5 block">EMAIL</label>
                          <input type="email" placeholder="seuemail@email.com" value={buyForm.email} onChange={(e) => setBuyForm({ ...buyForm, email: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/40 font-medium tracking-wider mb-1.5 block">CPF</label>
                          <input placeholder="000.000.000-00" value={buyForm.cpf} onChange={(e) => setBuyForm({ ...buyForm, cpf: e.target.value })} maxLength={14} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                        </div>
                        <button onClick={handleSubmitBuy} disabled={buyLoading} className="w-full h-11 rounded-xl bg-white text-black text-xs font-semibold tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                          {buyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          {buyLoading ? 'CRIANDO PEDIDO...' : 'IR PARA PAGAMENTO PIX'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: PIX Info */}
                  {buyStep === 'pix' && selectedPkg && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md">
                      <div className="glass rounded-xl p-5 space-y-4">
                        <div className="text-center pb-3 border-b border-white/[0.06]">
                          <CheckCircle className="w-10 h-10 text-green-400/60 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-white">Pedido #{createdOrderId.slice(0, 8)}</p>
                          <p className="text-2xl font-bold text-white mt-1">R$ {selectedPkg.price.toFixed(2)}</p>
                          <p className="text-xs text-white/40">{selectedPkg.credits} creditos</p>
                        </div>

                        <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
                          <p className="text-xs text-white/50 font-medium tracking-wider text-center">FACA O PIX PARA:</p>
                          <div className="text-center">
                            <p className="text-[11px] text-white/30">Chave PIX (Email)</p>
                            <p className="text-sm font-mono font-bold text-white mt-1 break-all">adrianviniciusdeoliveira1725@gmail.com</p>
                          </div>
                          <div className="border-t border-white/[0.06] pt-3">
                            <p className="text-[11px] text-white/30">Nome do titular</p>
                            <p className="text-sm font-semibold text-white mt-0.5">ADRIAN VINICIUS DE OLIVEIRA</p>
                          </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                          <p className="text-[11px] text-amber-400/80 text-center">
                            Apos fazer o PIX, aguarde a confirmacao do admin. Voce recebera uma notificacao quando os creditos forem adicionados.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => { setBuyStep('packages'); setSelectedPkg(null); setBuyForm({ name: '', email: '', cpf: '' }); }} className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 text-xs font-medium tracking-wider hover:bg-white/10 transition-colors">
                            Novo Pedido
                          </button>
                          <button onClick={() => setBuyStep('done')} className="flex-1 h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors">
                            Ja paguei
                          </button>
                        </div>
                      </div>

                      {/* User's order history */}
                      {userOrders.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm font-semibold tracking-wider text-white/60 mb-3">Meus Pedidos</h3>
                          <div className="space-y-2">
                            {userOrders.map((o) => (
                              <div key={o.id} className="glass rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-medium text-white">{o.credits} creditos — R${Number(o.amount).toFixed(2)}</p>
                                  <p className="text-[10px] text-white/30">{new Date(o.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <Badge className={o.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : o.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>
                                  {o.status === 'approved' ? 'Aprovado' : o.status === 'rejected' ? 'Recusado' : 'Pendente'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 4: Done */}
                  {buyStep === 'done' && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center py-8">
                      <Clock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Pagamento em analise</h3>
                      <p className="text-sm text-white/40 mb-6">Seu pagamento sera confirmado em breve pelo admin. Voce recebera uma notificacao assim que os creditos forem adicionados a sua conta.</p>
                      <button onClick={() => { setBuyStep('packages'); setSelectedPkg(null); fetchUserOrders(); }} className="h-10 px-6 rounded-xl bg-white/5 text-white/60 text-xs font-medium tracking-wider hover:bg-white/10 transition-colors">
                        Voltar aos pacotes
                      </button>
                    </motion.div>
                  )}
                </div>
                </TabsContent>
                </Tabs>
              )}
            </motion.div>
          ) : (
            /* ====== ADMIN VIEW ====== */
            <motion.div key="admin" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Produtos Ativos', value: activeProducts.length, color: 'text-white' },
                  { label: 'Vendas Totais', value: stats.totalSales, color: 'text-white' },
                  { label: 'Usuarios', value: users.length, color: 'text-blue-400' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="glass rounded-xl p-4"><p className="text-[10px] uppercase tracking-wider text-white/30">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>
                  </motion.div>
                ))}
              </div>

              <Tabs value={adminTab} onValueChange={setAdminTab}>
                <div className="space-y-2 mb-4">
                  {/* Central */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/20 px-1">Central</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-full sm:w-auto">
                    {[
                      { value: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    ].map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg text-xs tracking-wider gap-1.5">
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {/* Gerador */}
                  <div className="flex items-center gap-2 mb-1 mt-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/20 px-1">Gerador</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-full sm:w-auto">
                    {[
                      { value: 'products', icon: Key, label: 'Gerar Keys' },
                      { value: 'stock', icon: Package, label: 'Estoque' },
                      { value: 'sales', icon: History, label: 'Historico Keys' },
                    ].map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg text-xs tracking-wider gap-1.5">
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {/* Instalacao */}
                  <div className="flex items-center gap-2 mb-1 mt-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/20 px-1">Instalacao</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-full sm:w-auto">
                    {[
                      { value: 'tutorials', icon: Play, label: 'Tutoriais' },
                      { value: 'links', icon: Link2, label: 'Links' },
                    ].map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg text-xs tracking-wider gap-1.5">
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {/* Sistema */}
                  <div className="flex items-center gap-2 mb-1 mt-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/20 px-1">Sistema</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  <TabsList className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-full sm:w-auto">
                    {[
                      { value: 'users', icon: User, label: 'Usuarios' },
                      { value: 'notifications', icon: Bell, label: 'Notificacoes' },
                    ].map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded-lg text-xs tracking-wider gap-1.5">
                        <t.icon className="w-3.5 h-3.5" />{t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-5">
                      <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-white/40" />Vendas Recentes</h3>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                        {transactions.length === 0 ? (<p className="text-sm text-white/20 text-center py-6">Nenhuma venda.</p>) : transactions.slice(0, 10).map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2"><span className="text-sm text-white">{t.productName}</span><Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">{t.credits} cr.</Badge></div>
                              <p className="text-[10px] text-white/25 mt-0.5">{t.buyerInfo}</p>
                            </div>
                            <span className="text-[10px] text-white/20 shrink-0 ml-2">{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-5">
                      <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-white/40" />Resumo por Categoria</h3>
                      <div className="space-y-2">
                        {categories.filter(c => c.isActive).length === 0 ? (
                          <p className="text-sm text-white/20 text-center py-6">Nenhuma categoria.</p>
                        ) : categories.filter(c => c.isActive).map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                            <span className="text-sm text-white">{c.name}</span>
                            <span className="text-xs text-white/40">{c.productCount} produto{c.productCount !== 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                {/* Products Tab (Gerar Keys) */}
                <TabsContent value="products" className="space-y-3 mt-0">
                  {/* Quick Create Category */}
                  <div className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5 text-blue-400/60" />
                        <h3 className="text-xs font-semibold tracking-wider text-white/60">Categorias</h3>
                      </div>
                      <button onClick={() => setCatListOpen(!catListOpen)} className="text-white/30 hover:text-white/60 transition-colors text-[11px]">{catListOpen ? 'Ocultar' : 'Ver todas'}</button>
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Ex: IOS, Android, Windows..." value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20" />
                      <button onClick={handleCreateCategory} className="h-9 px-4 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-medium tracking-wider hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5 border border-blue-500/20 shrink-0"><Plus className="w-3.5 h-3.5" />CATEGORIA</button>
                    </div>
                    {catListOpen && (
                      <div className="mt-3 max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                        {categories.length === 0 ? (<p className="text-xs text-white/20 text-center py-3">Nenhuma categoria criada.</p>) : categories.map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-white">{c.name}</span>
                              <span className="text-[10px] text-white/25">{c.productCount} prod.</span>
                              {!c.isActive && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px]">Inativa</Badge>}
                            </div>
                            <button onClick={() => handleDeleteCategory(c.id)} className="text-white/20 hover:text-red-400 transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Create Product */}
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-white/40" />Novo Produto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white/80">
                        <option value="">Sem categoria</option>
                        {categories.filter(c => c.isActive).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                      <input placeholder="Nome" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input placeholder="Duracao (1 dia)" value={newProduct.duration} onChange={(e) => setNewProduct({ ...newProduct, duration: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input type="number" placeholder="Creditos" value={newProduct.credits} onChange={(e) => setNewProduct({ ...newProduct, credits: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <button onClick={handleCreateProduct} className="h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" />CRIAR</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Produtos Cadastrados</h3>
                      <div className="flex gap-2 items-center">
                        <select value={adminCategoryFilter} onChange={(e) => { setAdminCategoryFilter(e.target.value); fetchProducts(e.target.value || undefined); }} className="glass-input rounded-lg px-2 py-1 text-[11px] text-white/60"><option value="">Todas categorias</option>{categories.filter(c => c.isActive).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
                        <button onClick={() => fetchProducts(adminCategoryFilter || undefined)} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
                      {products.length === 0 ? (<p className="text-sm text-white/30 text-center py-6">Nenhum produto.</p>) : products.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium text-white">{p.name}</span>{p.categoryName && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] shrink-0"><Tag className="w-2.5 h-2.5 mr-0.5" />{p.categoryName}</Badge>}{!p.isActive && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] shrink-0">Inativo</Badge>}</div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40"><span>{p.duration}</span><span className="text-emerald-400">{p.credits} cr.</span><span className={p._count.keys > 0 ? 'text-emerald-400' : 'text-red-400'}>{p._count.keys} keys</span></div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEditProduct(p)} className="text-white/20 hover:text-amber-400 transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-white/20 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Stock Tab */}
                <TabsContent value="stock" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-1 flex items-center gap-2"><Plus className="w-4 h-4 text-white/40" />Adicionar Keys</h3>
                    <p className="text-[11px] text-white/25 mb-4">Cole uma key por linha</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <select value={addingKeysTo} onChange={(e) => setAddingKeysTo(e.target.value)} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white/80">
                        <option value="">Selecione...</option>
                        {products.filter((p) => p.isActive).map((p) => (<option key={p.id} value={p.id}>{p.categoryName ? `[${p.categoryName}] ` : ''}{p.name} ({p.credits} cr.)</option>))}
                      </select>
                      <div className="sm:col-span-2"><Textarea value={newKeysText} onChange={(e) => setNewKeysText(e.target.value)} rows={3} placeholder="Cole as keys aqui..." className="glass-input rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-white/15 resize-none min-h-[88px]" /></div>
                      <button onClick={handleAddKeys} disabled={!addingKeysTo || !newKeysText.trim()} className="h-auto rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5 py-3"><Plus className="w-3.5 h-3.5" />ADICIONAR</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Keys Cadastradas</h3>
                      <div className="flex gap-2 items-center">
                        <select value={selectedProductId} onChange={(e) => { setSelectedProductId(e.target.value); fetchKeys(e.target.value || undefined); }} className="glass-input rounded-lg px-2 py-1 text-[11px] text-white/60"><option value="">Todos</option>{products.map((p) => (<option key={p.id} value={p.id}>{p.categoryName ? `[${p.categoryName}] ` : ''}{p.name}</option>))}</select>
                        <button onClick={() => fetchKeys(selectedProductId || undefined)} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                      {keys.length === 0 ? (<div className="text-center py-8"><Hash className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhuma key.</p></div>) : keys.map((k) => (
                        <div key={k.id} className={`flex items-center justify-between p-2.5 rounded-lg ${k.isSold ? 'opacity-40' : 'bg-white/[0.02]'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><code className="text-xs font-mono text-white/80 truncate">{k.code}</code>{k.isSold ? <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Vendida</Badge> : <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Disponivel</Badge>}</div>
                            <p className="text-[10px] text-white/25 mt-0.5">{k.product.name} — {k.product.duration}</p>
                          </div>
                          {!k.isSold && <button onClick={() => handleDeleteKey(k.id)} className="text-white/20 hover:text-red-400 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales" className="mt-0">
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-white/40" />Historico de Vendas</h3>
                      <button onClick={fetchTransactions} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                      {transactions.length === 0 ? (<div className="text-center py-8"><History className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhuma venda.</p></div>) : transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><span className="text-sm font-medium text-white">{t.productName}</span><Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">{t.credits} cr.</Badge></div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-white/30"><span>{t.buyerInfo}</span><code className="text-emerald-400/70 font-mono">{t.key.code}</code></div>
                          </div>
                          <span className="text-[11px] text-white/20 shrink-0 ml-3">{new Date(t.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-white/40" />Novo Usuario</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <input placeholder="Usuario" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input type="password" placeholder="Senha" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input placeholder="Nome visivel" value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input type="number" placeholder="Creditos" value={newUser.credits} onChange={(e) => setNewUser({ ...newUser, credits: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <button onClick={handleCreateUser} className="h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />CRIAR</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Usuarios Cadastrados</h3>
                      <button onClick={fetchUsers} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                      {users.length === 0 ? (<div className="text-center py-8"><User className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhum usuario.</p></div>) : users.map((u) => (
                        <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg bg-white/[0.02] ${!u.isActive ? 'opacity-40' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{u.displayName}</span>
                              {!u.isActive && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Inativo</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40">
                              <span>@{u.username}</span>
                              <span className="text-white/20">desde {new Date(u.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingUser === u.id ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={editCredits} onChange={(e) => setEditCredits(e.target.value)} className="glass-input rounded-lg px-2 py-1 text-xs text-white w-20" />
                                <button onClick={() => handleUpdateCredits(u.id, Number(editCredits))} className="text-emerald-400 hover:text-emerald-300 p-1"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingUser(null)} className="text-white/30 hover:text-white/60 p-1"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingUser(u.id); setEditCredits(String(u.credits)); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                                <Coins className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400">{u.credits}</span>
                              </button>
                            )}
                            <button onClick={() => handleDeleteUser(u.id)} className="text-white/20 hover:text-red-400 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tutorials Tab */}
                <TabsContent value="tutorials" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><Play className="w-4 h-4 text-white/40" />Adicionar Tutorial</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input placeholder="Titulo do video" value={newTutorial.title} onChange={(e) => setNewTutorial({ ...newTutorial, title: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input placeholder="URL do video (YouTube...)" value={newTutorial.url} onChange={(e) => setNewTutorial({ ...newTutorial, url: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <button onClick={handleCreateTutorial} className="h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"><Play className="w-3.5 h-3.5" />ADICIONAR</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Tutoriais Cadastrados</h3>
                      <button onClick={() => fetchTutorials(true)} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {tutorials.length === 0 ? (
                        <div className="text-center py-8"><Play className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhum tutorial.</p></div>
                      ) : tutorials.map((t) => (
                        <div key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{t.title}</p>
                            <p className="text-[11px] text-white/30 mt-0.5 truncate">{t.url}</p>
                          </div>
                          <button onClick={() => handleDeleteTutorial(t.id)} className="text-white/20 hover:text-red-400 transition-colors p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Links Tab */}
                <TabsContent value="links" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-white/40" />Adicionar Link</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input placeholder="Titulo do link" value={newLink.title} onChange={(e) => setNewLink({ ...newLink, title: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input placeholder="URL (https://...)" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <input placeholder="Descricao (opcional)" value={newLink.description} onChange={(e) => setNewLink({ ...newLink, description: e.target.value })} className="glass-input rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <button onClick={handleCreateLink} className="h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" />ADICIONAR</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Links Cadastrados</h3>
                      <button onClick={() => fetchLinks(true)} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                      {links.length === 0 ? (
                        <div className="text-center py-8"><Link2 className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhum link.</p></div>
                      ) : links.map((l) => (
                        <div key={l.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.02]">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{l.title}</p>
                              {!l.isActive && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">Inativo</Badge>}
                            </div>
                            <p className="text-[11px] text-white/30 mt-0.5 truncate">{l.url}</p>
                            {l.description && <p className="text-[11px] text-white/20 mt-0.5">{l.description}</p>}
                          </div>
                          <button onClick={() => handleDeleteLink(l.id)} className="text-white/20 hover:text-red-400 transition-colors p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4 text-white/40" />Enviar Aviso</h3>
                    <div className="space-y-3">
                      <select value={newAnnouncement.userId} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, userId: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white/80">
                        <option value="">Todos os usuarios</option>
                        {users.filter(u => u.isActive).map((u) => (<option key={u.id} value={u.id}>{u.displayName} (@{u.username})</option>))}
                      </select>
                      <input placeholder="Titulo do aviso" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
                      <Textarea value={newAnnouncement.message} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} rows={3} placeholder="Mensagem do aviso..." className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/15 resize-none min-h-[80px]" />
                      <button onClick={handleSendAnnouncement} className="h-10 px-6 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"><Megaphone className="w-3.5 h-3.5" />ENVIAR AVISO</button>
                    </div>
                  </div>
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white">Notificacoes Enviadas</h3>
                      <button onClick={fetchNotifications} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-1">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8"><BellOff className="w-8 h-8 text-white/10 mx-auto mb-2" /><p className="text-sm text-white/20">Nenhuma notificacao.</p></div>
                      ) : notifications.map((n) => (
                        <div key={n.id} className="flex items-start justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">{n.title}</span>
                              <Badge className={`text-[10px] ${n.type === 'credit' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{n.type === 'credit' ? 'Creditos' : 'Aviso'}</Badge>
                            </div>
                            <p className="text-[11px] text-white/40 mt-1 break-words">{n.message}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/20">
                              {n.userName && <span>{n.userName}</span>}
                              <span>{new Date(n.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteNotification(n.id)} className="text-white/20 hover:text-red-400 transition-colors p-1 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Payments / PIX Tab */}
                <TabsContent value="payments" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4 text-white/40" />Verificar Pagamentos PIX</h3>
                    <p className="text-[11px] text-white/30 mb-4">Verifica automaticamente novos pagamentos PIX recebidos via email do Nubank. O usuario deve colocar o username na descricao do PIX.</p>
                    <button onClick={handleCheckPix} disabled={pixChecking} className="h-10 px-6 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {pixChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {pixChecking ? 'VERIFICANDO...' : 'VERIFICAR PAGAMENTOS'}
                    </button>
                  </div>

                  {pixResults.length > 0 && (
                    <div className="glass rounded-xl p-5">
                      <h3 className="text-sm font-semibold tracking-wider text-white mb-4">Resultados</h3>
                      <div className="space-y-2">
                        {pixResults.map((r, i) => (
                          <div key={i} className={`p-3 rounded-lg border ${r.credited ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.02] border-white/[0.05]'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-white">R$ {r.amount.toFixed(2)}</span>
                              <Badge className={r.credited ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                {r.credited ? 'Creditado' : 'Nao creditado'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-white/40">Remetente: {r.senderName}</p>
                            <p className="text-[11px] text-white/40">Descricao: {r.description || '(vazio)'}</p>
                            {r.username && <p className="text-[11px] text-blue-400">Usuario: @{r.username} — +{r.creditsAdded} creditos</p>}
                            <p className="text-[10px] text-white/25 mt-1">{r.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="glass rounded-xl p-5">
                    <h3 className="text-sm font-semibold tracking-wider text-white mb-3">Como funciona</h3>
                    <div className="space-y-2 text-[11px] text-white/40">
                      <p>1. O usuario faz um PIX para sua chave</p>
                      <p>2. Na descricao do PIX, o usuario coloca o <span className="text-white/70 font-medium">username</span> dele no site</p>
                      <p>3. O Nubank envia um email de notificacao para seu Gmail</p>
                      <p>4. Voce clica em <span className="text-white/70 font-medium">"Verificar Pagamentos"</span> acima</p>
                      <p>5. O sistema lê os emails, encontra o username na descricao e credita automaticamente</p>
                      <p className="text-white/60 mt-3">Cada R$1,00 = 1 credito adicionado ao usuario</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Orders Tab (Admin) */}
                <TabsContent value="orders" className="space-y-3 mt-0">
                  <div className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold tracking-wider text-white flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-white/40" />Pedidos de Compra</h3>
                      <div className="flex items-center gap-2">
                        {['pending', 'approved', 'rejected'].map((s) => (
                          <button key={s} onClick={() => { setOrderFilter(s); fetchAdminOrders(s); }} className={`px-3 py-1 rounded-lg text-[10px] font-medium tracking-wider transition-colors ${orderFilter === s ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white/60'}`}>
                            {s === 'pending' ? 'Pendentes' : s === 'approved' ? 'Aprovados' : 'Recusados'}
                            {s === 'pending' && adminOrders.filter((o: any) => o.status === 'pending').length > 0 && (
                              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px]">{adminOrders.length}</span>
                            )}
                          </button>
                        ))}
                        <button onClick={() => fetchAdminOrders()} className="text-white/30 hover:text-white/60 transition-colors p-1"><RefreshCw className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {adminOrders.length === 0 ? (
                      <div className="text-center py-12"><ShoppingCart className="w-10 h-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/20">Nenhum pedido {orderFilter === 'pending' ? 'pendente' : ''}.</p></div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {adminOrders.map((order: any) => (
                          <div key={order.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                    <Coins className="w-5 h-5 text-amber-400/70" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-white">R$ {Number(order.amount).toFixed(2)}</span>
                                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">{order.credits} creditos</Badge>
                                    </div>
                                    <p className="text-[11px] text-white/30 mt-0.5">
                                      {order.userDisplayName || order.username ? `@${order.username}` : 'Usuario'}
                                      <span className="mx-1.5">|</span>
                                      {new Date(order.createdAt).toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <p className="text-[10px] text-white/25 tracking-wider">NOME</p>
                                  <p className="text-xs text-white font-medium mt-0.5 truncate">{order.buyerName}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <p className="text-[10px] text-white/25 tracking-wider">EMAIL</p>
                                  <p className="text-xs text-white font-medium mt-0.5 truncate">{order.buyerEmail}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <p className="text-[10px] text-white/25 tracking-wider">CPF</p>
                                  <p className="text-xs text-white font-medium mt-0.5 font-mono">{String(order.buyerCpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                                </div>
                              </div>

                              {order.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleAdminOrderAction(order.id, 'approve')} className="flex-1 h-9 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium tracking-wider hover:bg-green-500/20 transition-colors flex items-center justify-center gap-1.5">
                                    <CheckCircle className="w-3.5 h-3.5" /> APROVAR
                                  </button>
                                  <button onClick={() => handleAdminOrderAction(order.id, 'reject')} className="flex-1 h-9 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium tracking-wider hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5" /> RECUSAR
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Badge className={order.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                    {order.status === 'approved' ? 'Aprovado' : 'Recusado'}
                                  </Badge>
                                  {order.adminNotes && <span className="text-[10px] text-white/25">— {order.adminNotes}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-white/[0.05] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center"><p className="text-[11px] text-white/15 tracking-wider">Magnata Key Generator</p></div>
      </footer>

      {/* Edit Product Modal */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
        <DialogContent className="glass-strong rounded-2xl max-w-md p-6 bg-transparent border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-base tracking-wider font-bold flex items-center gap-2"><Pencil className="w-4 h-4 text-amber-400" />Editar Produto</DialogTitle>
            <DialogDescription className="text-white/30 text-xs">Altere os dados do produto</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <select value={editProductForm.categoryId} onChange={(e) => setEditProductForm({ ...editProductForm, categoryId: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white/80">
              <option value="">Sem categoria</option>
              {categories.filter(c => c.isActive).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <input placeholder="Nome" value={editProductForm.name} onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <input placeholder="Duracao (1 dia)" value={editProductForm.duration} onChange={(e) => setEditProductForm({ ...editProductForm, duration: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <input type="number" placeholder="Creditos" value={editProductForm.credits} onChange={(e) => setEditProductForm({ ...editProductForm, credits: e.target.value })} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingProduct(null)} className="flex-1 h-10 rounded-xl bg-white/5 text-white/60 text-xs font-medium tracking-wider hover:bg-white/10 transition-colors">CANCELAR</button>
              <button onClick={handleSaveEditProduct} className="flex-1 h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors">SALVAR</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Login Modal */}
      <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
        <DialogContent className="glass-strong rounded-2xl max-w-sm p-6 bg-transparent border-white/10">
          <DialogHeader><DialogTitle className="text-white text-base tracking-wider font-bold">Acesso Admin</DialogTitle><DialogDescription className="text-white/30 text-xs">Digite a senha de administrador</DialogDescription></DialogHeader>
          <div className="flex gap-2 mt-4">
            <input type="password" placeholder="Senha..." value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <button onClick={handleAdminLogin} disabled={loggingIn} className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-50">{loggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Login Modal */}
      <Dialog open={showUserLogin} onOpenChange={setShowUserLogin}>
        <DialogContent className="glass-strong rounded-2xl max-w-sm p-6 bg-transparent border-white/10">
          <DialogHeader><DialogTitle className="text-white text-base tracking-wider font-bold">Login</DialogTitle><DialogDescription className="text-white/30 text-xs">Entre com seu usuario e senha</DialogDescription></DialogHeader>
          <div className="space-y-3 mt-4">
            <input placeholder="Usuario..." value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <input type="password" placeholder="Senha..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()} className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20" />
            <button onClick={handleUserLogin} disabled={userLoggingIn} className="w-full h-10 rounded-xl bg-white text-black text-xs font-medium tracking-wider hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {userLoggingIn ? <><RefreshCw className="w-4 h-4 animate-spin" /> Entrando...</> : <><LogIn className="w-4 h-4" /> ENTRAR</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
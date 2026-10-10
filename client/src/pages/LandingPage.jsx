import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  Database,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Lock,
  ChevronDown,
  TrendingUp,
  FileSpreadsheet,
  Cpu,
  Code2,
  Check,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const DEMO_CHART_DATA = [
  { name: 'Electronics', revenue: 87400000, fill: '#10b981' },
  { name: 'Apparel', revenue: 16800000, fill: '#6366f1' },
  { name: 'Home', revenue: 10500000, fill: '#8b5cf6' },
  { name: 'Books', revenue: 2050000, fill: '#f43f5e' },
];

export function LandingPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const isDark = theme === 'dark';

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#use-cases', label: 'Use Cases' },
    { href: '#security', label: 'Security' },
    { href: '#faq', label: 'FAQ' },
  ];

  const features = [
    {
      icon: MessageSquare,
      color: 'from-blue-500 to-indigo-600',
      title: 'Natural Language Querying',
      description:
        'Ask analytical questions in conversational English or Persian. Our AI agent inspects your table schemas and generates precise, optimized SQL queries without requiring any syntax knowledge.',
    },
    {
      icon: ShieldCheck,
      color: 'from-emerald-500 to-teal-600',
      title: 'Isolated PostgreSQL Sandbox',
      description:
        'Every query executes in a dedicated tenant schema under a strict read-only (SELECT-only) role with statement timeouts. Your data is protected against leaks, modifications, or drops.',
    },
    {
      icon: BarChart3,
      color: 'from-purple-500 to-pink-600',
      title: 'Automatic Recharts Visualizations',
      description:
        'The agent selects optimal chart types (Bar, Line, Pie) with tailored color palettes, interactive tooltips, and data labels for instant decision-making.',
    },
    {
      icon: LayoutDashboard,
      color: 'from-amber-500 to-orange-600',
      title: 'Visual Analytics Dashboard',
      description:
        'Pin vital charts and metrics from your conversations directly onto your personalized dashboard to track KPIs and present in executive meetings.',
    },
    {
      icon: FileSpreadsheet,
      color: 'from-rose-500 to-red-600',
      title: 'Instant Excel & CSV Ingestion',
      description:
        'Upload CSV, XLSX, or XLS files seamlessly. Data types (currency, numbers, dates, booleans) are inferred automatically and ingested into structured Postgres tables.',
    },
    {
      icon: Code2,
      color: 'from-cyan-500 to-blue-600',
      title: '100% SQL Transparency',
      description:
        'View and copy the exact SQL query written by the AI inside an accessible code drawer, ensuring complete auditability and engineering confidence.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Upload Datasets',
      desc: 'Drag & drop Excel or CSV files. They become structured tables in your PostgreSQL sandbox in seconds.',
      icon: Database,
    },
    {
      step: '02',
      title: 'Ask in Plain Language',
      desc: 'Ask questions like "Which product category drove the highest margin in Q3?" or in Persian.',
      icon: MessageSquare,
    },
    {
      step: '03',
      title: 'Safe Sandbox Execution',
      desc: 'The AI writes read-only SQL, verifies safety rules, and runs the query securely in your isolated schema.',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Explore & Pin Insights',
      desc: 'Receive clear statistical answers with interactive charts. Pin key visualizations to your dashboard.',
      icon: TrendingUp,
    },
  ];

  const useCases = [
    {
      title: 'Founders & Leadership',
      badge: 'Executive Insights',
      desc: 'Query month-over-month revenue growth, churn rate, and cash burn on demand without waiting for engineering backlogs.',
    },
    {
      title: 'Sales & Marketing Teams',
      badge: 'Customer Analytics',
      desc: 'Spot top-performing products, segment customer cohorts by lifetime value, and measure campaign conversion rates instantly.',
    },
    {
      title: 'Finance & Accounting',
      badge: 'Financial Reporting',
      desc: 'Analyze heavy ledger spreadsheets, cross-examine departmental expenses, and generate clean visual breakdowns in seconds.',
    },
    {
      title: 'Supply Chain & Inventory',
      badge: 'Operations',
      desc: 'Track low-stock SKUs, supplier shipment delays, and regional sales demand patterns through automatic visual reporting.',
    },
  ];

  const faqs = [
    {
      q: 'Do I need any SQL or technical knowledge to use DataChat?',
      a: 'Not at all. You interact naturally just like chatting with an experienced data analyst. The AI agent translates your questions into validated SQL queries and presents visual results automatically.',
    },
    {
      q: 'How is data security and privacy enforced?',
      a: 'All data is isolated per tenant schema in PostgreSQL. Queries are strictly executed under a read-only role that rejects any INSERT, UPDATE, DELETE, or DROP commands. AST parsing and regex filters prevent unauthorized statements.',
    },
    {
      q: 'What file formats are supported?',
      a: 'You can upload CSV (.csv) as well as Microsoft Excel (.xlsx, .xls) spreadsheets up to 25 MB with automatic schema generation and type inference.',
    },
    {
      q: 'Does it support bilingual Persian and English questions?',
      a: 'Yes! DataChat natively supports English and Persian questions, auto-detects writing direction (RTL/LTR), applies the Vazirmatn typography for Persian data, and processes numeric formatting smoothly.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden" dir="ltr">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-[#0b1120]/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md sm:shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 animate-pulse" />
            </div>
            <div>
              <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-600 to-purple-600 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
                DataChat AI
              </span>
              <div className="hidden xs:flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Postgres Sandbox Secure</span>
              </div>
            </div>
          </Link>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action Buttons & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
            </button>

            {/* Desktop Auth Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <button
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md sm:shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <span>Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-md sm:shadow-lg shadow-indigo-600/25 transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl md:hidden border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle navigation menu"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Fullscreen Menu Dropdown / Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-2xl overflow-hidden px-4 py-5 shadow-2xl"
            >
              <div className="flex flex-col space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={handleNavClick}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {/* Mobile Menu Action CTAs */}
              <div className="pt-4 space-y-2.5">
                {user ? (
                  <button
                    onClick={() => {
                      handleNavClick();
                      navigate('/chat');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/30"
                  >
                    <span>Open Chat Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={handleNavClick}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-md shadow-indigo-600/30"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/auth"
                      onClick={handleNavClick}
                      className="w-full flex items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-emerald-500/15 blur-[90px] sm:blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-[11px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-5 sm:mb-6 max-w-full truncate"
            >
              <Zap className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500 shrink-0" />
              <span className="truncate">Next-Gen Text-to-SQL AI with Real-Time Recharts</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] sm:leading-tight text-slate-900 dark:text-white mb-5 sm:mb-6"
            >
              Talk with your business data.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                From questions to charts
              </span>{' '}
              in seconds.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 sm:mb-10 max-w-3xl mx-auto px-2"
            >
              Upload Excel and CSV spreadsheets. Ask natural questions in English or Persian. Our AI agent
              inspects schemas, writes safe SQL queries, executes them in a secure Postgres sandbox, and
              returns interactive visualizations.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14"
            >
              <button
                onClick={() => navigate(user ? '/chat' : '/auth')}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <span>{user ? 'Open Chat & Analytics' : 'Start Analyzing Free'}</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              <a
                href="#features"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm sm:text-base transition-all"
              >
                <span>Explore Features</span>
              </a>
            </motion.div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Read-Only Sandbox</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Excel & CSV Ingestion</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Interactive Dashboard</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation / Live Showcase Container */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-12 sm:mt-16 max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl shadow-xl sm:shadow-2xl shadow-indigo-500/10 p-3.5 sm:p-8"
          >
            {/* Window Topbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 sm:pb-6 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500" />
                <span className="ml-1 sm:ml-2 text-[11px] sm:text-xs font-mono text-slate-400">
                  demo.datachat.ai
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 sm:px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Sandbox Active (SELECT-Only)</span>
                </span>
              </div>
            </div>

            {/* Simulated Chat Feed */}
            <div className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-full sm:max-w-xl rounded-2xl rounded-br-sm bg-indigo-600 text-white p-3.5 sm:p-4 shadow-md text-xs sm:text-sm font-medium leading-relaxed">
                  What is the total revenue for each product category? Show a comparative bar chart.
                </div>
              </div>

              {/* AI Response with Chart */}
              <div className="flex gap-2.5 sm:gap-3 justify-start items-start">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    Based on your sales dataset, <strong className="text-emerald-600 dark:text-emerald-400">Electronics</strong> is
                    the top revenue driver with <strong>$87,400,000</strong>, followed by Apparel ($16.8M) and Home ($10.5M).
                  </p>

                  {/* SQL Preview Box with horizontal scroll */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] sm:text-xs border border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between text-slate-400 pb-1 mb-1 border-b border-slate-800/80 text-[10px] sm:text-[11px]">
                      <span>SQL Sandbox Query</span>
                      <span className="text-emerald-400 font-semibold">Validated Read-Only</span>
                    </div>
                    <pre className="overflow-x-auto py-1 leading-relaxed">
                      <code>
                        SELECT product_category, SUM(revenue) AS total_revenue FROM dataset_sales_data GROUP BY product_category;
                      </code>
                    </pre>
                  </div>

                  {/* Interactive Chart Preview */}
                  <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0b1120] p-3 sm:p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 sm:pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          Revenue by Product Category
                        </h4>
                        <span className="text-[10px] sm:text-[11px] text-slate-400">BAR • 4 Data Points</span>
                      </div>
                      <span className="self-start sm:self-auto text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>Pinned to Dashboard</span>
                      </span>
                    </div>
                    <div className="h-44 sm:h-56 w-full pt-1" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={DEMO_CHART_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} />
                          <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={10} tickFormatter={(v) => `$${v / 1000000}M`} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              borderRadius: '12px',
                              fontSize: '11px',
                              color: isDark ? '#f8fafc' : '#0f172a',
                            }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Total Revenue']}
                          />
                          <Bar dataKey="revenue" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-14 sm:py-20 lg:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0e1628]/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3 sm:mb-4">
              Engineered for Speed, Precision & Enterprise Security
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
              Combining cutting-edge LLMs with strict PostgreSQL sandbox constraints for trustworthy analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-indigo-500/40 transition-all duration-300 group"
                >
                  <div
                    className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white mb-5 sm:mb-6 shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 sm:mb-3">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step by Step Workflow */}
      <section id="how-it-works" className="py-14 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3 sm:mb-4">
              Simpler than ever in 4 easy steps
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
              From raw Excel data to executive dashboards with zero manual SQL coding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              return (
                <div
                  key={idx}
                  className="relative rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl sm:text-3xl font-black text-indigo-600/30 dark:text-indigo-400/20 font-mono">
                        {st.step}
                      </span>
                      <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2">
                      {st.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-14 sm:py-20 lg:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0e1628]/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
              Industries & Teams
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3 sm:mb-4">
              Built for High-Velocity Business Decisions
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed">
              Whether you are analyzing marketing funnels or auditing accounting ledgers, DataChat accelerates your insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {useCases.map((uc, idx) => (
              <div
                key={idx}
                className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-6 sm:p-8 space-y-3 sm:space-y-4 hover:border-purple-500/40 transition-colors shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {uc.title}
                  </h3>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50">
                    {uc.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Architecture Section */}
      <section id="security" className="py-14 sm:py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-10 md:p-14 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-semibold border border-emerald-500/30">
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Zero Data Tampering Guarantee</span>
              </div>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                Enterprise-Grade Postgres Sandbox Architecture
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed">
                Unlike primitive implementations that execute arbitrary AI SQL on production databases, DataChat isolates each tenant in their own Postgres schema with a locked-down <code>SELECT-only</code> role and query AST verification.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 sm:pt-4">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-xs sm:text-sm text-emerald-400 mb-1">Non-Destructive</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">DROP, ALTER, UPDATE, and DELETE commands are instantly blocked.</p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-xs sm:text-sm text-indigo-400 mb-1">Isolated Schemas</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">Tenants never share table namespaces or unmasked database scopes.</p>
                </div>
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10">
                  <p className="font-bold text-xs sm:text-sm text-purple-400 mb-1">Safe Timeouts</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">Strict query statement execution limits prevent server resource hogging.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-14 sm:py-20 lg:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0e1628]/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Questions & Answers
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-3 sm:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
              Everything you need to know about getting started with DataChat AI.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f172a] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors gap-3"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-8 sm:py-12 bg-white dark:bg-[#0b1120] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              DataChat AI
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">© 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link to="/auth" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Sign In
            </Link>
            <span>•</span>
            <Link to="/chat" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Cpu,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  Globe,
  Key,
  Layers,
  ListChecks,
  Lock,
  Maximize2,
  Palette,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  Sun,
  Terminal,
  X,
  XCircle,
  Zap
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

// Light, Crisp, High-Contrast Themes (White & Gold / Orange)
const THEMES = {
  gold: {
    id: 'gold',
    name: '☀️ Solar Gold & White',
    bg: 'bg-[#faf8f5]',
    card: 'bg-white border-amber-200/90 shadow-sm',
    cardSubtle: 'bg-amber-50/70 border-amber-200',
    header: 'bg-white/95 border-amber-200 shadow-sm',
    accentGradient: 'from-amber-500 via-orange-500 to-amber-600',
    btnPrimary: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-orange-500/20',
    btnOutline: 'border-2 border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-950 font-bold',
    badge: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: 'text-amber-700',
    borderActive: 'border-amber-500 ring-2 ring-amber-500/20'
  },
  sunset: {
    id: 'sunset',
    name: '🍊 Tangerine Orange & White',
    bg: 'bg-[#fffaf7]',
    card: 'bg-white border-orange-200/90 shadow-sm',
    cardSubtle: 'bg-orange-50/70 border-orange-200',
    header: 'bg-white/95 border-orange-200 shadow-sm',
    accentGradient: 'from-orange-500 via-amber-500 to-red-500',
    btnPrimary: 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-md shadow-orange-500/20',
    btnOutline: 'border-2 border-orange-300 bg-orange-50/80 hover:bg-orange-100 text-orange-950 font-bold',
    badge: 'bg-orange-100 text-orange-950 border-orange-300',
    accentColor: 'text-orange-700',
    borderActive: 'border-orange-500 ring-2 ring-orange-500/20'
  },
  sandstone: {
    id: 'sandstone',
    name: '👑 Royal Champagne & Ivory',
    bg: 'bg-[#fdfbf7]',
    card: 'bg-white border-yellow-300/80 shadow-sm',
    cardSubtle: 'bg-yellow-50/60 border-yellow-200',
    header: 'bg-white/95 border-yellow-300/80 shadow-sm',
    accentGradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    btnPrimary: 'bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 hover:from-yellow-700 hover:to-amber-700 text-white shadow-md shadow-amber-500/20',
    btnOutline: 'border-2 border-yellow-400 bg-yellow-50/80 hover:bg-yellow-100 text-yellow-950 font-bold',
    badge: 'bg-yellow-100 text-yellow-950 border-yellow-300',
    accentColor: 'text-yellow-800',
    borderActive: 'border-yellow-500 ring-2 ring-yellow-500/20'
  }
};

export default function App() {
  // Theme Management (Forced to 'gold' so no dark blue appears)
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('bytesalt_theme');
    if (!saved || saved === 'midnight' || saved === 'emerald' || saved === 'amethyst' || saved === 'light') {
      localStorage.setItem('bytesalt_theme', 'gold');
      return 'gold';
    }
    return saved;
  });
  const theme = THEMES[currentTheme] || THEMES.gold;

  const handleThemeChange = (newTheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('bytesalt_theme', newTheme);
  };

  // OpenAI API Key Management
  const [openaiApiKey, setOpenaiApiKey] = useState(() => {
    return localStorage.getItem('bytesalt_openai_key') || '';
  });
  const [showKey, setShowKey] = useState(false);

  const handleKeyChange = (val) => {
    setOpenaiApiKey(val);
    localStorage.setItem('bytesalt_openai_key', val);
  };

  // Target Configurations
  const [targetUrl, setTargetUrl] = useState('https://itoview-stg.samsungsds.com/#/sign-in');
  const [authToken, setAuthToken] = useState('');
  const [authKey, setAuthKey] = useState('token');
  const [mode, setMode] = useState('single_page'); // 'single_page' | 'integration_flow'
  const [headless, setHeadless] = useState(false); // Live browser window

  // Execution Mode & Visual Pacing State (Watch step-by-step in 1 tab)
  const [executionMode, setExecutionMode] = useState('single_tab_step_by_step'); // 'single_tab_step_by_step' | 'parallel_tabs'
  const [stepDelayMs, setStepDelayMs] = useState(1200); // Visual delay (ms) for human eyes
  const [humanTyping, setHumanTyping] = useState(true);
  const [highlightElement, setHighlightElement] = useState(true);

  // AI Custom Context & Prompt State
  const [customContext, setCustomContext] = useState(() => {
    return localStorage.getItem('bytesalt_custom_context') || 'this is correct email and pass , this is sign in page and also go on sign up page and test';
  });

  const handleCustomContextChange = (val) => {
    setCustomContext(val);
    localStorage.setItem('bytesalt_custom_context', val);
  };

  // Pipeline State
  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [elements, setElements] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [selectedTcIds, setSelectedTcIds] = useState(new Set());
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'results'
  const [expandedTc, setExpandedTc] = useState({});
  const [expandedResult, setExpandedResult] = useState({});
  const [elementFilter, setElementFilter] = useState('');
  const [errorBanner, setErrorBanner] = useState(null);
  const [zoomScreenshot, setZoomScreenshot] = useState(null);

  // Preset Handlers
  const handleLoadSamsung = () => {
    setTargetUrl('https://itoview-stg.samsungsds.com/#/sign-in');
    setErrorBanner(null);
  };

  const handleLoadDemo = () => {
    setTargetUrl('http://localhost:8000/demo-app');
    setErrorBanner(null);
  };

  const handleLoadVivahika = () => {
    setTargetUrl('https://vivahika.in');
    setErrorBanner(null);
  };

  // 1. Scan & Plan
  const handleScanAndPlan = async () => {
    if (!targetUrl) {
      setErrorBanner('Please enter a target web application URL.');
      return;
    }

    setIsScanning(true);
    setErrorBanner(null);
    setResults([]);

    try {
      const res = await fetch(`${API_BASE}/api/scan-and-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          auth_token: authToken || null,
          auth_storage_key: authKey,
          mode: mode,
          headless: headless,
          openai_api_key: openaiApiKey.trim() || null,
          custom_context: customContext.trim() || null,
          execution_mode: executionMode,
          step_delay_ms: stepDelayMs,
          human_typing: humanTyping,
          highlight_element: highlightElement
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to scan DOM and generate test plan');
      }

      const data = await res.json();
      setElements(data.elements || []);
      setTestCases(data.test_cases || []);
      // Select all generated test cases by default
      setSelectedTcIds(new Set((data.test_cases || []).map(tc => tc.tc_id)));
      // Expand all test cases initially so user can see AI planned values
      const initialExpanded = {};
      (data.test_cases || []).forEach(tc => { initialExpanded[tc.tc_id] = true; });
      setExpandedTc(initialExpanded);
      setActiveTab('plan');
    } catch (err) {
      setErrorBanner(`Scan & Plan Failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Parallel Execute in Tabs of a Single Window
  const handleExecuteTests = async () => {
    const toRun = testCases.filter(tc => selectedTcIds.has(tc.tc_id));
    if (toRun.length === 0) {
      setErrorBanner('Please select at least one test case to execute.');
      return;
    }

    setIsExecuting(true);
    setErrorBanner(null);
    setActiveTab('results');

    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          auth_token: authToken || null,
          auth_storage_key: authKey,
          test_cases: toRun,
          headless: headless,
          openai_api_key: openaiApiKey.trim() || null,
          custom_context: customContext.trim() || null,
          execution_mode: executionMode,
          step_delay_ms: stepDelayMs,
          human_typing: humanTyping,
          highlight_element: highlightElement
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Execution failed');
      }

      const data = await res.json();
      setResults(data);
      const allOpen = {};
      data.forEach(r => { allOpen[r.tc_id] = true; });
      setExpandedResult(allOpen);
    } catch (err) {
      setErrorBanner(`Execution Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // 3. One-Click Auto Run Full Pipeline
  const handleAutoRun = async () => {
    if (!targetUrl) {
      setErrorBanner('Please enter a target web application URL.');
      return;
    }

    setIsScanning(true);
    setIsExecuting(true);
    setErrorBanner(null);

    try {
      const res = await fetch(`${API_BASE}/api/auto-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          auth_token: authToken || null,
          auth_storage_key: authKey,
          mode: mode,
          headless: headless,
          openai_api_key: openaiApiKey.trim() || null,
          custom_context: customContext.trim() || null,
          execution_mode: executionMode,
          step_delay_ms: stepDelayMs,
          human_typing: humanTyping,
          highlight_element: highlightElement
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Auto-run pipeline failed');
      }

      const data = await res.json();
      setElements(data.elements || []);
      setTestCases(data.test_cases || []);
      setSelectedTcIds(new Set((data.test_cases || []).map(tc => tc.tc_id)));
      setResults(data.results || []);
      setActiveTab('results');

      if (data.results && data.results.length > 0) {
        const allOpen = {};
        data.results.forEach(r => { allOpen[r.tc_id] = true; });
        setExpandedResult(allOpen);
      }
    } catch (err) {
      setErrorBanner(`Auto-Run Error: ${err.message}`);
    } finally {
      setIsScanning(false);
      setIsExecuting(false);
    }
  };

  // Inline Step Value Editing
  const handleUpdateStepValue = (tcId, stepNo, newValue) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.tc_id !== tcId) return tc;
      return {
        ...tc,
        steps: tc.steps.map(s => {
          if (s.step_no !== stepNo) return s;
          return { ...s, value: newValue };
        })
      };
    }));
  };

  // Toggle selection
  const toggleSelectTc = (id) => {
    const next = new Set(selectedTcIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTcIds(next);
  };

  const toggleAllTc = () => {
    if (selectedTcIds.size === testCases.length) {
      setSelectedTcIds(new Set());
    } else {
      setSelectedTcIds(new Set(testCases.map(tc => tc.tc_id)));
    }
  };

  // Filter elements
  const filteredElements = useMemo(() => {
    if (!elementFilter) return elements;
    const q = elementFilter.toLowerCase();
    return elements.filter(
      el =>
        el.id.toLowerCase().includes(q) ||
        el.tag.toLowerCase().includes(q) ||
        el.label.toLowerCase().includes(q) ||
        el.css_selector.toLowerCase().includes(q)
    );
  }, [elements, elementFilter]);

  // Aggregate KPIs
  const stats = useMemo(() => {
    if (!results || results.length === 0) {
      return { total: 0, passed: 0, failed: 0, rate: 0, speedup: '1.0x', totalTime: 0 };
    }
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = total - passed;
    const rate = Math.round((passed / total) * 100);
    const serialTime = results.reduce((acc, r) => acc + r.execution_time_ms, 0);
    const maxParallel = Math.max(...results.map(r => r.execution_time_ms), 1);
    const speedup = (serialTime / maxParallel).toFixed(1) + 'x';
    return { total, passed, failed, rate, speedup, totalTime: maxParallel };
  }, [results]);

  return (
    <div className={`min-h-screen ${theme.bg} text-slate-900 flex flex-col font-sans transition-colors duration-200 antialiased`}>
      {/* Top Navbar */}
      <header className={`border-b ${theme.header} sticky top-0 z-40 px-6 py-3.5 transition-colors`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${theme.accentGradient} flex items-center justify-center font-black text-white shadow-md shadow-orange-500/20`}>
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900">Bytesalt QA</span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  AUTONOMOUS QA
                </span>
                {openaiApiKey ? (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>OpenAI gpt-4o Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                    <Cpu className="w-3.5 h-3.5 text-amber-700" />
                    <span>Semantic Engine (Paste Key Below)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                High-Speed Testing in Single Window Tabs • Detailed Inputs & Step Execution Journey
              </p>
            </div>
          </div>

          {/* Presets & Theme Selector */}
          <div className="flex items-center space-x-2.5">
            {/* Quick URL Presets */}
            <button
              onClick={handleLoadSamsung}
              className="text-xs px-3 py-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Samsung SDS ITO View Portal"
            >
              <Shield className="w-3.5 h-3.5 text-orange-600" />
              <span>Samsung SDS App</span>
            </button>

            <button
              onClick={handleLoadVivahika}
              className="text-xs px-3 py-1.5 rounded-lg border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Vivahika Web App"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Vivahika App</span>
            </button>

            <button
              onClick={handleLoadDemo}
              className="text-xs px-3 py-1.5 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Buggy Demo App"
            >
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo Buggy App</span>
            </button>

            {/* Theme Selector */}
            <div className="flex items-center space-x-1 bg-amber-100/70 p-1 rounded-xl border border-amber-200 ml-2">
              {Object.values(THEMES).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    currentTheme === t.id
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col space-y-6">
        {/* Error Alert Banner */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 text-sm flex items-start justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="font-bold">{errorBanner}</span>
            </div>
            <button onClick={() => setErrorBanner(null)} className="text-red-600 hover:text-red-900 font-bold">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* OpenAI Key Bar + Target Config */}
        <div className={`${theme.card} rounded-2xl p-5 border-2 shadow-sm space-y-4`}>
          {/* OpenAI API Key Input Banner */}
          <div className={`p-3.5 rounded-xl border ${theme.cardSubtle} flex flex-wrap items-center justify-between gap-3`}>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold flex items-center space-x-1.5 text-slate-900">
                  <span>OpenAI API Key (BYOK)</span>
                  <span className="text-[11px] font-medium text-slate-500">— Enter key for AI to generate intelligent input field values</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <div className="relative w-full">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full pl-3 pr-10 py-1.5 rounded-lg text-xs font-mono border-2 border-amber-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700"
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {openaiApiKey && (
                <button
                  onClick={() => handleKeyChange('')}
                  className="text-xs text-red-600 hover:text-red-800 font-extrabold px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Main Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* URL Input */}
            <div className="lg:col-span-6 relative">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-1.5">
                Target Web Application URL
              </label>
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-amber-600 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://yourapp.com or http://localhost:8000/demo-app"
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-amber-200 rounded-xl text-sm bg-white text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-mono shadow-xs"
                />
              </div>
            </div>

            {/* Auth Token Input */}
            <div className="lg:col-span-3 relative">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-1.5">
                Auth Token (Optional Injection)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-amber-600 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Bearer eyJhbGciOi..."
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            {/* Mode Selector */}
            <div className="lg:col-span-3 flex flex-col justify-end space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800">
                QA Strategy Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('single_page')}
                  className={`py-2 px-2.5 text-xs font-extrabold rounded-xl border-2 transition-all text-center ${
                    mode === 'single_page'
                      ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Single Page QA
                </button>
                <button
                  type="button"
                  onClick={() => setMode('integration_flow')}
                  className={`py-2 px-2.5 text-xs font-extrabold rounded-xl border-2 transition-all text-center ${
                    mode === 'integration_flow'
                      ? 'bg-amber-100 border-amber-500 text-amber-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔗 Chained Flow
                </button>
              </div>
            </div>
          </div>

          {/* AI Custom Prompt & Context Field */}
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-4 space-y-2.5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <label className="text-xs font-black uppercase tracking-wider text-amber-950">
                  AI QA Instructions & Custom Prompt (AI को निर्देश & टेस्ट संदर्भ)
                </label>
              </div>

              {/* Quick Presets for Custom Prompt */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Preset Prompts:</span>
                <button
                  type="button"
                  onClick={() => handleCustomContextChange('this is correct email and pass , this is sign in page and also go on sign up page and test')}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold transition-all shadow-xs"
                >
                  Sign In + Sign Up Flow
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomContextChange("Valid login ID: 'admin_test', Password: 'Pass@2026!'. On login, verify dashboard.")}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold transition-all shadow-xs"
                >
                  Custom Credentials
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomContextChange("Test SQL Injection (' OR 1=1--) and empty required field submission")}
                  className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold transition-all shadow-xs"
                >
                  SQLi & Validation
                </button>
                {customContext && (
                  <button
                    type="button"
                    onClick={() => handleCustomContextChange('')}
                    className="text-[11px] text-red-600 hover:text-red-800 font-black px-2 py-0.5"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={customContext}
                onChange={(e) => handleCustomContextChange(e.target.value)}
                placeholder="e.g. this is correct email and pass , this is sign in page and also go on sign up page and test..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold border-2 border-amber-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-700 font-semibold flex items-center space-x-1.5">
              <span>💡</span>
              <span>
                <strong>AI Context Consideration:</strong> The AI uses your instructions to pick valid form credentials for happy path tests, click custom navigation links (like 회원가입 / Sign-Up), and verify specific pages.
              </span>
            </p>
          </div>

          {/* Action Row & Visual Pacing Controls */}
          <div className="pt-3 space-y-3 border-t border-amber-200">
            {/* Visual Pace & Mode Bar */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <span>Execution Mode:</span>
                </span>

                <div className="inline-flex p-1 bg-white rounded-xl border border-amber-300 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('single_tab_step_by_step')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                      executionMode === 'single_tab_step_by_step'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>👀 1 Tab Step-by-Step (Watch with your eyes)</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">Recommended</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode('parallel_tabs')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                      executionMode === 'parallel_tabs'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>⚡ Parallel in Tabs</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">Fast</span>
                  </button>
                </div>
              </div>

              {/* Speed Delays when in 1 Tab Step-by-Step Mode */}
              {executionMode === 'single_tab_step_by_step' && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Visual Delay:</span>
                  </span>
                  <div className="flex items-center space-x-1">
                    {[
                      { label: '🐢 1.5s (Detailed)', ms: 1500 },
                      { label: '🚶 1.0s (Normal)', ms: 1000 },
                      { label: '⚡ 0.4s (Brisk)', ms: 400 }
                    ].map(p => (
                      <button
                        key={p.ms}
                        type="button"
                        onClick={() => setStepDelayMs(p.ms)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                          stepDelayMs === p.ms
                            ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                            : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Line */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Live Browser Mode Pill */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={!headless}
                    onChange={(e) => setHeadless(!e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                  />
                  <span className="font-extrabold text-slate-900">
                    Live Visible Browser Window
                  </span>
                  <span className="text-[11px] text-amber-900 font-extrabold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {executionMode === 'single_tab_step_by_step' ? '✓ 1 Tab Live Mode' : '✓ Tabs Mode'}
                  </span>
                </label>

                {executionMode === 'single_tab_step_by_step' && (
                  <label className="flex items-center space-x-2 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={highlightElement}
                      onChange={(e) => setHighlightElement(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 border-amber-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Glowing Element Halos</span>
                  </label>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleScanAndPlan}
                  disabled={isScanning || isExecuting}
                  className="py-2.5 px-4 rounded-xl text-xs font-extrabold border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-sm flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Analyzing DOM & AI Planning...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>1. Scan & Generate Plan</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExecuteTests}
                  disabled={isExecuting || testCases.length === 0}
                  className={`py-2.5 px-5 rounded-xl text-xs font-extrabold ${theme.btnPrimary} flex items-center space-x-2 transition-all disabled:opacity-50`}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Running ({executionMode === 'single_tab_step_by_step' ? '1 Tab Step-by-Step' : 'Parallel Tabs'})...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>
                        {executionMode === 'single_tab_step_by_step'
                          ? `2. Watch Step-by-Step in 1 Tab (${selectedTcIds.size}) 👀`
                          : `2. Execute in Parallel Tabs (${selectedTcIds.size}) 🚀`}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleAutoRun}
                  disabled={isScanning || isExecuting}
                  className="py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>⚡ Auto-Run</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b-2 border-amber-200 pb-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('plan')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all ${
                activeTab === 'plan'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Discovery & AI Test Cases ({testCases.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all ${
                activeTab === 'results'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Execution Summary & Inputs Given ({results.length})</span>
              {results.length > 0 && stats.failed > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>
          </div>

          {activeTab === 'results' && results.length > 0 && (
            <div className="text-xs text-slate-800 font-mono font-extrabold">
              Execution Time: <span className="text-amber-700">{stats.totalTime} ms</span>
            </div>
          )}
        </div>

        {/* SECTION 1: DISCOVERY & PLAN */}
        {activeTab === 'plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Smart DOM Element Inventory */}
            <div className={`lg:col-span-5 ${theme.card} rounded-2xl p-5 border-2 shadow-sm flex flex-col space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold flex items-center space-x-2 text-slate-900">
                    <Terminal className="w-4 h-4 text-amber-600" />
                    <span>Discovered DOM Elements</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Interactive form elements tagged with data-bytesalt-id</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
                  {elements.length} Elements
                </span>
              </div>

              {/* Element Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={elementFilter}
                  onChange={(e) => setElementFilter(e.target.value)}
                  placeholder="Filter elements by tag, label, selector..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border-2 border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              {/* Elements List */}
              <div className="overflow-y-auto max-h-[580px] space-y-2 pr-1">
                {filteredElements.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    {elements.length === 0 ? (
                      <>
                        <Layers className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <span>No DOM scan yet. Click "1. Scan & Generate Plan" above to analyze the page.</span>
                      </>
                    ) : (
                      <span>No elements match filter query.</span>
                    )}
                  </div>
                ) : (
                  filteredElements.map((el) => (
                    <div
                      key={el.id}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 space-y-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded border border-amber-300">
                          {el.id}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-extrabold bg-slate-200 text-slate-800">
                            {el.tag} {el.type ? `(${el.type})` : ''}
                          </span>
                          {el.required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 font-black">
                              required
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-black text-slate-900">
                        {el.label || el.placeholder || '<No Label>'}
                      </div>

                      <div className="text-[11px] font-mono truncate px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 font-medium">
                        {el.css_selector}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: AI-Generated Test Cases with Input Values */}
            <div className={`lg:col-span-7 ${theme.card} rounded-2xl p-5 border-2 shadow-sm flex flex-col space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold flex items-center space-x-2 text-slate-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>AI-Generated Test Cases & Values to Check</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Input values planned by AI based on field semantics</p>
                </div>

                {testCases.length > 0 && (
                  <button
                    onClick={toggleAllTc}
                    className="text-xs text-amber-800 hover:text-amber-950 font-black"
                  >
                    {selectedTcIds.size === testCases.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Test Cases Accordion List */}
              <div className="overflow-y-auto max-h-[640px] space-y-3 pr-1">
                {testCases.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs">
                    <Cpu className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <span>No test cases generated yet. Click "1. Scan & Generate Plan" above.</span>
                  </div>
                ) : (
                  testCases.map((tc) => {
                    const isSelected = selectedTcIds.has(tc.tc_id);
                    const isOpen = expandedTc[tc.tc_id];

                    const categoryBadge =
                      tc.category === 'Positive'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : tc.category === 'Negative_Edge'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : tc.category === 'Validation_Empty'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-indigo-100 text-indigo-900 border-indigo-300';

                    const fillSteps = (tc.steps || []).filter(s => s.action === 'fill');

                    return (
                      <div
                        key={tc.tc_id}
                        className={`rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'bg-white border-amber-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between space-x-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTc(tc.tc_id)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                            />
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                              {tc.tc_id}
                            </span>
                            <span className="text-xs font-black text-slate-900 truncate">{tc.title}</span>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-black ${categoryBadge}`}>
                              {tc.category}
                            </span>
                            <button
                              onClick={() =>
                                setExpandedTc({ ...expandedTc, [tc.tc_id]: !isOpen })
                              }
                              className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Steps & Values */}
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-200 space-y-3 text-xs bg-amber-50/30">
                            {/* AI Generated Field Values Highlight */}
                            {fillSteps.length > 0 && (
                              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/80 space-y-2">
                                <div className="flex items-center justify-between text-xs font-black text-amber-950">
                                  <span className="flex items-center space-x-1.5">
                                    <Sparkles className="w-4 h-4 text-orange-600" />
                                    <span>AI Planned Input Values (आप इसे एडिट भी कर सकते हैं)</span>
                                  </span>
                                  <span className="text-[11px] text-amber-800 font-bold">Click to edit value</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {fillSteps.map(step => (
                                    <div
                                      key={step.step_no}
                                      className="p-2.5 rounded-lg border border-amber-200 bg-white flex items-center justify-between space-x-2 text-xs shadow-xs"
                                    >
                                      <div className="truncate flex-1">
                                        <span className="text-slate-400 font-mono text-[10px] block truncate">{step.target_id || step.css_selector}</span>
                                        <span className="font-black text-slate-900 truncate">{step.description.split("'")[1] || 'Input Field'}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <input
                                          type="text"
                                          value={step.value || ''}
                                          onChange={(e) => handleUpdateStepValue(tc.tc_id, step.step_no, e.target.value)}
                                          className="px-2 py-1 rounded text-xs font-mono border-2 border-amber-300 bg-amber-50/60 text-amber-950 font-black focus:outline-none focus:border-amber-600 max-w-[150px]"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Detailed Test Steps */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                                Sequence Execution Steps ({tc.steps?.length || 0})
                              </span>
                              <div className="space-y-1.5 font-mono">
                                {(tc.steps || []).map((step) => (
                                  <div
                                    key={step.step_no}
                                    className="p-2 rounded-lg border border-slate-200 bg-white flex items-start space-x-2 text-[11px]"
                                  >
                                    <span className="text-slate-400 font-bold">{step.step_no}.</span>
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 font-black uppercase text-[10px] border border-amber-300">
                                      {step.action}
                                    </span>
                                    {step.target_id && (
                                      <span className="font-extrabold text-slate-900">{step.target_id}</span>
                                    )}
                                    <span className="flex-1 text-slate-800 font-medium">{step.description}</span>
                                    {step.value && (
                                      <span className="text-orange-950 bg-orange-100 px-1.5 rounded font-black truncate max-w-[150px] border border-orange-200">
                                        "{step.value}"
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-800 font-medium">
                              <div>
                                <span className="font-black text-slate-900">Expected UI: </span>
                                {tc.expected_ui_behavior}
                              </div>
                              <div>
                                <span className="font-black text-slate-900">Expected API: </span>
                                <span className="font-mono text-emerald-800 font-black">{tc.expected_api_status}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: LIVE EXECUTION & DETAILED STEP REPORT */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* KPI Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`${theme.card} rounded-2xl p-4 border-2 shadow-sm`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Tests</span>
                  <FileCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{stats.total}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Single-Window Tabs</div>
              </div>

              <div className={`${theme.card} rounded-2xl p-4 border-2 shadow-sm`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Passed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-600">{stats.passed}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">{stats.rate}% Success Rate</div>
              </div>

              <div className={`${theme.card} rounded-2xl p-4 border-2 shadow-sm`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Bugs Caught</span>
                  <Bug className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-black text-red-600">{stats.failed}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">403s / 500s Caught</div>
              </div>

              <div className={`${theme.card} rounded-2xl p-4 border-2 shadow-sm`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Parallel Speedup</span>
                  <Zap className="w-4 h-4 text-orange-600" />
                </div>
                <div className="text-2xl font-black text-orange-600">{stats.speedup}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Tabs Execution</div>
              </div>

              <div className={`${theme.card} rounded-2xl p-4 border-2 shadow-sm col-span-2 md:col-span-1`}>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Execution Time</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{stats.totalTime} ms</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Real-Time Wall Clock</div>
              </div>
            </div>

            {/* Results Cards List with Detailed Steps and Inputs */}
            <div className="space-y-5">
              {results.length === 0 ? (
                <div className={`py-20 text-center text-slate-500 text-sm ${theme.card} rounded-2xl border-2`}>
                  <Activity className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <span className="font-bold">No test results available. Select test cases and click "Execute All Tests in Tabs 🚀".</span>
                </div>
              ) : (
                results.map((result) => {
                  const isOpen = expandedResult[result.tc_id];
                  const isPass = result.status === 'PASS';

                  return (
                    <div
                      key={result.tc_id}
                      className={`rounded-2xl overflow-hidden border-2 transition-all bg-white shadow-xs ${
                        isPass ? 'border-emerald-300' : 'border-red-400 ring-2 ring-red-100'
                      }`}
                    >
                      {/* Result Header */}
                      <div
                        onClick={() =>
                          setExpandedResult({
                            ...expandedResult,
                            [result.tc_id]: !isOpen
                          })
                        }
                        className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                          {isPass ? (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                              ✓
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-black">
                              ✕
                            </div>
                          )}

                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300">
                            {result.tc_id}
                          </span>

                          <span className="text-sm font-black text-slate-900 truncate">{result.title}</span>

                          <span
                            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-black uppercase ${
                              isPass
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-slate-600">{result.execution_time_ms} ms</span>
                          </div>
                          <button className="text-slate-500 hover:text-slate-900">
                            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Inspector */}
                      {isOpen && (
                        <div className="p-5 border-t-2 border-slate-200 space-y-6 bg-white">
                          {/* 1. Normal Plain Narrative Summary */}
                          <div className="p-4 rounded-xl bg-amber-50/80 border-2 border-amber-200 space-y-1.5">
                            <div className="flex items-center space-x-2 text-xs font-black text-amber-950 uppercase tracking-wider">
                              <Sparkles className="w-4 h-4 text-orange-600" />
                              <span>Test Case Summary & Observation (नॉर्मल विवरण)</span>
                            </div>
                            <p className="text-sm text-slate-900 font-semibold leading-relaxed">
                              {result.readable_summary}
                            </p>
                          </div>

                          {/* Failure Diagnosis if Failed */}
                          {!isPass && (
                            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 space-y-1">
                              <div className="flex items-center space-x-2 text-xs font-black text-red-700 uppercase tracking-wider">
                                <Bug className="w-4 h-4 text-red-600" />
                                <span>Failure Diagnosis & Root Cause</span>
                              </div>
                              <p className="text-xs font-mono font-bold">{result.failure_reason}</p>
                              <p className="text-xs text-slate-700 mt-1 font-medium">{result.ui_observation}</p>
                            </div>
                          )}

                          {/* 2. DETAILED STEP-BY-STEP ACTIONS & EXACT INPUTS GIVEN */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                                <ListChecks className="w-4 h-4 text-orange-600" />
                                <span>Step-by-Step Execution Journey: What Ran & Inputs Given (इसमें क्या चला और क्या इनपुट दिया)</span>
                              </h4>
                              <span className="text-xs font-mono text-slate-500 font-bold">
                                {result.step_logs?.length || 0} Steps Executed
                              </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-slate-800 uppercase font-extrabold border-b border-slate-200">
                                  <tr>
                                    <th className="py-2.5 px-3 w-16">Step</th>
                                    <th className="py-2.5 px-3 w-28">Action</th>
                                    <th className="py-2.5 px-3">Target Field</th>
                                    <th className="py-2.5 px-3">Input Value Given (इनपुट)</th>
                                    <th className="py-2.5 px-3">Status & Result</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {(result.step_logs || []).map((s) => (
                                    <tr key={s.step_no} className="hover:bg-amber-50/40 transition-colors">
                                      <td className="py-3 px-3 font-mono font-black text-slate-500">#{s.step_no}</td>
                                      <td className="py-3 px-3">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase font-mono ${
                                          s.action === 'fill' ? 'bg-amber-100 text-amber-950 border border-amber-300' :
                                          s.action === 'click' ? 'bg-orange-100 text-orange-950 border border-orange-300' :
                                          s.action === 'select' ? 'bg-yellow-100 text-yellow-950 border border-yellow-300' :
                                          'bg-slate-100 text-slate-800 border border-slate-200'
                                        }`}>
                                          {s.action}
                                        </span>
                                      </td>
                                      <td className="py-3 px-3 font-bold text-slate-900">
                                        <div>{s.description.split("'")[1] || s.target}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{s.target}</div>
                                      </td>
                                      <td className="py-3 px-3 font-mono font-black">
                                        {s.input_value ? (
                                          <span className="px-2 py-1 rounded bg-amber-100/90 text-amber-950 border border-amber-300 inline-block font-mono font-black">
                                            "{s.input_value}"
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 font-normal italic">— None (Direct Click) —</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 font-medium">
                                        <div className="flex items-center space-x-1.5">
                                          {s.status === 'SUCCESS' ? (
                                            <span className="text-emerald-800 font-black flex items-center space-x-1">
                                              <span>✓</span>
                                              <span>{s.detail || 'Executed'}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-800 font-black flex items-center space-x-1">
                                              <span>✕</span>
                                              <span>{s.detail || 'Failed'}</span>
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 3. STRICT FETCH / XHR NETWORK SPY (3 Categorized Lists) */}
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                            {/* Network Tab Payload Inspector */}
                            <div className="lg:col-span-8 space-y-4">
                              {(() => {
                                const netLogs = result.network_logs || [];
                                const failedApis = result.categorized_network?.failed_5xx || netLogs.filter(l => l.status >= 500);
                                const warningApis = result.categorized_network?.warnings_4xx || netLogs.filter(l => l.status >= 300 && l.status < 500);
                                const passedApis = result.categorized_network?.passed_200 || netLogs.filter(l => l.status >= 200 && l.status < 300);

                                return (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center space-x-2">
                                        <Server className="w-4 h-4 text-orange-600" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                          Intercepted Fetch / XHR APIs ({netLogs.length})
                                        </h4>
                                      </div>

                                      {/* Categorized Summary Badges */}
                                      <div className="flex items-center space-x-1.5 text-xs font-bold">
                                        <span className={`px-2.5 py-0.5 rounded-full border ${
                                          failedApis.length > 0 ? 'bg-red-100 text-red-900 border-red-300 font-black' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                          🚨 {failedApis.length} Failed (5xx)
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full border ${
                                          warningApis.length > 0 ? 'bg-amber-100 text-amber-900 border-amber-300 font-black' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                          ⚠️ {warningApis.length} Warnings (4xx)
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full border ${
                                          passedApis.length > 0 ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black' : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                          ✅ {passedApis.length} Passed (200 OK)
                                        </span>
                                      </div>
                                    </div>

                                    {netLogs.length === 0 ? (
                                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 font-mono text-center font-medium">
                                        No fetch/XHR API calls were triggered during this test.
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {/* LIST 1: FAILED SERVER APIS (5xx) WITH FULL RESPONSE */}
                                        {failedApis.length > 0 && (
                                          <div className="rounded-xl border-2 border-red-400 bg-red-50/50 p-3.5 space-y-2.5 shadow-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-black uppercase tracking-wider text-red-900 flex items-center space-x-1.5">
                                                <AlertCircle className="w-4 h-4 text-red-600" />
                                                <span>🚨 Failed Server APIs (5xx Errors) — ({failedApis.length})</span>
                                              </span>
                                              <span className="text-[10px] font-mono font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-300">
                                                SERVER BUG / CRASH
                                              </span>
                                            </div>

                                            <div className="space-y-2.5">
                                              {failedApis.map((log, idx) => (
                                                <div key={idx} className="p-3 rounded-lg border border-red-300 bg-white space-y-2 text-xs shadow-xs">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2 truncate">
                                                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-mono font-black uppercase text-[11px] border border-red-300">
                                                        {log.method}
                                                      </span>
                                                      <span className="font-mono text-slate-900 font-bold truncate text-xs">{log.url}</span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[11px] flex-shrink-0">
                                                      HTTP {log.status} SERVER ERROR
                                                    </span>
                                                  </div>

                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 font-mono text-[11px]">
                                                    <div>
                                                      <span className="text-[10px] text-slate-600 font-black uppercase block mb-1">Payload Sent:</span>
                                                      <pre className="p-2 rounded border border-slate-200 bg-slate-50 text-slate-900 overflow-x-auto max-h-32 text-[11px]">
                                                        {log.request_payload ? JSON.stringify(log.request_payload, null, 2) : '<No Payload>'}
                                                      </pre>
                                                    </div>
                                                    <div>
                                                      <span className="text-[10px] text-red-700 font-black uppercase block mb-1">Server Response (Error Body):</span>
                                                      <pre className="p-2 rounded border border-red-300 bg-red-950 text-red-100 overflow-x-auto max-h-32 text-[11px] font-bold">
                                                        {log.response_body ? JSON.stringify(log.response_body, null, 2) : '<Empty Response>'}
                                                      </pre>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* LIST 2: WARNING / CLIENT RESPONSES (4xx/3xx) */}
                                        {warningApis.length > 0 && (
                                          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3.5 space-y-2.5 shadow-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center space-x-1.5">
                                                <AlertTriangle className="w-4 h-4 text-orange-600" />
                                                <span>⚠️ Warning / Client Response APIs (4xx/3xx) — ({warningApis.length})</span>
                                              </span>
                                              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                                                CLIENT VALIDATIONS / NOTICES
                                              </span>
                                            </div>

                                            <div className="space-y-2.5">
                                              {warningApis.map((log, idx) => (
                                                <div key={idx} className="p-3 rounded-lg border border-amber-200 bg-white space-y-2 text-xs shadow-xs">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2 truncate">
                                                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-black uppercase text-[11px] border border-amber-300">
                                                        {log.method}
                                                      </span>
                                                      <span className="font-mono text-slate-900 font-bold truncate text-xs">{log.url}</span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 rounded bg-amber-500 text-white font-mono font-black text-[11px] flex-shrink-0">
                                                      HTTP {log.status}
                                                    </span>
                                                  </div>

                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 font-mono text-[11px]">
                                                    <div>
                                                      <span className="text-[10px] text-slate-600 font-black uppercase block mb-1">Payload Sent:</span>
                                                      <pre className="p-2 rounded border border-slate-200 bg-slate-50 text-slate-900 overflow-x-auto max-h-28 text-[11px]">
                                                        {log.request_payload ? JSON.stringify(log.request_payload, null, 2) : '<No Payload>'}
                                                      </pre>
                                                    </div>
                                                    <div>
                                                      <span className="text-[10px] text-slate-600 font-black uppercase block mb-1">Response Body:</span>
                                                      <pre className="p-2 rounded border border-amber-200 bg-amber-50/70 text-slate-900 overflow-x-auto max-h-28 text-[11px]">
                                                        {log.response_body ? JSON.stringify(log.response_body, null, 2) : '<Empty Response>'}
                                                      </pre>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* LIST 3: PASSED 200 APIS - COMPACT BOUND LIST */}
                                        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/40 p-3.5 space-y-2.5 shadow-xs">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                              <span>✅ 200 Passed APIs Bound List ({passedApis.length})</span>
                                            </span>
                                            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                                              HEALTHY (COMPACT LIST)
                                            </span>
                                          </div>

                                          {passedApis.length === 0 ? (
                                            <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 font-medium text-center">
                                              No 200 OK API calls recorded in this test.
                                            </div>
                                          ) : (
                                            <div className="bg-white rounded-xl border border-emerald-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
                                              {passedApis.map((log, idx) => (
                                                <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-emerald-50/30 transition-colors text-xs">
                                                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-3">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-mono font-black uppercase text-[10px] border border-emerald-300 flex-shrink-0">
                                                      {log.method}
                                                    </span>
                                                    <span className="font-mono text-slate-800 font-bold truncate text-xs" title={log.url}>
                                                      {log.url}
                                                    </span>
                                                  </div>
                                                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-black text-[11px] flex-shrink-0">
                                                    200 OK ✓
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>

                            {/* Screenshot Preview */}
                            <div className="lg:col-span-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                                  <Eye className="w-4 h-4 text-orange-600" />
                                  <span>Visual State Proof</span>
                                </h4>
                                <span className="text-[11px] text-slate-500 font-mono font-bold">1280x800 Viewport</span>
                              </div>

                              {result.screenshot_base64 ? (
                                <div
                                  onClick={() => setZoomScreenshot(result.screenshot_base64)}
                                  className="relative group rounded-xl overflow-hidden border-2 border-amber-200 cursor-zoom-in bg-slate-100 shadow-sm"
                                >
                                  <img
                                    src={`data:image/png;base64,${result.screenshot_base64}`}
                                    alt="Test Result Screenshot"
                                    className="w-full h-auto object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <div className="px-3 py-1.5 rounded-lg bg-white/95 text-slate-900 text-xs font-black flex items-center space-x-1.5 shadow-xl">
                                      <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Click to Enlarge Proof</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400 bg-slate-50">
                                  No screenshot captured.
                                </div>
                              )}

                              <div className="text-[11px] font-mono text-slate-700 break-all bg-amber-50/50 p-2 rounded-lg border border-amber-200">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase">Final Browser Tab URL:</span>
                                {result.final_url}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Screenshot Zoom Modal */}
      {zoomScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setZoomScreenshot(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-white border-2 border-amber-300 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 font-mono">Captured Page Screenshot Proof</span>
              <button
                onClick={() => setZoomScreenshot(null)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-amber-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-50px)] p-2">
              <img
                src={`data:image/png;base64,${zoomScreenshot}`}
                alt="Full Zoom Screenshot"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-amber-200 bg-white py-4 px-6 text-center text-xs text-slate-600 font-medium">
        Bytesalt Autonomous AI QA Testing Platform • High-Speed Web & API Parallel Verification in Browser Tabs
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Lightbulb,
  Target,
  MapPin,
  IndianRupee,
  Layers,
  FileText,
  RotateCcw,
  Send,
  Loader2,
  AlertCircle,
  Check,
  Edit3,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Sliders,
} from 'lucide-react';
import { intakeApi } from '../services/intakeApi.ts';
import type {
  IntakeCategory,
  IntakeStructuredState,
  IntakeProgress,
  FieldSource,
} from '../../shared/types/intake.ts';

interface IntakePageProps {
  projectId: string;
  navigate: (path: string) => void;
}

interface CategoryMeta {
  key: IntakeCategory;
  label: string;
  shortLabel: string;
  isRequired: boolean;
  icon: React.ReactNode;
  hint: string;
  quickOptions?: Array<{ label: string; value: string }>;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'startupIdea',
    label: 'Startup Idea',
    shortLabel: 'Idea',
    isRequired: true,
    icon: <Lightbulb className="h-4 w-4" />,
    hint: 'Describe the core problem you want to solve. You can speak naturally or describe your motivation.',
  },
  {
    key: 'proposedSolution',
    label: 'Proposed Solution / Product',
    shortLabel: 'Solution',
    isRequired: true,
    icon: <Layers className="h-4 w-4" />,
    hint: 'How will your product or service actually solve this problem for the user?',
  },
  {
    key: 'startupName',
    label: 'Working Startup Name',
    shortLabel: 'Name',
    isRequired: false,
    icon: <Briefcase className="h-4 w-4" />,
    hint: 'Do you have a working name or brand concept? If not, feel free to skip.',
    quickOptions: [
      { label: "I don't have one yet", value: "I don't have a startup name yet" },
      { label: 'Project Stealth', value: 'Project Stealth' },
    ],
  },
  {
    key: 'targetCustomers',
    label: 'Target Customers',
    shortLabel: 'Audience',
    isRequired: true,
    icon: <Target className="h-4 w-4" />,
    hint: 'Who in India will pay for or use your product? (e.g. college students, tier-2 merchants, MSME CFOs)',
    quickOptions: [
      { label: 'College / Gen-Z Students', value: 'College and undergraduate students in India' },
      { label: 'MSME & Small Businesses', value: 'Small and medium business owners in India' },
      { label: 'Urban Professionals', value: 'Working professionals in metropolitan tech hubs' },
      { label: 'D2C Shoppers', value: 'Digital-first retail consumers in India' },
    ],
  },
  {
    key: 'location',
    label: 'Launch Location in India',
    shortLabel: 'Location',
    isRequired: true,
    icon: <MapPin className="h-4 w-4" />,
    hint: 'Country is always India. You can launch nationally, or focus on a specific state, city, or regional cluster.',
    quickOptions: [
      { label: '🇮🇳 All India (National)', value: 'All India national launch' },
      { label: 'Maharashtra', value: 'Maharashtra' },
      { label: 'Bengaluru, Karnataka', value: 'Bengaluru, Karnataka' },
      { label: 'Delhi NCR', value: 'Delhi NCR' },
      { label: 'Multiple Tech Hubs', value: 'Bengaluru, Mumbai, and Pune' },
    ],
  },
  {
    key: 'budget',
    label: 'Estimated Starting Budget',
    shortLabel: 'Budget',
    isRequired: true,
    icon: <IndianRupee className="h-4 w-4" />,
    hint: 'Estimated capital needed in INR. You can give an amount, range, or choose AI Estimated if unsure.',
    quickOptions: [
      { label: '₹2 – 5 Lakhs', value: '₹2 to ₹5 Lakhs' },
      { label: '₹5 – 10 Lakhs', value: 'Around ₹5-10 Lakhs' },
      { label: '₹10 – 25 Lakhs', value: '₹10 to ₹25 Lakhs' },
      { label: '₹25 – 50 Lakhs', value: '₹25 to ₹50 Lakhs' },
      { label: "I'm not sure (AI Estimated)", value: "I'm not sure yet, please estimate for me" },
    ],
  },
  {
    key: 'revenueModel',
    label: 'Revenue Model',
    shortLabel: 'Revenue',
    isRequired: false,
    icon: <IndianRupee className="h-4 w-4" />,
    hint: 'How will the startup generate revenue? (Optional — can be decided during Business Model phase)',
    quickOptions: [
      { label: 'SaaS / Recurring Subscription', value: 'Monthly/Annual SaaS subscription model' },
      { label: 'Commission / Marketplace Take', value: 'Transaction fee / marketplace take-rate' },
      { label: 'Freemium with Pro Features', value: 'Freemium core with paid premium upgrades' },
      { label: "I don't know yet", value: "I don't know yet, need suggestions" },
    ],
  },
  {
    key: 'additionalInformation',
    label: 'Additional Information',
    shortLabel: 'Notes',
    isRequired: false,
    icon: <FileText className="h-4 w-4" />,
    hint: 'Any competitive moat, co-founder background, or regulatory details you would like considered? (Optional)',
    quickOptions: [
      { label: 'Solo Technical Founder', value: 'Solo technical founder with 4 years software experience' },
      { label: 'Bootstrapped', value: 'Bootstrapped, aiming for cash-flow positive within 9 months' },
      { label: 'Skip for now', value: 'Nothing else to add right now' },
    ],
  },
  {
    key: 'analysisDepth',
    label: 'Analysis Depth',
    shortLabel: 'Depth',
    isRequired: true,
    icon: <Sliders className="h-4 w-4" />,
    hint: 'Choose how deeply the 9 AI agents will evaluate your startup when analysis begins in Phase 3.',
    quickOptions: [
      { label: '⚡ Quick (Rapid Evaluation)', value: 'Quick analysis depth' },
      { label: '🎯 Standard (Recommended)', value: 'Standard analysis depth' },
      { label: '🔬 Deep (Comprehensive Pro-Forma)', value: 'Deep comprehensive analysis' },
    ],
  },
];

export const IntakePage: React.FC<IntakePageProps> = ({ projectId, navigate }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversation & state
  const [state, setState] = useState<IntakeStructuredState | null>(null);
  const [currentCategory, setCurrentCategory] = useState<IntakeCategory | 'complete'>('startupIdea');
  const [nextQuestion, setNextQuestion] = useState<string>('');
  const [progress, setProgress] = useState<IntakeProgress>({
    completed: 0,
    total: 9,
    percentage: 0,
    requiredCompleted: 0,
    totalRequired: 6,
  });
  const [readyForAnalysis, setReadyForAnalysis] = useState(false);
  const [recentAssistantNote, setRecentAssistantNote] = useState<string>('');

  // Form input
  const [userInput, setUserInput] = useState('');
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await intakeApi.getConversation(projectId);
      setState(data.state);
      setCurrentCategory(data.currentCategory);
      setNextQuestion(data.nextQuestion);
      setProgress(data.progress);
      setReadyForAnalysis(data.readyForAnalysis);

      // If already ready for analysis, open review mode
      if (data.readyForAnalysis) {
        setIsReviewMode(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load intake conversation.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isSubmitting) return;

    const messageText = userInput.trim();
    setUserInput('');
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await intakeApi.sendMessage(projectId, messageText);
      setState(response.state);
      setCurrentCategory(response.currentCategory);
      setNextQuestion(response.nextQuestion);
      setProgress(response.progress);
      setReadyForAnalysis(response.readyForAnalysis);
      setRecentAssistantNote(response.message);

      if (response.readyForAnalysis) {
        setIsReviewMode(true);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process message.');
      setUserInput(messageText); // Restore input on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickOption = (value: string) => {
    setUserInput(value);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all intake answers for this startup? Your project itself will not be deleted.')) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await intakeApi.resetConversation(projectId);
      setState(data.state);
      setCurrentCategory(data.currentCategory);
      setNextQuestion(data.nextQuestion);
      setProgress(data.progress);
      setReadyForAnalysis(false);
      setIsReviewMode(false);
      setRecentAssistantNote('');
      setUserInput('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset conversation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndContinue = async () => {
    setIsConfirming(true);
    try {
      await intakeApi.confirmIntake(projectId);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm intake.');
      setIsConfirming(false);
    }
  };

  const activeMeta = CATEGORIES.find((c) => c.key === currentCategory) || CATEGORIES[0];

  const renderSourceBadge = (source?: FieldSource) => {
    if (source === 'user_provided') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          User Provided
        </span>
      );
    }
    if (source === 'ai_estimated') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          AI Estimated
        </span>
      );
    }
    if (source === 'ai_inferred') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
          AI Inferred
        </span>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3 max-w-md mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-200">Loading Smart Intake...</h2>
        <p className="text-xs text-slate-400">Restoring your startup analysis workspace state</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 2.4B · Smart Guided Intake
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Startup Intake &amp; Analysis Setup
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Answer naturally in your own words. The background intelligence organizes your details across 9 core categories.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>

          <Button variant="ghost" size="sm" onClick={handleReset} title="Restart intake questions">
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-400" />
            Reset
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Intake Communication Error</div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Progress & Stepper Bar */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-200 text-sm">Startup Analysis Setup: </span>
              <span className="text-emerald-400 font-mono font-semibold">
                {progress.completed} of 9 understood
              </span>
              <span className="text-slate-400 ml-2">
                ({progress.requiredCompleted} of 6 required categories complete)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Progress:</span>
              <span className="font-mono font-bold text-slate-200">{progress.percentage}%</span>
            </div>
          </div>

          {/* Progress bar track */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* 9 Category Pills */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-1">
            {CATEGORIES.map((cat) => {
              const isDone =
                cat.key === 'startupIdea' ? !!state?.startupIdea :
                cat.key === 'proposedSolution' ? !!state?.proposedSolution :
                cat.key === 'startupName' ? state?.startupName !== null && state?.startupName !== undefined :
                cat.key === 'targetCustomers' ? !!state?.targetCustomers :
                cat.key === 'location' ? !!state?.location?.scope :
                cat.key === 'budget' ? state?.budget?.amount !== null || state?.budget?.source !== null :
                cat.key === 'revenueModel' ? state?.revenueModel !== null && state?.revenueModel !== undefined :
                cat.key === 'additionalInformation' ? state?.additionalInformation !== null && state?.additionalInformation !== undefined :
                !!state?.analysisDepth;

              const isCurrent = currentCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setCurrentCategory(cat.key);
                    setNextQuestion(cat.hint);
                    setIsReviewMode(false);
                  }}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium transition-all text-left flex items-center justify-between border ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isCurrent
                      ? 'bg-slate-800 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{cat.shortLabel}</span>
                  {isDone ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 text-slate-600 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Experience Layout: Two-Column (Guided Question Center + Live Summary Right) */}
      {!isReviewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Center Stage: Active Question & Natural Answer Input */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-800 bg-slate-900 shadow-xl">
              <CardHeader className="border-b border-slate-800/80 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    {activeMeta.icon}
                    <span>Category: {activeMeta.label}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    activeMeta.isRequired
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeMeta.isRequired ? 'Required' : 'Optional'}
                  </span>
                </div>

                <CardTitle className="text-lg font-bold text-white mt-2 leading-snug">
                  {nextQuestion || activeMeta.hint}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  {activeMeta.hint}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5 space-y-4">
                {/* Assistant Feedback Bubble */}
                {recentAssistantNote && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{recentAssistantNote}</p>
                  </div>
                )}

                {/* Contextual Quick Select Options */}
                {activeMeta.quickOptions && activeMeta.quickOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-400 block">
                      Quick Suggestions (or type in your own words):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeMeta.quickOptions.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleQuickOption(opt.value)}
                          className="px-2.5 py-1 text-xs rounded-full bg-slate-950 border border-slate-800 text-slate-300 hover:border-emerald-500 hover:text-emerald-300 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free-form Natural Answer Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <textarea
                      ref={inputRef}
                      rows={4}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your response naturally... (e.g. 'I want to build an AI study planner for engineering students in Maharashtra. I have around ₹5 lakh.')"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all shadow-inner"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSubmit();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
                      <span>Tip: Press Ctrl+Enter or Cmd+Enter to submit quickly</span>
                      <span>Multiple fields in one answer are auto-extracted</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {readyForAnalysis ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsReviewMode(true)}
                      >
                        <Check className="h-4 w-4 mr-1 text-emerald-400" />
                        Go to Review Screen
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {6 - progress.requiredCompleted} required questions remaining
                      </span>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmitting}
                      disabled={!userInput.trim() || isSubmitting}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Continue
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Live Understood Information Summary */}
          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900/90 shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/80">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Captured Project Summary
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Live State</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Information verified by the background intelligence engine
                </CardDescription>
              </CardHeader>

              <CardContent className="p-3.5 space-y-3 max-h-[500px] overflow-y-auto text-xs">
                {/* 1. Idea */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>1. Startup Idea</span>
                    {renderSourceBadge(state?.fieldSources?.startupIdea)}
                  </div>
                  <p className="text-slate-200 line-clamp-3">
                    {state?.startupIdea || <span className="text-slate-500 italic">Not provided yet</span>}
                  </p>
                </div>

                {/* 2. Solution */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>2. Proposed Solution</span>
                    {renderSourceBadge(state?.fieldSources?.proposedSolution)}
                  </div>
                  <p className="text-slate-200 line-clamp-2">
                    {state?.proposedSolution || <span className="text-slate-500 italic">Not provided yet</span>}
                  </p>
                </div>

                {/* 3. Name */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>3. Startup Name</span>
                    {renderSourceBadge(state?.fieldSources?.startupName)}
                  </div>
                  <p className="text-slate-200">
                    {state?.startupName || <span className="text-slate-500 italic">Undecided (Optional)</span>}
                  </p>
                </div>

                {/* 4. Customers */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>4. Target Customers</span>
                    {renderSourceBadge(state?.fieldSources?.targetCustomers)}
                  </div>
                  <p className="text-slate-200">
                    {state?.targetCustomers || <span className="text-slate-500 italic">Not provided yet</span>}
                  </p>
                </div>

                {/* 5. Location */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>5. Launch Location</span>
                    {renderSourceBadge(state?.fieldSources?.location || state?.location?.source)}
                  </div>
                  <p className="text-slate-200 capitalize">
                    {state?.location?.scope ? (
                      `${state.location.country} (${state.location.scope}${
                        state.location.locations.length > 0 ? `: ${state.location.locations.join(', ')}` : ''
                      })`
                    ) : (
                      <span className="text-slate-500 italic">Not selected yet</span>
                    )}
                  </p>
                </div>

                {/* 6. Budget */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>6. Starting Budget</span>
                    {renderSourceBadge(state?.fieldSources?.budget || (state?.budget?.source as FieldSource))}
                  </div>
                  <p className="text-slate-200 font-mono">
                    {state?.budget?.amount ? (
                      `₹${state.budget.amount.toLocaleString()} INR`
                    ) : state?.budget?.source === 'ai_estimated' ? (
                      <span className="text-amber-400 font-sans">Marked for AI Estimation</span>
                    ) : (
                      <span className="text-slate-500 italic font-sans">Not provided yet</span>
                    )}
                  </p>
                </div>

                {/* 7. Revenue Model */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>7. Revenue Model</span>
                    {renderSourceBadge(state?.fieldSources?.revenueModel)}
                  </div>
                  <p className="text-slate-200">
                    {state?.revenueModel || <span className="text-slate-500 italic">Undecided (Optional)</span>}
                  </p>
                </div>

                {/* 8. Additional Info */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>8. Additional Notes</span>
                    {renderSourceBadge(state?.fieldSources?.additionalInformation)}
                  </div>
                  <p className="text-slate-200">
                    {state?.additionalInformation || <span className="text-slate-500 italic">None (Optional)</span>}
                  </p>
                </div>

                {/* 9. Analysis Depth */}
                <div className="p-2.5 rounded-md bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>9. Analysis Depth</span>
                    {renderSourceBadge(state?.fieldSources?.analysisDepth)}
                  </div>
                  <p className="text-slate-200 capitalize font-medium">
                    {state?.analysisDepth || <span className="text-slate-500 italic">Not chosen yet</span>}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Review Screen: Polished Verification & Confirm View */
        <Card className="border-slate-800 bg-slate-900 shadow-2xl">
          <CardHeader className="border-b border-slate-800 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Intake Complete · Ready For Analysis
                </span>
                <CardTitle className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  Review Structured Startup Profile
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-1">
                  All required categories have been successfully captured and validated. Review before confirming.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={() => setIsReviewMode(false)}>
                  <Edit3 className="h-4 w-4 mr-1.5" />
                  Edit Answers
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isConfirming}
                  onClick={handleConfirmAndContinue}
                >
                  <ArrowRight className="h-4 w-4 mr-1.5" />
                  Confirm &amp; Continue
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Startup Idea */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
                    Startup Idea (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.startupIdea)}
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {state?.startupIdea || 'None provided'}
                </p>
              </div>

              {/* Proposed Solution */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-400" />
                    Proposed Solution (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.proposedSolution)}
                </div>
                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {state?.proposedSolution || 'None provided'}
                </p>
              </div>

              {/* Startup Name */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                    Startup Name (Optional)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.startupName)}
                </div>
                <p className="text-sm text-slate-100">
                  {state?.startupName || <span className="text-slate-500 italic">Undecided</span>}
                </p>
              </div>

              {/* Target Customers */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    Target Customers (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.targetCustomers)}
                </div>
                <p className="text-sm text-slate-100">
                  {state?.targetCustomers || 'None provided'}
                </p>
              </div>

              {/* Launch Location */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    Launch Location in India (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.location || state?.location?.source)}
                </div>
                <p className="text-sm text-slate-100 capitalize">
                  {state?.location?.country} · Scope: <strong className="text-white">{state?.location?.scope}</strong>
                  {state?.location?.locations && state.location.locations.length > 0 && (
                    <span className="block text-xs text-slate-400 mt-0.5">
                      Locations: {state.location.locations.join(', ')}
                    </span>
                  )}
                </p>
              </div>

              {/* Starting Budget */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                    Starting Budget (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.budget || (state?.budget?.source as FieldSource))}
                </div>
                <p className="text-sm text-slate-100 font-mono">
                  {state?.budget?.amount ? (
                    `₹${state.budget.amount.toLocaleString()} INR`
                  ) : state?.budget?.source === 'ai_estimated' ? (
                    <span className="text-amber-400 font-sans text-sm font-medium">
                      AI Estimated (Will be calculated during financial projection)
                    </span>
                  ) : (
                    'Not specified'
                  )}
                </p>
              </div>

              {/* Revenue Model */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                    Revenue Model (Optional)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.revenueModel)}
                </div>
                <p className="text-sm text-slate-100">
                  {state?.revenueModel || <span className="text-slate-500 italic">To be formulated in Phase 3</span>}
                </p>
              </div>

              {/* Analysis Depth */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                    Analysis Depth (Required)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.analysisDepth)}
                </div>
                <p className="text-sm text-slate-100 capitalize font-medium">
                  {state?.analysisDepth || 'standard'}
                </p>
              </div>
            </div>

            {/* Additional Information */}
            {state?.additionalInformation && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    Additional Notes (Optional)
                  </span>
                  {renderSourceBadge(state?.fieldSources?.additionalInformation)}
                </div>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {state.additionalInformation}
                </p>
              </div>
            )}

            {/* Confirmation Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-emerald-200">Ready For Startup Analysis</div>
                  <p className="text-slate-400 text-[11px]">
                    Clicking &quot;Confirm &amp; Continue&quot; saves this validated profile to MongoDB and marks project status as <code>READY_FOR_ANALYSIS</code>. AI agent orchestration will be triggered in Phase 3.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                isLoading={isConfirming}
                onClick={handleConfirmAndContinue}
              >
                Confirm &amp; Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

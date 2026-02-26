'use client'

import { getConfidenceLabel } from '@/types'
import type {
  ChannelMetrics,
  ScenarioPlan,
} from '@/types'
import type { ScenarioRecordPayload } from '@/lib/api'
import {
  BUDGET_DELTA_PRESETS,
  formatMoney,
  formatScenarioAction,
  scenarioActionClass,
  readScenarioPlan,
} from '@/lib/scenario-helpers'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScenarioActionCenterProps {
  channels: ChannelMetrics[]
  plannerEnabled: boolean
  targetCpaDrafts: Record<string, string>
  onTargetCpaDraftChange: (channelName: string, value: string) => void
  onApplyTargetCpas: () => void | Promise<void>
  targetCpaApplying: boolean
  targetCpaError: string | null
  budgetDeltaPercent: number
  onBudgetDeltaPercentChange: (value: number) => void
  lockedChannels: string[]
  onToggleLockedChannel: (channelName: string) => void
  onGenerateScenario: () => void | Promise<void>
  onRefreshSavedScenarios: () => void | Promise<void>
  scenarioLoading: boolean
  scenarioError: string | null
  scenarioPlan: ScenarioPlan | null
  scenarioName: string
  onScenarioNameChange: (value: string) => void
  onSaveScenario: () => void | Promise<void>
  scenarioSaving: boolean
  saveConfirmation: string | null
  savedScenarios: ScenarioRecordPayload[]
  selectedScenarioId: string
  onSelectScenario: (scenarioId: string) => void
  nextActionSummary: string
  onExportCsv: () => void
  onExportJson: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioActionCenter({
  channels,
  plannerEnabled,
  targetCpaDrafts,
  onTargetCpaDraftChange,
  onApplyTargetCpas,
  targetCpaApplying,
  targetCpaError,
  budgetDeltaPercent,
  onBudgetDeltaPercentChange,
  lockedChannels,
  onToggleLockedChannel,
  onGenerateScenario,
  onRefreshSavedScenarios,
  scenarioLoading,
  scenarioError,
  scenarioPlan,
  scenarioName,
  onScenarioNameChange,
  onSaveScenario,
  scenarioSaving,
  saveConfirmation,
  savedScenarios,
  selectedScenarioId,
  onSelectScenario,
  nextActionSummary,
  onExportCsv,
  onExportJson,
}: ScenarioActionCenterProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Create operator-ready spend moves, review confidence, then export for campaign deployment.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="space-y-3 xl:col-span-2">
          <details className="space-y-2">
            <summary className="text-xs font-medium text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors list-none">
              Override target CPA for specific channels →
            </summary>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Channel Target CPA</p>
              <button
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void onApplyTargetCpas()}
                disabled={!plannerEnabled || targetCpaApplying || channels.length === 0}
                type="button"
              >
                {targetCpaApplying ? 'Applying...' : 'Apply Targets'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {channels.length === 0 && <p className="text-xs text-slate-400">No channels available</p>}
              {channels.map((channel) => (
                <label key={channel.channelName} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm text-slate-700">
                  <span>{channel.channelName}</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={targetCpaDrafts[channel.channelName] ?? ''}
                    onChange={(event) => onTargetCpaDraftChange(channel.channelName, event.target.value)}
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </label>
              ))}
            </div>
            {targetCpaError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {targetCpaError}
              </div>
            )}
          </details>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs uppercase tracking-wide text-slate-500">Total Budget Change</label>
              <ScenarioStepConstraintHelp />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Budget moves are simulated in fixed 10% steps to preserve marginal-curve numerical stability.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
              {BUDGET_DELTA_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onBudgetDeltaPercentChange(preset)}
                  className={`rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold border transition-colors ${
                    budgetDeltaPercent === preset
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset > 0 ? `+${preset}%` : `${preset}%`}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={budgetDeltaPercent}
              step={1}
              onChange={(event) => onBudgetDeltaPercentChange(Number(event.target.value) || 0)}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="text-xs text-slate-500 mt-1">
              0% reallocates without changing your total budget. Positive adds spend, negative trims.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Locked Channels</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {channels.length === 0 && <p className="text-xs text-slate-400">No channels available</p>}
              {channels.map((channel) => (
                <label key={channel.channelName} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={lockedChannels.includes(channel.channelName)}
                    onChange={() => onToggleLockedChannel(channel.channelName)}
                  />
                  {channel.channelName}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-primary"
              onClick={() => void onGenerateScenario()}
              disabled={!plannerEnabled || scenarioLoading || targetCpaApplying}
              type="button"
            >
              {scenarioLoading ? 'Generating...' : scenarioPlan ? 'Regenerate Plan' : 'Generate Recommended Plan'}
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void onRefreshSavedScenarios()}
              type="button"
            >
              Reload Saved
            </button>
          </div>
        </div>

        <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">What To Do Now</p>
          <p className="text-sm text-indigo-900 mt-2">{nextActionSummary}</p>
          {scenarioPlan && (
            <div className="text-xs text-indigo-700 mt-3 space-y-1">
              <p>
                Projected spend: ${formatMoney(scenarioPlan.projectedSummary.currentTotalSpend)}
                {' -> '}
                ${formatMoney(scenarioPlan.projectedSummary.projectedTotalSpend)}
              </p>
              <p>
                Net delta: {scenarioPlan.projectedSummary.totalSpendDelta >= 0 ? '+' : ''}
                ${formatMoney(scenarioPlan.projectedSummary.totalSpendDelta)}
                {' / '}
                {scenarioPlan.projectedSummary.totalSpendDeltaPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {scenarioError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {scenarioError}
        </div>
      )}

      {scenarioPlan && (
        <>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Projected Mix</p>
            <p className="text-xs text-slate-500 mt-1">
              Increase: {scenarioPlan.projectedSummary.channelsIncrease}
              {' | '}
              Decrease: {scenarioPlan.projectedSummary.channelsDecrease}
              {' | '}
              Maintain: {scenarioPlan.projectedSummary.channelsMaintain}
              {' | '}
              Locked: {scenarioPlan.projectedSummary.channelsLocked}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {scenarioPlan.recommendations.map((recommendation) => (
              <div
                key={recommendation.channelName}
                className="rounded-md border border-slate-200 px-3 py-2 bg-white"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{recommendation.channelName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${scenarioActionClass(recommendation.action)}`}>
                      {formatScenarioAction(recommendation.action)}
                    </span>
                    {recommendation.isActionBlocked && (
                      <span className="text-[11px] rounded-full bg-red-100 text-red-700 px-2 py-0.5">
                        Blocked
                      </span>
                    )}
                    <span className="text-[11px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                      {getConfidenceLabel(recommendation.confidenceTier)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{recommendation.rationale}</p>
                {recommendation.isActionBlocked && recommendation.blockedReason && (
                  <p className="text-xs text-red-600 mt-1">{recommendation.blockedReason}</p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  ${formatMoney(recommendation.currentSpend)}
                  {' -> '}
                  ${formatMoney(recommendation.recommendedSpend)}
                  {' '}
                  ({recommendation.spendDelta >= 0 ? '+' : ''}
                  {formatMoney(recommendation.spendDelta)}
                  {' / '}
                  {recommendation.spendDeltaPercent.toFixed(1)}%)
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-primary"
              onClick={onExportCsv}
              type="button"
            >
              Export Plan CSV
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onExportJson}
              type="button"
            >
              JSON
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-slate-500">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(event) => onScenarioNameChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="flex items-center gap-3">
              <button
                className="btn-primary"
                onClick={() => void onSaveScenario()}
                disabled={scenarioSaving}
                type="button"
              >
                {scenarioSaving ? 'Saving...' : 'Save Scenario'}
              </button>
              {saveConfirmation && (
                <span className="text-sm font-medium text-emerald-600 animate-fade-in">
                  {saveConfirmation}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {savedScenarios.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-slate-500">Saved Scenarios</label>
          <div className="space-y-2">
            {savedScenarios.map((scenario) => {
              const plan = readScenarioPlan(scenario.budget_allocation)
              const delta = plan?.projectedSummary?.totalSpendDelta ?? null
              const isSelected = selectedScenarioId === scenario.id
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => onSelectScenario(scenario.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {scenario.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    {scenario.created_at && (
                      <span>{new Date(scenario.created_at).toLocaleDateString()}</span>
                    )}
                    {delta !== null && (
                      <span className={delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-500'}>
                        {delta > 0 ? '+' : ''}{delta.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/day
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScenarioStepConstraintHelp() {
  return (
    <details className="group relative">
      <summary
        className="list-none inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        aria-label="Explain 10% scenario step constraint"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px]">
          i
        </span>
        Why fixed 10% steps?
      </summary>
      <p className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600 max-w-xl">
        Budget moves are simulated in fixed 10% steps to preserve marginal-curve numerical stability. This keeps
        scenario recommendations consistent with the same incremental math policy used in marginal CPA analysis.
      </p>
    </details>
  )
}

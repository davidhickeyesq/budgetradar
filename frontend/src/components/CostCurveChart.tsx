'use client'

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ReferenceDot,
    ReferenceArea,
    ResponsiveContainer,
} from 'recharts'
import type { CurvePoint, CurrentPoint, HillParameters } from '@/types'

interface CostCurveChartProps {
    modelParams: HillParameters | null
    currentSpend: number
    targetCpa: number
    channelName: string
    curvePoints?: CurvePoint[] | null
    currentPoint?: CurrentPoint | null
    projectedPoint?: CurrentPoint | null
}

/**
 * Compute conversions via the Hill function:
 * f(x) = S * x^β / (κ^β + x^β)
 */
function hillFunction(spend: number, params: HillParameters): number {
    const s = Math.max(spend, 1e-10)
    const num = Math.pow(s, params.beta)
    const den = Math.pow(params.kappa, params.beta) + num
    return params.max_yield * (num / den)
}

/**
 * Compute marginal CPA at a given spend level using the 10% increment method
 * (same as the backend does).
 */
function marginalCpaAt(spend: number, params: HillParameters, increment = 0.10): number | null {
    if (spend <= 0) return null
    const spendNext = spend * (1 + increment)
    const convCurrent = hillFunction(spend, params)
    const convNext = hillFunction(spendNext, params)
    const deltaConv = convNext - convCurrent
    if (deltaConv <= 0) return null
    const deltaSpend = spendNext - spend
    return deltaSpend / deltaConv
}

/**
 * Generate curve data points spanning from a small fraction of current spend
 * up to 4x current spend, so the user can see the full diminishing returns picture.
 */
function generateCurveData(
    params: HillParameters,
    currentSpend: number,
    targetCpa: number,
): CurvePoint[] {
    const points: CurvePoint[] = []
    const minSpend = Math.max(currentSpend * 0.05, 10)
    const maxSpend = currentSpend * 4

    const numPoints = 120
    const step = (maxSpend - minSpend) / numPoints

    for (let i = 0; i <= numPoints; i++) {
        const spend = minSpend + i * step
        const mcpa = marginalCpaAt(spend, params)
        if (mcpa === null || mcpa > targetCpa * 5) continue

        const ratio = mcpa / targetCpa
        let zone: 'green' | 'yellow' | 'red' = 'green'
        if (ratio > 1.1) zone = 'red'
        else if (ratio >= 0.9) zone = 'yellow'

        points.push({
            spend: Math.round(spend),
            marginalCpa: Math.round(mcpa * 100) / 100,
            zone,
        })
    }

    return points
}

function formatCurrency(value: number): string {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
    return `$${value.toFixed(0)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    const data = payload[0]?.payload as CurvePoint | undefined
    if (!data) return null

    const zoneColors = {
        green: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', label: 'Scale — Room to grow' },
        yellow: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', label: 'Maintain — At threshold' },
        red: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', label: 'Cut — Diminishing returns' },
    }
    const c = zoneColors[data.zone]

    return (
        <div
            style={{
                background: c.bg,
                border: `1.5px solid ${c.border}`,
                borderRadius: 10,
                padding: '10px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                fontSize: 13,
                lineHeight: 1.4,
            }}
        >
            <p style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>
                Spend: <span style={{ color: '#1e293b', fontWeight: 600 }}>${label?.toLocaleString()}</span>
            </p>
            <p style={{ margin: '4px 0 0', color: c.text, fontWeight: 600, fontSize: 14 }}>
                Marginal CPA: ${data.marginalCpa.toFixed(2)}
            </p>
            <p style={{ margin: '3px 0 0', color: c.text, fontSize: 11, opacity: 0.8 }}>
                {c.label}
            </p>
        </div>
    )
}

export function CostCurveChart({
    modelParams,
    currentSpend,
    targetCpa,
    channelName,
    curvePoints,
    currentPoint,
    projectedPoint,
}: CostCurveChartProps) {
    const backendData = curvePoints ?? []
    const fallbackData = modelParams ? generateCurveData(modelParams, currentSpend, targetCpa) : []
    const data = backendData.length > 0 ? backendData : fallbackData

    const fallbackCurrentMcpa = modelParams ? marginalCpaAt(currentSpend, modelParams) : null
    const resolvedCurrentPoint = currentPoint ?? (
        fallbackCurrentMcpa !== null
            ? {
                spend: Math.round(currentSpend),
                marginalCpa: Math.round(fallbackCurrentMcpa * 100) / 100,
            }
            : null
    )

    if (data.length === 0 || resolvedCurrentPoint === null) {
        return (
            <div className="py-4 px-3 rounded-lg bg-slate-50 text-center">
                <p className="text-sm text-slate-400">Insufficient data to render cost curve</p>
            </div>
        )
    }

    // Y-axis: always include the target CPA with headroom
    const maxMcpa = Math.max(...data.map(d => d.marginalCpa), resolvedCurrentPoint.marginalCpa)
    const yMax = Math.max(targetCpa * 1.6, maxMcpa * 1.1)

    // Zone boundary values
    const greenThreshold = targetCpa * 0.9
    const redThreshold = targetCpa * 1.1

    const hasProjectedPoint = Boolean(
        projectedPoint
        && Number.isFinite(projectedPoint.spend)
        && Number.isFinite(projectedPoint.marginalCpa)
        && (
            Math.abs(projectedPoint.spend - resolvedCurrentPoint.spend) > 0.5
            || Math.abs(projectedPoint.marginalCpa - resolvedCurrentPoint.marginalCpa) > 0.05
        )
    )

    // Unique gradient ID
    const uid = channelName.replace(/\s+/g, '-')

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 20 }}>
                    <defs>
                        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.01} />
                        </linearGradient>
                    </defs>

                    {/* Colored zone backgrounds */}
                    <ReferenceArea
                        y1={0}
                        y2={greenThreshold}
                        fill="#10b981"
                        fillOpacity={0.06}
                    />
                    <ReferenceArea
                        y1={greenThreshold}
                        y2={redThreshold}
                        fill="#f59e0b"
                        fillOpacity={0.06}
                    />
                    <ReferenceArea
                        y1={redThreshold}
                        y2={yMax}
                        fill="#ef4444"
                        fillOpacity={0.06}
                    />

                    <CartesianGrid strokeDasharray="3 6" stroke="#e2e8f0" vertical={false} />

                    <XAxis
                        dataKey="spend"
                        tickFormatter={formatCurrency}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        label={{
                            value: 'Daily Spend →',
                            position: 'insideBottom',
                            offset: -8,
                            style: { fontSize: 11, fill: '#94a3b8' },
                        }}
                    />
                    <YAxis
                        tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, yMax]}
                        label={{
                            value: 'Marginal CPA',
                            angle: -90,
                            position: 'insideLeft',
                            offset: 4,
                            style: { fontSize: 11, fill: '#94a3b8', textAnchor: 'middle' },
                        }}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    {/* Filled area under the curve */}
                    <Area
                        type="monotone"
                        dataKey="marginalCpa"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill={`url(#fill-${uid})`}
                        fillOpacity={1}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                    />

                    {/* Target CPA line */}
                    <ReferenceLine
                        y={targetCpa}
                        stroke="#6366f1"
                        strokeDasharray="8 4"
                        strokeWidth={1.5}
                        label={{
                            value: `Target $${targetCpa}`,
                            position: 'right',
                            style: { fontSize: 11, fill: '#6366f1', fontWeight: 600 },
                        }}
                    />

                    {/* Green → Yellow boundary */}
                    <ReferenceLine
                        y={greenThreshold}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        strokeWidth={0.8}
                        strokeOpacity={0.5}
                    />

                    {/* Yellow → Red boundary */}
                    <ReferenceLine
                        y={redThreshold}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={0.8}
                        strokeOpacity={0.5}
                    />

                    {/* Current spend vertical marker */}
                    <ReferenceLine
                        x={Math.round(resolvedCurrentPoint.spend)}
                        stroke="#475569"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        strokeOpacity={0.5}
                    />

                    {/* "You are here" dot */}
                    <ReferenceDot
                        x={Math.round(resolvedCurrentPoint.spend)}
                        y={Math.round(resolvedCurrentPoint.marginalCpa * 100) / 100}
                        r={7}
                        fill="#1e293b"
                        stroke="#ffffff"
                        strokeWidth={3}
                    />

                    {hasProjectedPoint && projectedPoint && (
                        <>
                            <ReferenceLine
                                x={Math.round(projectedPoint.spend)}
                                stroke="#0f766e"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                                strokeOpacity={0.7}
                            />
                            <ReferenceDot
                                x={Math.round(projectedPoint.spend)}
                                y={Math.round(projectedPoint.marginalCpa * 100) / 100}
                                r={6}
                                fill="#0f766e"
                                stroke="#ffffff"
                                strokeWidth={2}
                            />
                        </>
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, TrendingUp, AlertTriangle, ArrowRight, Info } from 'lucide-react'
import Link from 'next/link'
import { debounce } from 'lodash'
import {
    analyzeChannels,
    simulateScenario,
    type SimulateScenarioResponse,
    type ChannelProjection,
    type ChannelAnalysis
} from '@/lib/api'

const ACCOUNT_ID = 'a8465a7b-bf39-4352-9658-4f1b8d05b381'

export default function ScenarioPlannerPage() {
    const [loading, setLoading] = useState(true)
    const [simulating, setSimulating] = useState(false)
    const [data, setData] = useState<SimulateScenarioResponse | null>(null)
    const [allocations, setAllocations] = useState<Record<string, number>>({})

    // Initial load - get current state
    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        try {
            // Use the API function instead of manual fetch
            const analysisData = await analyzeChannels(ACCOUNT_ID, 50, 'revenue')

            const initialAllocations: Record<string, number> = {}
            analysisData.channels.forEach((c: ChannelAnalysis) => {
                initialAllocations[c.channel_name] = c.current_spend
            })

            setAllocations(initialAllocations)
            await runSimulation(initialAllocations)
            setLoading(false)
        } catch (err) {
            console.error('Failed to load initial data', err)
            setLoading(false)
        }
    }

    const runSimulation = async (currentAllocations: Record<string, number>) => {
        setSimulating(true)
        try {
            const allocationsList = Object.entries(currentAllocations).map(([name, spend]) => ({
                channel_name: name,
                spend: Number(spend)
            }))

            const result = await simulateScenario(ACCOUNT_ID, allocationsList)
            setData(result)
        } catch (err) {
            console.error('Simulation failed', err)
        } finally {
            setSimulating(false)
        }
    }

    // Debounced simulation trigger
    const debouncedSimulation = useCallback(
        debounce((newAllocations: Record<string, number>) => {
            runSimulation(newAllocations)
        }, 500),
        []
    )

    const handleSpendChange = (channel: string, value: number) => {
        const newAllocations = { ...allocations, [channel]: value }
        setAllocations(newAllocations)
        debouncedSimulation(newAllocations)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-500">Loading Scenario Planner...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Scenario Planner</h1>
                            <p className="text-gray-500">Simulate budget changes and predict outcomes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <Info className="w-4 h-4" />
                        <span>Inputs are Daily • Projections are Monthly (30.4 days)</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Channel List - Left Side */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="col-span-3">Channel</div>
                                <div className="col-span-2 text-right">Current Daily</div>
                                <div className="col-span-4 text-center">Proposed Daily Spend</div>
                                <div className="col-span-3 text-right">Proj. Monthly Rev</div>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {data?.projections.map((channel) => (
                                    <ChannelRow
                                        key={channel.channel_name}
                                        channel={channel}
                                        onSpendChange={handleSpendChange}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary Card - Right Side */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Projected Outcome</h2>

                            <div className="space-y-6">
                                {/* Revenue Comparison */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Monthly Revenue</span>
                                        <span className={data?.delta_revenue && data.delta_revenue >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {data?.delta_revenue && data.delta_revenue > 0 ? '+' : ''}
                                            ${Math.round(data?.delta_revenue || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-gray-900">
                                            ${Math.round(data?.total_projected_revenue || 0).toLocaleString()}
                                        </span>
                                        <span className="text-sm text-gray-400 line-through">
                                            ${Math.round(data?.total_current_revenue || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, ((data?.total_projected_revenue || 0) / ((data?.total_current_revenue || 1) * 1.5)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Spend Comparison */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Monthly Spend</span>
                                        <span className={data?.delta_spend && data.delta_spend <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                            {data?.delta_spend && data.delta_spend > 0 ? '+' : ''}
                                            ${Math.round((data?.delta_spend || 0) * 30.4).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xl font-semibold text-gray-900">
                                            ${Math.round((data?.total_proposed_spend || 0) * 30.4).toLocaleString()}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            was ${Math.round((data?.total_current_spend || 0) * 30.4).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* ROAS */}
                                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-medium">Blended ROAS</div>
                                        <div className="text-xl font-bold text-gray-900 mt-1">
                                            {data?.total_proposed_spend ? (data.total_projected_revenue / (data.total_proposed_spend * 30.4)).toFixed(2) : '0.00'}x
                                        </div>
                                    </div>
                                    <div className={`text-sm font-medium ${(data?.total_proposed_spend && (data.total_projected_revenue / (data.total_proposed_spend * 30.4)) >= 1.1)
                                        ? 'text-emerald-600'
                                        : 'text-yellow-600'
                                        }`}>
                                        {(data?.total_proposed_spend && (data.total_projected_revenue / (data.total_proposed_spend * 30.4)) >= 1.1)
                                            ? 'Healthy'
                                            : 'Review'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ChannelRow({ channel, onSpendChange }: { channel: ChannelProjection, onSpendChange: (name: string, val: number) => void }) {
    const isProfitable = channel.marginal_roas >= 1.1
    const isUncertain = channel.traffic_light === 'grey'

    return (
        <div className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors ${isUncertain ? 'opacity-75' : ''}`}>
            {/* Channel Info */}
            <div className="col-span-3">
                <div className="font-medium text-gray-900">{channel.channel_name}</div>
                {channel.warning && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        {channel.warning}
                    </div>
                )}
            </div>

            {/* Current Spend */}
            <div className="col-span-2 text-right text-sm text-gray-500 font-mono">
                ${channel.current_spend.toLocaleString()}
            </div>

            {/* Slider & Input */}
            <div className="col-span-4 px-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max={Math.max(channel.current_spend * 3, 1000)}
                            step="10"
                            value={channel.proposed_spend}
                            onChange={(e) => onSpendChange(channel.channel_name, Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            disabled={!channel.has_model}
                        />
                        {isProfitable && !isUncertain && (
                            <div className="group relative">
                                <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
                                    High potential (ROAS {channel.marginal_roas.toFixed(1)}x)
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                            <input
                                type="number"
                                value={Math.round(channel.proposed_spend)}
                                onChange={(e) => onSpendChange(channel.channel_name, Number(e.target.value))}
                                className="w-20 pl-4 pr-1 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Projected Revenue */}
            <div className="col-span-3 text-right">
                <div className="font-medium text-gray-900">
                    ${Math.round(channel.projected_revenue).toLocaleString()}
                </div>
                {channel.delta_revenue !== 0 && (
                    <div className={`text-xs ${channel.delta_revenue > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {channel.delta_revenue > 0 ? '+' : ''}
                        ${Math.round(channel.delta_revenue).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    )
}
